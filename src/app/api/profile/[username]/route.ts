import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { scorePicks } from "@/lib/scoring";
import { DEFAULT_SCORING } from "@/lib/bracket-constants";
import type { RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { ProfileData, ProfileBracket, ProfileGroup } from "@/types/profile";

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
    SELECT b.id, b.name, b.picks, b.tiebreaker, b.updated_at,
           t.name AS tournament_name, t.bracket_data, t.results_data
    FROM brackets b
    JOIN tournaments t ON t.id = b.tournament_id
    WHERE b.user_id = ?
    ORDER BY b.updated_at DESC
  `).all(targetUser.id) as {
    id: number; name: string; picks: string; tiebreaker: number | null;
    updated_at: string; tournament_name: string; bracket_data: string; results_data: string;
  }[];

  const brackets: ProfileBracket[] = rows.map((r) => {
    const picks: Picks = typeof r.picks === "string" ? JSON.parse(r.picks) : r.picks;
    const results: Results = typeof r.results_data === "string" ? JSON.parse(r.results_data) : r.results_data;
    const bracketDataParsed = typeof r.bracket_data === "string" ? JSON.parse(r.bracket_data) : r.bracket_data;
    const regions: RegionData[] = Array.isArray(bracketDataParsed) ? bracketDataParsed : bracketDataParsed?.regions ?? [];
    const rounds = scorePicks(picks, results, DEFAULT_SCORING, regions);
    const total = rounds.reduce((s, rd) => s + rd.points, 0);
    return {
      id: r.id,
      name: r.name,
      tournamentName: r.tournament_name,
      total,
      rounds,
      tiebreaker: r.tiebreaker,
      updatedAt: r.updated_at,
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
