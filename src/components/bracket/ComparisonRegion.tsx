"use client";

import ComparisonGameCard from "@/components/bracket/ComparisonGameCard";
import { gameId, getTeamsForGame, gamesInRound } from "@/lib/bracket-utils";
import type { RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { ComparisonBracket } from "@/types/comparison";

interface ComparisonRegionProps {
  region: string;
  regions: RegionData[];
  /** Merged picks used to determine which teams appear in each slot */
  displayPicks: Picks;
  results: Results;
  brackets: ComparisonBracket[];
  side: "left" | "right";
}

const ROUND_LABELS = ["R64", "R32", "Sweet 16", "Elite 8"];

export default function ComparisonRegion({ region, regions, displayPicks, results, brackets, side }: ComparisonRegionProps) {
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
                const [top, bottom] = getTeamsForGame(gId, regions, displayPicks);
                return (
                  <div key={gId} className="flex items-center justify-center" style={{ flex: 1 }}>
                    <ComparisonGameCard
                      gameId={gId}
                      topTeam={top}
                      bottomTeam={bottom}
                      results={results}
                      brackets={brackets}
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
