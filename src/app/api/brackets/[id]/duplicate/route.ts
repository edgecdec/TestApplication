import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Bracket } from "@/types/tournament";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const bracket = db.prepare("SELECT * FROM brackets WHERE id = ?").get(Number(id)) as Bracket | undefined;

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
  }
  if (bracket.user_id !== user.id) {
    return NextResponse.json({ error: "Not your bracket" }, { status: 403 });
  }

  const tournament = db.prepare("SELECT lock_time FROM tournaments WHERE id = ?").get(bracket.tournament_id) as { lock_time: string } | undefined;
  if (tournament && new Date(tournament.lock_time) <= new Date()) {
    return NextResponse.json({ error: "Tournament is locked" }, { status: 403 });
  }

  const newName = `${bracket.name} (Copy)`;
  const result = db.prepare(
    "INSERT INTO brackets (user_id, tournament_id, name, picks, tiebreaker) VALUES (?, ?, ?, ?, ?)"
  ).run(user.id, bracket.tournament_id, newName, bracket.picks, bracket.tiebreaker);

  return NextResponse.json({ id: result.lastInsertRowid, name: newName });
}
