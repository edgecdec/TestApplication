"use client";

import { useEffect, useState } from "react";
import type { PickDetail } from "@/types/scoring";
import { ROUND_NAMES } from "@/lib/bracket-constants";

interface Props {
  groupId: string;
  bracketId: number;
  onClose: () => void;
}

interface DetailData {
  bracketName: string;
  username: string;
  details: PickDetail[];
}

export default function ScoringBreakdownDialog({ groupId, bracketId, onClose }: Props) {
  const [data, setData] = useState<DetailData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/leaderboard/${bracketId}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [groupId, bracketId]);

  const decided = data?.details.filter((d) => d.result !== null) ?? [];
  const correct = decided.filter((d) => d.correct);
  const totalBase = correct.reduce((s, d) => s + d.basePoints, 0);
  const totalBonus = correct.reduce((s, d) => s + d.upsetBonus, 0);

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b">
          <h2 className="font-bold text-lg">
            {loading ? "Loading..." : `${data?.username} — ${data?.bracketName}`}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
        </div>

        {!loading && data && (
          <>
            <div className="flex gap-4 px-4 py-2 text-sm border-b bg-gray-50">
              <span>Correct: {correct.length}/{decided.length}</span>
              <span>Base: {totalBase}</span>
              {totalBonus > 0 && <span className="text-green-600">Upset Bonus: +{totalBonus}</span>}
              <span className="font-bold">Total: {totalBase + totalBonus}</span>
            </div>

            <div className="overflow-y-auto flex-1">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 sticky top-0">
                  <tr>
                    <th className="text-left px-3 py-2">Round</th>
                    <th className="text-left px-3 py-2">Pick</th>
                    <th className="text-left px-3 py-2">Result</th>
                    <th className="text-right px-3 py-2">Pts</th>
                    <th className="text-right px-3 py-2">Bonus</th>
                  </tr>
                </thead>
                <tbody>
                  {decided.map((d) => (
                    <tr key={d.gameId} className={d.correct ? "bg-green-50" : "bg-red-50"}>
                      <td className="px-3 py-1.5 text-xs text-gray-500">{ROUND_NAMES[d.round]}</td>
                      <td className="px-3 py-1.5">{d.pick}</td>
                      <td className="px-3 py-1.5">{d.correct ? "✓" : d.result}</td>
                      <td className="px-3 py-1.5 text-right">{d.basePoints}</td>
                      <td className="px-3 py-1.5 text-right">{d.upsetBonus > 0 ? `+${d.upsetBonus}` : "—"}</td>
                    </tr>
                  ))}
                  {decided.length === 0 && (
                    <tr><td colSpan={5} className="px-3 py-4 text-center text-gray-400">No results yet</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
