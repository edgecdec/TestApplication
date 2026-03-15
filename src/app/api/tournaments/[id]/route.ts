import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import type { Tournament } from "@/types/tournament";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();
  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(id) as Tournament | undefined;
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }
  return NextResponse.json({ tournament });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const { id } = await params;
  const body = await req.json();
  const { name, bracket_data, results_data, lock_time } = body;

  const db = getDb();
  const existing = db.prepare("SELECT id FROM tournaments WHERE id = ?").get(id) as Tournament | undefined;
  if (!existing) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const fields: string[] = [];
  const values: (string | number)[] = [];

  if (name !== undefined) { fields.push("name = ?"); values.push(name); }
  if (bracket_data !== undefined) { fields.push("bracket_data = ?"); values.push(typeof bracket_data === "string" ? bracket_data : JSON.stringify(bracket_data)); }
  if (results_data !== undefined) { fields.push("results_data = ?"); values.push(typeof results_data === "string" ? results_data : JSON.stringify(results_data)); }
  if (lock_time !== undefined) { fields.push("lock_time = ?"); values.push(lock_time); }

  if (fields.length === 0) {
    return NextResponse.json({ error: "No fields to update" }, { status: 400 });
  }

  values.push(Number(id));
  db.prepare(`UPDATE tournaments SET ${fields.join(", ")} WHERE id = ?`).run(...values);

  return NextResponse.json({ success: true });
}
