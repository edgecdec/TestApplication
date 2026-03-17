import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scoreBracket, maxPossibleRemaining, buildTeamSeedMap, countResolvedGames, computeStreak, getCurrentRound, filterResultsBeforeRound, filterResultsThroughRound, getCompletedRounds, scorePicks, computeLuckScore } from "@/lib/scoring";
import { parseBracketData, getEliminatedTeams } from "@/lib/bracket-utils";
import type { ScoringSettings } from "@/types/group";
import type { Bracket, Tournament, RegionData } from "@/types/tournament";
import type { LeaderboardEntry, FinalFourPick } from "@/types/scoring";
import type { Picks, Results } from "@/types/bracket";
import { CHAMPIONSHIP_GAME_ID, REGIONS } from "@/lib/bracket-constants";

interface BracketWithUser extends Bracket {
  username: string;
}

interface GroupRow {
  scoring_settings: string;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const group = db.prepare("SELECT scoring_settings FROM groups WHERE id = ?").get(id) as GroupRow | undefined;
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const settings: ScoringSettings = JSON.parse(group.scoring_settings);

  const brackets = db.prepare(`
    SELECT b.*, u.username, gb.paid
    FROM group_brackets gb
    JOIN brackets b ON b.id = gb.bracket_id
    JOIN users u ON u.id = b.user_id
    WHERE gb.group_id = ?
  `).all(id) as (BracketWithUser & { paid: number })[];

  if (brackets.length === 0) {
    return NextResponse.json({ leaderboard: [], actualTotal: null, completedRounds: [] });
  }

  const tournamentId = brackets[0].tournament_id;
  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(tournamentId) as Tournament | undefined;
  if (!tournament) {
    return NextResponse.json({ leaderboard: [], actualTotal: null, completedRounds: [] });
  }

  const regions: RegionData[] = parseBracketData(tournament.bracket_data);
  const fullResults: Results = JSON.parse(tournament.results_data);
  const completedRounds = getCompletedRounds(fullResults);

  // Support ?asOfRound=N to view historical standings
  const asOfRoundParam = req.nextUrl.searchParams.get("asOfRound");
  const asOfRound = asOfRoundParam != null ? parseInt(asOfRoundParam, 10) : null;
  const isHistorical = asOfRound != null && !isNaN(asOfRound);

  const results: Results = isHistorical ? filterResultsThroughRound(fullResults, asOfRound) : fullResults;
  const eliminatedTeams = getEliminatedTeams(results, regions);
  const seedMap = buildTeamSeedMap(regions);
  const actualTotal: number | null = null;
  const totalResolved = countResolvedGames(results);

  // Compute pick distribution from all tournament brackets for luck score
  const allBracketRows = db.prepare("SELECT picks FROM brackets WHERE tournament_id = ?").all(tournamentId) as { picks: string }[];
  const distCounts: Record<string, Record<string, number>> = {};
  for (const row of allBracketRows) {
    const p = JSON.parse(row.picks) as Picks;
    for (const [gId, team] of Object.entries(p)) {
      if (!distCounts[gId]) distCounts[gId] = {};
      distCounts[gId][team] = (distCounts[gId][team] || 0) + 1;
    }
  }
  const distTotal = allBracketRows.length;
  const distribution: Record<string, Record<string, number>> = {};
  for (const [gId, teamCounts] of Object.entries(distCounts)) {
    distribution[gId] = {};
    for (const [team, count] of Object.entries(teamCounts)) {
      distribution[gId][team] = Math.round((count / distTotal) * 100);
    }
  }

  function getFinalFourPicks(picks: Picks): FinalFourPick[] {
    return REGIONS.map((region) => {
      const team = picks[`${region}-3-0`] ?? null;
      return {
        region,
        team,
        seed: team ? (seedMap.get(team) ?? null) : null,
        eliminated: team !== null && eliminatedTeams.has(team),
      };
    });
  }

  const scored = brackets.map((b) => {
    const picks: Picks = JSON.parse(b.picks);
    const championPick = picks[CHAMPIONSHIP_GAME_ID] ?? null;
    const busted = championPick !== null && eliminatedTeams.has(championPick);
    const finalFourPicks = getFinalFourPicks(picks);
    const semifinalPicks: [string | null, string | null] = [picks["ff-4-0"] ?? null, picks["ff-4-1"] ?? null];
    const score = scoreBracket(
      b.id, b.name, b.username, b.user_id,
      picks, results, settings, regions,
      b.tiebreaker, actualTotal
    );
    const maxRemaining = isHistorical ? 0 : maxPossibleRemaining(picks, results, settings, eliminatedTeams);
    const correctPicks = score.rounds.reduce((sum, r) => sum + r.correct, 0);
    const streak = computeStreak(picks, results);
    const luckScore = totalResolved > 0 ? computeLuckScore(picks, results, settings, distribution) : null;
    return { ...score, championPick, busted, maxPossible: score.total + maxRemaining, finalFourPicks, semifinalPicks, correctPicks, totalResolved, streak, paid: !!b.paid, isSecondChance: !!b.is_second_chance, luckScore };
  });

  scored.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a.tiebreakerDiff != null && b.tiebreakerDiff != null) {
      return a.tiebreakerDiff - b.tiebreakerDiff;
    }
    if (a.tiebreakerDiff != null) return -1;
    if (b.tiebreakerDiff != null) return 1;
    return 0;
  });

  const leaderScore = scored.length > 0 ? scored[0].total : 0;

  const leaderboard: LeaderboardEntry[] = scored.map((s, i) => {
    let rank = 1;
    if (i > 0) {
      const prev = scored[i - 1];
      if (s.total === prev.total && s.tiebreakerDiff === prev.tiebreakerDiff) {
        rank = (leaderboard[i - 1] as LeaderboardEntry).rank;
      } else {
        rank = i + 1;
      }
    }
    const percentile = scored.length > 1
      ? Math.round(((scored.length - rank) / (scored.length - 1)) * 100)
      : 100;
    const eliminated = isHistorical ? false : s.maxPossible < leaderScore;
    const bestPossibleFinish = isHistorical ? rank : scored.filter((other) => other.total > s.maxPossible).length + 1;

    return { ...s, rank, percentile, eliminated, bestPossibleFinish, rankChange: null as number | null };
  });

  // Compute previous-round rankings for rank movement indicators
  const currentRound = getCurrentRound(results);
  if (currentRound > 0) {
    const prevResults = filterResultsBeforeRound(results, currentRound);
    const prevScored = brackets.map((b) => {
      const picks: Picks = JSON.parse(b.picks);
      const total = scorePicks(picks, prevResults, settings, regions).reduce((sum, r) => sum + r.points, 0);
      return { bracketId: b.id, total };
    });
    prevScored.sort((a, b) => b.total - a.total);
    const prevRankMap = new Map<number, number>();
    for (let i = 0; i < prevScored.length; i++) {
      const rank = i > 0 && prevScored[i].total === prevScored[i - 1].total
        ? (prevRankMap.get(prevScored[i - 1].bracketId) ?? i + 1)
        : i + 1;
      prevRankMap.set(prevScored[i].bracketId, rank);
    }
    for (const entry of leaderboard) {
      const prevRank = prevRankMap.get(entry.bracketId);
      if (prevRank != null) entry.rankChange = prevRank - entry.rank;
    }
  }

  return NextResponse.json({ leaderboard, actualTotal, completedRounds });
}
