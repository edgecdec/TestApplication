import { NextRequest, NextResponse } from "next/server";

const DEV_USER_PARAM = "dev_user";

/**
 * Middleware: if ?dev_user=xxx is present and NODE_ENV !== production,
 * redirect to /api/auth/dev-login to set the cookie, then back to the
 * original page (without the dev_user param).
 */
export function middleware(req: NextRequest) {
  if (process.env.NODE_ENV === "production") return NextResponse.next();

  const devUser = req.nextUrl.searchParams.get(DEV_USER_PARAM);
  if (!devUser) return NextResponse.next();

  // Build the redirect-back URL without the dev_user param
  const cleanUrl = new URL(req.nextUrl.pathname, req.nextUrl.origin);
  req.nextUrl.searchParams.forEach((value, key) => {
    if (key !== DEV_USER_PARAM) cleanUrl.searchParams.set(key, value);
  });

  const loginUrl = new URL("/api/auth/dev-login", req.nextUrl.origin);
  loginUrl.searchParams.set("username", devUser);
  loginUrl.searchParams.set("redirect", cleanUrl.pathname + cleanUrl.search);

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/bracket/:path*",
    "/groups/:path*",
    "/admin/:path*",
    "/stats/:path*",
    "/results/:path*",
    "/leaderboard/:path*",
    "/profile/:path*",
    "/whos-left/:path*",
    "/upsets/:path*",
    "/simulator/:path*",
    "/join/:path*",
    "/login",
    "/register",
  ],
};
