"use client";

import { useCallback, useEffect, useState } from "react";
import type { BracketHistoryEntry, PickChange, Picks } from "@/types/bracket";

interface Props {
  bracketId: number;
  onClose: () => void;
}

function diffPicks(prev: Picks, curr: Picks): PickChange[] {
  const changes: PickChange[] = [];
  const allKeys = Array.from(new Set([...Object.keys(prev), ...Object.keys(curr)]));
  for (const gameId of allKeys) {
    const from = prev[gameId] || null;
    const to = curr[gameId] || null;
    if (from !== to) {
      changes.push({ gameId, from, to });
    }
  }
  return changes.sort((a, b) => a.gameId.localeCompare(b.gameId));
}

export default function BracketHistory({ bracketId, onClose }: Props) {
  const [history, setHistory] = useState<BracketHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/brackets/${bracketId}/history`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(d => setHistory(d.history ?? []))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [bracketId]);

  const handleBackdrop = useCallback((e: React.MouseEvent) => {
    if (e.target === e.currentTarget) onClose();
  }, [onClose]);

  // Compute diffs between consecutive snapshots (newest first)
  const diffs = history.map((entry, i) => {
    const curr: Picks = JSON.parse(entry.picks);
    const prev: Picks = i < history.length - 1 ? JSON.parse(history[i + 1].picks) : {};
    const prevTb = i < history.length - 1 ? history[i + 1].tiebreaker : null;
    const changes = diffPicks(prev, curr);
    const tbChanged = entry.tiebreaker !== prevTb;
    return { entry, changes, tbChanged, prevTb, pickCount: Object.keys(curr).length };
  });

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={handleBackdrop}>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="font-bold text-lg">📜 Pick History</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl">✕</button>
        </div>
        <div className="overflow-y-auto p-4 flex-1">
          {loading && <p className="text-gray-500 text-sm">Loading...</p>}
          {!loading && diffs.length === 0 && (
            <p className="text-gray-500 text-sm">No history yet. History is recorded each time you save picks.</p>
          )}
          {diffs.map(({ entry, changes, tbChanged, prevTb, pickCount }, idx) => (
            <div key={entry.id} className="mb-4 last:mb-0">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-semibold text-gray-600 dark:text-gray-300">
                  {new Date(entry.changed_at + "Z").toLocaleString()}
                </span>
                <span className="text-xs text-gray-400">{pickCount}/63 picks</span>
                {idx === 0 && <span className="text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-1.5 rounded">Latest</span>}
                {idx === diffs.length - 1 && diffs.length > 1 && <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 rounded">First save</span>}
              </div>
              {changes.length === 0 && !tbChanged ? (
                <p className="text-xs text-gray-400 ml-2">No changes from previous save</p>
              ) : (
                <ul className="text-xs space-y-0.5 ml-2">
                  {changes.map(c => (
                    <li key={c.gameId} className="flex items-center gap-1">
                      <span className="text-gray-400 font-mono w-16">{c.gameId}</span>
                      {c.from && !c.to ? (
                        <span className="text-red-500">removed <strong>{c.from}</strong></span>
                      ) : !c.from && c.to ? (
                        <span className="text-green-600">picked <strong>{c.to}</strong></span>
                      ) : (
                        <span className="text-yellow-600">
                          <span className="line-through">{c.from}</span> → <strong>{c.to}</strong>
                        </span>
                      )}
                    </li>
                  ))}
                  {tbChanged && (
                    <li className="flex items-center gap-1">
                      <span className="text-gray-400 font-mono w-16">TB</span>
                      <span className="text-yellow-600">
                        {prevTb ?? "none"} → <strong>{entry.tiebreaker ?? "none"}</strong>
                      </span>
                    </li>
                  )}
                </ul>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
