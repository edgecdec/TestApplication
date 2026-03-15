import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { notifyGroupMembers } from "@/lib/notifications";
import type { GroupMessage } from "@/types/chat";

const MAX_MESSAGE_LENGTH = 500;
const MESSAGES_LIMIT = 50;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const member = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(id, user.id);
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const messages = db.prepare(`
    SELECT gm.id, gm.group_id, gm.user_id, u.username, gm.message, gm.created_at
    FROM group_messages gm
    JOIN users u ON u.id = gm.user_id
    WHERE gm.group_id = ?
    ORDER BY gm.created_at DESC
    LIMIT ?
  `).all(id, MESSAGES_LIMIT) as GroupMessage[];

  return NextResponse.json({ messages: messages.reverse() });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const member = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(id, user.id);
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const body = await req.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: "Invalid message" }, { status: 400 });
  }

  const result = db.prepare("INSERT INTO group_messages (group_id, user_id, message) VALUES (?, ?, ?)").run(id, user.id, message);

  const groupRow = db.prepare("SELECT name FROM groups WHERE id = ?").get(id) as { name: string } | undefined;
  const preview = message.length > 50 ? message.slice(0, 47) + "..." : message;
  notifyGroupMembers(Number(id), user.id, "chat_message", `💬 ${user.username} in ${groupRow?.name ?? "group"}: ${preview}`, `/groups/${id}`);

  return NextResponse.json({ id: result.lastInsertRowid });
}
