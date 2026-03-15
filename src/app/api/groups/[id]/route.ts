import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Group } from "@/types/group";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const group = db.prepare(`
    SELECT g.*, COUNT(gm.user_id) as member_count, u.username as creator_name
    FROM groups g
    JOIN users u ON u.id = g.created_by
    LEFT JOIN group_members gm ON gm.group_id = g.id
    WHERE g.id = ?
    GROUP BY g.id
  `).get(id) as (Group & { member_count: number; creator_name: string }) | undefined;

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  return NextResponse.json({ group });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(id) as Group | undefined;

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  if (group.created_by !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "Only the group creator can edit" }, { status: 403 });
  }

  const body = await req.json();
  const { scoring_settings, max_brackets, name } = body;

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (name !== undefined) { fields.push("name = ?"); values.push(name); }
  if (scoring_settings !== undefined) { fields.push("scoring_settings = ?"); values.push(typeof scoring_settings === "string" ? scoring_settings : JSON.stringify(scoring_settings)); }
  if (max_brackets !== undefined) { fields.push("max_brackets = ?"); values.push(max_brackets); }

  if (fields.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(Number(id));
  db.prepare(`UPDATE groups SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return NextResponse.json({ success: true });
}
