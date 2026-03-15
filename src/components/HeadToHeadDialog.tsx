"use client";

import { useEffect, useState } from "react";
import type { HeadToHeadResult } from "@/types/scoring";
import { ROUND_NAMES } from "@/lib/bracket-constants";

interface Props {
  bracketIdA: number;
  bracketIdB: number;
  groupId?: string;
  onClose: () => void;
}

type RoundFilter = "all" | number;

export default function HeadToHeadDialog({ bracketIdA, bracketIdB, groupId, onClose }: Props) {
  const [data, setData] = useState<HeadToHeadResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [roundFilter, setRoundFilter] = useState<RoundFilter>("all");

  useEffect(() => {
    const params = new URLSearchParams({ a: String(bracketIdA), b: String(bracketIdB) });
    if (groupId) params.set("group_id", groupId);
    fetch(`/api/brackets/head-to-head?${params}`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [bracketIdA, bracketIdB, groupId]);

  const filtered = data?.games.filter((g) => roundFilter === "all" || g.round === roundFilter) ?? [];
  const onlyDiffs = filtered.filter((g) => g.pickA !== g.pickB);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[85vh] overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="p-4 border-b dark:border-gray-700 flex items-center justify-between">
          <h2 className="text-lg font-bold">⚔️ Head-to-Head</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
        </div>

        {loading && <div className="p-8 text-center text-gray-500">Loading...</div>}

        {data && (
          <div className="overflow-y-auto flex-1 p-4 space-y-4">
            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className={`p-3 rounded-lg ${data.winsA > data.winsB ? "bg-green-50 dark:bg-green-900/30 ring-2 ring-green-400" : "bg-gray-50 dark:bg-gray-700"}`}>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{data.bracketA.username}</div>
                <div className="font-bold truncate">{data.bracketA.name}</div>
                <div className="text-2xl font-bold text-green-600">{data.winsA}</div>
                <div className="text-xs text-gray-500">wins</div>
              </div>
              <div className="p-3 rounded-lg bg-gray-50 dark:bg-gray-700 flex flex-col items-center justify-center">
                <div className="text-sm text-gray-500">vs</div>
                <div className="text-lg font-bold">{data.ties}</div>
                <div className="text-xs text-gray-500">ties</div>
              </div>
              <div className={`p-3 rounded-lg ${data.winsB > data.winsA ? "bg-green-50 dark:bg-green-900/30 ring-2 ring-green-400" : "bg-gray-50 dark:bg-gray-700"}`}>
                <div className="text-xs text-gray-500 dark:text-gray-400 truncate">{data.bracketB.username}</div>
                <div className="font-bold truncate">{data.bracketB.name}</div>
                <div className="text-2xl font-bold text-blue-600">{data.winsB}</div>
                <div className="text-xs text-gray-500">wins</div>
              </div>
            </div>

            {/* Stats comparison */}
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="font-medium">{data.bracketA.total}</div>
              <div className="text-gray-500">Total Points</div>
              <div className="font-medium">{data.bracketB.total}</div>
              <div className="font-medium">{data.bracketA.correctPicks}</div>
              <div className="text-gray-500">Correct Picks</div>
              <div className="font-medium">{data.bracketB.correctPicks}</div>
              <div className="font-medium">{data.bracketA.maxPossible}</div>
              <div className="text-gray-500">Max Possible</div>
              <div className="font-medium">{data.bracketB.maxPossible}</div>
              <div className="font-medium truncate">{data.bracketA.championPick ?? "—"}</div>
              <div className="text-gray-500">🏆 Champion</div>
              <div className="font-medium truncate">{data.bracketB.championPick ?? "—"}</div>
            </div>

            {/* Round filter */}
            <div className="flex gap-1 flex-wrap">
              <button onClick={() => setRoundFilter("all")} className={`px-2 py-1 text-xs rounded ${roundFilter === "all" ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700"}`}>All</button>
              {ROUND_NAMES.map((rn, i) => (
                <button key={rn} onClick={() => setRoundFilter(i)} className={`px-2 py-1 text-xs rounded ${roundFilter === i ? "bg-blue-600 text-white" : "bg-gray-100 dark:bg-gray-700"}`}>{rn}</button>
              ))}
            </div>

            {/* Game-by-game where picks differ */}
            {onlyDiffs.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-4">No disagreements in {roundFilter === "all" ? "any round" : ROUND_NAMES[roundFilter as number]}.</p>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="text-left px-2 py-1 font-medium">Round</th>
                    <th className="text-left px-2 py-1 font-medium">Winner</th>
                    <th className="text-center px-2 py-1 font-medium truncate">{data.bracketA.username}</th>
                    <th className="text-center px-2 py-1 font-medium truncate">{data.bracketB.username}</th>
                  </tr>
                </thead>
                <tbody>
                  {onlyDiffs.map((g) => (
                    <tr key={g.gameId} className="border-t dark:border-gray-700">
                      <td className="px-2 py-1 text-xs text-gray-500">{ROUND_NAMES[g.round]}</td>
                      <td className="px-2 py-1 font-medium">{g.result}</td>
                      <td className={`px-2 py-1 text-center ${g.correctA ? "text-green-600 font-medium" : "text-red-500"}`}>
                        {g.correctA ? "✅" : "❌"} {g.pickA || "—"}
                      </td>
                      <td className={`px-2 py-1 text-center ${g.correctB ? "text-green-600 font-medium" : "text-red-500"}`}>
                        {g.correctB ? "✅" : "❌"} {g.pickB || "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
