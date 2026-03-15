"use client";

import { REGION_COLORS, type RegionName } from "@/lib/bracket-constants";
import type { Results } from "@/types/bracket";

interface GameCardProps {
  gameId: string;
  topTeam: string | null;
  bottomTeam: string | null;
  pick: string | null;
  result: string | null;
  region: string;
  onPick: (gameId: string, team: string) => void;
  locked: boolean;
}

function teamClass(team: string | null, pick: string | null, result: string | null): string {
  const base = "px-2 py-1 text-xs truncate cursor-pointer hover:bg-gray-100 transition-colors";
  if (!team) return base + " text-gray-300 cursor-default";
  if (!pick) return base;
  if (pick !== team) return base;
  // This team is the pick
  if (!result) return base + " font-bold bg-blue-50";
  if (result === team) return base + " font-bold bg-green-100 text-green-800";
  return base + " font-bold bg-red-100 text-red-800 line-through";
}

export default function GameCard({
  gameId,
  topTeam,
  bottomTeam,
  pick,
  result,
  region,
  onPick,
  locked,
}: GameCardProps) {
  const color = REGION_COLORS[region as RegionName] ?? "#6b7280";

  function handleClick(team: string | null) {
    if (!team || locked) return;
    onPick(gameId, team);
  }

  return (
    <div
      className="border rounded bg-white shadow-sm w-40 overflow-hidden"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
    >
      <div
        className={teamClass(topTeam, pick, result)}
        onClick={() => handleClick(topTeam)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick(topTeam)}
      >
        {topTeam ?? "TBD"}
      </div>
      <div className="border-t border-gray-200" />
      <div
        className={teamClass(bottomTeam, pick, result)}
        onClick={() => handleClick(bottomTeam)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick(bottomTeam)}
      >
        {bottomTeam ?? "TBD"}
      </div>
    </div>
  );
}
