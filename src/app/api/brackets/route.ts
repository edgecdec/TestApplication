import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Bracket } from "@/types/tournament";

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tournamentId = req.nextUrl.searchParams.get("tournament_id");
  const db = getDb();

  if (tournamentId) {
    const brackets = db.prepare(
      "SELECT * FROM brackets WHERE user_id = ? AND tournament_id = ? ORDER BY created_at DESC"
    ).all(user.id, tournamentId) as Bracket[];
    return NextResponse.json({ brackets });
  }

  const brackets = db.prepare(
    "SELECT * FROM brackets WHERE user_id = ? ORDER BY created_at DESC"
  ).all(user.id) as Bracket[];
  return NextResponse.json({ brackets });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { tournament_id, name } = body;

  if (!tournament_id || !name) {
    return NextResponse.json({ error: "tournament_id and name are required" }, { status: 400 });
  }

  const db = getDb();
  const tournament = db.prepare("SELECT id FROM tournaments WHERE id = ?").get(tournament_id);
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const result = db.prepare(
    "INSERT INTO brackets (user_id, tournament_id, name) VALUES (?, ?, ?)"
  ).run(user.id, tournament_id, name);

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
