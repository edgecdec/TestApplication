import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseBracketData } from "@/lib/bracket-utils";
import { ROUND_NAMES, CHAMPIONSHIP_GAME_ID } from "@/lib/bracket-constants";
import type { TournamentStats, ChampionPick, UpsetPick, BracketProfile } from "@/types/stats";

const UPSET_SEED_THRESHOLD = 5; // only count seeds > 4 as upsets
const CHALK_SEED_WEIGHT = 17; // higher seed number = lower chalk score

export async function GET(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const tournamentId = req.nextUrl.searchParams.get("tournament_id");
  if (!tournamentId) return NextResponse.json({ error: "tournament_id required" }, { status: 400 });

  const db = getDb();
  const tournament = db.prepare("SELECT bracket_data, lock_time FROM tournaments WHERE id = ?").get(Number(tournamentId)) as
    { bracket_data: string; lock_time: string } | undefined;
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  // Only show stats after lock
  if (!tournament.lock_time || new Date(tournament.lock_time) > new Date()) {
    return NextResponse.json({ stats: null });
  }

  const regions = parseBracketData(tournament.bracket_data);

  // Build seed lookup: team name -> seed number
  const seedMap: Record<string, number> = {};
  for (const r of regions) {
    for (const t of r.seeds) {
      seedMap[t.name] = t.seed;
    }
  }

  const rows = db.prepare(
    "SELECT b.picks, b.name AS bracket_name, u.username FROM brackets b JOIN users u ON b.user_id = u.id WHERE b.tournament_id = ?"
  ).all(Number(tournamentId)) as { picks: string; bracket_name: string; username: string }[];

  const championCounts: Record<string, number> = {};
  const upsetPicks: Record<string, UpsetPick> = {};
  const bracketScores: BracketProfile[] = [];

  for (const row of rows) {
    const picks: Record<string, string> = JSON.parse(row.picks);

    // Champion tally
    const champ = picks[CHAMPIONSHIP_GAME_ID];
    if (champ) championCounts[champ] = (championCounts[champ] || 0) + 1;

    // Chalk score: sum (CHALK_SEED_WEIGHT - seed) for each pick — higher = more chalk
    let chalkScore = 0;
    for (const team of Object.values(picks)) {
      const seed = seedMap[team];
      if (seed !== undefined) chalkScore += CHALK_SEED_WEIGHT - seed;
    }
    bracketScores.push({ username: row.username, bracketName: row.bracket_name, chalkScore });

    // Track upset picks (high seeds picked in late rounds)
    for (const [gId, team] of Object.entries(picks)) {
      const round = parseInt(gId.split("-")[1], 10) || 0;
      const seed = seedMap[team];
      if (seed === undefined || seed <= UPSET_SEED_THRESHOLD) continue;
      const key = `${team}-R${round}`;
      if (!upsetPicks[key]) upsetPicks[key] = { team, seed, round, count: 0 };
      upsetPicks[key].count++;
    }
  }

  const totalBrackets = bracketScores.length;

  // Champions sorted by popularity
  const champions: ChampionPick[] = Object.entries(championCounts)
    .map(([team, count]) => ({ team, count, pct: totalBrackets > 0 ? Math.round((count / totalBrackets) * 100) : 0, seed: seedMap[team] || 0 }))
    .sort((a, b) => b.count - a.count);

  // Biggest upset: latest round, then highest seed
  const sortedUpsets = Object.values(upsetPicks).sort((a, b) => b.round - a.round || b.seed - a.seed);
  const biggestUpset = sortedUpsets[0] ?? null;

  // Chalk/contrarian
  bracketScores.sort((a, b) => b.chalkScore - a.chalkScore);
  const mostChalk = bracketScores[0] ?? null;
  const mostContrarian = totalBrackets > 0 ? bracketScores[totalBrackets - 1] : null;

  const stats: TournamentStats = { totalBrackets, champions, biggestUpset, mostChalk, mostContrarian };
  return NextResponse.json({ stats });
}
