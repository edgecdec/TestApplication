"use client";

import type { RegionData } from "@/types/tournament";
import type { Picks } from "@/types/bracket";
import { REGIONS, ROUND_NAMES, ROUND_GAME_COUNTS } from "@/lib/bracket-constants";
import { gameId, getTeamsForGameFromResults } from "@/lib/bracket-utils";
import TeamLogo from "@/components/TeamLogo";

interface ActiveGame {
  gameId: string;
  round: number;
  teamA: string | null;
  teamB: string | null;
}

interface BracketPick {
  name: string;
  picks: Picks;
}

interface Props {
  regions: RegionData[];
  results: Picks;
  brackets: BracketPick[];
}

function findSeed(regions: RegionData[], name: string): number | undefined {
  for (const r of regions) {
    const t = r.seeds.find((s) => s.name === name);
    if (t) return t.seed;
  }
}

function getActiveGames(regions: RegionData[], results: Picks): ActiveGame[] {
  // Find current round (first round not fully complete)
  let currentRound = -1;
  for (let round = 0; round < ROUND_NAMES.length; round++) {
    let completed = 0;
    const total = ROUND_GAME_COUNTS[round];
    // Count resolved games in this round
    if (round <= 3) {
      for (const region of REGIONS) {
        const gamesInRound = total / REGIONS.length;
        for (let i = 0; i < gamesInRound; i++) {
          if (results[gameId(region, round, i)]) completed++;
        }
      }
    } else {
      const count = round === 4 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        if (results[gameId("ff", round, i)]) completed++;
      }
    }
    if (completed < total) {
      currentRound = round;
      break;
    }
  }

  if (currentRound < 0) return [];

  const active: ActiveGame[] = [];
  if (currentRound <= 3) {
    const gamesPerRegion = ROUND_GAME_COUNTS[currentRound] / REGIONS.length;
    for (const region of REGIONS) {
      for (let i = 0; i < gamesPerRegion; i++) {
        const gId = gameId(region, currentRound, i);
        if (!results[gId]) {
          const [teamA, teamB] = getTeamsForGameFromResults(gId, results, regions);
          if (teamA && teamB) {
            active.push({ gameId: gId, round: currentRound, teamA, teamB });
          }
        }
      }
    }
  } else {
    const count = currentRound === 4 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      const gId = gameId("ff", currentRound, i);
      if (!results[gId]) {
        const [teamA, teamB] = getTeamsForGameFromResults(gId, results, regions);
        if (teamA && teamB) {
          active.push({ gameId: gId, round: currentRound, teamA, teamB });
        }
      }
    }
  }

  return active;
}

export default function MyPicksTonight({ regions, results, brackets }: Props) {
  const activeGames = getActiveGames(regions, results);

  if (activeGames.length === 0 || brackets.length === 0) return null;

  const roundName = ROUND_NAMES[activeGames[0].round];

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
        🎯 My Picks — {roundName} ({activeGames.length} game{activeGames.length !== 1 ? "s" : ""} remaining)
      </h2>
      <div className="space-y-3">
        {activeGames.map((game) => {
          const seedA = findSeed(regions, game.teamA!);
          const seedB = findSeed(regions, game.teamB!);
          return (
            <div key={game.gameId} className="border dark:border-gray-700 rounded p-2">
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-3 text-sm">
                  <span className="flex items-center gap-1">
                    <TeamLogo team={game.teamA!} size={16} />
                    <span className="text-xs text-gray-400">{seedA}</span>
                    <span className="font-medium dark:text-gray-200">{game.teamA}</span>
                  </span>
                  <span className="text-gray-400 text-xs">vs</span>
                  <span className="flex items-center gap-1">
                    <TeamLogo team={game.teamB!} size={16} />
                    <span className="text-xs text-gray-400">{seedB}</span>
                    <span className="font-medium dark:text-gray-200">{game.teamB}</span>
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1">
                {brackets.map((b) => {
                  const pick = b.picks[game.gameId];
                  const pickedA = pick === game.teamA;
                  const pickedB = pick === game.teamB;
                  return (
                    <span
                      key={b.name}
                      className={`text-xs px-2 py-0.5 rounded ${
                        pickedA
                          ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300"
                          : pickedB
                          ? "bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300"
                          : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
                      }`}
                      title={`${b.name}: ${pick || "No pick"}`}
                    >
                      {b.name}: {pick || "—"}
                    </span>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
