"use client";

import GameCard from "@/components/bracket/GameCard";
import TeamLogo from "@/components/TeamLogo";
import { gameId, getTeamsForGame } from "@/lib/bracket-utils";
import type { RegionData } from "@/types/tournament";
import type { Picks, Results, PickDistribution } from "@/types/bracket";

interface FinalFourProps {
  regions: RegionData[];
  picks: Picks;
  results: Results;
  onPick: (gameId: string, team: string) => void;
  locked: boolean;
  distribution?: PickDistribution;
  seedLookup?: Record<string, number>;
  userPicks?: Picks;
  focusedGameId?: string | null;
  onFocusGame?: (gameId: string) => void;
}

export default function FinalFour({ regions, picks, results, onPick, locked, distribution, seedLookup, userPicks, focusedGameId, onFocusGame }: FinalFourProps) {
  const ff0 = gameId("ff", 4, 0);
  const ff1 = gameId("ff", 4, 1);
  const champ = gameId("ff", 5, 0);

  const [ff0Top, ff0Bottom] = getTeamsForGame(ff0, regions, picks);
  const [ff1Top, ff1Bottom] = getTeamsForGame(ff1, regions, picks);
  const [champTop, champBottom] = getTeamsForGame(champ, regions, picks);

  return (
    <div className="flex flex-col items-center justify-center gap-2" style={{ minWidth: 160 }}>
      <div className="text-sm font-bold text-center text-blue-600">Final Four</div>
      <GameCard
        gameId={ff0}
        topTeam={ff0Top}
        bottomTeam={ff0Bottom}
        pick={picks[ff0] ?? null}
        result={results[ff0] ?? null}
        region="ff"
        onPick={onPick}
        locked={locked}
        distribution={distribution?.[ff0]}
        seedLookup={seedLookup}
        userPicks={userPicks}
        focused={focusedGameId === ff0}
        onFocus={onFocusGame}
      />
      <div className="flex flex-col items-center gap-1 my-1">
        <div className="text-xs font-bold text-yellow-600">🏆 Championship</div>
        <GameCard
          gameId={champ}
          topTeam={champTop}
          bottomTeam={champBottom}
          pick={picks[champ] ?? null}
          result={results[champ] ?? null}
          region="ff"
          onPick={onPick}
          locked={locked}
          distribution={distribution?.[champ]}
          seedLookup={seedLookup}
          userPicks={userPicks}
          focused={focusedGameId === champ}
          onFocus={onFocusGame}
        />
        {picks[champ] && (
          <div className="text-center mt-1 px-3 py-1 bg-yellow-100 rounded text-sm font-bold text-yellow-800 border border-yellow-300 flex items-center gap-1 justify-center">
            🏆 <TeamLogo team={picks[champ]} size={20} /> {picks[champ]}
          </div>
        )}
      </div>
      <GameCard
        gameId={ff1}
        topTeam={ff1Top}
        bottomTeam={ff1Bottom}
        pick={picks[ff1] ?? null}
        result={results[ff1] ?? null}
        region="ff"
        onPick={onPick}
        locked={locked}
        distribution={distribution?.[ff1]}
        seedLookup={seedLookup}
        userPicks={userPicks}
        focused={focusedGameId === ff1}
        onFocus={onFocusGame}
      />
    </div>
  );
}
