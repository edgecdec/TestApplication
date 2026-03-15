"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { LeaderboardEntry } from "@/types/scoring";
import { ROUND_NAMES } from "@/lib/bracket-constants";
import ScoringBreakdownDialog from "@/components/ScoringBreakdownDialog";
import TeamLogo from "@/components/TeamLogo";

interface Props {
  entries: LeaderboardEntry[];
  actualTotal: number | null;
  groupId?: string;
}

export default function GroupLeaderboard({ entries, actualTotal, groupId }: Props) {
  const router = useRouter();
  const [selectedBracketId, setSelectedBracketId] = useState<number | null>(null);

  if (entries.length === 0) {
    return <div className="bg-white rounded-lg shadow p-6 text-gray-500">No brackets to score yet.</div>;
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left px-3 py-2 font-medium">#</th>
              <th className="text-left px-3 py-2 font-medium">Bracket</th>
              <th className="text-left px-3 py-2 font-medium">User</th>
              <th className="text-left px-3 py-2 font-medium">Champion</th>
              <th className="text-right px-3 py-2 font-medium">Total</th>
              <th className="text-right px-3 py-2 font-medium" title="Maximum possible score if all remaining alive picks win">Max</th>
              <th className="text-right px-3 py-2 font-medium" title="Best rank this bracket can still achieve">Best</th>
              {ROUND_NAMES.map((rn) => (
                <th key={rn} className="text-right px-3 py-2 font-medium text-xs">{rn}</th>
              ))}
              <th className="text-right px-3 py-2 font-medium">TB</th>
              <th className="text-right px-3 py-2 font-medium">%ile</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.bracketId} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-400 font-medium">{e.rank}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => router.push(`/bracket/${e.bracketId}`)}
                    className="text-blue-600 hover:underline"
                  >
                    {e.bracketName}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => router.push(`/profile/${encodeURIComponent(e.username)}`)}
                    className="text-gray-600 hover:text-blue-600 hover:underline"
                  >
                    {e.username}
                  </button>
                  {e.eliminated && <span className="ml-1" title="Eliminated — can't catch the leader">🚫</span>}
                </td>
                <td className="px-3 py-2 text-sm whitespace-nowrap">
                  {e.championPick ? (
                    <span className={`flex items-center gap-1 ${e.busted ? "text-gray-400 line-through" : ""}`}>
                      <TeamLogo team={e.championPick} />
                      {e.championPick}
                      {e.busted && <span className="ml-1 no-underline" style={{ textDecoration: "none" }} title="Champion pick eliminated">💀</span>}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right font-bold">
                  {groupId ? (
                    <button
                      onClick={() => setSelectedBracketId(e.bracketId)}
                      className="text-blue-600 hover:underline font-bold"
                      title="Click for scoring breakdown"
                    >
                      {e.total}
                    </button>
                  ) : (
                    e.total
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-500" title="Max possible score">
                  {e.maxPossible}
                </td>
                <td className="px-3 py-2 text-right text-gray-500" title="Best possible finish">
                  #{e.bestPossibleFinish}
                </td>
                {e.rounds.map((r, i) => (
                  <td key={i} className="px-3 py-2 text-right text-xs">
                    <span>{r.points}</span>
                    {r.upsetBonus > 0 && (
                      <span className="text-green-600 ml-0.5" title={`+${r.upsetBonus} upset bonus`}>*</span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-2 text-right text-gray-500">
                  {e.tiebreaker != null ? e.tiebreaker : "—"}
                  {e.tiebreakerDiff != null && (
                    <span className="text-xs text-gray-400 ml-1">(±{e.tiebreakerDiff})</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-500">{e.percentile}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedBracketId !== null && groupId && (
        <ScoringBreakdownDialog
          groupId={groupId}
          bracketId={selectedBracketId}
          onClose={() => setSelectedBracketId(null)}
        />
      )}
    </>
  );
}
