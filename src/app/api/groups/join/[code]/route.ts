import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logGroupActivity } from "@/lib/activity";
import type { Group } from "@/types/group";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const db = getDb();

  const group = db.prepare(`
    SELECT g.id, g.name, g.invite_code, COUNT(gm.user_id) as member_count, u.username as creator_name
    FROM groups g
    JOIN users u ON u.id = g.created_by
    LEFT JOIN group_members gm ON gm.group_id = g.id
    WHERE g.invite_code = ?
    GROUP BY g.id
  `).get(code) as (Pick<Group, "id" | "name" | "invite_code"> & { member_count: number; creator_name: string }) | undefined;

  if (!group) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  return NextResponse.json({ group });
}

export async function POST(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { code } = await params;
  const db = getDb();

  const group = db.prepare("SELECT id FROM groups WHERE invite_code = ?").get(code) as { id: number } | undefined;
  if (!group) {
    return NextResponse.json({ error: "Invalid invite code" }, { status: 404 });
  }

  const existing = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(group.id, user.id);
  if (existing) {
    return NextResponse.json({ id: group.id, message: "Already a member" });
  }

  db.prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(group.id, user.id);
  logGroupActivity(group.id, user.id, "member_joined");

  return NextResponse.json({ id: group.id }, { status: 201 });
}
