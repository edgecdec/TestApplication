import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { TOTAL_GAMES } from "@/lib/bracket-constants";

export interface MemberStatus {
  username: string;
  userId: number;
  brackets: { id: number; name: string; pickCount: number }[];
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const member = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(id, user.id);
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  // Get all members
  const members = db.prepare(`
    SELECT u.id as userId, u.username
    FROM group_members gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ?
    ORDER BY u.username
  `).all(id) as { userId: number; username: string }[];

  // Get all brackets in this group with pick counts
  const groupBrackets = db.prepare(`
    SELECT b.id, b.name, b.user_id, b.picks
    FROM group_brackets gb
    JOIN brackets b ON b.id = gb.bracket_id
    WHERE gb.group_id = ?
  `).all(id) as { id: number; name: string; user_id: number; picks: string }[];

  // Get lock time from tournament (use first bracket's tournament)
  let lockTime: string | null = null;
  if (groupBrackets.length > 0) {
    const t = db.prepare(
      "SELECT lock_time FROM tournaments WHERE id = (SELECT tournament_id FROM brackets WHERE id = ? LIMIT 1)"
    ).get(groupBrackets[0].id) as { lock_time: string } | undefined;
    lockTime = t?.lock_time ?? null;
  } else {
    // No brackets yet — try to get lock time from any tournament
    const t = db.prepare("SELECT lock_time FROM tournaments ORDER BY id DESC LIMIT 1").get() as { lock_time: string } | undefined;
    lockTime = t?.lock_time ?? null;
  }

  const result: MemberStatus[] = members.map((m) => {
    const userBrackets = groupBrackets
      .filter((b) => b.user_id === m.userId)
      .map((b) => {
        let pickCount = 0;
        try {
          const parsed = typeof b.picks === "string" ? JSON.parse(b.picks) : b.picks;
          pickCount = parsed && typeof parsed === "object" ? Object.keys(parsed).length : 0;
        } catch { /* empty */ }
        return { id: b.id, name: b.name, pickCount };
      });
    return { username: m.username, userId: m.userId, brackets: userBrackets };
  });

  return NextResponse.json({ members: result, totalGames: TOTAL_GAMES, lockTime });
}
