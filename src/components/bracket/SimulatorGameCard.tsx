"use client";

import { REGION_COLORS, type RegionName } from "@/lib/bracket-constants";

interface Props {
  gameId: string;
  topTeam: string | null;
  bottomTeam: string | null;
  result: string | null;
  isActual: boolean;
  region: string;
  onSetResult: (gameId: string, team: string) => void;
}

function teamClass(team: string | null, result: string | null, isActual: boolean): string {
  const base = "px-2 py-1 text-xs truncate transition-colors";
  if (!team) return base + " text-gray-300 cursor-default";
  if (!result) return base + " cursor-pointer hover:bg-yellow-50";
  if (result === team) {
    return isActual
      ? base + " font-bold bg-green-100 text-green-800 cursor-default"
      : base + " font-bold bg-yellow-100 text-yellow-800 cursor-pointer hover:bg-yellow-200";
  }
  return base + " text-gray-400 cursor-pointer hover:bg-yellow-50";
}

export default function SimulatorGameCard({ gameId, topTeam, bottomTeam, result, isActual, region, onSetResult }: Props) {
  const color = REGION_COLORS[region as RegionName] ?? "#6b7280";

  function handleClick(team: string | null) {
    if (!team || isActual) return;
    onSetResult(gameId, team);
  }

  return (
    <div className="border rounded bg-white shadow-sm w-40 overflow-hidden" style={{ borderLeftColor: color, borderLeftWidth: 3 }}>
      <div
        className={teamClass(topTeam, result, isActual)}
        onClick={() => handleClick(topTeam)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick(topTeam)}
      >
        {topTeam ?? "TBD"}
      </div>
      <div className="border-t border-gray-200" />
      <div
        className={teamClass(bottomTeam, result, isActual)}
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
