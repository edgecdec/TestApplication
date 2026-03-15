"use client";

import type { Results } from "@/types/bracket";
import { ROUND_NAMES, ROUND_GAME_COUNTS, TOTAL_GAMES } from "@/lib/bracket-constants";

interface RoundProgress {
  name: string;
  completed: number;
  total: number;
}

function computeRoundProgress(results: Results): RoundProgress[] {
  const progress: RoundProgress[] = ROUND_NAMES.map((name, i) => ({
    name,
    completed: 0,
    total: ROUND_GAME_COUNTS[i],
  }));

  for (const gameId of Object.keys(results)) {
    if (!results[gameId]) continue;
    const parts = gameId.split("-");
    const round = parseInt(parts[parts.length - 2], 10);
    if (round >= 0 && round < progress.length) {
      progress[round].completed++;
    }
  }

  return progress;
}

interface Props {
  results: Results;
}

export default function TournamentProgress({ results }: Props) {
  const rounds = computeRoundProgress(results);
  const totalCompleted = rounds.reduce((s, r) => s + r.completed, 0);

  if (totalCompleted === 0) return null;

  // Current round = first round not fully complete
  const currentRoundIdx = rounds.findIndex((r) => r.completed < r.total);
  const currentRound = currentRoundIdx >= 0 ? rounds[currentRoundIdx] : null;
  const overallPct = Math.round((totalCompleted / TOTAL_GAMES) * 100);

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200">🏟️ Tournament Progress</h2>
        <span className="text-xs text-gray-500 dark:text-gray-400">{totalCompleted}/{TOTAL_GAMES} games</span>
      </div>

      {/* Overall progress bar */}
      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2.5 mb-3">
        <div
          className="bg-blue-600 h-2.5 rounded-full transition-all"
          style={{ width: `${overallPct}%` }}
        />
      </div>

      {/* Current round status */}
      {currentRound ? (
        <p className="text-sm text-gray-600 dark:text-gray-300">
          <span className="font-medium">{currentRound.name}</span>
          {" — "}
          {currentRound.completed}/{currentRound.total} games complete
        </p>
      ) : (
        <p className="text-sm font-medium text-green-600 dark:text-green-400">🏆 Tournament Complete!</p>
      )}

      {/* Round dots */}
      <div className="flex gap-1 mt-2">
        {rounds.map((r, i) => {
          const done = r.completed === r.total;
          const active = i === currentRoundIdx;
          return (
            <div
              key={r.name}
              className={`flex-1 text-center text-[10px] py-0.5 rounded ${
                done
                  ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                  : active
                  ? "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 font-medium"
                  : "bg-gray-100 text-gray-400 dark:bg-gray-700 dark:text-gray-500"
              }`}
              title={`${r.name}: ${r.completed}/${r.total}`}
            >
              {r.name}
            </div>
          );
        })}
      </div>
    </div>
  );
}
