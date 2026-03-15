"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { REGIONS } from "@/lib/bracket-constants";
import SimulatorRegion from "@/components/bracket/SimulatorRegion";
import SimulatorFinalFour from "@/components/bracket/SimulatorFinalFour";
import SimulatorLeaderboard from "@/components/SimulatorLeaderboard";
import { useSimulatorResults } from "@/hooks/useSimulatorResults";
import type { SimulatorData } from "@/types/simulator";

export default function SimulatorPage() {
  const { groupId } = useParams<{ groupId: string }>();
  const router = useRouter();
  const [data, setData] = useState<SimulatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/groups/${groupId}/simulator`);
      if (!res.ok) {
        setError((await res.json()).error ?? "Failed to load");
      } else {
        setData(await res.json());
      }
      setLoading(false);
    }
    load();
  }, [groupId]);

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading simulator...</p></main>;
  if (error || !data) return (
    <main className="flex min-h-screen items-center justify-center flex-col gap-4">
      <p className="text-red-600">{error}</p>
      <button onClick={() => router.back()} className="text-blue-600 underline">Go Back</button>
    </main>
  );

  return <SimulatorView data={data} />;
}

function SimulatorView({ data }: { data: SimulatorData }) {
  const router = useRouter();
  const { mergedResults, hypothetical, setResult, resetHypothetical } = useSimulatorResults(data.results);
  const hypotheticalCount = Object.keys(hypothetical).length;

  return (
    <main className="min-h-screen flex">
      {/* Bracket area */}
      <div className="flex-1 p-4 overflow-x-auto">
        <div className="flex items-center justify-between mb-4 max-w-screen-2xl mx-auto">
          <div className="flex items-center gap-4">
            <button onClick={() => router.push(`/groups/${data.groupId}`)} className="text-blue-600 hover:underline text-sm">← Back to Group</button>
            <h1 className="text-lg font-bold">🔮 What-If: {data.groupName}</h1>
            <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">Simulator</span>
          </div>
          {hypotheticalCount > 0 && (
            <button onClick={resetHypothetical} className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300 transition">
              Reset ({hypotheticalCount} hypothetical)
            </button>
          )}
        </div>

        <div className="text-xs text-gray-500 mb-3 max-w-screen-2xl mx-auto">
          Click games to set hypothetical results. <span className="inline-block w-3 h-3 bg-green-100 border border-green-300 rounded align-middle" /> = actual result, <span className="inline-block w-3 h-3 bg-yellow-100 border border-yellow-300 rounded align-middle" /> = hypothetical
        </div>

        <div className="bg-white p-4">
          <div className="min-w-[1200px] max-w-screen-2xl mx-auto">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
              <SimulatorRegion region={REGIONS[0]} regions={data.regions} results={mergedResults} actualResults={data.results} onSetResult={setResult} side="left" />
              <SimulatorFinalFour regions={data.regions} results={mergedResults} actualResults={data.results} onSetResult={setResult} />
              <SimulatorRegion region={REGIONS[1]} regions={data.regions} results={mergedResults} actualResults={data.results} onSetResult={setResult} side="right" />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start mt-8">
              <SimulatorRegion region={REGIONS[2]} regions={data.regions} results={mergedResults} actualResults={data.results} onSetResult={setResult} side="left" />
              <div className="w-40" />
              <SimulatorRegion region={REGIONS[3]} regions={data.regions} results={mergedResults} actualResults={data.results} onSetResult={setResult} side="right" />
            </div>
          </div>
        </div>
      </div>

      {/* Leaderboard sidebar */}
      <div className="w-64 border-l bg-gray-50 p-3 flex flex-col">
        <h2 className="text-sm font-bold mb-2">📊 Live Leaderboard</h2>
        <SimulatorLeaderboard
          brackets={data.brackets}
          results={mergedResults}
          settings={data.scoringSettings}
          regions={data.regions}
        />
      </div>
    </main>
  );
}
