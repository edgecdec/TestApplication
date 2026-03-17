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
  const { scoring_settings, max_brackets, name, description, buy_in, payout_structure, payment_link, announcement, submissions_locked } = body;

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (name !== undefined) { fields.push("name = ?"); values.push(name); }
  if (description !== undefined) { fields.push("description = ?"); values.push(description); }
  if (announcement !== undefined) { fields.push("announcement = ?"); values.push(String(announcement)); }
  if (scoring_settings !== undefined) { fields.push("scoring_settings = ?"); values.push(typeof scoring_settings === "string" ? scoring_settings : JSON.stringify(scoring_settings)); }
  if (max_brackets !== undefined) { fields.push("max_brackets = ?"); values.push(max_brackets); }
  if (buy_in !== undefined) { fields.push("buy_in = ?"); values.push(Number(buy_in)); }
  if (payout_structure !== undefined) { fields.push("payout_structure = ?"); values.push(typeof payout_structure === "string" ? payout_structure : JSON.stringify(payout_structure)); }
  if (payment_link !== undefined) { fields.push("payment_link = ?"); values.push(String(payment_link)); }
  if (submissions_locked !== undefined) { fields.push("submissions_locked = ?"); values.push(submissions_locked ? 1 : 0); }

  if (fields.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(Number(id));
  db.prepare(`UPDATE groups SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return NextResponse.json({ success: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const db = getDb();
  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(id) as Group | undefined;

  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });
  if (group.created_by !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "Only the group creator can delete this group" }, { status: 403 });
  }

  const deleteAll = db.transaction(() => {
    // Delete prediction votes via predictions
    const predIds = db.prepare("SELECT id FROM group_predictions WHERE group_id = ?").all(Number(id)) as { id: number }[];
    if (predIds.length > 0) {
      const ph = predIds.map(() => "?").join(",");
      db.prepare(`DELETE FROM prediction_votes WHERE prediction_id IN (${ph})`).run(...predIds.map(p => p.id));
    }
    db.prepare("DELETE FROM group_predictions WHERE group_id = ?").run(Number(id));
    db.prepare("DELETE FROM bracket_reactions WHERE group_id = ?").run(Number(id));
    db.prepare("DELETE FROM group_activity WHERE group_id = ?").run(Number(id));
    db.prepare("DELETE FROM group_messages WHERE group_id = ?").run(Number(id));
    db.prepare("DELETE FROM group_brackets WHERE group_id = ?").run(Number(id));
    db.prepare("DELETE FROM group_members WHERE group_id = ?").run(Number(id));
    db.prepare("DELETE FROM groups WHERE id = ?").run(Number(id));
  });

  deleteAll();
  return NextResponse.json({ success: true });
}
