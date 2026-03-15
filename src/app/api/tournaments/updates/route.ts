import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

interface TournamentRow {
  results_updated_at: string | null;
}

/** GET /api/tournaments/updates — returns the latest results_updated_at timestamp */
export async function GET() {
  const db = getDb();
  const row = db.prepare(
    "SELECT results_updated_at FROM tournaments ORDER BY year DESC LIMIT 1"
  ).get() as TournamentRow | undefined;
  return NextResponse.json({ results_updated_at: row?.results_updated_at ?? null });
}
