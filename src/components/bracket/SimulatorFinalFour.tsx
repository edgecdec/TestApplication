"use client";

import SimulatorGameCard from "@/components/bracket/SimulatorGameCard";
import { gameId, getTeamsForGame } from "@/lib/bracket-utils";
import type { RegionData } from "@/types/tournament";
import type { Results } from "@/types/bracket";

interface Props {
  regions: RegionData[];
  results: Results;
  actualResults: Results;
  onSetResult: (gameId: string, team: string) => void;
}

export default function SimulatorFinalFour({ regions, results, actualResults, onSetResult }: Props) {
  const ff0 = gameId("ff", 4, 0);
  const ff1 = gameId("ff", 4, 1);
  const champ = gameId("ff", 5, 0);

  const [ff0Top, ff0Bottom] = getTeamsForGame(ff0, regions, results);
  const [ff1Top, ff1Bottom] = getTeamsForGame(ff1, regions, results);
  const [champTop, champBottom] = getTeamsForGame(champ, regions, results);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm font-bold text-center">Final Four</div>
      <div className="flex gap-8 items-end">
        <SimulatorGameCard
          gameId={ff0}
          topTeam={ff0Top}
          bottomTeam={ff0Bottom}
          result={results[ff0] ?? null}
          isActual={!!actualResults[ff0]}
          region="ff"
          onSetResult={onSetResult}
        />
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-bold text-yellow-600">🏆 Championship</div>
          <SimulatorGameCard
            gameId={champ}
            topTeam={champTop}
            bottomTeam={champBottom}
            result={results[champ] ?? null}
            isActual={!!actualResults[champ]}
            region="ff"
            onSetResult={onSetResult}
          />
          {results[champ] && (
            <div className="text-center mt-1 px-3 py-1 bg-yellow-100 rounded text-sm font-bold text-yellow-800 border border-yellow-300">
              🏆 {results[champ]}
            </div>
          )}
        </div>
        <SimulatorGameCard
          gameId={ff1}
          topTeam={ff1Top}
          bottomTeam={ff1Bottom}
          result={results[ff1] ?? null}
          isActual={!!actualResults[ff1]}
          region="ff"
          onSetResult={onSetResult}
        />
      </div>
    </div>
  );
}
