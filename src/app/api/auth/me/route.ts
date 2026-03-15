import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import type { AuthResponse } from "@/types/auth";

export async function GET(): Promise<NextResponse<AuthResponse>> {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }
  return NextResponse.json({
    user: { id: user.id, username: user.username, isAdmin: user.isAdmin },
  });
}
