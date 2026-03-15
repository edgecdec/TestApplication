"use client";

import { useEffect, useState } from "react";
import TeamLogo from "@/components/TeamLogo";
import { ROUND_NAMES } from "@/lib/bracket-constants";
import type { SwingGame } from "@/types/games-that-matter";

export default function GamesThatMatter() {
  const [games, setGames] = useState<SwingGame[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/brackets/games-that-matter")
      .then((r) => (r.ok ? r.json() : { games: [] }))
      .then((d) => setGames(d.games ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading || games.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
        🎯 Games That Matter
      </h2>
      <div className="space-y-3">
        {games.map((g) => (
          <div
            key={`${g.gameId}-${g.groupId}`}
            className="border dark:border-gray-700 rounded p-3 text-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {ROUND_NAMES[g.round] ?? `Round ${g.round}`} · {g.groupName}
              </span>
            </div>
            <div className="flex items-center gap-2 mb-2">
              {g.teamA && (
                <span className="flex items-center gap-1">
                  <TeamLogo team={g.teamA} size={16} />
                  <span className={g.userPick === g.teamA ? "font-bold text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-300"}>
                    {g.teamA}
                  </span>
                </span>
              )}
              <span className="text-gray-400">vs</span>
              {g.teamB && (
                <span className="flex items-center gap-1">
                  <TeamLogo team={g.teamB} size={16} />
                  <span className={g.userPick === g.teamB ? "font-bold text-blue-600 dark:text-blue-400" : "text-gray-600 dark:text-gray-300"}>
                    {g.teamB}
                  </span>
                </span>
              )}
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400">
              You picked <span className="font-medium text-blue-600 dark:text-blue-400">{g.userPick}</span>
              {" · "}
              {g.rivals.length} rival{g.rivals.length !== 1 ? "s" : ""} picked differently:
              <span className="ml-1 text-red-600 dark:text-red-400">
                {g.rivals.slice(0, 3).map((r) => `${r.username} (#${r.rank}): ${r.pick}`).join(", ")}
                {g.rivals.length > 3 && ` +${g.rivals.length - 3} more`}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
