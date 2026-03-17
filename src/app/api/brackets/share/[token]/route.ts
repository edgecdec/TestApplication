import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { Bracket, Tournament } from "@/types/tournament";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const db = getDb();

  const bracket = db.prepare(
    "SELECT b.*, u.username FROM brackets b JOIN users u ON b.user_id = u.id WHERE b.share_token = ?"
  ).get(token) as (Bracket & { username: string }) | undefined;

  if (!bracket) return NextResponse.json({ error: "Bracket not found" }, { status: 404 });

  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(bracket.tournament_id) as Tournament | undefined;
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  return NextResponse.json({
    bracket: { id: bracket.id, name: bracket.name, picks: bracket.picks, tiebreaker: bracket.tiebreaker, username: bracket.username, notes: bracket.notes || "" },
    tournament: { name: tournament.name, year: tournament.year, bracket_data: tournament.bracket_data, results_data: tournament.results_data },
  });
}
