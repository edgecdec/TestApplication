import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scoreBracket, maxPossibleRemaining, buildTeamSeedMap, countResolvedGames, computeStreak } from "@/lib/scoring";
import { parseBracketData, getEliminatedTeams } from "@/lib/bracket-utils";
import { DEFAULT_SCORING, CHAMPIONSHIP_GAME_ID, REGIONS } from "@/lib/bracket-constants";
import type { Tournament, RegionData, BracketRow } from "@/types/tournament";
import type { LeaderboardEntry, FinalFourPick } from "@/types/scoring";
import type { Picks, Results } from "@/types/bracket";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(id) as Tournament | undefined;
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const regions: RegionData[] = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data);
  const eliminatedTeams = getEliminatedTeams(results, regions);
  const seedMap = buildTeamSeedMap(regions);
  const totalResolved = countResolvedGames(results);

  const brackets = db.prepare(
    "SELECT b.*, u.username FROM brackets b JOIN users u ON u.id = b.user_id WHERE b.tournament_id = ?"
  ).all(id) as BracketRow[];

  if (brackets.length === 0) {
    return NextResponse.json({ leaderboard: [] });
  }

  const settings = DEFAULT_SCORING;

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
    const score = scoreBracket(
      b.id, b.name, b.username ?? "", b.user_id,
      picks, results, settings, regions,
      b.tiebreaker, null
    );
    const maxRemaining = maxPossibleRemaining(picks, results, settings, eliminatedTeams);
    const correctPicks = score.rounds.reduce((sum, r) => sum + r.correct, 0);
    const streak = computeStreak(picks, results);
    return { ...score, championPick, busted, maxPossible: score.total + maxRemaining, finalFourPicks, correctPicks, totalResolved, streak };
  });

  scored.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a.tiebreakerDiff != null && b.tiebreakerDiff != null) return a.tiebreakerDiff - b.tiebreakerDiff;
    if (a.tiebreakerDiff != null) return -1;
    if (b.tiebreakerDiff != null) return 1;
    return 0;
  });

  const leaderScore = scored.length > 0 ? scored[0].total : 0;

  const leaderboard: LeaderboardEntry[] = [];
  for (let i = 0; i < scored.length; i++) {
    const s = scored[i];
    let rank = 1;
    if (i > 0) {
      const prev = scored[i - 1];
      if (s.total === prev.total && s.tiebreakerDiff === prev.tiebreakerDiff) {
        rank = leaderboard[i - 1].rank;
      } else {
        rank = i + 1;
      }
    }
    const percentile = scored.length > 1
      ? Math.round(((scored.length - rank) / (scored.length - 1)) * 100)
      : 100;
    const eliminated = s.maxPossible < leaderScore;
    const bestPossibleFinish = scored.filter((other) => other.total > s.maxPossible).length + 1;
    leaderboard.push({ ...s, rank, percentile, eliminated, bestPossibleFinish });
  }

  return NextResponse.json({ leaderboard });
}
