"use client";

import { useState } from "react";
import { REGION_COLORS, type RegionName } from "@/lib/bracket-constants";
import TeamLogo from "@/components/TeamLogo";
import { getSeedMatchupRate } from "@/lib/seed-matchup-history";

interface GameCardProps {
  gameId: string;
  topTeam: string | null;
  bottomTeam: string | null;
  pick: string | null;
  result: string | null;
  region: string;
  onPick: (gameId: string, team: string) => void;
  locked: boolean;
  distribution?: Record<string, number>;
  seedLookup?: Record<string, number>;
  userPicks?: Record<string, string>;
}

function teamClass(team: string | null, pick: string | null, result: string | null): string {
  const base = "px-2 py-1 text-xs truncate cursor-pointer hover:bg-gray-100 transition-colors";
  if (!team) return base + " text-gray-300 cursor-default";
  if (!pick) return base;
  if (pick !== team) return base;
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
  distribution,
  seedLookup,
  userPicks,
}: GameCardProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const color = REGION_COLORS[region as RegionName] ?? "#6b7280";

  function handleClick(team: string | null) {
    if (!team || locked) return;
    onPick(gameId, team);
  }

  const topPct = topTeam ? distribution?.[topTeam] : undefined;
  const bottomPct = bottomTeam ? distribution?.[bottomTeam] : undefined;

  // User picks overlay indicator
  const userPick = userPicks?.[gameId];
  const hasOverlay = userPicks !== undefined && result;
  const overlayCorrect = hasOverlay && userPick === result;
  const overlayWrong = hasOverlay && userPick && userPick !== result;
  const overlayMissed = hasOverlay && !userPick;

  // Compute seed matchup hint (only when unlocked and both teams present)
  let matchupHint: string | null = null;
  if (!locked && topTeam && bottomTeam && seedLookup) {
    const topSeed = seedLookup[topTeam];
    const bottomSeed = seedLookup[bottomTeam];
    if (topSeed && bottomSeed && topSeed !== bottomSeed) {
      const rate = getSeedMatchupRate(topSeed, bottomSeed);
      if (rate) {
        matchupHint = `#${rate.favoriteSeed} seeds beat #${rate.underdogSeed} seeds ${rate.favoriteRate}% of the time`;
      }
    }
  }

  return (
    <div
      className="border rounded bg-white shadow-sm w-40 overflow-hidden relative"
      style={{ borderLeftColor: color, borderLeftWidth: 3 }}
      onMouseEnter={() => matchupHint && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {showTooltip && matchupHint && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-gray-800 text-white text-[10px] rounded shadow-lg whitespace-nowrap z-50 pointer-events-none">
          📊 {matchupHint}
        </div>
      )}
      {hasOverlay && (
        <span className={`absolute -top-1.5 -right-1.5 text-[10px] leading-none rounded-full w-4 h-4 flex items-center justify-center z-10 shadow ${
          overlayCorrect ? "bg-green-500 text-white" : overlayWrong ? "bg-red-500 text-white" : "bg-gray-400 text-white"
        }`}>
          {overlayCorrect ? "✓" : overlayWrong ? "✗" : "–"}
        </span>
      )}
      <div
        className={teamClass(topTeam, pick, result)}
        onClick={() => handleClick(topTeam)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick(topTeam)}
      >
        <span className="flex items-center justify-between gap-1">
          <span className="flex items-center gap-1 truncate">
            {topTeam && <TeamLogo team={topTeam} />}
            <span className="truncate">{topTeam ?? "TBD"}</span>
          </span>
          {topPct !== undefined && (
            <span className="text-[9px] text-gray-400 font-normal shrink-0">{topPct}%</span>
          )}
        </span>
      </div>
      <div className="border-t border-gray-200" />
      <div
        className={teamClass(bottomTeam, pick, result)}
        onClick={() => handleClick(bottomTeam)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === "Enter" && handleClick(bottomTeam)}
      >
        <span className="flex items-center justify-between gap-1">
          <span className="flex items-center gap-1 truncate">
            {bottomTeam && <TeamLogo team={bottomTeam} />}
            <span className="truncate">{bottomTeam ?? "TBD"}</span>
          </span>
          {bottomPct !== undefined && (
            <span className="text-[9px] text-gray-400 font-normal shrink-0">{bottomPct}%</span>
          )}
        </span>
      </div>
    </div>
  );
}
