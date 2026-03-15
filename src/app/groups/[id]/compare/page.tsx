"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { REGIONS } from "@/lib/bracket-constants";
import { COMPARISON_COLORS, MAX_COMPARISON_BRACKETS } from "@/lib/comparison-constants";
import ComparisonRegion from "@/components/bracket/ComparisonRegion";
import ComparisonFinalFour from "@/components/bracket/ComparisonFinalFour";
import type { SimulatorData, SimulatorBracketData } from "@/types/simulator";
import type { ComparisonBracket } from "@/types/comparison";
import type { Picks } from "@/types/bracket";

export default function ComparePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<SimulatorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());

  useEffect(() => {
    async function load() {
      const res = await fetch(`/api/groups/${id}/simulator`);
      if (!res.ok) {
        setError((await res.json()).error ?? "Failed to load");
      } else {
        const d: SimulatorData = await res.json();
        setData(d);
        // Select first few brackets by default
        const initial = d.brackets.slice(0, MAX_COMPARISON_BRACKETS).map((b) => b.bracketId);
        setSelectedIds(new Set(initial));
      }
      setLoading(false);
    }
    load();
  }, [id]);

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading...</p></main>;
  if (error || !data) return (
    <main className="flex min-h-screen items-center justify-center flex-col gap-4">
      <p className="text-red-600">{error}</p>
      <button onClick={() => router.back()} className="text-blue-600 underline">Go Back</button>
    </main>
  );

  return <CompareView data={data} selectedIds={selectedIds} setSelectedIds={setSelectedIds} groupId={id} />;
}

function buildDisplayPicks(selected: ComparisonBracket[], results: Picks): Picks {
  // Use actual results first, then majority pick among selected brackets
  const display: Picks = { ...results };
  if (selected.length === 0) return display;

  // Collect all game IDs across all selected brackets
  const allGameIds: Record<string, boolean> = {};
  for (const b of selected) {
    for (const gId of Object.keys(b.picks)) {
      allGameIds[gId] = true;
    }
  }

  for (const gId of Object.keys(allGameIds)) {
    if (display[gId]) continue; // result already known
    // Find most common pick
    const counts: Record<string, number> = {};
    for (const b of selected) {
      const pick = b.picks[gId];
      if (pick) counts[pick] = (counts[pick] || 0) + 1;
    }
    const entries = Object.entries(counts);
    if (entries.length > 0) {
      entries.sort((a, b) => b[1] - a[1]);
      display[gId] = entries[0][0];
    }
  }
  return display;
}

interface CompareViewProps {
  data: SimulatorData;
  selectedIds: Set<number>;
  setSelectedIds: (ids: Set<number>) => void;
  groupId: string;
}

function CompareView({ data, selectedIds, setSelectedIds, groupId }: CompareViewProps) {
  const router = useRouter();

  const selected: ComparisonBracket[] = data.brackets
    .filter((b) => selectedIds.has(b.bracketId))
    .slice(0, MAX_COMPARISON_BRACKETS)
    .map((b, i) => ({
      bracketId: b.bracketId,
      bracketName: b.bracketName,
      username: b.username,
      picks: b.picks,
      color: COMPARISON_COLORS[i % COMPARISON_COLORS.length],
    }));

  const displayPicks = buildDisplayPicks(selected, data.results);

  function toggleBracket(bracketId: number) {
    const next = new Set(selectedIds);
    if (next.has(bracketId)) {
      next.delete(bracketId);
    } else if (next.size < MAX_COMPARISON_BRACKETS) {
      next.add(bracketId);
    }
    setSelectedIds(next);
  }

  return (
    <main className="min-h-screen p-4">
      <div className="flex items-center justify-between mb-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push(`/groups/${groupId}`)} className="text-blue-600 hover:underline text-sm">← Back to Group</button>
          <h1 className="text-lg font-bold">📊 Bracket Comparison — {data.groupName}</h1>
        </div>
      </div>

      {/* Bracket selector + legend */}
      <div className="max-w-screen-2xl mx-auto mb-4 bg-white rounded-lg shadow p-3">
        <div className="text-xs font-medium text-gray-500 mb-2">
          Select brackets to compare (max {MAX_COMPARISON_BRACKETS}):
        </div>
        <div className="flex flex-wrap gap-2">
          {data.brackets.map((b) => {
            const isSelected = selectedIds.has(b.bracketId);
            const idx = selected.findIndex((s) => s.bracketId === b.bracketId);
            const color = idx >= 0 ? selected[idx].color : "#9ca3af";
            return (
              <button
                key={b.bracketId}
                onClick={() => toggleBracket(b.bracketId)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs border transition ${
                  isSelected ? "border-current font-medium" : "border-gray-300 text-gray-400 hover:text-gray-600"
                }`}
                style={isSelected ? { color, borderColor: color } : undefined}
              >
                <span
                  className="inline-block w-3 h-3 rounded-full"
                  style={{ backgroundColor: isSelected ? color : "#d1d5db" }}
                />
                {b.username} — {b.bracketName}
              </button>
            );
          })}
        </div>
      </div>

      {selected.length === 0 ? (
        <div className="text-center text-gray-500 py-12">Select at least one bracket to compare.</div>
      ) : (
        <div className="overflow-x-auto bg-white p-4">
          <div className="min-w-[1200px] max-w-screen-2xl mx-auto">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
              <ComparisonRegion region={REGIONS[0]} regions={data.regions} displayPicks={displayPicks} results={data.results} brackets={selected} side="left" />
              <ComparisonFinalFour regions={data.regions} displayPicks={displayPicks} results={data.results} brackets={selected} />
              <ComparisonRegion region={REGIONS[1]} regions={data.regions} displayPicks={displayPicks} results={data.results} brackets={selected} side="right" />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start mt-8">
              <ComparisonRegion region={REGIONS[2]} regions={data.regions} displayPicks={displayPicks} results={data.results} brackets={selected} side="left" />
              <div className="w-44" />
              <ComparisonRegion region={REGIONS[3]} regions={data.regions} displayPicks={displayPicks} results={data.results} brackets={selected} side="right" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
