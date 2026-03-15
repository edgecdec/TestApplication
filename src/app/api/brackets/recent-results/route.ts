import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseBracketData } from "@/lib/bracket-utils";
import { buildTeamSeedMap } from "@/lib/scoring";
import { DEFAULT_SCORING, ROUND_NAMES } from "@/lib/bracket-constants";
import type { Tournament, BracketRow } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { RecentResultItem } from "@/types/scoring";
import { getTeamsForGameFromResults } from "@/lib/bracket-utils";

const MAX_RECENT = 10;

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const tournamentId = req.nextUrl.searchParams.get("tournament_id");
  if (!tournamentId) {
    return NextResponse.json({ error: "tournament_id required" }, { status: 400 });
  }

  const db = getDb();
  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(tournamentId) as Tournament | undefined;
  if (!tournament) {
    return NextResponse.json({ results: [] });
  }

  const regions = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data);
  const teamSeedMap = buildTeamSeedMap(regions);

  const userBrackets = db.prepare(
    "SELECT id, name, picks FROM brackets WHERE tournament_id = ? AND user_id = ?"
  ).all(tournamentId, user.id) as Pick<BracketRow, "id" | "name" | "picks">[];

  if (userBrackets.length === 0 || Object.keys(results).length === 0) {
    return NextResponse.json({ results: [] });
  }

  const parsedBrackets = userBrackets.map((b) => ({
    id: b.id,
    name: b.name,
    picks: JSON.parse(b.picks) as Picks,
  }));

  // Build recent results sorted by round (highest round first = most recent)
  const items: RecentResultItem[] = [];

  for (const [gId, winner] of Object.entries(results)) {
    const parts = gId.split("-");
    const round = parseInt(parts[parts.length - 2], 10);
    const [teamA, teamB] = getTeamsForGameFromResults(gId, results, regions);
    const loser = teamA === winner ? teamB : teamA;
    const winnerSeed = teamSeedMap.get(winner) ?? null;
    const loserSeed = loser ? (teamSeedMap.get(loser) ?? null) : null;
    const isUpset = winnerSeed !== null && loserSeed !== null && winnerSeed > loserSeed;

    const brackets = parsedBrackets.map((b) => {
      const pick = b.picks[gId];
      const correct = pick === winner;
      const roundPoints = DEFAULT_SCORING.pointsPerRound[round] ?? 0;
      return {
        bracketId: b.id,
        bracketName: b.name,
        correct,
        points: correct ? roundPoints : 0,
      };
    });

    items.push({ gameId: gId, round, winner, loser, winnerSeed, loserSeed, isUpset, brackets });
  }

  // Sort: highest round first, then by game index descending
  items.sort((a, b) => b.round - a.round || b.gameId.localeCompare(a.gameId));

  return NextResponse.json({ results: items.slice(0, MAX_RECENT) });
}
