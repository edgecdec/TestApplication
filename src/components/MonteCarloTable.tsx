"use client";

import { useState } from "react";
import type { MCResult } from "@/hooks/useMonteCarlo";

type SortKey = "winPct" | "avgPlace" | "avgScore";

const SORT_LABELS: Record<SortKey, string> = {
  avgScore: "Avg Score",
  avgPlace: "Avg Place",
  winPct: "Win %",
};

interface Props {
  results: MCResult[];
  progress: number;
  running: boolean;
  totalSims: number;
}

export default function MonteCarloTable({ results, progress, running, totalSims }: Props) {
  const [sortBy, setSortBy] = useState<SortKey>("winPct");
  const [asc, setAsc] = useState(false);

  const sorted = [...results].sort((a, b) => {
    const dir = asc ? 1 : -1;
    const diff = a[sortBy] - b[sortBy];
    return (diff * dir) || b.winPct - a.winPct || a.avgPlace - b.avgPlace;
  });

  const handleSort = (key: SortKey) => {
    if (sortBy === key) setAsc(!asc);
    else { setSortBy(key); setAsc(key === "avgPlace"); }
  };

  const pct = totalSims > 0 ? Math.round((progress / totalSims) * 100) : 0;

  return (
    <div>
      <h3 className="text-sm font-bold mb-1">🎲 Monte Carlo {running ? `(${progress}/${totalSims})` : `(${totalSims} sims)`}</h3>
      {running && (
        <div className="w-full bg-gray-200 dark:bg-gray-700 rounded h-1.5 mb-2">
          <div className="bg-blue-500 h-1.5 rounded transition-all" style={{ width: `${pct}%` }} />
        </div>
      )}
      {results.length > 0 && (
        <div className="overflow-y-auto max-h-[300px]">
          <table className="w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-800 sticky top-0">
              <tr>
                <th className="text-left px-1.5 py-1 font-medium">Bracket</th>
                {(["avgScore", "avgPlace", "winPct"] as SortKey[]).map((k) => (
                  <th
                    key={k}
                    className="text-right px-1.5 py-1 font-medium cursor-pointer hover:text-blue-600 select-none"
                    onClick={() => handleSort(k)}
                  >
                    {SORT_LABELS[k]}
                    {sortBy === k && <span className="ml-0.5">{asc ? "↑" : "↓"}</span>}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sorted.map((r) => {
                const label = r.key.replace("|", " — ");
                return (
                  <tr key={r.key} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-1.5 py-0.5 truncate max-w-[120px]" title={label}>
                      {label}
                    </td>
                    <td className="px-1.5 py-0.5 text-right">{r.avgScore.toFixed(1)}</td>
                    <td className="px-1.5 py-0.5 text-right">{r.avgPlace.toFixed(1)}</td>
                    <td className="px-1.5 py-0.5 text-right font-bold">
                      {r.winPct.toFixed(1)}%
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {!running && results.length === 0 && (
        <p className="text-gray-400 text-xs">No simulation data yet.</p>
      )}
    </div>
  );
}
