import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { getCurrentRound } from "@/lib/scoring";
import type { Results } from "@/types/bracket";

/** Create a second chance bracket pre-filled with actual results for completed games. */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { tournament_id, name } = await req.json();
  if (!tournament_id || !name) {
    return NextResponse.json({ error: "tournament_id and name are required" }, { status: 400 });
  }

  const db = getDb();
  const tournament = db.prepare(
    "SELECT id, results_data FROM tournaments WHERE id = ?"
  ).get(tournament_id) as { id: number; results_data: string } | undefined;

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const results: Results = JSON.parse(tournament.results_data || "{}");
  const currentRound = getCurrentRound(results);

  if (currentRound < 1) {
    return NextResponse.json({ error: "Tournament must have completed at least Round of 64 for second chance" }, { status: 400 });
  }

  // Pre-fill picks with all resolved game results
  const prefilled: Results = { ...results };

  const result = db.prepare(
    "INSERT INTO brackets (user_id, tournament_id, name, picks, is_second_chance, second_chance_round) VALUES (?, ?, ?, ?, 1, ?)"
  ).run(user.id, tournament_id, name, JSON.stringify(prefilled), currentRound);

  return NextResponse.json({ id: result.lastInsertRowid, secondChanceRound: currentRound }, { status: 201 });
}
