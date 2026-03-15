import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { fetchEspnScores, resolveResults } from "@/lib/espn";
import { parseBracketData } from "@/lib/bracket-utils";
import { notifyResultsSynced } from "@/lib/notifications";
import type { Tournament, RegionData } from "@/types/tournament";
import type { Results } from "@/types/bracket";

/**
 * POST /api/espn/sync
 * Admin-only. Fetches ESPN scores and auto-resolves tournament results.
 * Body: { tournamentId: number, dates?: string }
 * dates format: "YYYYMMDD" or "YYYYMMDD-YYYYMMDD" range
 */
export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 });
  }

  const body = await req.json();
  const { tournamentId, dates } = body as { tournamentId: number; dates?: string };

  if (!tournamentId) {
    return NextResponse.json({ error: "tournamentId is required" }, { status: 400 });
  }

  const db = getDb();
  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(tournamentId) as Tournament | undefined;
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const regions: RegionData[] = parseBracketData(tournament.bracket_data);
  const currentResults: Results = JSON.parse(tournament.results_data);

  if (regions.length === 0) {
    return NextResponse.json({ error: "Tournament has no bracket data" }, { status: 400 });
  }

  // ESPN group 100 = NCAA Tournament
  const ESPN_NCAA_GROUP = "100";
  const espnGames = await fetchEspnScores(dates, ESPN_NCAA_GROUP);
  const { results, newCount } = resolveResults(espnGames, regions, currentResults);

  if (newCount > 0) {
    db.prepare("UPDATE tournaments SET results_data = ?, results_updated_at = datetime('now') WHERE id = ?")
      .run(JSON.stringify(results), tournamentId);
    notifyResultsSynced(tournamentId, newCount);
  }

  const totalResolved = Object.keys(results).length;
  return NextResponse.json({
    success: true,
    espnGamesFound: espnGames.length,
    newResultsResolved: newCount,
    totalResultsResolved: totalResolved,
  });
}
