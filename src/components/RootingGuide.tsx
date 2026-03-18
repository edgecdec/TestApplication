"use client";

import { useEffect, useState } from "react";
import type { RootingEntry } from "@/types/rooting-guide";
import { ROUND_NAMES } from "@/lib/bracket-constants";
import TeamLogo from "@/components/TeamLogo";

export default function RootingGuide() {
  const [entries, setEntries] = useState<RootingEntry[]>([]);

  useEffect(() => {
    fetch("/api/brackets/rooting-guide")
      .then((r) => (r.ok ? r.json() : { entries: [] }))
      .then((d) => setEntries(d.entries ?? []))
      .catch(() => {});
  }, []);

  if (entries.length === 0) return null;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-200 mb-3">
        🏀 Who to Root For
      </h2>
      <div className="space-y-2">
        {entries.map((e) => {
          const isTeamA = e.rootFor === e.teamA;
          return (
            <div key={e.gameId} className="flex items-center gap-2 border dark:border-gray-700 rounded p-2">
              <div className="flex items-center gap-1.5 flex-1 min-w-0">
                <TeamLogo team={e.rootFor} size={20} />
                <span className="font-semibold text-sm dark:text-white truncate">{e.rootFor}</span>
                <span className="text-xs text-gray-400">vs</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {isTeamA ? e.teamB : e.teamA}
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300 px-1.5 py-0.5 rounded font-medium">
                  {e.totalPoints} pts
                </span>
                <span className="text-[10px] text-gray-400" title={e.bracketNames.join(", ")}>
                  {e.bracketCount} bracket{e.bracketCount !== 1 ? "s" : ""}
                </span>
                <span className="text-[10px] text-gray-400">{ROUND_NAMES[e.round]}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
