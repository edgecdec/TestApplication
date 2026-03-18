import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Bracket, Tournament } from "@/types/tournament";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { share_token } = await req.json();
  if (!share_token) return NextResponse.json({ error: "share_token is required" }, { status: 400 });

  const db = getDb();
  const source = db.prepare(
    "SELECT * FROM brackets WHERE share_token = ?"
  ).get(share_token) as Bracket | undefined;
  if (!source) return NextResponse.json({ error: "Source bracket not found" }, { status: 404 });

  const tournament = db.prepare(
    "SELECT * FROM tournaments WHERE id = ?"
  ).get(source.tournament_id) as Tournament | undefined;
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  if (new Date(tournament.lock_time) <= new Date()) {
    return NextResponse.json({ error: "Tournament is locked — cannot create new brackets" }, { status: 403 });
  }

  const name = `${source.name} (Template)`;
  const result = db.prepare(
    "INSERT INTO brackets (user_id, tournament_id, name, picks, tiebreaker) VALUES (?, ?, ?, ?, ?)"
  ).run(user.id, source.tournament_id, name, source.picks, source.tiebreaker);

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
