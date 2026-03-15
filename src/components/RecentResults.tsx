"use client";

import { useEffect, useState } from "react";
import type { RecentResultItem } from "@/types/scoring";
import { ROUND_NAMES } from "@/lib/bracket-constants";
import TeamLogo from "@/components/TeamLogo";

interface Props {
  tournamentId: number;
}

export default function RecentResults({ tournamentId }: Props) {
  const [items, setItems] = useState<RecentResultItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/brackets/recent-results?tournament_id=${tournamentId}`)
      .then((r) => (r.ok ? r.json() : { results: [] }))
      .then((d) => setItems(d.results ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tournamentId]);

  if (loading) return null;
  if (items.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
        📋 Recent Results
      </h2>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.gameId}
            className="flex flex-col gap-1 p-2 rounded bg-gray-50 dark:bg-gray-700"
          >
            <div className="flex items-center gap-2 text-sm">
              <span className="text-xs text-gray-400 dark:text-gray-500 w-16 shrink-0">
                {ROUND_NAMES[item.round]}
              </span>
              <span className="flex items-center gap-1 font-medium">
                {item.winnerSeed && (
                  <span className="text-xs text-gray-400">({item.winnerSeed})</span>
                )}
                <TeamLogo team={item.winner} size={16} />
                {item.winner}
              </span>
              <span className="text-gray-400">def.</span>
              <span className="flex items-center gap-1 text-gray-500 dark:text-gray-400">
                {item.loserSeed && (
                  <span className="text-xs text-gray-400">({item.loserSeed})</span>
                )}
                {item.loser && <TeamLogo team={item.loser} size={16} />}
                {item.loser ?? "TBD"}
              </span>
              {item.isUpset && (
                <span className="text-xs bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300 px-1.5 py-0.5 rounded">
                  Upset!
                </span>
              )}
            </div>
            <div className="flex flex-wrap gap-2 ml-16">
              {item.brackets.map((b) => (
                <span
                  key={b.bracketId}
                  className={`text-xs px-1.5 py-0.5 rounded ${
                    b.correct
                      ? "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300"
                      : "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300"
                  }`}
                >
                  {b.correct ? "✅" : "❌"} {b.bracketName}
                  {b.correct && b.points > 0 && ` +${b.points}`}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
