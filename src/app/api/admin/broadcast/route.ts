import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { notifyAllUsers } from "@/lib/notifications";

const MAX_MESSAGE_LENGTH = 500;

/** POST /api/admin/broadcast — send a notification to all users */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const db = getDb();
  const row = db.prepare("SELECT is_admin FROM users WHERE id = ?").get(user.id) as { is_admin: number } | undefined;
  if (!row?.is_admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

  const body = await req.json();
  const message = typeof body.message === "string" ? body.message.trim() : "";
  const link = typeof body.link === "string" ? body.link.trim() : "";

  if (!message) return NextResponse.json({ error: "Message is required" }, { status: 400 });
  if (message.length > MAX_MESSAGE_LENGTH) {
    return NextResponse.json({ error: `Message must be ${MAX_MESSAGE_LENGTH} characters or less` }, { status: 400 });
  }

  const count = notifyAllUsers(`📢 ${message}`, link);
  return NextResponse.json({ success: true, notified: count });
}
