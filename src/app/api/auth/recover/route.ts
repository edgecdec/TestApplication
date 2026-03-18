import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { BCRYPT_ROUNDS, PASSWORD_MIN_LENGTH } from "@/lib/constants";

interface RecoverRow { id: number; recovery_hash: string | null }

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.username !== "string" || typeof body.recoveryCode !== "string" || typeof body.newPassword !== "string") {
    return NextResponse.json({ error: "Username, recovery code, and new password are required" }, { status: 400 });
  }

  const username = body.username.trim().toLowerCase();
  const { recoveryCode, newPassword } = body;

  if (newPassword.length < PASSWORD_MIN_LENGTH) {
    return NextResponse.json({ error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare("SELECT id, recovery_hash FROM users WHERE username = ?").get(username) as RecoverRow | undefined;

  if (!user || !user.recovery_hash) {
    return NextResponse.json({ error: "Invalid username or recovery code" }, { status: 400 });
  }

  const valid = await bcrypt.compare(recoveryCode, user.recovery_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid username or recovery code" }, { status: 400 });
  }

  const hash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hash, user.id);

  return NextResponse.json({ success: true });
}
