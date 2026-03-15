"use client";

import type { Picks } from "@/types/bracket";
import type { RegionData } from "@/types/tournament";
import { getEliminatedTeams } from "@/lib/bracket-utils";

interface Props {
  picks: Picks;
  results: Picks;
  regions: RegionData[];
}

interface HealthCounts {
  correct: number;
  wrong: number;
  alive: number;
  busted: number;
}

function computeHealth(picks: Picks, results: Picks, regions: RegionData[]): HealthCounts {
  const eliminated = getEliminatedTeams(results, regions);
  let correct = 0, wrong = 0, alive = 0, busted = 0;

  for (const [gId, pickedTeam] of Object.entries(picks)) {
    const result = results[gId];
    if (result) {
      if (pickedTeam === result) correct++;
      else wrong++;
    } else {
      if (eliminated.has(pickedTeam)) busted++;
      else alive++;
    }
  }

  return { correct, wrong, alive, busted };
}

export default function BracketHealth({ picks, results, regions }: Props) {
  if (!results || Object.keys(results).length === 0) return null;

  const h = computeHealth(picks, results, regions);
  const total = h.correct + h.wrong + h.alive + h.busted;
  if (total === 0) return null;

  return (
    <div className="flex gap-3 text-xs mt-1">
      <span className="text-green-600" title="Correct picks">✅ {h.correct}</span>
      <span className="text-red-500" title="Wrong picks">❌ {h.wrong}</span>
      <span className="text-blue-500" title="Alive — pending picks with team still in">🟢 {h.alive}</span>
      {h.busted > 0 && (
        <span className="text-gray-400" title="Busted — pending picks with eliminated team">💀 {h.busted}</span>
      )}
    </div>
  );
}
