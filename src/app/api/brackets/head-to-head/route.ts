import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scoreBracket, maxPossibleRemaining, countResolvedGames } from "@/lib/scoring";
import { parseBracketData, getEliminatedTeams } from "@/lib/bracket-utils";
import { CHAMPIONSHIP_GAME_ID, REGIONS } from "@/lib/bracket-constants";
import { gamesInRound, gameId } from "@/lib/bracket-utils";
import type { ScoringSettings } from "@/types/group";
import type { Tournament, RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { HeadToHeadGame, HeadToHeadResult } from "@/types/scoring";

const NUM_ROUNDS = 6;

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

export async function GET(req: NextRequest) {
  const sp = req.nextUrl.searchParams;
  const idA = Number(sp.get("a"));
  const idB = Number(sp.get("b"));
  const groupId = sp.get("group_id");

  if (!idA || !idB || idA === idB) {
    return NextResponse.json({ error: "Two different bracket IDs required" }, { status: 400 });
  }

  const db = getDb();

  const bracketA = db.prepare("SELECT b.*, u.username FROM brackets b JOIN users u ON u.id = b.user_id WHERE b.id = ?").get(idA) as (Record<string, unknown> & { picks: string; tournament_id: number; name: string; username: string; user_id: number; tiebreaker: number | null }) | undefined;
  const bracketB = db.prepare("SELECT b.*, u.username FROM brackets b JOIN users u ON u.id = b.user_id WHERE b.id = ?").get(idB) as (Record<string, unknown> & { picks: string; tournament_id: number; name: string; username: string; user_id: number; tiebreaker: number | null }) | undefined;

  if (!bracketA || !bracketB) {
    return NextResponse.json({ error: "Bracket not found" }, { status: 404 });
  }
  if (bracketA.tournament_id !== bracketB.tournament_id) {
    return NextResponse.json({ error: "Brackets must be from the same tournament" }, { status: 400 });
  }

  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(bracketA.tournament_id) as Tournament | undefined;
  if (!tournament) {
    return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
  }

  // Use group scoring if provided, otherwise default
  let settings: ScoringSettings = { pointsPerRound: [1, 2, 4, 8, 16, 32], upsetBonusPerRound: [0, 0, 0, 0, 0, 0] };
  if (groupId) {
    const group = db.prepare("SELECT scoring_settings FROM groups WHERE id = ?").get(groupId) as { scoring_settings: string } | undefined;
    if (group) settings = JSON.parse(group.scoring_settings);
  }

  const regions: RegionData[] = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data);
  const eliminatedTeams = getEliminatedTeams(results, regions);
  const picksA: Picks = JSON.parse(bracketA.picks);
  const picksB: Picks = JSON.parse(bracketB.picks);

  const scoreA = scoreBracket(idA, bracketA.name, bracketA.username, bracketA.user_id, picksA, results, settings, regions, bracketA.tiebreaker, null);
  const scoreB = scoreBracket(idB, bracketB.name, bracketB.username, bracketB.user_id, picksB, results, settings, regions, bracketB.tiebreaker, null);
  const maxA = scoreA.total + maxPossibleRemaining(picksA, results, settings, eliminatedTeams);
  const maxB = scoreB.total + maxPossibleRemaining(picksB, results, settings, eliminatedTeams);
  const correctA = scoreA.rounds.reduce((s, r) => s + r.correct, 0);
  const correctB = scoreB.rounds.reduce((s, r) => s + r.correct, 0);

  // Build per-game comparison for resolved games
  const games: HeadToHeadGame[] = [];
  let winsA = 0;
  let winsB = 0;
  let ties = 0;

  for (let round = 0; round < NUM_ROUNDS; round++) {
    for (const gId of allGameIdsForRound(round)) {
      const result = results[gId];
      if (!result) continue;
      const pA = picksA[gId] ?? "";
      const pB = picksB[gId] ?? "";
      if (!pA && !pB) continue; // skip games where neither bracket picked
      const cA = !!pA && pA === result;
      const cB = !!pB && pB === result;
      if (cA && !cB) winsA++;
      else if (!cA && cB) winsB++;
      else ties++;
      games.push({ gameId: gId, round, result, pickA: pA, pickB: pB, correctA: cA, correctB: cB });
    }
  }

  const h2h: HeadToHeadResult = {
    bracketA: { id: idA, name: bracketA.name, username: bracketA.username, total: scoreA.total, championPick: picksA[CHAMPIONSHIP_GAME_ID] ?? null, correctPicks: correctA, maxPossible: maxA },
    bracketB: { id: idB, name: bracketB.name, username: bracketB.username, total: scoreB.total, championPick: picksB[CHAMPIONSHIP_GAME_ID] ?? null, correctPicks: correctB, maxPossible: maxB },
    winsA,
    winsB,
    ties,
    games,
  };

  return NextResponse.json(h2h);
}
