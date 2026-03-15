"use client";

import GameCard from "@/components/bracket/GameCard";
import { gameId, getTeamsForGame, gamesInRound } from "@/lib/bracket-utils";
import { REGION_COLORS, type RegionName } from "@/lib/bracket-constants";
import type { RegionData } from "@/types/tournament";
import type { Picks, Results, PickDistribution } from "@/types/bracket";

interface RegionBracketProps {
  region: string;
  regions: RegionData[];
  picks: Picks;
  results: Results;
  onPick: (gameId: string, team: string) => void;
  locked: boolean;
  side: "left" | "right";
  distribution?: PickDistribution;
  seedLookup?: Record<string, number>;
  userPicks?: Picks;
  focusedGameId?: string | null;
  onFocusGame?: (gameId: string) => void;
}

const ROUND_LABELS = ["R64", "R32", "Sweet 16", "Elite 8"];
const REGION_MIN_HEIGHT = 520;

export default function RegionBracket({
  region,
  regions,
  picks,
  results,
  onPick,
  locked,
  side,
  distribution,
  seedLookup,
  userPicks,
  focusedGameId,
  onFocusGame,
}: RegionBracketProps) {
  const rounds = [0, 1, 2, 3];
  const orderedRounds = side === "left" ? rounds : [...rounds].reverse();
  const regionColor = REGION_COLORS[region as RegionName] ?? "#6b7280";

  const renderRound = (round: number) => {
    const count = gamesInRound(round);
    return (
      <div
        key={`round-${round}`}
        className="flex flex-col justify-around shrink-0"
        style={{ minWidth: 160 }}
      >
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
                distribution={distribution?.[gId]}
                seedLookup={seedLookup}
                userPicks={userPicks}
                focused={focusedGameId === gId}
                onFocus={onFocusGame}
              />
            </div>
          );
        })}
      </div>
    );
  };

  const renderConnectors = (fromRound: number) => {
    const fromCount = gamesInRound(fromRound);
    const toCount = fromCount / 2;
    return (
      <div
        key={`conn-${fromRound}`}
        className="flex flex-col justify-around shrink-0"
        style={{ width: 16 }}
      >
        {Array.from({ length: toCount }, (_, i) => (
          <div key={i} className="flex flex-col justify-center relative" style={{ flex: 1 }}>
            {/* Top half: line from top feeder game to midpoint */}
            <div
              style={{
                flex: 1,
                borderRight: `2px solid ${regionColor}`,
                ...(side === "left"
                  ? { borderBottom: `2px solid ${regionColor}` }
                  : { borderTop: `2px solid ${regionColor}` }),
              }}
            />
            {/* Bottom half: line from bottom feeder game to midpoint */}
            <div
              style={{
                flex: 1,
                borderRight: `2px solid ${regionColor}`,
                ...(side === "left"
                  ? { borderTop: `2px solid ${regionColor}` }
                  : { borderBottom: `2px solid ${regionColor}` }),
              }}
            />
          </div>
        ))}
      </div>
    );
  };

  // Build interleaved rounds and connectors
  const elements: React.ReactNode[] = [];
  for (let i = 0; i < orderedRounds.length; i++) {
    elements.push(renderRound(orderedRounds[i]));
    if (i < orderedRounds.length - 1) {
      const fromRound = side === "left" ? orderedRounds[i] : orderedRounds[i + 1];
      elements.push(renderConnectors(fromRound));
    }
  }

  return (
    <div className="flex flex-col">
      <h3 className="text-sm font-bold mb-2 text-center" style={{ color: regionColor }}>
        {region}
      </h3>
      <div
        className="flex flex-row items-stretch"
        style={{ minHeight: REGION_MIN_HEIGHT }}
      >
        {elements}
      </div>
    </div>
  );
}
