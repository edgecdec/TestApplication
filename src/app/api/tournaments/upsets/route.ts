import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseBracketData, getTeamsForGameFromResults, buildR64Matchups, gameId } from "@/lib/bracket-utils";
import { buildTeamSeedMap } from "@/lib/scoring";
import { REGIONS, ROUND_NAMES } from "@/lib/bracket-constants";
import type { Tournament, RegionData } from "@/types/tournament";
import type { Results, Picks } from "@/types/bracket";
import type { UpsetInfo } from "@/types/upsets";

function gamesInRound(round: number): number {
  if (round === 0) return 8;
  if (round === 1) return 4;
  if (round === 2) return 2;
  if (round === 3) return 1;
  if (round === 4) return 2;
  if (round === 5) return 1;
  return 0;
}

function allGameIdsForRound(round: number): string[] {
  const ids: string[] = [];
  if (round <= 3) {
    const count = gamesInRound(round);
    for (const region of REGIONS) {
      for (let i = 0; i < count; i++) ids.push(gameId(region, round, i));
    }
  } else {
    const count = round === 4 ? 2 : 1;
    for (let i = 0; i < count; i++) ids.push(gameId("ff", round, i));
  }
  return ids;
}

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const tournamentId = sp.get("tournament_id");
  if (!tournamentId) return NextResponse.json({ error: "tournament_id required" }, { status: 400 });

  const db = getDb();
  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(tournamentId) as Tournament | undefined;
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  const regions = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data || "{}");
  const seedMap = buildTeamSeedMap(regions);

  // Find all upsets
  const upsets: UpsetInfo[] = [];
  for (let round = 0; round < ROUND_NAMES.length; round++) {
    for (const gId of allGameIdsForRound(round)) {
      const winner = results[gId];
      if (!winner) continue;
      const [teamA, teamB] = getTeamsForGameFromResults(gId, results, regions);
      const loser = teamA === winner ? teamB : teamA;
      if (!loser) continue;
      const winnerSeed = seedMap.get(winner);
      const loserSeed = seedMap.get(loser);
      if (winnerSeed == null || loserSeed == null) continue;
      if (winnerSeed <= loserSeed) continue; // not an upset
      upsets.push({
        gameId: gId,
        round,
        winner,
        winnerSeed,
        loser,
        loserSeed,
        seedDiff: winnerSeed - loserSeed,
        predictedBy: 0,
        totalBrackets: 0,
        predictedPct: 0,
      });
    }
  }

  // Count bracket predictions
  const brackets = db.prepare("SELECT picks FROM brackets WHERE tournament_id = ?").all(tournamentId) as { picks: string }[];
  const totalBrackets = brackets.length;

  for (const upset of upsets) {
    let count = 0;
    for (const b of brackets) {
      const picks: Picks = JSON.parse(b.picks || "{}");
      if (picks[upset.gameId] === upset.winner) count++;
    }
    upset.predictedBy = count;
    upset.totalBrackets = totalBrackets;
    upset.predictedPct = totalBrackets > 0 ? Math.round((count / totalBrackets) * 100) : 0;
  }

  // Sort by seed difference descending (biggest upsets first)
  upsets.sort((a, b) => b.seedDiff - a.seedDiff || a.round - b.round);

  return NextResponse.json({ upsets });
}
