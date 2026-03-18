"use client";

import { useEffect, useState, useMemo, Fragment } from "react";
import type { PickSheetData, PickSheetGame, PickSheetBracket } from "@/app/api/groups/[id]/picksheet/route";

interface Props {
  groupId: string;
}

interface RowItem {
  type: "header";
  roundName: string;
  round: number;
}

interface GameRowItem {
  type: "game";
  game: PickSheetGame;
  label: string;
  matchup: string;
}

export default function GroupPickSheet({ groupId }: Props) {
  const [data, setData] = useState<PickSheetData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/picksheet`)
      .then((r) => r.json())
      .then((d) => setData(d))
      .finally(() => setLoading(false));
  }, [groupId]);

  const rows = useMemo(() => {
    if (!data) return [];
    const items: (RowItem | GameRowItem)[] = [];
    let prevRound = -1;
    for (const g of data.games) {
      if (g.round !== prevRound) {
        items.push({ type: "header", roundName: g.roundName, round: g.round });
        prevRound = g.round;
      }
      const label = g.round < 4 ? g.region : g.roundName;
      const matchup = g.topTeam && g.bottomTeam ? `${g.topTeam} vs ${g.bottomTeam}` : g.topTeam || g.bottomTeam || "TBD";
      items.push({ type: "game", game: g, label, matchup });
    }
    return items;
  }, [data]);

  if (loading) return <p className="text-sm text-gray-500">Loading pick sheet…</p>;
  if (!data || data.brackets.length === 0) return <p className="text-sm text-gray-500">No brackets in this group yet.</p>;

  const { brackets, picks } = data;

  return (
    <div className="overflow-x-auto print:overflow-visible">
      <table className="min-w-full text-xs border-collapse">
        <thead className="sticky top-0 z-10 bg-white dark:bg-gray-800">
          <tr>
            <th className="px-2 py-1 text-left border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">Region</th>
            <th className="px-2 py-1 text-left border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 min-w-[120px]">Matchup</th>
            <th className="px-2 py-1 text-center border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">Result</th>
            {brackets.map((b) => (
              <th key={b.bracketId} className="px-2 py-1 text-center border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 min-w-[80px] max-w-[120px]" title={`${b.username} — ${b.bracketName}`}>
                <div className="truncate font-medium">{b.username}</div>
                <div className="truncate text-gray-400 font-normal">{b.bracketName}</div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            if (row.type === "header") {
              return (
                <tr key={`hdr-${row.round}`}>
                  <td colSpan={3 + brackets.length} className="px-2 py-1.5 font-bold text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700 border border-gray-200 dark:border-gray-600">
                    {row.roundName}
                  </td>
                </tr>
              );
            }
            const { game: g, label, matchup } = row;
            return (
              <tr key={g.gameId}>
                <td className="px-2 py-1 border border-gray-200 dark:border-gray-700 text-gray-500 whitespace-nowrap">{label}</td>
                <td className="px-2 py-1 border border-gray-200 dark:border-gray-700 whitespace-nowrap">{matchup}</td>
                <td className="px-2 py-1 border border-gray-200 dark:border-gray-700 text-center font-medium">{g.result || "—"}</td>
                {brackets.map((b) => {
                  const pick = picks[b.bracketId]?.[g.gameId];
                  let cls = "px-2 py-1 border border-gray-200 dark:border-gray-700 text-center";
                  if (pick && g.result) {
                    cls += pick === g.result
                      ? " bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300"
                      : " bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-300 line-through";
                  }
                  return <td key={b.bracketId} className={cls}>{pick || "—"}</td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
