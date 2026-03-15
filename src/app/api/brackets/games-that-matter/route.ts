import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { scoreBracket } from "@/lib/scoring";
import { parseBracketData, getTeamsForGameFromResults } from "@/lib/bracket-utils";
import { REGIONS } from "@/lib/bracket-constants";
import { gameId, gamesInRound } from "@/lib/bracket-utils";
import type { ScoringSettings } from "@/types/group";
import type { Bracket, Tournament, RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { SwingGame } from "@/types/games-that-matter";

interface BracketWithUser extends Bracket {
  username: string;
}

interface GroupRow {
  id: number;
  name: string;
  scoring_settings: string;
}

const MAX_SWING_GAMES = 10;

/** Get all unresolved game IDs. */
function getUnresolvedGameIds(results: Results, regions: RegionData[]): string[] {
  const ids: string[] = [];
  if (regions.length === 0) return ids;
  for (let round = 0; round <= 5; round++) {
    if (round <= 3) {
      const count = gamesInRound(round);
      for (const region of REGIONS) {
        for (let i = 0; i < count; i++) {
          const gId = gameId(region, round, i);
          if (!results[gId]) ids.push(gId);
        }
      }
    } else {
      const count = round === 4 ? 2 : 1;
      for (let i = 0; i < count; i++) {
        const gId = gameId("ff", round, i);
        if (!results[gId]) ids.push(gId);
      }
    }
  }
  return ids;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = getDb();

  // Get user's groups
  const groups = db.prepare(`
    SELECT g.id, g.name, g.scoring_settings
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
  `).all(user.id) as GroupRow[];

  if (groups.length === 0) {
    return NextResponse.json({ games: [] });
  }

  const swingGames: SwingGame[] = [];

  for (const group of groups) {
    const brackets = db.prepare(`
      SELECT b.*, u.username
      FROM group_brackets gb
      JOIN brackets b ON b.id = gb.bracket_id
      JOIN users u ON u.id = b.user_id
      WHERE gb.group_id = ?
    `).all(group.id) as BracketWithUser[];

    if (brackets.length < 2) continue;

    const tournamentId = brackets[0].tournament_id;
    const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(tournamentId) as Tournament | undefined;
    if (!tournament) continue;

    const regions: RegionData[] = parseBracketData(tournament.bracket_data);
    const results: Results = JSON.parse(tournament.results_data);
    const settings: ScoringSettings = JSON.parse(group.scoring_settings);

    // Score all brackets
    const scored = brackets.map((b) => {
      const picks: Picks = JSON.parse(b.picks);
      const score = scoreBracket(b.id, b.name, b.username, b.user_id, picks, results, settings, regions, b.tiebreaker, null);
      return { ...score, picks };
    });
    scored.sort((a, b) => b.total - a.total);

    // Find user's brackets in this group
    const userBrackets = scored.filter((s) => s.userId === user.id);
    if (userBrackets.length === 0) continue;

    const unresolvedIds = getUnresolvedGameIds(results, regions);

    for (const userBracket of userBrackets) {
      const userRank = scored.findIndex((s) => s.bracketId === userBracket.bracketId) + 1;
      // Rivals = brackets ranked above the user
      const rivals = scored.filter((_, idx) => idx < userRank - 1);
      if (rivals.length === 0) continue;

      for (const gId of unresolvedIds) {
        const userPick = userBracket.picks[gId];
        if (!userPick) continue;

        // Find rivals who picked differently
        const differingRivals = rivals
          .filter((r) => r.picks[gId] && r.picks[gId] !== userPick)
          .map((r) => ({
            username: r.username,
            bracketName: r.bracketName,
            pick: r.picks[gId],
            rank: scored.findIndex((s) => s.bracketId === r.bracketId) + 1,
          }));

        if (differingRivals.length === 0) continue;

        const [teamA, teamB] = getTeamsForGameFromResults(gId, results, regions);

        swingGames.push({
          gameId: gId,
          round: parseInt(gId.split("-").slice(-2, -1)[0], 10),
          teamA,
          teamB,
          userPick,
          rivals: differingRivals,
          groupId: group.id,
          groupName: group.name,
        });
      }
    }
  }

  // Deduplicate by gameId+groupId, sort by round (earlier rounds first = more imminent), limit
  const seen = new Set<string>();
  const unique = swingGames.filter((g) => {
    const key = `${g.gameId}-${g.groupId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
  unique.sort((a, b) => a.round - b.round);

  return NextResponse.json({ games: unique.slice(0, MAX_SWING_GAMES) });
}
