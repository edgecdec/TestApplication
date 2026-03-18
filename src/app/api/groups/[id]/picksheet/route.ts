import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { REGIONS, ROUND_NAMES } from "@/lib/bracket-constants";
import { parseBracketData, getTeamsForGame, buildR64Matchups, gameId } from "@/lib/bracket-utils";
import type { RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";

interface BracketRow {
  id: number;
  name: string;
  picks: string;
  username: string;
}

interface TournamentRow {
  bracket_data: string;
  results_data: string;
}

export interface PickSheetGame {
  gameId: string;
  round: number;
  roundName: string;
  region: string;
  topTeam: string | null;
  bottomTeam: string | null;
  result: string | null;
}

export interface PickSheetBracket {
  bracketId: number;
  bracketName: string;
  username: string;
}

export interface PickSheetData {
  games: PickSheetGame[];
  brackets: PickSheetBracket[];
  /** bracketId -> gameId -> team picked */
  picks: Record<number, Record<string, string>>;
}

function buildAllGames(regions: RegionData[], results: Results): PickSheetGame[] {
  const games: PickSheetGame[] = [];
  for (const regionName of REGIONS) {
    for (let round = 0; round < 4; round++) {
      const count = 8 / Math.pow(2, round);
      for (let i = 0; i < count; i++) {
        const gId = gameId(regionName, round, i);
        const [top, bottom] = getTeamsForGame(gId, regions, results);
        games.push({
          gameId: gId,
          round,
          roundName: ROUND_NAMES[round],
          region: regionName,
          topTeam: top,
          bottomTeam: bottom,
          result: results[gId] ?? null,
        });
      }
    }
  }
  // Final Four
  for (let i = 0; i < 2; i++) {
    const gId = gameId("ff", 4, i);
    const [top, bottom] = getTeamsForGame(gId, regions, results);
    games.push({ gameId: gId, round: 4, roundName: ROUND_NAMES[4], region: "Final Four", topTeam: top, bottomTeam: bottom, result: results[gId] ?? null });
  }
  // Championship
  const champId = gameId("ff", 5, 0);
  const [top, bottom] = getTeamsForGame(champId, regions, results);
  games.push({ gameId: champId, round: 5, roundName: ROUND_NAMES[5], region: "Final Four", topTeam: top, bottomTeam: bottom, result: results[champId] ?? null });

  return games;
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const rows = db.prepare(`
    SELECT b.id, b.name, b.picks, u.username
    FROM group_brackets gb
    JOIN brackets b ON b.id = gb.bracket_id
    JOIN users u ON u.id = b.user_id
    WHERE gb.group_id = ?
    ORDER BY u.username, b.name
  `).all(id) as BracketRow[];

  const groupRow = db.prepare("SELECT tournament_id FROM brackets WHERE id = (SELECT bracket_id FROM group_brackets WHERE group_id = ? LIMIT 1)").get(id) as { tournament_id: number } | undefined;
  if (!groupRow) return NextResponse.json({ error: "No brackets in group" }, { status: 404 });

  const tournament = db.prepare("SELECT bracket_data, results_data FROM tournaments WHERE id = ?").get(groupRow.tournament_id) as TournamentRow | undefined;
  if (!tournament) return NextResponse.json({ error: "Tournament not found" }, { status: 404 });

  const regions = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data || "{}");

  const games = buildAllGames(regions, results);

  const brackets: PickSheetBracket[] = rows.map((r) => ({
    bracketId: r.id,
    bracketName: r.name,
    username: r.username,
  }));

  const picks: Record<number, Record<string, string>> = {};
  for (const r of rows) {
    try {
      picks[r.id] = typeof r.picks === "string" ? JSON.parse(r.picks) : (r.picks ?? {});
    } catch {
      picks[r.id] = {};
    }
  }

  const data: PickSheetData = { games, brackets, picks };
  return NextResponse.json(data);
}
