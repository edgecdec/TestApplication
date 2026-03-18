import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BCRYPT_ROUNDS, PASSWORD_MIN_LENGTH } from "@/lib/constants";

interface UserListRow {
  id: number;
  username: string;
  is_admin: number;
  created_at: string;
  bracket_count: number;
}

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim();
  const db = getDb();

  if (q) {
    const users = db.prepare(`
      SELECT u.id, u.username, u.is_admin, u.created_at,
             COUNT(b.id) AS bracket_count
      FROM users u
      LEFT JOIN brackets b ON b.user_id = u.id
      WHERE u.username LIKE ?
      GROUP BY u.id
      ORDER BY u.username ASC
    `).all(`%${q}%`) as UserListRow[];
    return NextResponse.json({ users });
  }

  const users = db.prepare(`
    SELECT u.id, u.username, u.is_admin, u.created_at,
           COUNT(b.id) AS bracket_count
    FROM users u
    LEFT JOIN brackets b ON b.user_id = u.id
    GROUP BY u.id
    ORDER BY u.created_at ASC
  `).all() as UserListRow[];

  return NextResponse.json({ users });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.userId !== "number" || typeof body.action !== "string") {
    return NextResponse.json({ error: "userId and action required" }, { status: 400 });
  }

  const db = getDb();
  const target = db.prepare("SELECT id, username, is_admin FROM users WHERE id = ?").get(body.userId) as { id: number; username: string; is_admin: number } | undefined;
  if (!target) return NextResponse.json({ error: "User not found" }, { status: 404 });

  if (body.action === "reset_password") {
    const tempPassword = generateTempPassword();
    const hash = await bcrypt.hash(tempPassword, BCRYPT_ROUNDS);
    db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, target.id);
    return NextResponse.json({ success: true, tempPassword });
  }

  if (body.action === "toggle_admin") {
    if (target.id === user.id) {
      return NextResponse.json({ error: "Cannot change your own admin status" }, { status: 400 });
    }
    const newStatus = target.is_admin === 1 ? 0 : 1;
    db.prepare("UPDATE users SET is_admin = ? WHERE id = ?").run(newStatus, target.id);
    return NextResponse.json({ success: true, is_admin: newStatus });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

const TEMP_PASSWORD_LENGTH = 10;
const TEMP_PASSWORD_CHARS = "abcdefghjkmnpqrstuvwxyz23456789";

function generateTempPassword(): string {
  let result = "";
  for (let i = 0; i < TEMP_PASSWORD_LENGTH; i++) {
    result += TEMP_PASSWORD_CHARS[Math.floor(Math.random() * TEMP_PASSWORD_CHARS.length)];
  }
  return result;
}
