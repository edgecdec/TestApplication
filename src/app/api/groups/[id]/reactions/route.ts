import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { REACTION_EMOJIS } from "@/types/reactions";
import type { ReactionEmoji, BracketReactions, ReactionCount } from "@/types/reactions";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const rows = db.prepare(
    "SELECT bracket_id, emoji, COUNT(*) as count, SUM(CASE WHEN user_id = ? THEN 1 ELSE 0 END) as reacted FROM bracket_reactions WHERE group_id = ? GROUP BY bracket_id, emoji"
  ).all(user.id, id) as { bracket_id: number; emoji: string; count: number; reacted: number }[];

  const reactions: BracketReactions = {};
  for (const row of rows) {
    if (!reactions[row.bracket_id]) reactions[row.bracket_id] = [];
    reactions[row.bracket_id].push({
      emoji: row.emoji as ReactionEmoji,
      count: row.count,
      reacted: row.reacted > 0,
    });
  }

  return NextResponse.json({ reactions });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const { bracketId, emoji } = await req.json() as { bracketId: number; emoji: string };

  if (!REACTION_EMOJIS.includes(emoji as ReactionEmoji)) {
    return NextResponse.json({ error: "Invalid emoji" }, { status: 400 });
  }

  const db = getDb();

  // Verify user is a member of this group
  const member = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(id, user.id);
  if (!member) return NextResponse.json({ error: "Not a group member" }, { status: 403 });

  // Toggle: if exists, delete; otherwise insert
  const existing = db.prepare(
    "SELECT id FROM bracket_reactions WHERE group_id = ? AND bracket_id = ? AND user_id = ? AND emoji = ?"
  ).get(id, bracketId, user.id, emoji) as { id: number } | undefined;

  if (existing) {
    db.prepare("DELETE FROM bracket_reactions WHERE id = ?").run(existing.id);
    return NextResponse.json({ action: "removed" });
  }

  db.prepare(
    "INSERT INTO bracket_reactions (group_id, bracket_id, user_id, emoji) VALUES (?, ?, ?, ?)"
  ).run(id, bracketId, user.id, emoji);

  return NextResponse.json({ action: "added" });
}
