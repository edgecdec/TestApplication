import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { signToken } from "@/lib/auth";
import {
  BCRYPT_ROUNDS,
  JWT_COOKIE_NAME,
  USERNAME_MIN_LENGTH,
  USERNAME_MAX_LENGTH,
  PASSWORD_MIN_LENGTH,
} from "@/lib/constants";
import type { UserRow, AuthResponse } from "@/types/auth";

export async function POST(req: NextRequest): Promise<NextResponse<AuthResponse>> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const username = body.username.trim().toLowerCase();
  const { password } = body;

  if (username.length < USERNAME_MIN_LENGTH || username.length > USERNAME_MAX_LENGTH) {
    return NextResponse.json(
      { error: `Username must be ${USERNAME_MIN_LENGTH}-${USERNAME_MAX_LENGTH} characters` },
      { status: 400 }
    );
  }

  if (!/^[a-z0-9_]+$/.test(username)) {
    return NextResponse.json(
      { error: "Username can only contain letters, numbers, and underscores" },
      { status: 400 }
    );
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    return NextResponse.json(
      { error: `Password must be at least ${PASSWORD_MIN_LENGTH} characters` },
      { status: 400 }
    );
  }

  const db = getDb();

  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get(username) as UserRow | undefined;
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  // First user becomes admin
  const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number }).count;
  const isAdmin = userCount === 0 ? 1 : 0;

  const result = db.prepare("INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)").run(
    username,
    passwordHash,
    isAdmin
  );

  const token = signToken({
    userId: Number(result.lastInsertRowid),
    username,
    isAdmin: isAdmin === 1,
  });

  const response = NextResponse.json({
    user: { id: Number(result.lastInsertRowid), username, isAdmin: isAdmin === 1 },
  });

  response.cookies.set(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
