import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logGroupActivity } from "@/lib/activity";
import { notifyGroupMembers } from "@/lib/notifications";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.user_id !== "number" || typeof body.group_id !== "number") {
    return NextResponse.json({ error: "user_id and group_id required" }, { status: 400 });
  }

  const { user_id, group_id, bracket_ids } = body as {
    user_id: number;
    group_id: number;
    bracket_ids?: number[];
  };

  const db = getDb();

  const targetUser = db.prepare("SELECT id, username FROM users WHERE id = ?").get(user_id) as { id: number; username: string } | undefined;
  if (!targetUser) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const group = db.prepare("SELECT id, name, max_brackets FROM groups WHERE id = ?").get(group_id) as { id: number; name: string; max_brackets: number } | undefined;
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  // Add as member if not already
  const existing = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(group_id, user_id);
  if (!existing) {
    db.prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(group_id, user_id);
    logGroupActivity(group_id, user_id, "member_joined");
    notifyGroupMembers(group_id, user_id, "member_joined", `👋 ${targetUser.username} was added to ${group.name}`, `/groups/${group_id}`);
  }

  // Assign brackets if provided
  let bracketsAdded = 0;
  if (bracket_ids && bracket_ids.length > 0) {
    for (const bid of bracket_ids) {
      const bracket = db.prepare("SELECT id, name, user_id FROM brackets WHERE id = ? AND user_id = ?").get(bid, user_id) as { id: number; name: string; user_id: number } | undefined;
      if (!bracket) continue;
      const alreadyIn = db.prepare("SELECT 1 FROM group_brackets WHERE group_id = ? AND bracket_id = ?").get(group_id, bid);
      if (alreadyIn) continue;
      db.prepare("INSERT INTO group_brackets (group_id, bracket_id) VALUES (?, ?)").run(group_id, bid);
      logGroupActivity(group_id, user_id, "bracket_added", { bracket_name: bracket.name });
      bracketsAdded++;
    }
  }

  return NextResponse.json({
    success: true,
    already_member: !!existing,
    brackets_added: bracketsAdded,
  });
}
