import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scorePicksDetailed } from "@/lib/scoring";
import { parseBracketData } from "@/lib/bracket-utils";
import type { ScoringSettings } from "@/types/group";
import type { Bracket, Tournament, RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";

interface GroupRow { scoring_settings: string }
interface BracketWithUser extends Bracket { username: string }

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string; bracketId: string }> }) {
  const { id, bracketId } = await params;
  const db = getDb();

  const group = db.prepare("SELECT scoring_settings FROM groups WHERE id = ?").get(id) as GroupRow | undefined;
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const settings: ScoringSettings = JSON.parse(group.scoring_settings);

  // Verify bracket is in this group
  const membership = db.prepare("SELECT 1 FROM group_brackets WHERE group_id = ? AND bracket_id = ?").get(id, bracketId);
  if (!membership) return NextResponse.json({ error: "Bracket not in group" }, { status: 404 });

  const bracket = db.prepare("SELECT b.*, u.username FROM brackets b JOIN users u ON u.id = b.user_id WHERE b.id = ?").get(bracketId) as BracketWithUser | undefined;
  if (!bracket) return NextResponse.json({ error: "Bracket not found" }, { status: 404 });

  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(bracket.tournament_id) as Tournament | undefined;
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  const regions: RegionData[] = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data);
  const picks: Picks = JSON.parse(bracket.picks);

  const details = scorePicksDetailed(picks, results, settings, regions);

  return NextResponse.json({
    bracketName: bracket.name,
    username: bracket.username,
    details,
  });
}
