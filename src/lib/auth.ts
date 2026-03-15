import jwt from "jsonwebtoken";
import { cookies } from "next/headers";
import { JWT_SECRET, JWT_COOKIE_NAME, JWT_EXPIRY } from "@/lib/constants";
import { getDb } from "@/lib/db";
import type { JwtPayload, User } from "@/types/auth";

export function signToken(payload: JwtPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export async function getCurrentUser(): Promise<(JwtPayload & { id: number }) | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(JWT_COOKIE_NAME)?.value;
  if (!token) return null;
  const payload = verifyToken(token);
  if (!payload) return null;
  // Verify user still exists
  const db = getDb();
  const user = db.prepare("SELECT id FROM users WHERE id = ?").get(payload.userId) as User | undefined;
  if (!user) return null;
  return { ...payload, id: payload.userId };
}
