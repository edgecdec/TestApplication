import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseBracketData } from "@/lib/bracket-utils";
import { computeAchievements, type Achievement } from "@/lib/achievements";
import type { Tournament, BracketRow } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";

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
    return NextResponse.json({ achievements: {} });
  }

  const regions = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data);

  if (Object.keys(results).length === 0) {
    return NextResponse.json({ achievements: {} });
  }

  const brackets = db.prepare(
    "SELECT id, picks FROM brackets WHERE tournament_id = ? AND user_id = ?"
  ).all(tournamentId, user.id) as Pick<BracketRow, "id" | "picks">[];

  const achievements: Record<number, Achievement[]> = {};
  for (const b of brackets) {
    const picks: Picks = JSON.parse(b.picks);
    const list = computeAchievements(picks, results, regions);
    if (list.length > 0) {
      achievements[b.id] = list;
    }
  }

  return NextResponse.json({ achievements });
}
