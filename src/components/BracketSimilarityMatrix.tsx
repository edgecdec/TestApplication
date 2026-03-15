"use client";

import { useEffect, useState } from "react";
import type { SimilarityData, SimilarityBracket } from "@/types/similarity";

interface Props {
  groupId: string;
}

function pctColor(pct: number): string {
  if (pct >= 80) return "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200";
  if (pct >= 60) return "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200";
  if (pct >= 40) return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200";
  if (pct >= 20) return "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200";
  return "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200";
}

function label(b: SimilarityBracket): string {
  return `${b.username} — ${b.bracketName}`;
}

export default function BracketSimilarityMatrix({ groupId }: Props) {
  const [data, setData] = useState<SimilarityData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/similarity`)
      .then((r) => r.ok ? r.json() : null)
      .then((d) => { if (d) setData(d); })
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <p className="text-sm text-gray-500">Loading similarity data…</p>;
  if (!data || data.brackets.length < 2) return <p className="text-sm text-gray-500">Need at least 2 brackets to compare.</p>;

  const { brackets, pairs, mostSimilar, mostDifferent } = data;
  const pairMap = new Map<string, number>();
  for (const p of pairs) {
    pairMap.set(`${p.a}-${p.b}`, p.percentage);
    pairMap.set(`${p.b}-${p.a}`, p.percentage);
  }

  const getName = (id: number) => {
    const b = brackets.find((x) => x.bracketId === id);
    return b ? label(b) : "?";
  };

  return (
    <div className="space-y-4">
      {/* Highlights */}
      <div className="flex flex-wrap gap-3 text-sm">
        {mostSimilar && (
          <div className="bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 rounded px-3 py-2">
            <span className="font-medium">👯 Bracket Twins:</span>{" "}
            {getName(mostSimilar.a)} &amp; {getName(mostSimilar.b)} — {mostSimilar.percentage}% match ({mostSimilar.matching}/{mostSimilar.total})
          </div>
        )}
        {mostDifferent && mostDifferent !== mostSimilar && (
          <div className="bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded px-3 py-2">
            <span className="font-medium">🔄 Polar Opposites:</span>{" "}
            {getName(mostDifferent.a)} &amp; {getName(mostDifferent.b)} — {mostDifferent.percentage}% match ({mostDifferent.matching}/{mostDifferent.total})
          </div>
        )}
      </div>

      {/* Matrix */}
      <div className="overflow-x-auto">
        <table className="text-xs border-collapse">
          <thead>
            <tr>
              <th className="p-1" />
              {brackets.map((b) => (
                <th key={b.bracketId} className="p-1 font-medium text-center max-w-[100px] truncate" title={label(b)}>
                  <div className="truncate">{b.username}</div>
                  <div className="truncate text-gray-400 font-normal">{b.bracketName}</div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {brackets.map((row) => (
              <tr key={row.bracketId}>
                <td className="p-1 font-medium whitespace-nowrap pr-2" title={label(row)}>
                  <div className="truncate max-w-[120px]">{row.username}</div>
                  <div className="truncate max-w-[120px] text-gray-400 font-normal">{row.bracketName}</div>
                </td>
                {brackets.map((col) => {
                  if (row.bracketId === col.bracketId) {
                    return <td key={col.bracketId} className="p-1 text-center bg-gray-100 dark:bg-gray-700">—</td>;
                  }
                  const pct = pairMap.get(`${row.bracketId}-${col.bracketId}`) ?? 0;
                  return (
                    <td key={col.bracketId} className={`p-1 text-center font-medium rounded ${pctColor(pct)}`} title={`${label(row)} vs ${label(col)}: ${pct}%`}>
                      {pct}%
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
