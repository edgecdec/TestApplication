import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import type { PickDistribution } from "@/types/bracket";

export async function GET(req: NextRequest) {
  const tournamentId = req.nextUrl.searchParams.get("tournament_id");
  if (!tournamentId) {
    return NextResponse.json({ error: "tournament_id required" }, { status: 400 });
  }

  const db = getDb();
  const tournament = db.prepare("SELECT lock_time FROM tournaments WHERE id = ?").get(Number(tournamentId)) as
    { lock_time: string } | undefined;

  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Only reveal distribution after lock time
  if (new Date(tournament.lock_time) > new Date()) {
    return NextResponse.json({ distribution: {} });
  }

  const rows = db.prepare("SELECT picks FROM brackets WHERE tournament_id = ?").all(Number(tournamentId)) as
    { picks: string }[];

  if (rows.length === 0) {
    return NextResponse.json({ distribution: {} });
  }

  const counts: Record<string, Record<string, number>> = {};
  for (const row of rows) {
    const picks = JSON.parse(row.picks) as Record<string, string>;
    for (const [gameId, team] of Object.entries(picks)) {
      if (!counts[gameId]) counts[gameId] = {};
      counts[gameId][team] = (counts[gameId][team] || 0) + 1;
    }
  }

  const total = rows.length;
  const distribution: PickDistribution = {};
  for (const [gameId, teamCounts] of Object.entries(counts)) {
    distribution[gameId] = {};
    for (const [team, count] of Object.entries(teamCounts)) {
      distribution[gameId][team] = Math.round((count / total) * 100);
    }
  }

  return NextResponse.json({ distribution });
}
