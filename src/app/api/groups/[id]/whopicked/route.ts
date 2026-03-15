import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { parseBracketData, getTeamsForGame, gameId, gamesInRound } from "@/lib/bracket-utils";
import { REGIONS } from "@/lib/bracket-constants";
import type { Bracket, Tournament, RegionData } from "@/types/tournament";
import type { Picks } from "@/types/bracket";
import type { PickerInfo, TeamPickers, GamePicks, WhoPickedResponse } from "@/types/whopicked";

interface BracketWithUser extends Bracket {
  username: string;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const group = db.prepare("SELECT id, name FROM groups WHERE id = ?").get(id) as { id: number; name: string } | undefined;
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

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
  const allPicks = brackets.map((b) => ({
    username: b.username,
    bracketName: b.name,
    picks: JSON.parse(b.picks) as Picks,
  }));

  const totalBrackets = allPicks.length;

  function buildGamePicks(gId: string): GamePicks {
    const counts: Record<string, PickerInfo[]> = {};
    for (const bp of allPicks) {
      const pick = bp.picks[gId];
      if (pick) {
        if (!counts[pick]) counts[pick] = [];
        counts[pick].push({ username: bp.username, bracketName: bp.bracketName });
      }
    }
    // Use first bracket's picks to determine teams for display
    const [teamA, teamB] = getTeamsForGame(gId, regions, allPicks[0]?.picks ?? {});
    const picks: TeamPickers[] = Object.entries(counts)
      .map(([team, users]) => ({ team, count: users.length, users }))
      .sort((a, b) => b.count - a.count);
    return { gameId: gId, teamA, teamB, picks };
  }

  const regionData = REGIONS.map((regionName) => {
    const rounds: GamePicks[][] = [];
    for (let round = 0; round <= 3; round++) {
      const count = gamesInRound(round);
      const games: GamePicks[] = [];
      for (let i = 0; i < count; i++) {
        games.push(buildGamePicks(gameId(regionName, round, i)));
      }
      rounds.push(games);
    }
    return { name: regionName, rounds };
  });

  const finalFour: GamePicks[] = [
    buildGamePicks(gameId("ff", 4, 0)),
    buildGamePicks(gameId("ff", 4, 1)),
  ];
  const championship = buildGamePicks(gameId("ff", 5, 0));

  const response: WhoPickedResponse = {
    groupName: group.name,
    totalBrackets,
    regions: regionData,
    finalFour,
    championship,
  };

  return NextResponse.json(response);
}
