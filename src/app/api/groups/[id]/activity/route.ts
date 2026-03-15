import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

const ACTIVITY_LIMIT = 50;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const { id } = await params;
  const db = getDb();

  const member = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(id, user.id);
  if (!member) return NextResponse.json({ error: "Not a member" }, { status: 403 });

  const activities = db.prepare(`
    SELECT ga.id, ga.group_id, ga.user_id, u.username, ga.activity_type, ga.metadata, ga.created_at
    FROM group_activity ga
    JOIN users u ON u.id = ga.user_id
    WHERE ga.group_id = ?
    ORDER BY ga.created_at DESC
    LIMIT ?
  `).all(id, ACTIVITY_LIMIT);

  return NextResponse.json({ activities });
}
