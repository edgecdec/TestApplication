"use client";

import { useState } from "react";
import GameCard from "@/components/bracket/GameCard";
import TeamLogo from "@/components/TeamLogo";
import { REGIONS, REGION_COLORS, type RegionName } from "@/lib/bracket-constants";
import { gameId, getTeamsForGame, gamesInRound } from "@/lib/bracket-utils";
import type { RegionData } from "@/types/tournament";
import type { Picks, Results, PickDistribution } from "@/types/bracket";

const REGION_ROUND_LABELS = ["R64", "R32", "Sweet 16", "Elite 8"];
const FF_TABS = ["Final Four", "Championship"];

interface MobileBracketProps {
  regions: RegionData[];
  picks: Picks;
  results: Results;
  onPick: (gameId: string, team: string) => void;
  locked: boolean;
  distribution?: PickDistribution;
}

type TabId = typeof REGIONS[number] | "FinalFour";
const TABS: { id: TabId; label: string }[] = [
  ...REGIONS.map((r) => ({ id: r as TabId, label: r })),
  { id: "FinalFour" as TabId, label: "Final Four" },
];

export default function MobileBracket({ regions, picks, results, onPick, locked, distribution }: MobileBracketProps) {
  const [activeTab, setActiveTab] = useState<TabId>(REGIONS[0]);

  return (
    <div>
      {/* Tab bar */}
      <div className="flex overflow-x-auto border-b mb-3 gap-0 -mx-1">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          const color = tab.id !== "FinalFour" ? REGION_COLORS[tab.id as RegionName] : "#eab308";
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-3 py-2 text-xs font-semibold whitespace-nowrap border-b-2 transition-colors ${
                isActive ? "text-gray-900 dark:text-white" : "text-gray-400 border-transparent"
              }`}
              style={isActive ? { borderBottomColor: color } : undefined}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab !== "FinalFour" ? (
        <RegionMobileView
          region={activeTab}
          regions={regions}
          picks={picks}
          results={results}
          onPick={onPick}
          locked={locked}
          distribution={distribution}
        />
      ) : (
        <FinalFourMobileView
          regions={regions}
          picks={picks}
          results={results}
          onPick={onPick}
          locked={locked}
          distribution={distribution}
        />
      )}
    </div>
  );
}

function RegionMobileView({
  region, regions, picks, results, onPick, locked, distribution,
}: {
  region: string; regions: RegionData[]; picks: Picks; results: Results;
  onPick: (g: string, t: string) => void; locked: boolean; distribution?: PickDistribution;
}) {
  return (
    <div className="space-y-4">
      {[0, 1, 2, 3].map((round) => (
        <div key={round}>
          <div className="text-xs font-bold text-gray-500 mb-2">{REGION_ROUND_LABELS[round]}</div>
          <div className="flex flex-col gap-2 items-center">
            {Array.from({ length: gamesInRound(round) }, (_, i) => {
              const gId = gameId(region, round, i);
              const [top, bottom] = getTeamsForGame(gId, regions, picks);
              return (
                <GameCard
                  key={gId}
                  gameId={gId}
                  topTeam={top}
                  bottomTeam={bottom}
                  pick={picks[gId] ?? null}
                  result={results[gId] ?? null}
                  region={region}
                  onPick={onPick}
                  locked={locked}
                  distribution={distribution?.[gId]}
                />
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

function FinalFourMobileView({
  regions, picks, results, onPick, locked, distribution,
}: {
  regions: RegionData[]; picks: Picks; results: Results;
  onPick: (g: string, t: string) => void; locked: boolean; distribution?: PickDistribution;
}) {
  const ff0 = gameId("ff", 4, 0);
  const ff1 = gameId("ff", 4, 1);
  const champ = gameId("ff", 5, 0);

  const games = [
    { label: "Semifinal 1", gId: ff0 },
    { label: "Semifinal 2", gId: ff1 },
    { label: "🏆 Championship", gId: champ },
  ];

  return (
    <div className="space-y-4">
      {games.map(({ label, gId }) => {
        const [top, bottom] = getTeamsForGame(gId, regions, picks);
        return (
          <div key={gId}>
            <div className="text-xs font-bold text-gray-500 mb-2">{label}</div>
            <div className="flex justify-center">
              <GameCard
                gameId={gId}
                topTeam={top}
                bottomTeam={bottom}
                pick={picks[gId] ?? null}
                result={results[gId] ?? null}
                region="ff"
                onPick={onPick}
                locked={locked}
                distribution={distribution?.[gId]}
              />
            </div>
          </div>
        );
      })}
      {picks[champ] && (
        <div className="text-center mt-2 px-3 py-2 bg-yellow-100 rounded text-sm font-bold text-yellow-800 border border-yellow-300 flex items-center gap-1 justify-center">
          🏆 <TeamLogo team={picks[champ]} size={20} /> {picks[champ]}
        </div>
      )}
    </div>
  );
}
