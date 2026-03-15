import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { BCRYPT_ROUNDS, PASSWORD_MIN_LENGTH } from "@/lib/constants";
import type { UserRow } from "@/types/auth";

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body.currentPassword !== "string" || typeof body.newPassword !== "string") {
    return NextResponse.json({ error: "Current and new password are required" }, { status: 400 });
  }

  if (body.newPassword.length < PASSWORD_MIN_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` }, { status: 400 });
  }

  const db = getDb();
  const row = db.prepare("SELECT password_hash FROM users WHERE id = ?").get(user.id) as Pick<UserRow, "password_hash"> | undefined;
  if (!row) return NextResponse.json({ error: "User not found" }, { status: 404 });

  const valid = await bcrypt.compare(body.currentPassword, row.password_hash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 403 });

  const hash = await bcrypt.hash(body.newPassword, BCRYPT_ROUNDS);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);

  return NextResponse.json({ success: true });
}
