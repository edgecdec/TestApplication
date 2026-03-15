"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { REGIONS } from "@/lib/bracket-constants";
import RegionBracket from "@/components/bracket/RegionBracket";
import FinalFour from "@/components/bracket/FinalFour";
import { useBracketPicks } from "@/hooks/useBracketPicks";
import { generateAutofill, type AutofillMode } from "@/lib/autofill";
import AutofillDropdown from "@/components/bracket/AutofillDropdown";
import type { Bracket, RegionData, Tournament } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";

interface LoadedData {
  bracket: Bracket;
  tournament: Tournament;
  regions: RegionData[];
  results: Results;
  isOwner: boolean;
  locked: boolean;
}

export default function BracketPage() {
  const params = useParams();
  const router = useRouter();
  const bracketId = Number(params.id);
  const [data, setData] = useState<LoadedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [bracketRes, meRes] = await Promise.all([
          fetch(`/api/brackets/${bracketId}`),
          fetch("/api/auth/me"),
        ]);
        if (!bracketRes.ok) {
          setLoadError("Bracket not found");
          return;
        }
        const { bracket } = await bracketRes.json() as { bracket: Bracket & { username: string } };
        const tournamentRes = await fetch(`/api/tournaments/${bracket.tournament_id}`);
        if (!tournamentRes.ok) {
          setLoadError("Tournament not found");
          return;
        }
        const { tournament } = await tournamentRes.json() as { tournament: Tournament };
        const regions: RegionData[] = JSON.parse(tournament.bracket_data);
        const results: Results = JSON.parse(tournament.results_data);
        const meData = meRes.ok ? await meRes.json() : null;
        const isOwner = meData?.user?.id === bracket.user_id;
        const locked = !isOwner || new Date(tournament.lock_time) <= new Date();

        setData({ bracket, tournament, regions, results, isOwner, locked });
      } catch {
        setLoadError("Failed to load bracket");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bracketId]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading bracket...</p></main>;
  }
  if (loadError || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center flex-col gap-4">
        <p className="text-red-600">{loadError}</p>
        <button onClick={() => router.push("/dashboard")} className="text-blue-600 underline">Back to Dashboard</button>
      </main>
    );
  }

  return <BracketView data={data} />;
}

function BracketView({ data }: { data: LoadedData }) {
  const router = useRouter();
  const initialPicks: Picks = JSON.parse(data.bracket.picks);
  const { picks, dirty, saving, error, makePick, bulkSetPicks, save } = useBracketPicks({
    initialPicks,
    bracketId: data.bracket.id,
    locked: data.locked,
  });

  function handleAutofill(mode: AutofillMode) {
    const filled = generateAutofill(mode, data.regions, picks);
    bulkSetPicks(filled);
  }

  return (
    <main className="min-h-screen p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push("/dashboard")} className="text-blue-600 hover:underline text-sm">
            ← Dashboard
          </button>
          <h1 className="text-lg font-bold">🏀 {data.bracket.name}</h1>
          {data.locked && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Locked</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          {error && <span className="text-red-600 text-xs">{error}</span>}
          {dirty && !data.locked && (
            <span className="text-yellow-600 text-xs">Unsaved changes</span>
          )}
          {!data.locked && (
            <>
              <AutofillDropdown onSelect={handleAutofill} disabled={saving} />
              <button
                onClick={save}
                disabled={saving || !dirty}
                className="px-4 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? "Saving..." : "Save Picks"}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Bracket */}
      <div className="overflow-x-auto">
        <div className="min-w-[1200px] max-w-screen-2xl mx-auto">
          {/* Top two regions + Final Four */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
            <RegionBracket
              region={REGIONS[0]}
              regions={data.regions}
              picks={picks}
              results={data.results}
              onPick={makePick}
              locked={data.locked}
              side="left"
            />
            <FinalFour
              regions={data.regions}
              picks={picks}
              results={data.results}
              onPick={makePick}
              locked={data.locked}
            />
            <RegionBracket
              region={REGIONS[1]}
              regions={data.regions}
              picks={picks}
              results={data.results}
              onPick={makePick}
              locked={data.locked}
              side="right"
            />
          </div>

          {/* Bottom two regions */}
          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start mt-8">
            <RegionBracket
              region={REGIONS[2]}
              regions={data.regions}
              picks={picks}
              results={data.results}
              onPick={makePick}
              locked={data.locked}
              side="left"
            />
            <div className="w-40" /> {/* spacer to match Final Four width */}
            <RegionBracket
              region={REGIONS[3]}
              regions={data.regions}
              picks={picks}
              results={data.results}
              onPick={makePick}
              locked={data.locked}
              side="right"
            />
          </div>
        </div>
      </div>
    </main>
  );
}
