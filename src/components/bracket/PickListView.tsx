"use client";

import { useMemo } from "react";
import { REGIONS, ROUND_NAMES } from "@/lib/bracket-constants";
import { gameId, getTeamsForGame, gamesInRound } from "@/lib/bracket-utils";
import TeamLogo from "@/components/TeamLogo";
import type { RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";

interface PickListViewProps {
  regions: RegionData[];
  picks: Picks;
  results: Results;
  seedLookup: Record<string, number>;
}

interface PickRow {
  gameId: string;
  round: number;
  region: string;
  topTeam: string | null;
  bottomTeam: string | null;
  pick: string | null;
  result: string | null;
  status: "correct" | "wrong" | "pending" | "empty";
}

function buildAllPickRows(regions: RegionData[], picks: Picks, results: Results): PickRow[] {
  const rows: PickRow[] = [];
  for (let round = 0; round < ROUND_NAMES.length; round++) {
    if (round <= 3) {
      for (const region of REGIONS) {
        const count = gamesInRound(round);
        for (let i = 0; i < count; i++) {
          const gId = gameId(region, round, i);
          const [top, bottom] = getTeamsForGame(gId, regions, picks);
          const pick = picks[gId] ?? null;
          const result = results[gId] ?? null;
          let status: PickRow["status"] = "empty";
          if (pick) {
            if (result) status = pick === result ? "correct" : "wrong";
            else status = "pending";
          }
          rows.push({ gameId: gId, round, region, topTeam: top, bottomTeam: bottom, pick, result, status });
        }
      }
    } else {
      const count = round === 4 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const gId = gameId("ff", round, i);
        const [top, bottom] = getTeamsForGame(gId, regions, picks);
        const pick = picks[gId] ?? null;
        const result = results[gId] ?? null;
        let status: PickRow["status"] = "empty";
        if (pick) {
          if (result) status = pick === result ? "correct" : "wrong";
          else status = "pending";
        }
        rows.push({ gameId: gId, round, region: "Final Four", topTeam: top, bottomTeam: bottom, pick, result, status });
      }
    }
  }
  return rows;
}

const STATUS_ICON: Record<PickRow["status"], string> = {
  correct: "✅",
  wrong: "❌",
  pending: "⏳",
  empty: "—",
};

const STATUS_BG: Record<PickRow["status"], string> = {
  correct: "bg-green-50 dark:bg-green-900/20",
  wrong: "bg-red-50 dark:bg-red-900/20",
  pending: "",
  empty: "",
};

export default function PickListView({ regions, picks, results, seedLookup }: PickListViewProps) {
  const rows = useMemo(() => buildAllPickRows(regions, picks, results), [regions, picks, results]);

  // Group rows by round
  const roundGroups = useMemo(() => {
    const groups: Map<number, PickRow[]> = new Map();
    for (const row of rows) {
      const arr = groups.get(row.round) ?? [];
      arr.push(row);
      groups.set(row.round, arr);
    }
    return groups;
  }, [rows]);

  // Summary counts
  const correct = rows.filter((r) => r.status === "correct").length;
  const wrong = rows.filter((r) => r.status === "wrong").length;
  const pending = rows.filter((r) => r.status === "pending").length;
  const empty = rows.filter((r) => r.status === "empty").length;

  return (
    <div className="max-w-3xl mx-auto space-y-4">
      {/* Summary bar */}
      <div className="flex flex-wrap gap-3 text-sm bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
        <span>✅ {correct} correct</span>
        <span>❌ {wrong} wrong</span>
        <span>⏳ {pending} pending</span>
        {empty > 0 && <span className="text-gray-400">— {empty} unfilled</span>}
      </div>

      {Array.from(roundGroups.entries()).map(([round, roundRows]) => {
        const filled = roundRows.filter((r) => r.pick).length;
        return (
          <div key={round} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm overflow-hidden">
            <div className="px-4 py-2 bg-gray-100 dark:bg-gray-700 flex items-center justify-between">
              <span className="font-semibold text-sm">{ROUND_NAMES[round]}</span>
              <span className="text-xs text-gray-500">{filled}/{roundRows.length} picked</span>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b dark:border-gray-700">
                  <th className="text-left px-4 py-1.5 font-medium">Matchup</th>
                  <th className="text-left px-4 py-1.5 font-medium">Your Pick</th>
                  <th className="text-center px-2 py-1.5 font-medium w-12"></th>
                </tr>
              </thead>
              <tbody>
                {roundRows.map((row) => (
                  <tr key={row.gameId} className={`border-b dark:border-gray-700 last:border-0 ${STATUS_BG[row.status]}`}>
                    <td className="px-4 py-2">
                      {row.topTeam && row.bottomTeam ? (
                        <div className="flex items-center gap-1 text-xs">
                          <TeamLogo team={row.topTeam} size={14} />
                          <span className="text-gray-400">{seedLookup[row.topTeam] ? `(${seedLookup[row.topTeam]})` : ""}</span>
                          <span className="truncate max-w-[80px]">{row.topTeam}</span>
                          <span className="text-gray-400 mx-1">vs</span>
                          <TeamLogo team={row.bottomTeam} size={14} />
                          <span className="text-gray-400">{seedLookup[row.bottomTeam] ? `(${seedLookup[row.bottomTeam]})` : ""}</span>
                          <span className="truncate max-w-[80px]">{row.bottomTeam}</span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">TBD</span>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      {row.pick ? (
                        <div className="flex items-center gap-1">
                          <TeamLogo team={row.pick} size={14} />
                          <span className={`text-xs font-medium ${row.status === "correct" ? "text-green-700 dark:text-green-400" : row.status === "wrong" ? "text-red-700 dark:text-red-400 line-through" : ""}`}>
                            {seedLookup[row.pick] ? `(${seedLookup[row.pick]}) ` : ""}{row.pick}
                          </span>
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-2 py-2 text-center text-sm">{STATUS_ICON[row.status]}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}
