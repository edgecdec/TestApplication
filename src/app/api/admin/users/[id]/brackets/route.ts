import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";

interface BracketRow {
  id: number;
  name: string;
  tournament_id: number;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user?.isAdmin) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { id } = await params;
  const db = getDb();
  const brackets = db.prepare(
    "SELECT id, name, tournament_id FROM brackets WHERE user_id = ? ORDER BY name"
  ).all(Number(id)) as BracketRow[];

  return NextResponse.json({ brackets });
}
