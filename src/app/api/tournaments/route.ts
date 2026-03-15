import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Tournament } from "@/types/tournament";

export async function GET() {
  const db = getDb();
  const tournaments = db.prepare("SELECT * FROM tournaments ORDER BY year DESC").all();
  return NextResponse.json({ tournaments });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const { name, year, bracket_data, lock_time } = body as Partial<Tournament>;

  if (!name || !year || !lock_time) {
    return NextResponse.json({ error: "name, year, and lock_time are required" }, { status: 400 });
  }

  const db = getDb();
  const result = db.prepare(
    "INSERT INTO tournaments (name, year, bracket_data, lock_time) VALUES (?, ?, ?, ?)"
  ).run(name, year, bracket_data || "[]", lock_time);

  return NextResponse.json({ id: result.lastInsertRowid }, { status: 201 });
}
