import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Group } from "@/types/group";
import type { Bracket } from "@/types/tournament";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const brackets = db.prepare(`
    SELECT b.*, u.username
    FROM group_brackets gb
    JOIN brackets b ON b.id = gb.bracket_id
    JOIN users u ON u.id = b.user_id
    WHERE gb.group_id = ?
    ORDER BY u.username, b.name
  `).all(id);

  return NextResponse.json({ brackets });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { bracket_id } = body;

  if (!bracket_id) {
    return NextResponse.json({ error: "bracket_id is required" }, { status: 400 });
  }

  const db = getDb();

  const member = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(id, user.id);
  if (!member) {
    return NextResponse.json({ error: "Not a member of this group" }, { status: 403 });
  }

  const bracket = db.prepare("SELECT * FROM brackets WHERE id = ?").get(bracket_id) as Bracket | undefined;
  if (!bracket || bracket.user_id !== user.id) {
    return NextResponse.json({ error: "Bracket not found or not yours" }, { status: 404 });
  }

  const group = db.prepare("SELECT max_brackets FROM groups WHERE id = ?").get(id) as Pick<Group, "max_brackets"> | undefined;
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const currentCount = db.prepare(
    "SELECT COUNT(*) as count FROM group_brackets gb JOIN brackets b ON b.id = gb.bracket_id WHERE gb.group_id = ? AND b.user_id = ?"
  ).get(id, user.id) as { count: number };

  if (currentCount.count >= group.max_brackets) {
    return NextResponse.json({ error: `Max ${group.max_brackets} bracket(s) per group` }, { status: 400 });
  }

  const existing = db.prepare("SELECT 1 FROM group_brackets WHERE group_id = ? AND bracket_id = ?").get(id, bracket_id);
  if (existing) {
    return NextResponse.json({ message: "Bracket already in group" });
  }

  db.prepare("INSERT INTO group_brackets (group_id, bracket_id) VALUES (?, ?)").run(id, bracket_id);

  return NextResponse.json({ success: true }, { status: 201 });
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const body = await req.json();
  const { bracket_id } = body;

  if (!bracket_id) {
    return NextResponse.json({ error: "bracket_id is required" }, { status: 400 });
  }

  const db = getDb();

  const bracket = db.prepare("SELECT user_id FROM brackets WHERE id = ?").get(bracket_id) as { user_id: number } | undefined;
  const group = db.prepare("SELECT created_by FROM groups WHERE id = ?").get(id) as { created_by: number } | undefined;

  if (!bracket || !group) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = bracket.user_id === user.id;
  const isGroupCreator = group.created_by === user.id;
  if (!isOwner && !isGroupCreator && !user.isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  db.prepare("DELETE FROM group_brackets WHERE group_id = ? AND bracket_id = ?").run(id, bracket_id);

  return NextResponse.json({ success: true });
}
