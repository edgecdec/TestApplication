"use client";

import ComparisonGameCard from "@/components/bracket/ComparisonGameCard";
import { gameId, getTeamsForGame } from "@/lib/bracket-utils";
import type { RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { ComparisonBracket } from "@/types/comparison";

interface ComparisonFinalFourProps {
  regions: RegionData[];
  displayPicks: Picks;
  results: Results;
  brackets: ComparisonBracket[];
}

export default function ComparisonFinalFour({ regions, displayPicks, results, brackets }: ComparisonFinalFourProps) {
  const ff0 = gameId("ff", 4, 0);
  const ff1 = gameId("ff", 4, 1);
  const champ = gameId("ff", 5, 0);

  const [ff0Top, ff0Bottom] = getTeamsForGame(ff0, regions, displayPicks);
  const [ff1Top, ff1Bottom] = getTeamsForGame(ff1, regions, displayPicks);
  const [champTop, champBottom] = getTeamsForGame(champ, regions, displayPicks);

  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-sm font-bold text-center">Final Four</div>
      <div className="flex gap-8 items-end">
        <ComparisonGameCard gameId={ff0} topTeam={ff0Top} bottomTeam={ff0Bottom} results={results} brackets={brackets} />
        <div className="flex flex-col items-center gap-2">
          <div className="text-xs font-bold text-yellow-600">🏆 Championship</div>
          <ComparisonGameCard gameId={champ} topTeam={champTop} bottomTeam={champBottom} results={results} brackets={brackets} />
        </div>
        <ComparisonGameCard gameId={ff1} topTeam={ff1Top} bottomTeam={ff1Bottom} results={results} brackets={brackets} />
      </div>
    </div>
  );
}
