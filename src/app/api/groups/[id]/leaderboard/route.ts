import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scoreBracket } from "@/lib/scoring";
import { parseBracketData } from "@/lib/bracket-utils";
import type { ScoringSettings } from "@/types/group";
import type { Bracket, Tournament, RegionData } from "@/types/tournament";
import type { LeaderboardEntry } from "@/types/scoring";
import type { Picks, Results } from "@/types/bracket";

interface BracketWithUser extends Bracket {
  username: string;
}

interface GroupRow {
  scoring_settings: string;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const group = db.prepare("SELECT scoring_settings FROM groups WHERE id = ?").get(id) as GroupRow | undefined;
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const settings: ScoringSettings = JSON.parse(group.scoring_settings);

  const brackets = db.prepare(`
    SELECT b.*, u.username
    FROM group_brackets gb
    JOIN brackets b ON b.id = gb.bracket_id
    JOIN users u ON u.id = b.user_id
    WHERE gb.group_id = ?
  `).all(id) as BracketWithUser[];

  if (brackets.length === 0) {
    return NextResponse.json({ leaderboard: [], actualTotal: null });
  }

  // Get the tournament for these brackets (all brackets in a group share the same tournament)
  const tournamentId = brackets[0].tournament_id;
  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(tournamentId) as Tournament | undefined;
  if (!tournament) {
    return NextResponse.json({ leaderboard: [], actualTotal: null });
  }

  const regions: RegionData[] = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data);

  // Check if championship game has a result for tiebreaker
  const champResult = results["ff-5-0"];
  // actualTotal would be stored somewhere — for now we pass null
  // (will be set when live scores are implemented)
  const actualTotal: number | null = null;

  const scores = brackets.map((b) => {
    const picks: Picks = JSON.parse(b.picks);
    return scoreBracket(
      b.id, b.name, b.username, b.user_id,
      picks, results, settings, regions,
      b.tiebreaker, actualTotal
    );
  });

  // Sort: highest total first, then by tiebreaker diff (lower is better)
  scores.sort((a, b) => {
    if (b.total !== a.total) return b.total - a.total;
    if (a.tiebreakerDiff != null && b.tiebreakerDiff != null) {
      return a.tiebreakerDiff - b.tiebreakerDiff;
    }
    if (a.tiebreakerDiff != null) return -1;
    if (b.tiebreakerDiff != null) return 1;
    return 0;
  });

  // Assign ranks (tied scores get same rank)
  const leaderboard: LeaderboardEntry[] = scores.map((s, i) => {
    let rank = 1;
    if (i > 0) {
      const prev = scores[i - 1];
      if (s.total === prev.total && s.tiebreakerDiff === prev.tiebreakerDiff) {
        rank = (leaderboard[i - 1] as LeaderboardEntry).rank;
      } else {
        rank = i + 1;
      }
    }
    const percentile = scores.length > 1
      ? Math.round(((scores.length - rank) / (scores.length - 1)) * 100)
      : 100;

    return { ...s, rank, percentile };
  });

  return NextResponse.json({ leaderboard, actualTotal });
}
