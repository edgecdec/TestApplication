import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Bracket } from "@/types/tournament";
import type { BracketHistoryEntry } from "@/types/bracket";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const bracket = db.prepare("SELECT user_id FROM brackets WHERE id = ?").get(Number(id)) as Pick<Bracket, "user_id"> | undefined;

  if (!bracket) {
    return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
  }
  if (bracket.user_id !== user.id) {
    return NextResponse.json({ error: "Not your bracket" }, { status: 403 });
  }

  const history = db.prepare(
    "SELECT id, bracket_id, picks, tiebreaker, changed_at FROM bracket_history WHERE bracket_id = ? ORDER BY changed_at DESC LIMIT 50"
  ).all(Number(id)) as BracketHistoryEntry[];

  return NextResponse.json({ history });
}
