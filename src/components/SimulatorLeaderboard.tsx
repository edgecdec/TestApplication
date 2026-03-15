"use client";

import { useMemo } from "react";
import type { Results } from "@/types/bracket";
import type { ScoringSettings } from "@/types/group";
import type { RegionData } from "@/types/tournament";
import type { SimulatorBracketData } from "@/types/simulator";
import type { LeaderboardEntry } from "@/types/scoring";
import { scoreBracket } from "@/lib/scoring";

interface Props {
  brackets: SimulatorBracketData[];
  results: Results;
  settings: ScoringSettings;
  regions: RegionData[];
}

export default function SimulatorLeaderboard({ brackets, results, settings, regions }: Props) {
  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    const scores = brackets.map((b) =>
      scoreBracket(b.bracketId, b.bracketName, b.username, b.userId, b.picks, results, settings, regions, b.tiebreaker, null)
    );
    scores.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (a.tiebreakerDiff != null && b.tiebreakerDiff != null) return a.tiebreakerDiff - b.tiebreakerDiff;
      if (a.tiebreakerDiff != null) return -1;
      if (b.tiebreakerDiff != null) return 1;
      return 0;
    });
    return scores.map((s, i) => {
      let rank = 1;
      if (i > 0) {
        const prev = scores[i - 1];
        rank = s.total === prev.total ? leaderboard[i - 1]?.rank ?? i + 1 : i + 1;
      }
      const percentile = scores.length > 1 ? Math.round(((scores.length - rank) / (scores.length - 1)) * 100) : 100;
      return { ...s, rank, percentile };
    });
  }, [brackets, results, settings, regions]);

  if (leaderboard.length === 0) {
    return <p className="text-gray-500 text-sm">No brackets to score.</p>;
  }

  return (
    <div className="overflow-y-auto">
      <table className="w-full text-xs">
        <thead className="bg-gray-50 sticky top-0">
          <tr>
            <th className="text-left px-2 py-1 font-medium">#</th>
            <th className="text-left px-2 py-1 font-medium">Bracket</th>
            <th className="text-right px-2 py-1 font-medium">Pts</th>
          </tr>
        </thead>
        <tbody>
          {leaderboard.map((e) => (
            <tr key={e.bracketId} className="border-t hover:bg-gray-50">
              <td className="px-2 py-1 text-gray-400">{e.rank}</td>
              <td className="px-2 py-1 truncate max-w-[140px]" title={`${e.bracketName} (${e.username})`}>
                <span className="font-medium">{e.bracketName}</span>
                <span className="text-gray-400 ml-1">{e.username}</span>
              </td>
              <td className="px-2 py-1 text-right font-bold">{e.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
