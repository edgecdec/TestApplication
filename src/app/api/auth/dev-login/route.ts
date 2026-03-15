import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { signToken } from "@/lib/auth";
import { ensureEveryoneGroup } from "@/lib/everyone-group";
import { JWT_COOKIE_NAME } from "@/lib/constants";
import type { UserRow } from "@/types/auth";

/**
 * Dev-only auto-login: GET /api/auth/dev-login?username=testbot&redirect=/dashboard
 * Looks up the user by username (no password), sets JWT cookie, redirects.
 * Only works when NODE_ENV !== 'production'.
 */
export async function GET(req: NextRequest): Promise<NextResponse> {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available" }, { status: 404 });
  }

  const username = req.nextUrl.searchParams.get("username");
  const redirectTo = req.nextUrl.searchParams.get("redirect") || "/dashboard";

  if (!username) {
    return NextResponse.json({ error: "username required" }, { status: 400 });
  }

  const db = getDb();
  const user = db.prepare("SELECT * FROM users WHERE username = ?").get(username.trim().toLowerCase()) as UserRow | undefined;

  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const token = signToken({
    userId: user.id,
    username: user.username,
    isAdmin: user.is_admin === 1,
  });

  ensureEveryoneGroup(user.id);

  const url = new URL(redirectTo, req.nextUrl.origin);
  const response = NextResponse.redirect(url);

  response.cookies.set(JWT_COOKIE_NAME, token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    path: "/",
    maxAge: 7 * 24 * 60 * 60,
  });

  return response;
}
