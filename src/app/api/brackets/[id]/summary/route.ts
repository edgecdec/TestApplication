import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseBracketData } from "@/lib/bracket-utils";
import { scorePicks, maxPossibleRemaining, countResolvedGames } from "@/lib/scoring";
import { DEFAULT_SCORING, TOTAL_GAMES } from "@/lib/bracket-constants";
import type { Bracket, Tournament } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { ScoringSettings } from "@/types/group";

interface GroupBracketRow { group_id: number; group_name: string; scoring_settings: string }
interface GroupBracketEntry { bracket_id: number; picks: string }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const bracket = db.prepare(
    "SELECT b.*, u.username FROM brackets b JOIN users u ON b.user_id = u.id WHERE b.id = ?"
  ).get(id) as (Bracket & { username: string }) | undefined;
  if (!bracket) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(bracket.tournament_id) as Tournament | undefined;
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  const regions = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data);
  const picks: Picks = typeof bracket.picks === "string" ? JSON.parse(bracket.picks) : bracket.picks;
  const resolved = countResolvedGames(results);

  const rounds = scorePicks(picks, results, DEFAULT_SCORING, regions);
  const total = rounds.reduce((s, r) => s + r.points, 0);
  const correct = rounds.reduce((s, r) => s + r.correct, 0);

  let wrong = 0;
  let pending = 0;
  for (const gId of Object.keys(picks)) {
    if (!picks[gId]) continue;
    if (results[gId]) { if (picks[gId] !== results[gId]) wrong++; }
    else { pending++; }
  }

  const maxRemaining = maxPossibleRemaining(picks, results, DEFAULT_SCORING, new Set());

  const groupRows = db.prepare(`
    SELECT g.id as group_id, g.name as group_name, g.scoring_settings
    FROM group_brackets gb JOIN groups g ON gb.group_id = g.id WHERE gb.bracket_id = ?
  `).all(Number(id)) as GroupBracketRow[];

  const groupRanks: { groupId: number; groupName: string; rank: number; total: number }[] = [];
  for (const gr of groupRows) {
    const settings: ScoringSettings = JSON.parse(gr.scoring_settings);
    const entries = db.prepare(`
      SELECT gb.bracket_id, b.picks FROM group_brackets gb JOIN brackets b ON gb.bracket_id = b.id WHERE gb.group_id = ?
    `).all(gr.group_id) as GroupBracketEntry[];

    const scores = entries.map((e) => {
      const p: Picks = typeof e.picks === "string" ? JSON.parse(e.picks) : e.picks;
      const r = scorePicks(p, results, settings, regions);
      return { bracketId: e.bracket_id, total: r.reduce((s, rd) => s + rd.points, 0) };
    }).sort((a, b) => b.total - a.total);

    const rank = scores.findIndex((s) => s.bracketId === Number(id)) + 1;
    if (rank > 0) groupRanks.push({ groupId: gr.group_id, groupName: gr.group_name, rank, total: scores.length });
  }

  return NextResponse.json({
    score: total, correct, wrong, pending, resolved,
    totalGames: TOTAL_GAMES, maxPossible: total + maxRemaining, groupRanks,
  });
}
