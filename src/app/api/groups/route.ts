import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { generateInviteCode } from "@/lib/invite";
import { DEFAULT_SCORING } from "@/lib/bracket-constants";
import type { Group } from "@/types/group";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = getDb();
  const groups = db.prepare(`
    SELECT g.*, COUNT(gm2.user_id) as member_count, u.username as creator_name
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
    JOIN users u ON u.id = g.created_by
    LEFT JOIN group_members gm2 ON gm2.group_id = g.id
    GROUP BY g.id
    ORDER BY g.created_at DESC
  `).all(user.id);

  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = await req.json();
  const { name, scoring_settings, max_brackets, description } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Group name is required" }, { status: 400 });
  }

  const db = getDb();
  const inviteCode = generateInviteCode();

  const result = db.prepare(
    "INSERT INTO groups (name, invite_code, scoring_settings, max_brackets, description, created_by) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(
    name.trim(),
    inviteCode,
    scoring_settings ? (typeof scoring_settings === "string" ? scoring_settings : JSON.stringify(scoring_settings)) : JSON.stringify(DEFAULT_SCORING),
    max_brackets || 1,
    (description || "").trim(),
    user.id
  );

  const groupId = result.lastInsertRowid;
  db.prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(groupId, user.id);

  return NextResponse.json({ id: groupId, invite_code: inviteCode }, { status: 201 });
}
