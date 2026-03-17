"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { REGIONS, ROUND_NAMES, REGION_COLORS, TOTAL_GAMES, type RegionName } from "@/lib/bracket-constants";
import { gameId, getTeamsForGame, buildR64Matchups } from "@/lib/bracket-utils";
import { getSeedMatchupRate } from "@/lib/seed-matchup-history";
import TeamLogo from "@/components/TeamLogo";
import type { RegionData } from "@/types/tournament";
import type { Picks } from "@/types/bracket";

interface BracketWizardProps {
  regions: RegionData[];
  picks: Picks;
  onPick: (gameId: string, team: string) => void;
  seedLookup: Record<string, number>;
  onClose: () => void;
}

interface WizardGame {
  id: string;
  region: string;
  round: number;
  roundName: string;
}

/** Build ordered list of all 63 games: R64 all regions, R32 all regions, ... FF, Championship */
function buildGameList(): WizardGame[] {
  const games: WizardGame[] = [];
  // Regional rounds 0-3
  for (let round = 0; round <= 3; round++) {
    const gamesPerRegion = 8 / Math.pow(2, round);
    for (const region of REGIONS) {
      for (let i = 0; i < gamesPerRegion; i++) {
        games.push({ id: gameId(region, round, i), region, round, roundName: ROUND_NAMES[round] });
      }
    }
  }
  // Final Four (round 4)
  for (let i = 0; i < 2; i++) {
    games.push({ id: gameId("ff", 4, i), region: "Final Four", round: 4, roundName: ROUND_NAMES[4] });
  }
  // Championship (round 5)
  games.push({ id: gameId("ff", 5, 0), region: "Championship", round: 5, roundName: ROUND_NAMES[5] });
  return games;
}

export default function BracketWizard({ regions, picks, onPick, seedLookup, onClose }: BracketWizardProps) {
  const allGames = useMemo(() => buildGameList(), []);
  const [currentIdx, setCurrentIdx] = useState(() => {
    // Start at first unfilled game
    const firstUnfilled = allGames.findIndex((g) => !picks[g.id]);
    return firstUnfilled >= 0 ? firstUnfilled : 0;
  });

  const game = allGames[currentIdx];
  const [topTeam, bottomTeam] = getTeamsForGame(game.id, regions, picks);
  const pick = picks[game.id] ?? null;
  const filledCount = allGames.filter((g) => picks[g.id]).length;

  const topSeed = topTeam ? seedLookup[topTeam] : undefined;
  const bottomSeed = bottomTeam ? seedLookup[bottomTeam] : undefined;
  const matchup = topSeed && bottomSeed && topSeed !== bottomSeed ? getSeedMatchupRate(topSeed, bottomSeed) : null;

  const goNext = useCallback(() => setCurrentIdx((i) => Math.min(i + 1, allGames.length - 1)), [allGames.length]);
  const goPrev = useCallback(() => setCurrentIdx((i) => Math.max(i - 1, 0)), []);
  const goNextUnfilled = useCallback(() => {
    for (let i = currentIdx + 1; i < allGames.length; i++) {
      if (!picks[allGames[i].id]) { setCurrentIdx(i); return; }
    }
    // Wrap around
    for (let i = 0; i < currentIdx; i++) {
      if (!picks[allGames[i].id]) { setCurrentIdx(i); return; }
    }
  }, [currentIdx, allGames, picks]);

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "ArrowLeft") { e.preventDefault(); goPrev(); }
      else if (e.key === "ArrowRight") { e.preventDefault(); goNext(); }
      else if (e.key === "1" && topTeam) { e.preventDefault(); onPick(game.id, topTeam); }
      else if (e.key === "2" && bottomTeam) { e.preventDefault(); onPick(game.id, bottomTeam); }
      else if (e.key === "Tab") { e.preventDefault(); goNextUnfilled(); }
      else if (e.key === "Escape") { e.preventDefault(); onClose(); }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [goPrev, goNext, goNextUnfilled, onClose, topTeam, bottomTeam, game.id, onPick]);

  // Auto-advance after picking
  const handlePick = useCallback((team: string) => {
    onPick(game.id, team);
    // Small delay then advance to next unfilled
    setTimeout(() => {
      setCurrentIdx((idx) => {
        for (let i = idx + 1; i < allGames.length; i++) {
          if (!picks[allGames[i].id] && allGames[i].id !== game.id) return i;
        }
        for (let i = 0; i < idx; i++) {
          if (!picks[allGames[i].id]) return i;
        }
        return Math.min(idx + 1, allGames.length - 1);
      });
    }, 300);
  }, [onPick, game.id, allGames, picks]);

  const regionColor = REGION_COLORS[game.region as RegionName] ?? "#6b7280";

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-md w-full overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b dark:border-gray-700">
          <div className="flex items-center gap-2">
            <span className="text-lg">🧙</span>
            <span className="font-bold text-sm">Bracket Wizard</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500 dark:text-gray-400">{filledCount}/{TOTAL_GAMES} picks</span>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-lg leading-none">&times;</button>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-gray-200 dark:bg-gray-700">
          <div
            className="h-full bg-blue-500 transition-all duration-300"
            style={{ width: `${(filledCount / TOTAL_GAMES) * 100}%` }}
          />
        </div>

        {/* Game info */}
        <div className="px-4 pt-3 pb-1 text-center">
          <div className="flex items-center justify-center gap-2 mb-1">
            <span className="text-xs font-semibold px-2 py-0.5 rounded" style={{ backgroundColor: regionColor + "20", color: regionColor }}>
              {game.region}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-400">{game.roundName}</span>
          </div>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Game {currentIdx + 1} of {TOTAL_GAMES}</p>
        </div>

        {/* Matchup */}
        <div className="px-4 py-4 space-y-3">
          {[{ team: topTeam, seed: topSeed, key: "1" }, { team: bottomTeam, seed: bottomSeed, key: "2" }].map(({ team, seed, key }) => (
            <button
              key={key}
              disabled={!team}
              onClick={() => team && handlePick(team)}
              className={`w-full flex items-center gap-3 p-3 rounded-lg border-2 transition-all ${
                !team
                  ? "border-gray-200 dark:border-gray-700 opacity-40 cursor-default"
                  : pick === team
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/30 dark:border-blue-400 shadow-md"
                    : "border-gray-200 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-500 hover:shadow-sm"
              }`}
            >
              <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5">{key}</span>
              {seed && <span className="text-xs font-bold text-gray-500 dark:text-gray-400 w-5">({seed})</span>}
              {team && <TeamLogo team={team} size={28} />}
              <span className={`text-sm font-semibold truncate ${pick === team ? "text-blue-700 dark:text-blue-300" : "text-gray-800 dark:text-gray-200"}`}>
                {team ?? "TBD"}
              </span>
              {pick === team && <span className="ml-auto text-blue-500 text-lg">✓</span>}
            </button>
          ))}
        </div>

        {/* Matchup hint */}
        {matchup && (
          <div className="px-4 pb-2 text-center">
            <p className="text-[10px] text-gray-400 dark:text-gray-500">
              📊 #{matchup.favoriteSeed} seeds win {matchup.favoriteRate}% vs #{matchup.underdogSeed} seeds historically
            </p>
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-t dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <button
            onClick={goPrev}
            disabled={currentIdx === 0}
            className="px-3 py-1.5 text-xs rounded border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
          >
            ← Prev
          </button>
          <button
            onClick={goNextUnfilled}
            className="px-3 py-1.5 text-xs rounded bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/60 transition"
          >
            Skip to unfilled ⏭
          </button>
          <button
            onClick={goNext}
            disabled={currentIdx === allGames.length - 1}
            className="px-3 py-1.5 text-xs rounded border dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-30 transition"
          >
            Next →
          </button>
        </div>

        {/* Keyboard hint */}
        <div className="px-4 py-2 text-center border-t dark:border-gray-700">
          <p className="text-[9px] text-gray-400 dark:text-gray-500">
            ← → navigate · 1/2 pick · Tab skip · Esc close
          </p>
        </div>
      </div>
    </div>
  );
}
