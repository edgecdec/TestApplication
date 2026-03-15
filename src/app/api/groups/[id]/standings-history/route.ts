import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scorePicks } from "@/lib/scoring";
import { parseBracketData, gameId, gamesInRound } from "@/lib/bracket-utils";
import type { ScoringSettings } from "@/types/group";
import type { Bracket, Tournament, RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { StandingsHistoryData, StandingsRoundRank } from "@/types/standings-history";
import { REGIONS, ROUND_NAMES } from "@/lib/bracket-constants";

interface BracketWithUser extends Bracket {
  username: string;
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

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const group = db.prepare("SELECT scoring_settings FROM groups WHERE id = ?").get(id) as { scoring_settings: string } | undefined;
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const settings: ScoringSettings = JSON.parse(group.scoring_settings);

  const brackets = db.prepare(`
    SELECT b.*, u.username
    FROM group_brackets gb
    JOIN brackets b ON b.id = gb.bracket_id
    JOIN users u ON u.id = b.user_id
    WHERE gb.group_id = ?
  `).all(id) as BracketWithUser[];

  if (brackets.length === 0) return NextResponse.json({ brackets: [], rounds: [] });

  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(brackets[0].tournament_id) as Tournament | undefined;
  if (!tournament) return NextResponse.json({ brackets: [], rounds: [] });

  const regions: RegionData[] = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data);

  const bracketData = brackets.map((b) => ({
    id: b.id,
    name: b.name,
    username: b.username,
    picks: JSON.parse(b.picks) as Picks,
    rounds: scorePicks(JSON.parse(b.picks) as Picks, results, settings, regions),
  }));

  const historyBrackets = bracketData.map((b) => ({
    bracketId: b.id,
    bracketName: b.name,
    username: b.username,
  }));

  const rounds: StandingsRoundRank[] = [];

  for (let round = 0; round < ROUND_NAMES.length; round++) {
    const gameIds = allGameIdsForRound(round);
    const hasResults = gameIds.some((g) => results[g]);
    if (!hasResults) break;

    // Compute cumulative scores through this round
    const cumulatives = bracketData.map((b) => ({
      bracketId: b.id,
      score: b.rounds.slice(0, round + 1).reduce((s, r) => s + r.points, 0),
    }));

    // Sort descending by score for ranking
    cumulatives.sort((a, b) => b.score - a.score);

    const rankings: Record<number, number> = {};
    const scores: Record<number, number> = {};
    cumulatives.forEach((c, i) => {
      scores[c.bracketId] = c.score;
      rankings[c.bracketId] = i > 0 && cumulatives[i - 1].score === c.score
        ? rankings[cumulatives[i - 1].bracketId]
        : i + 1;
    });

    rounds.push({ round, roundName: String(ROUND_NAMES[round]), rankings, scores });
  }

  const data: StandingsHistoryData = { brackets: historyBrackets, rounds };
  return NextResponse.json(data);
}
