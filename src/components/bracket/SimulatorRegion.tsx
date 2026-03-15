"use client";

import SimulatorGameCard from "@/components/bracket/SimulatorGameCard";
import { gameId, getTeamsForGame, gamesInRound } from "@/lib/bracket-utils";
import type { RegionData } from "@/types/tournament";
import type { Results } from "@/types/bracket";

interface Props {
  region: string;
  regions: RegionData[];
  results: Results;
  actualResults: Results;
  onSetResult: (gameId: string, team: string) => void;
  side: "left" | "right";
}

const ROUND_LABELS = ["R64", "R32", "Sweet 16", "Elite 8"];

export default function SimulatorRegion({ region, regions, results, actualResults, onSetResult, side }: Props) {
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
                // Use results as "picks" for team propagation
                const [top, bottom] = getTeamsForGame(gId, regions, results);
                return (
                  <div key={gId} className="flex items-center justify-center" style={{ flex: 1 }}>
                    <SimulatorGameCard
                      gameId={gId}
                      topTeam={top}
                      bottomTeam={bottom}
                      result={results[gId] ?? null}
                      isActual={!!actualResults[gId]}
                      region={region}
                      onSetResult={onSetResult}
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
