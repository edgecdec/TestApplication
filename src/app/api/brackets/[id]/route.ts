import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Bracket } from "@/types/tournament";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const bracket = db.prepare(
    "SELECT b.*, u.username FROM brackets b JOIN users u ON b.user_id = u.id WHERE b.id = ?"
  ).get(id) as (Bracket & { username: string }) | undefined;

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
  }
  return NextResponse.json({ bracket });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const bracket = db.prepare("SELECT * FROM brackets WHERE id = ?").get(id) as Bracket | undefined;

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

  const body = await req.json();
  const { picks, tiebreaker, name } = body;

  const fields: string[] = ["updated_at = datetime('now')"];
  const values: (string | number | null)[] = [];

  if (picks !== undefined) { fields.push("picks = ?"); values.push(typeof picks === "string" ? picks : JSON.stringify(picks)); }
  if (tiebreaker !== undefined) { fields.push("tiebreaker = ?"); values.push(tiebreaker); }
  if (name !== undefined) { fields.push("name = ?"); values.push(name); }

  values.push(Number(id));
  db.prepare(`UPDATE brackets SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const bracket = db.prepare("SELECT * FROM brackets WHERE id = ?").get(id) as Bracket | undefined;

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
  }
  if (bracket.user_id !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  db.prepare("DELETE FROM group_brackets WHERE bracket_id = ?").run(id);
  db.prepare("DELETE FROM brackets WHERE id = ?").run(id);

  return NextResponse.json({ success: true });
}
