import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { scoreBracket } from "@/lib/scoring";
import { parseBracketData } from "@/lib/bracket-utils";
import type { ScoringSettings } from "@/types/group";
import type { Bracket, Tournament, RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";

interface GroupRow {
  id: number;
  name: string;
  member_count: number;
}

interface BracketWithUser extends Bracket {
  username: string;
}

export interface GroupSummaryItem {
  groupId: number;
  groupName: string;
  memberCount: number;
  myBestRank: number;
  myBestScore: number;
  myBestBracketName: string;
  leaderUsername: string;
  leaderScore: number;
  totalBrackets: number;
}

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const db = getDb();

  const groups = db.prepare(`
    SELECT g.id, g.name, g.scoring_settings,
      (SELECT COUNT(*) FROM group_members gm2 WHERE gm2.group_id = g.id) as member_count
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id AND gm.user_id = ?
    ORDER BY g.created_at DESC
  `).all(user.id) as (GroupRow & { scoring_settings: string })[];

  const summaries: GroupSummaryItem[] = [];

  for (const g of groups) {
    const brackets = db.prepare(`
      SELECT b.*, u.username
      FROM group_brackets gb
      JOIN brackets b ON b.id = gb.bracket_id
      JOIN users u ON u.id = b.user_id
      WHERE gb.group_id = ?
    `).all(g.id) as BracketWithUser[];

    if (brackets.length === 0) {
      summaries.push({
        groupId: g.id,
        groupName: g.name,
        memberCount: g.member_count,
        myBestRank: 0,
        myBestScore: 0,
        myBestBracketName: "",
        leaderUsername: "",
        leaderScore: 0,
        totalBrackets: 0,
      });
      continue;
    }

    const tournamentId = brackets[0].tournament_id;
    const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(tournamentId) as Tournament | undefined;
    if (!tournament) continue;

    const regions: RegionData[] = parseBracketData(tournament.bracket_data);
    const results: Results = JSON.parse(tournament.results_data);
    const settings: ScoringSettings = JSON.parse(g.scoring_settings);

    const scored = brackets.map((b) => {
      const picks: Picks = JSON.parse(b.picks);
      const score = scoreBracket(b.id, b.name, b.username, b.user_id, picks, results, settings, regions, b.tiebreaker, null);
      return score;
    });

    scored.sort((a, b) => b.total - a.total);

    const myScores = scored.filter((s) => s.userId === user.id);
    const myBest = myScores.length > 0 ? myScores.reduce((best, s) => s.total > best.total ? s : best) : null;
    const myBestRank = myBest ? scored.findIndex((s) => s.bracketId === myBest.bracketId) + 1 : scored.length;

    summaries.push({
      groupId: g.id,
      groupName: g.name,
      memberCount: g.member_count,
      myBestRank,
      myBestScore: myBest?.total ?? 0,
      myBestBracketName: myBest?.bracketName ?? "",
      leaderUsername: scored[0]?.username ?? "",
      leaderScore: scored[0]?.total ?? 0,
      totalBrackets: scored.length,
    });
  }

  return NextResponse.json({ summaries });
}
