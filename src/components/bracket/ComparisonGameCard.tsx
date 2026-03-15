"use client";

import type { ComparisonBracket } from "@/types/comparison";
import type { Results } from "@/types/bracket";

interface ComparisonGameCardProps {
  gameId: string;
  topTeam: string | null;
  bottomTeam: string | null;
  results: Results;
  brackets: ComparisonBracket[];
}

function PickDots({ team, gameId, brackets }: { team: string | null; gameId: string; brackets: ComparisonBracket[] }) {
  if (!team) return null;
  const pickers = brackets.filter((b) => b.picks[gameId] === team);
  if (pickers.length === 0) return null;
  return (
    <span className="flex gap-0.5 ml-1 flex-shrink-0">
      {pickers.map((b) => (
        <span
          key={b.bracketId}
          className="inline-block w-2.5 h-2.5 rounded-full border border-white"
          style={{ backgroundColor: b.color }}
          title={`${b.username} — ${b.bracketName}`}
        />
      ))}
    </span>
  );
}

export default function ComparisonGameCard({ gameId, topTeam, bottomTeam, results, brackets }: ComparisonGameCardProps) {
  const result = results[gameId] ?? null;

  function teamClass(team: string | null): string {
    const base = "px-2 py-1 text-xs truncate flex items-center justify-between";
    if (!team) return base + " text-gray-300";
    if (result && result === team) return base + " bg-green-50";
    if (result && result !== team) return base + " text-gray-400";
    return base;
  }

  return (
    <div className="border rounded bg-white shadow-sm w-44 overflow-hidden">
      <div className={teamClass(topTeam)}>
        <span className="truncate">{topTeam ?? "TBD"}</span>
        <PickDots team={topTeam} gameId={gameId} brackets={brackets} />
      </div>
      <div className="border-t border-gray-200" />
      <div className={teamClass(bottomTeam)}>
        <span className="truncate">{bottomTeam ?? "TBD"}</span>
        <PickDots team={bottomTeam} gameId={gameId} brackets={brackets} />
      </div>
    </div>
  );
}
