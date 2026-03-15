import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { getDb } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { ensureEveryoneGroup } from "@/lib/everyone-group";
import { JWT_COOKIE_NAME } from "@/lib/constants";
import type { UserRow, AuthResponse } from "@/types/auth";

export async function POST(req: NextRequest): Promise<NextResponse<AuthResponse>> {
  const body = await req.json().catch(() => null);
  if (!body || typeof body.username !== "string" || typeof body.password !== "string") {
    return NextResponse.json({ error: "Username and password are required" }, { status: 400 });
  }

  const username = body.username.trim().toLowerCase();
  const { password } = body;

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username) as UserRow | undefined;

  if (!user) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) {
    return NextResponse.json({ error: "Invalid username or password" }, { status: 401 });
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    isAdmin: user.is_admin === 1,
  });

  ensureEveryoneGroup(user.id);

  const response = NextResponse.json({
    user: { id: user.id, username: user.username, isAdmin: user.is_admin === 1 },
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
