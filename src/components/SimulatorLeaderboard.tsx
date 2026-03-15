"use client";

import { useMemo } from "react";
import type { Results } from "@/types/bracket";
import type { ScoringSettings } from "@/types/group";
import type { RegionData } from "@/types/tournament";
import type { SimulatorBracketData } from "@/types/simulator";
import type { LeaderboardEntry } from "@/types/scoring";
import { scoreBracket, maxPossibleRemaining, buildTeamSeedMap, countResolvedGames, computeStreak } from "@/lib/scoring";
import { CHAMPIONSHIP_GAME_ID, REGIONS } from "@/lib/bracket-constants";
import { getEliminatedTeams } from "@/lib/bracket-utils";
import type { FinalFourPick } from "@/types/scoring";

interface Props {
  brackets: SimulatorBracketData[];
  results: Results;
  settings: ScoringSettings;
  regions: RegionData[];
}

export default function SimulatorLeaderboard({ brackets, results, settings, regions }: Props) {
  const leaderboard = useMemo<LeaderboardEntry[]>(() => {
    const eliminated = getEliminatedTeams(results, regions);
    const seedMap = buildTeamSeedMap(regions);
    const totalResolved = countResolvedGames(results);
    const scores = brackets.map((b) => {
      const score = scoreBracket(b.bracketId, b.bracketName, b.username, b.userId, b.picks, results, settings, regions, b.tiebreaker, null);
      const championPick = b.picks[CHAMPIONSHIP_GAME_ID] ?? null;
      const busted = championPick !== null && eliminated.has(championPick);
      const maxRemaining = maxPossibleRemaining(b.picks, results, settings, eliminated);
      const correctPicks = score.rounds.reduce((sum, r) => sum + r.correct, 0);
      const streak = computeStreak(b.picks, results);
      const finalFourPicks: FinalFourPick[] = REGIONS.map((region) => {
        const team = b.picks[`${region}-3-0`] ?? null;
        return { region, team, seed: team ? (seedMap.get(team) ?? null) : null, eliminated: team !== null && eliminated.has(team) };
      });
      return { ...score, championPick, busted, maxPossible: score.total + maxRemaining, finalFourPicks, correctPicks, totalResolved, streak };
    });
    scores.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (a.tiebreakerDiff != null && b.tiebreakerDiff != null) return a.tiebreakerDiff - b.tiebreakerDiff;
      if (a.tiebreakerDiff != null) return -1;
      if (b.tiebreakerDiff != null) return 1;
      return 0;
    });
    const leaderScore = scores.length > 0 ? scores[0].total : 0;
    return scores.map((s, i) => {
      let rank = 1;
      if (i > 0) {
        const prev = scores[i - 1];
        rank = s.total === prev.total ? leaderboard[i - 1]?.rank ?? i + 1 : i + 1;
      }
      const percentile = scores.length > 1 ? Math.round(((scores.length - rank) / (scores.length - 1)) * 100) : 100;
      const isEliminated = s.maxPossible < leaderScore;
      const bestPossibleFinish = scores.filter((other) => other.total > s.maxPossible).length + 1;
      return { ...s, rank, percentile, eliminated: isEliminated, bestPossibleFinish, rankChange: null };
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
