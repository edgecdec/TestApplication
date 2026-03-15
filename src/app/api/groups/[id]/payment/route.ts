import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Group } from "@/types/group";

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const db = getDb();
  const group = db.prepare("SELECT created_by FROM groups WHERE id = ?").get(id) as Pick<Group, "created_by"> | undefined;

  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }
  if (group.created_by !== user.id && !user.isAdmin) {
    return NextResponse.json({ error: "Only the group creator or admin can manage payments" }, { status: 403 });
  }

  const body = await req.json();
  const { bracket_id, paid } = body;

  if (typeof bracket_id !== "number" || typeof paid !== "boolean") {
    return NextResponse.json({ error: "bracket_id (number) and paid (boolean) required" }, { status: 400 });
  }

  const row = db.prepare("SELECT 1 FROM group_brackets WHERE group_id = ? AND bracket_id = ?").get(id, bracket_id);
  if (!row) {
    return NextResponse.json({ error: "Bracket not in this group" }, { status: 404 });
  }

  db.prepare("UPDATE group_brackets SET paid = ? WHERE group_id = ? AND bracket_id = ?").run(paid ? 1 : 0, id, bracket_id);

  return NextResponse.json({ success: true });
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const rows = db.prepare(`
    SELECT gb.bracket_id, gb.paid, b.name AS bracket_name, u.username, u.id AS user_id
    FROM group_brackets gb
    JOIN brackets b ON b.id = gb.bracket_id
    JOIN users u ON u.id = b.user_id
    WHERE gb.group_id = ?
    ORDER BY u.username, b.name
  `).all(id) as { bracket_id: number; paid: number; bracket_name: string; username: string; user_id: number }[];

  return NextResponse.json({
    payments: rows.map(r => ({
      bracketId: r.bracket_id,
      bracketName: r.bracket_name,
      username: r.username,
      userId: r.user_id,
      paid: !!r.paid,
    })),
  });
}
