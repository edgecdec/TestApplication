"use client";

import GameCard from "@/components/bracket/GameCard";
import { gameId, getTeamsForGame, gamesInRound } from "@/lib/bracket-utils";
import type { RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";

interface RegionBracketProps {
  region: string;
  regions: RegionData[];
  picks: Picks;
  results: Results;
  onPick: (gameId: string, team: string) => void;
  locked: boolean;
  /** "left" renders rounds L-to-R (0→3), "right" renders R-to-L (3→0) */
  side: "left" | "right";
}

const ROUND_LABELS = ["R64", "R32", "Sweet 16", "Elite 8"];

export default function RegionBracket({
  region,
  regions,
  picks,
  results,
  onPick,
  locked,
  side,
}: RegionBracketProps) {
  const rounds = [0, 1, 2, 3];
  const orderedRounds = side === "left" ? rounds : [...rounds].reverse();

  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-bold mb-2 text-center">{region}</h3>
      <div className="flex gap-2 items-center">
        {orderedRounds.map((round) => {
          const count = gamesInRound(round);
          return (
            <div key={round} className="flex flex-col justify-around gap-2 min-h-0" style={{ flex: 1 }}>
              <div className="text-[10px] text-gray-400 text-center mb-1">{ROUND_LABELS[round]}</div>
              {Array.from({ length: count }, (_, i) => {
                const gId = gameId(region, round, i);
                const [top, bottom] = getTeamsForGame(gId, regions, picks);
                return (
                  <div key={gId} className="flex items-center justify-center" style={{ flex: 1 }}>
                    <GameCard
                      gameId={gId}
                      topTeam={top}
                      bottomTeam={bottom}
                      pick={picks[gId] ?? null}
                      result={results[gId] ?? null}
                      region={region}
                      onPick={onPick}
                      locked={locked}
                    />
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>
    </div>
  );
}
