import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { scorePicks, countResolvedGames } from "@/lib/scoring";
import { parseBracketData } from "@/lib/bracket-utils";
import { DEFAULT_SCORING } from "@/lib/bracket-constants";
import { computeGrade } from "@/lib/grading";
import type { Tournament, BracketRow } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { BracketGradeInfo } from "@/lib/grading";

export interface GradeResponse {
  grades: Record<number, BracketGradeInfo & { percentile: number; correctPicks: number; totalResolved: number }>;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tournamentId = req.nextUrl.searchParams.get("tournament_id");
  if (!tournamentId) {
    return NextResponse.json({ error: "tournament_id required" }, { status: 400 });
  }

  const db = getDb();
  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(tournamentId) as Tournament | undefined;
  if (!tournament) {
    return NextResponse.json({ grades: {} });
  }

  const regions = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data);
  const totalResolved = countResolvedGames(results);

  if (totalResolved === 0) {
    return NextResponse.json({ grades: {} });
  }

  // Score ALL brackets to compute percentiles
  const allBrackets = db.prepare(
    "SELECT id, user_id, picks FROM brackets WHERE tournament_id = ?"
  ).all(tournamentId) as Pick<BracketRow, "id" | "user_id" | "picks">[];

  const scores = allBrackets.map((b) => {
    const picks: Picks = JSON.parse(b.picks);
    const rounds = scorePicks(picks, results, DEFAULT_SCORING, regions);
    const total = rounds.reduce((s, r) => s + r.points, 0);
    const correct = rounds.reduce((s, r) => s + r.correct, 0);
    return { id: b.id, userId: b.user_id, total, correct };
  });

  scores.sort((a, b) => b.total - a.total);

  // Assign ranks
  const ranks = new Map<number, number>();
  for (let i = 0; i < scores.length; i++) {
    const rank = i > 0 && scores[i].total === scores[i - 1].total
      ? (ranks.get(scores[i - 1].id) ?? i + 1)
      : i + 1;
    ranks.set(scores[i].id, rank);
  }

  const grades: GradeResponse["grades"] = {};
  const count = scores.length;

  for (const s of scores) {
    if (s.userId !== user.id) continue;
    const rank = ranks.get(s.id) ?? count;
    const percentile = count > 1
      ? Math.round(((count - rank) / (count - 1)) * 100)
      : 100;
    const g = computeGrade(percentile);
    grades[s.id] = { ...g, percentile, correctPicks: s.correct, totalResolved };
  }

  return NextResponse.json({ grades });
}
