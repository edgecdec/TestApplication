import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseBracketData } from "@/lib/bracket-utils";
import type { ScoringSettings } from "@/types/group";
import type { Bracket, Tournament, RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { SimulatorBracketData } from "@/types/simulator";

interface BracketWithUser extends Bracket {
  username: string;
}

interface GroupRow {
  id: number;
  name: string;
  scoring_settings: string;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const group = db.prepare("SELECT id, name, scoring_settings FROM groups WHERE id = ?").get(id) as GroupRow | undefined;
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  const scoringSettings: ScoringSettings = JSON.parse(group.scoring_settings);

  const brackets = db.prepare(`
    SELECT b.*, u.username
    FROM group_brackets gb
    JOIN brackets b ON b.id = gb.bracket_id
    JOIN users u ON u.id = b.user_id
    WHERE gb.group_id = ?
  `).all(id) as BracketWithUser[];

  if (brackets.length === 0) {
    return NextResponse.json({ error: "No brackets in this group" }, { status: 404 });
  }

  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(brackets[0].tournament_id) as Tournament | undefined;
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  const regions: RegionData[] = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data);

  const bracketData: SimulatorBracketData[] = brackets.map((b) => ({
    bracketId: b.id,
    bracketName: b.name,
    username: b.username,
    userId: b.user_id,
    picks: JSON.parse(b.picks) as Picks,
    tiebreaker: b.tiebreaker,
  }));

  return NextResponse.json({
    groupId: group.id,
    groupName: group.name,
    regions,
    results,
    scoringSettings,
    brackets: bracketData,
  });
}
