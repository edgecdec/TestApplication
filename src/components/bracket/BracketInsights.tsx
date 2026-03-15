"use client";

import { useState, useMemo } from "react";
import { REGIONS, ROUND_NAMES, CHAMPIONSHIP_GAME_ID } from "@/lib/bracket-constants";
import { gameId, getTeamsForGame, gamesInRound, buildR64Matchups } from "@/lib/bracket-utils";
import { buildTeamSeedMap } from "@/lib/scoring";
import type { RegionData } from "@/types/tournament";
import type { Picks, PickDistribution } from "@/types/bracket";

interface Props {
  picks: Picks;
  regions: RegionData[];
  distribution: PickDistribution;
}

interface Insight {
  label: string;
  value: string;
  emoji: string;
}

function computeInsights(picks: Picks, regions: RegionData[], distribution: PickDistribution): Insight[] {
  const seedMap = buildTeamSeedMap(regions);
  const insights: Insight[] = [];

  // Count chalk vs upset picks across all rounds
  let chalkCount = 0;
  let upsetCount = 0;
  let totalPicks = 0;
  const upsetsByRound: number[] = new Array(6).fill(0);

  for (let round = 0; round <= 5; round++) {
    if (round <= 3) {
      const count = gamesInRound(round);
      for (const region of REGIONS) {
        for (let i = 0; i < count; i++) {
          const gId = gameId(region, round, i);
          const winner = picks[gId];
          if (!winner) continue;
          totalPicks++;
          const [teamA, teamB] = getTeamsForGame(gId, regions, picks);
          const seedA = teamA ? seedMap.get(teamA) : undefined;
          const seedB = teamB ? seedMap.get(teamB) : undefined;
          if (seedA != null && seedB != null) {
            if (seedMap.get(winner)! <= Math.min(seedA, seedB)) {
              chalkCount++;
            } else {
              upsetCount++;
              upsetsByRound[round]++;
            }
          }
        }
      }
    } else {
      const count = round === 4 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const gId = gameId("ff", round, i);
        const winner = picks[gId];
        if (!winner) continue;
        totalPicks++;
        const [teamA, teamB] = getTeamsForGame(gId, regions, picks);
        const seedA = teamA ? seedMap.get(teamA) : undefined;
        const seedB = teamB ? seedMap.get(teamB) : undefined;
        if (seedA != null && seedB != null) {
          if (seedMap.get(winner)! <= Math.min(seedA, seedB)) {
            chalkCount++;
          } else {
            upsetCount++;
            upsetsByRound[round]++;
          }
        }
      }
    }
  }

  if (totalPicks > 0) {
    const chalkPct = Math.round((chalkCount / totalPicks) * 100);
    insights.push({ emoji: "📏", label: "Chalk Rate", value: `${chalkPct}% (${chalkCount}/${totalPicks} favorites)` });
    insights.push({ emoji: "🔮", label: "Upsets Picked", value: `${upsetCount} total` });

    // Upsets by round (only show rounds with upsets)
    const upsetRoundParts = upsetsByRound
      .map((count, i) => count > 0 ? `${ROUND_NAMES[i]}: ${count}` : null)
      .filter(Boolean);
    if (upsetRoundParts.length > 0) {
      insights.push({ emoji: "📊", label: "Upsets by Round", value: upsetRoundParts.join(", ") });
    }
  }

  // Most contrarian pick (lowest distribution %)
  // Most popular pick (highest distribution %)
  if (Object.keys(distribution).length > 0) {
    let mostContrarian: { gameId: string; team: string; pct: number } | null = null;
    let mostPopular: { gameId: string; team: string; pct: number } | null = null;

    for (const [gId, winner] of Object.entries(picks)) {
      const gameDist = distribution[gId];
      if (!gameDist || !winner) continue;
      const pct = gameDist[winner] ?? 0;
      if (!mostContrarian || pct < mostContrarian.pct) {
        mostContrarian = { gameId: gId, team: winner, pct };
      }
      if (!mostPopular || pct > mostPopular.pct) {
        mostPopular = { gameId: gId, team: winner, pct };
      }
    }

    if (mostContrarian) {
      const seed = seedMap.get(mostContrarian.team);
      const seedStr = seed != null ? ` (${seed})` : "";
      insights.push({ emoji: "🦄", label: "Most Contrarian Pick", value: `${mostContrarian.team}${seedStr} — only ${mostContrarian.pct}% agree` });
    }
    if (mostPopular) {
      const seed = seedMap.get(mostPopular.team);
      const seedStr = seed != null ? ` (${seed})` : "";
      insights.push({ emoji: "🤝", label: "Most Popular Pick", value: `${mostPopular.team}${seedStr} — ${mostPopular.pct}% agree` });
    }
  }

  // Champion pick popularity
  const champ = picks[CHAMPIONSHIP_GAME_ID];
  if (champ && distribution[CHAMPIONSHIP_GAME_ID]) {
    const champPct = distribution[CHAMPIONSHIP_GAME_ID][champ] ?? 0;
    const seed = seedMap.get(champ);
    const seedStr = seed != null ? ` (${seed})` : "";
    insights.push({ emoji: "🏆", label: "Champion Pick", value: `${champ}${seedStr} — picked by ${champPct}% of brackets` });
  }

  return insights;
}

export default function BracketInsights({ picks, regions, distribution }: Props) {
  const [open, setOpen] = useState(false);
  const insights = useMemo(() => computeInsights(picks, regions, distribution), [picks, regions, distribution]);

  if (insights.length === 0) return null;

  return (
    <div className="no-print mb-4 max-w-screen-2xl mx-auto">
      <button
        onClick={() => setOpen(!open)}
        className="text-sm font-medium text-blue-600 hover:text-blue-800 dark:text-blue-400 transition"
      >
        {open ? "▼" : "▶"} 📊 Bracket Insights
      </button>
      {open && (
        <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((ins) => (
            <div key={ins.label} className="bg-gray-50 dark:bg-gray-700 rounded p-2 text-sm">
              <span className="mr-1">{ins.emoji}</span>
              <span className="font-medium text-gray-700 dark:text-gray-300">{ins.label}:</span>{" "}
              <span className="text-gray-600 dark:text-gray-400">{ins.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
