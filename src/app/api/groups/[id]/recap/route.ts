import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { scorePicks, buildTeamSeedMap } from "@/lib/scoring";
import { parseBracketData, gameId, gamesInRound, buildR64Matchups } from "@/lib/bracket-utils";
import type { ScoringSettings } from "@/types/group";
import type { Bracket, Tournament, RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { RoundRecap, RoundRecapEntry, UpsetHit } from "@/types/recap";
import { REGIONS, ROUND_NAMES } from "@/lib/bracket-constants";

interface BracketWithUser extends Bracket {
  username: string;
}

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

function totalGamesInRound(round: number): number {
  if (round <= 3) return gamesInRound(round) * REGIONS.length;
  return round === 4 ? 2 : 1;
}

function getTeamsInGame(
  gId: string,
  results: Results,
  regions: RegionData[]
): [string | null, string | null] {
  const parts = gId.split("-");
  const regionName = parts[0];
  const round = parseInt(parts[parts.length - 2], 10);
  const index = parseInt(parts[parts.length - 1], 10);

  if (round === 0 && regionName !== "ff") {
    const region = regions.find((r) => r.name === regionName);
    if (!region) return [null, null];
    const matchups = buildR64Matchups();
    const [topSeed, bottomSeed] = matchups[index];
    return [
      region.seeds.find((s) => s.seed === topSeed)?.name ?? null,
      region.seeds.find((s) => s.seed === bottomSeed)?.name ?? null,
    ];
  }
  if (regionName === "ff" && round === 5) {
    return [results[gameId("ff", 4, 0)] ?? null, results[gameId("ff", 4, 1)] ?? null];
  }
  if (regionName === "ff" && round === 4) {
    const pairs: [string, string][] = [[REGIONS[0], REGIONS[1]], [REGIONS[2], REGIONS[3]]];
    const [r1, r2] = pairs[index];
    return [results[gameId(r1, 3, 0)] ?? null, results[gameId(r2, 3, 0)] ?? null];
  }
  return [
    results[gameId(regionName, round - 1, index * 2)] ?? null,
    results[gameId(regionName, round - 1, index * 2 + 1)] ?? null,
  ];
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const group = db.prepare("SELECT scoring_settings FROM groups WHERE id = ?").get(id) as { scoring_settings: string } | undefined;
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const settings: ScoringSettings = JSON.parse(group.scoring_settings);

  const brackets = db.prepare(`
    SELECT b.*, u.username
    FROM group_brackets gb
    JOIN brackets b ON b.id = gb.bracket_id
    JOIN users u ON u.id = b.user_id
    WHERE gb.group_id = ?
  `).all(id) as BracketWithUser[];

  if (brackets.length === 0) return NextResponse.json({ rounds: [] });

  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(brackets[0].tournament_id) as Tournament | undefined;
  if (!tournament) return NextResponse.json({ rounds: [] });

  const regions: RegionData[] = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data);
  const seedMap = buildTeamSeedMap(regions);

  const bracketPicks = brackets.map((b) => ({
    id: b.id,
    name: b.name,
    username: b.username,
    picks: JSON.parse(b.picks) as Picks,
  }));

  const rounds: RoundRecap[] = [];
  const prevRanks = new Map<number, number>(); // bracketId -> rank after previous round

  for (let round = 0; round < ROUND_NAMES.length; round++) {
    const gameIds = allGameIdsForRound(round);
    const resolvedInRound = gameIds.filter((g) => results[g]).length;
    if (resolvedInRound === 0) break; // no results for this round yet

    // Score each bracket for this specific round
    const roundEntries: RoundRecapEntry[] = bracketPicks.map((bp) => {
      const allRounds = scorePicks(bp.picks, results, settings, regions);
      const thisRound = allRounds[round];
      const cumulativeTotal = allRounds.slice(0, round + 1).reduce((s, r) => s + r.points, 0);
      return {
        username: bp.username,
        bracketName: bp.name,
        bracketId: bp.id,
        points: thisRound.points,
        correct: thisRound.correct,
        upsetBonus: thisRound.upsetBonus,
        cumulativeTotal,
        rankAfterRound: 0,
        rankChange: null,
      };
    });

    // Sort by cumulative total descending for ranking
    roundEntries.sort((a, b) => b.cumulativeTotal - a.cumulativeTotal);
    roundEntries.forEach((e, i) => {
      e.rankAfterRound = i > 0 && roundEntries[i - 1].cumulativeTotal === e.cumulativeTotal
        ? roundEntries[i - 1].rankAfterRound
        : i + 1;
      const prev = prevRanks.get(e.bracketId);
      e.rankChange = prev != null ? prev - e.rankAfterRound : null;
    });

    // Update prevRanks for next round
    roundEntries.forEach((e) => prevRanks.set(e.bracketId, e.rankAfterRound));

    // Find upsets in this round
    const upsetHits: UpsetHit[] = [];
    for (const gId of gameIds) {
      const winner = results[gId];
      if (!winner) continue;
      const [teamA, teamB] = getTeamsInGame(gId, results, regions);
      const loser = teamA === winner ? teamB : teamA;
      if (!loser) continue;
      const winnerSeed = seedMap.get(winner);
      const loserSeed = seedMap.get(loser);
      if (winnerSeed == null || loserSeed == null || winnerSeed <= loserSeed) continue;
      // This is an upset
      const pickedBy = bracketPicks
        .filter((bp) => bp.picks[gId] === winner)
        .map((bp) => bp.username);
      upsetHits.push({
        gameId: gId,
        winner,
        winnerSeed,
        loser,
        loserSeed,
        pickedBy: Array.from(new Set(pickedBy)),
        totalBrackets: brackets.length,
      });
    }
    upsetHits.sort((a, b) => (b.winnerSeed - b.loserSeed) - (a.winnerSeed - a.loserSeed));

    // Sort entries by round points descending for display
    roundEntries.sort((a, b) => b.points - a.points);

    rounds.push({
      round,
      roundName: ROUND_NAMES[round],
      gamesResolved: resolvedInRound,
      totalGames: totalGamesInRound(round),
      entries: roundEntries,
      upsetHits,
    });
  }

  return NextResponse.json({ rounds });
}
