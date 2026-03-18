import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { parseBracketData, getTeamsForGameFromResults, gameId, gamesInRound } from "@/lib/bracket-utils";
import { REGIONS, ROUND_NAMES } from "@/lib/bracket-constants";
import type { ScoringSettings } from "@/types/group";
import type { Tournament, Bracket, RegionData } from "@/types/tournament";
import type { Picks } from "@/types/bracket";
import type { RootingEntry } from "@/types/rooting-guide";
import { DEFAULT_SCORING } from "@/lib/bracket-constants";

const MAX_ENTRIES = 20;

/** Get all unresolved game IDs where both teams are known. */
function getActionableGames(results: Picks, regions: RegionData[]): { gId: string; round: number; teamA: string; teamB: string }[] {
  const games: { gId: string; round: number; teamA: string; teamB: string }[] = [];
  for (let round = 0; round <= 5; round++) {
    if (round <= 3) {
      const count = gamesInRound(round);
      for (const region of REGIONS) {
        for (let i = 0; i < count; i++) {
          const gId = gameId(region, round, i);
          if (results[gId]) continue;
          const [a, b] = getTeamsForGameFromResults(gId, results, regions);
          if (a && b) games.push({ gId, round, teamA: a, teamB: b });
        }
      }
    } else {
      const count = round === 4 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const gId = gameId("ff", round, i);
        if (results[gId]) continue;
        const [a, b] = getTeamsForGameFromResults(gId, results, regions);
        if (a && b) games.push({ gId, round, teamA: a, teamB: b });
      }
    }
  }
  return games;
}

interface GroupInfo { id: number; scoring: ScoringSettings }

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const db = getDb();

  // Get user's brackets
  const brackets = db.prepare("SELECT * FROM brackets WHERE user_id = ?").all(user.id) as Bracket[];
  if (brackets.length === 0) return NextResponse.json({ entries: [] });

  const tournamentId = brackets[0].tournament_id;
  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(tournamentId) as Tournament | undefined;
  if (!tournament) return NextResponse.json({ entries: [] });

  const regions = parseBracketData(tournament.bracket_data);
  const results: Picks = JSON.parse(tournament.results_data || "{}");
  if (regions.length === 0) return NextResponse.json({ entries: [] });

  const actionableGames = getActionableGames(results, regions);
  if (actionableGames.length === 0) return NextResponse.json({ entries: [] });

  // Get groups the user belongs to, with scoring settings
  const groups = db.prepare(`
    SELECT g.id, g.scoring_settings FROM groups g
    JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
  `).all(user.id) as { id: number; scoring_settings: string }[];

  // For each bracket, find which groups it belongs to
  const bracketGroups = new Map<number, GroupInfo[]>();
  for (const b of brackets) {
    const assignments = db.prepare(
      "SELECT group_id FROM group_brackets WHERE bracket_id = ?"
    ).all(b.id) as { group_id: number }[];
    const gInfos: GroupInfo[] = [];
    for (const a of assignments) {
      const g = groups.find((gr) => gr.id === a.group_id);
      if (g) {
        const scoring: ScoringSettings = { ...DEFAULT_SCORING, ...JSON.parse(g.scoring_settings || "{}") };
        gInfos.push({ id: g.id, scoring });
      }
    }
    // If bracket isn't in any group, use default scoring
    if (gInfos.length === 0) gInfos.push({ id: 0, scoring: DEFAULT_SCORING });
    bracketGroups.set(b.id, gInfos);
  }

  // For each actionable game, aggregate across brackets
  const teamMap = new Map<string, { teamA: string; teamB: string; round: number; picks: Map<string, { count: number; points: number; names: string[] }> }>();

  for (const game of actionableGames) {
    const pickAgg = new Map<string, { count: number; points: number; names: string[] }>();

    for (const b of brackets) {
      const picks: Picks = typeof b.picks === "string" ? JSON.parse(b.picks) : b.picks;
      const pick = picks[game.gId];
      if (!pick) continue;

      // Calculate max points this game is worth across all groups this bracket is in
      const gInfos = bracketGroups.get(b.id) ?? [{ id: 0, scoring: DEFAULT_SCORING }];
      let maxPoints = 0;
      for (const gi of gInfos) {
        maxPoints += gi.scoring.pointsPerRound[game.round] ?? 0;
      }

      const existing = pickAgg.get(pick) ?? { count: 0, points: 0, names: [] };
      existing.count++;
      existing.points += maxPoints;
      existing.names.push(b.name);
      pickAgg.set(pick, existing);
    }

    if (pickAgg.size > 0) {
      teamMap.set(game.gId, { teamA: game.teamA, teamB: game.teamB, round: game.round, picks: pickAgg });
    }
  }

  // Build entries — one per game, showing the team the user should root for
  const entries: RootingEntry[] = [];
  teamMap.forEach((data, gId) => {
    // Find the team with the most points at stake
    let bestTeam = "";
    let bestPoints = 0;
    let bestCount = 0;
    let bestNames: string[] = [];

    data.picks.forEach((agg, team) => {
      if (agg.points > bestPoints || (agg.points === bestPoints && agg.count > bestCount)) {
        bestTeam = team;
        bestPoints = agg.points;
        bestCount = agg.count;
        bestNames = agg.names;
      }
    });

    entries.push({
      gameId: gId,
      round: data.round,
      teamA: data.teamA,
      teamB: data.teamB,
      rootFor: bestTeam,
      bracketCount: bestCount,
      totalPoints: bestPoints,
      bracketNames: bestNames,
    });
  });

  // Sort by points at stake (highest first), then by round (earliest first)
  entries.sort((a, b) => b.totalPoints - a.totalPoints || a.round - b.round);

  return NextResponse.json({ entries: entries.slice(0, MAX_ENTRIES) });
}
