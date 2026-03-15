import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { scorePicks, countResolvedGames } from "@/lib/scoring";
import { DEFAULT_SCORING } from "@/lib/bracket-constants";
import { parseBracketData } from "@/lib/bracket-utils";
import { computeGrade } from "@/lib/grading";
import { computeAchievements, type Achievement } from "@/lib/achievements";
import type { RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { ProfileData, ProfileBracket, ProfileGroup } from "@/types/profile";
import type { BracketGradeInfo } from "@/lib/grading";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { username } = await params;
  const db = getDb();

  const targetUser = db.prepare("SELECT id, username, created_at FROM users WHERE username = ?").get(username) as
    | { id: number; username: string; created_at: string }
    | undefined;

  if (!targetUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  // Get brackets with tournament info
  const rows = db.prepare(`
    SELECT b.id, b.name, b.picks, b.tiebreaker, b.updated_at, b.tournament_id,
           t.name AS tournament_name, t.bracket_data, t.results_data
    FROM brackets b
    JOIN tournaments t ON t.id = b.tournament_id
    WHERE b.user_id = ?
    ORDER BY b.updated_at DESC
  `).all(targetUser.id) as {
    id: number; name: string; picks: string; tiebreaker: number | null;
    updated_at: string; tournament_id: number; tournament_name: string; bracket_data: string; results_data: string;
  }[];

  // Compute grades: for each tournament, score all brackets to get percentiles
  const gradeMap = new Map<number, BracketGradeInfo>();
  const tournamentIds = Array.from(new Set(rows.map((r) => r.tournament_id)));
  for (const tid of tournamentIds) {
    const tRow = rows.find((r) => r.tournament_id === tid);
    if (!tRow) continue;
    const tResults: Results = typeof tRow.results_data === "string" ? JSON.parse(tRow.results_data) : tRow.results_data;
    if (countResolvedGames(tResults) === 0) continue;
    const tRegions = parseBracketData(tRow.bracket_data);
    if (tRegions.length === 0) continue;

    const allBrackets = db.prepare("SELECT id, picks FROM brackets WHERE tournament_id = ?").all(tid) as { id: number; picks: string }[];
    const totals = allBrackets.map((ab) => {
      const p: Picks = JSON.parse(ab.picks);
      const rds = scorePicks(p, tResults, DEFAULT_SCORING, tRegions);
      return { id: ab.id, total: rds.reduce((s, rd) => s + rd.points, 0) };
    });
    totals.sort((a, b) => b.total - a.total);
    const ranks = new Map<number, number>();
    for (let i = 0; i < totals.length; i++) {
      ranks.set(totals[i].id, i > 0 && totals[i].total === totals[i - 1].total ? (ranks.get(totals[i - 1].id) ?? i + 1) : i + 1);
    }
    const count = totals.length;
    for (const r of rows.filter((r) => r.tournament_id === tid)) {
      const rank = ranks.get(r.id) ?? count;
      const pct = count > 1 ? Math.round(((count - rank) / (count - 1)) * 100) : 100;
      gradeMap.set(r.id, computeGrade(pct));
    }
  }

  const brackets: ProfileBracket[] = rows.map((r) => {
    const picks: Picks = typeof r.picks === "string" ? JSON.parse(r.picks) : r.picks;
    const results: Results = typeof r.results_data === "string" ? JSON.parse(r.results_data) : r.results_data;
    const regions = parseBracketData(r.bracket_data);
    const hasRegions = regions.length > 0 && regions.every((rg: RegionData) => Array.isArray(rg.seeds));
    const rounds = hasRegions ? scorePicks(picks, results, DEFAULT_SCORING, regions) : [];
    const total = rounds.reduce((s, rd) => s + rd.points, 0);
    const bracketAchievements = hasRegions ? computeAchievements(picks, results, regions) : [];
    return {
      id: r.id,
      name: r.name,
      tournamentName: r.tournament_name,
      total,
      rounds,
      tiebreaker: r.tiebreaker,
      updatedAt: r.updated_at,
      grade: gradeMap.get(r.id) ?? null,
      achievements: bracketAchievements,
    };
  });

  // Get groups
  const groups = db.prepare(`
    SELECT g.id, g.name, (SELECT COUNT(*) FROM group_members WHERE group_id = g.id) AS member_count
    FROM groups g
    JOIN group_members gm ON gm.group_id = g.id
    WHERE gm.user_id = ?
    ORDER BY g.name
  `).all(targetUser.id) as ProfileGroup[];

  const data: ProfileData = {
    username: targetUser.username,
    createdAt: targetUser.created_at,
    brackets,
    groups,
  };

  return NextResponse.json(data);
}
