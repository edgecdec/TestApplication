import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { fetchEspnScores, resolveResults } from "@/lib/espn";
import { parseBracketData } from "@/lib/bracket-utils";
import { notifyResultsSynced } from "@/lib/notifications";
import { autoFillIncompleteBrackets } from "@/lib/autofill-at-lock";
import type { Tournament, RegionData } from "@/types/tournament";
import type { Results } from "@/types/bracket";

const DEBOUNCE_SECONDS = 60;
const ESPN_NCAA_GROUP = "100";

/**
 * POST /api/espn/auto-sync
 * Non-admin endpoint. Auto-syncs ESPN results with 60s debounce.
 * Triggered by dashboard/bracket page loads so results flow in
 * without admin intervention during games.
 */
export async function POST() {
  const db = getDb();
  const tournament = db.prepare(
    "SELECT * FROM tournaments ORDER BY year DESC LIMIT 1"
  ).get() as Tournament | undefined;

  if (!tournament) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_tournament" });
  }

  // Debounce: skip if synced within the last 60 seconds
  if (tournament.results_updated_at) {
    const updatedAt = new Date(tournament.results_updated_at + (tournament.results_updated_at.endsWith("Z") ? "" : "Z")).getTime();
    const age = (Date.now() - updatedAt) / 1000;
    if (age < DEBOUNCE_SECONDS) {
      return NextResponse.json({ ok: true, skipped: true, age: Math.round(age) });
    }
  }

  const regions: RegionData[] = parseBracketData(tournament.bracket_data);
  if (regions.length === 0) {
    return NextResponse.json({ ok: true, skipped: true, reason: "no_bracket_data" });
  }

  const currentResults: Results = JSON.parse(tournament.results_data || "{}");

  const espnGames = await fetchEspnScores(undefined, ESPN_NCAA_GROUP);
  const { results, newCount } = resolveResults(espnGames, regions, currentResults);

  // Always update timestamp to enforce debounce
  db.prepare(
    "UPDATE tournaments SET results_updated_at = datetime('now') WHERE id = ?"
  ).run(tournament.id);

  if (newCount > 0) {
    db.prepare(
      "UPDATE tournaments SET results_data = ? WHERE id = ?"
    ).run(JSON.stringify(results), tournament.id);
    notifyResultsSynced(tournament.id, newCount);
  }

  const autoFilled = autoFillIncompleteBrackets(tournament.id);

  return NextResponse.json({
    ok: true,
    skipped: false,
    newResults: newCount,
    totalResults: Object.keys(results).length,
    autoFilled,
  });
}
