import type { RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { ScoringSettings } from "@/types/group";
import type { RoundScore, BracketScore } from "@/types/scoring";
import { ROUND_NAMES, REGIONS } from "@/lib/bracket-constants";
import { gameId, buildR64Matchups, gamesInRound } from "@/lib/bracket-utils";

const NUM_ROUNDS = ROUND_NAMES.length;

/** Build a map of team name → seed from region data. */
export function buildTeamSeedMap(regions: RegionData[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const region of regions) {
    for (const ts of region.seeds) {
      map.set(ts.name, ts.seed);
    }
  }
  return map;
}

/** Get all game IDs for a given round. */
function allGameIdsForRound(round: number): string[] {
  const ids: string[] = [];
  if (round <= 3) {
    const count = gamesInRound(round);
    for (const region of REGIONS) {
      for (let i = 0; i < count; i++) {
        ids.push(gameId(region, round, i));
      }
    }
  } else {
    const count = round === 4 ? 2 : 1;
    for (let i = 0; i < count; i++) {
      ids.push(gameId("ff", round, i));
    }
  }
  return ids;
}

/** Get the two teams in a game based on results (for resolved games). */
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
    const topTeam = region.seeds.find((s) => s.seed === topSeed);
    const bottomTeam = region.seeds.find((s) => s.seed === bottomSeed);
    return [topTeam?.name ?? null, bottomTeam?.name ?? null];
  }

  if (regionName === "ff" && round === 5) {
    return [results[gameId("ff", 4, 0)] ?? null, results[gameId("ff", 4, 1)] ?? null];
  }
  if (regionName === "ff" && round === 4) {
    const regionPairs: [string, string][] = [
      [REGIONS[0], REGIONS[1]],
      [REGIONS[2], REGIONS[3]],
    ];
    const [r1, r2] = regionPairs[index];
    return [results[gameId(r1, 3, 0)] ?? null, results[gameId(r2, 3, 0)] ?? null];
  }

  return [
    results[gameId(regionName, round - 1, index * 2)] ?? null,
    results[gameId(regionName, round - 1, index * 2 + 1)] ?? null,
  ];
}

/**
 * Score a single bracket's picks against results.
 * Returns per-round breakdown and total.
 */
export function scorePicks(
  picks: Picks,
  results: Results,
  settings: ScoringSettings,
  regions: RegionData[]
): RoundScore[] {
  const teamSeedMap = buildTeamSeedMap(regions);
  const rounds: RoundScore[] = [];

  for (let round = 0; round < NUM_ROUNDS; round++) {
    const gameIds = allGameIdsForRound(round);
    let correct = 0;
    let points = 0;
    let upsetBonus = 0;
    const roundPoints = settings.pointsPerRound[round] ?? 0;
    const bonusMultiplier = settings.upsetBonusPerRound[round] ?? 0;

    for (const gId of gameIds) {
      const result = results[gId];
      const pick = picks[gId];
      if (!result || !pick) continue;
      if (pick === result) {
        correct++;
        points += roundPoints;

        if (bonusMultiplier > 0) {
          const winnerSeed = teamSeedMap.get(result);
          const [teamA, teamB] = getTeamsInGame(gId, results, regions);
          const loser = teamA === result ? teamB : teamA;
          const loserSeed = loser ? teamSeedMap.get(loser) : undefined;
          if (winnerSeed != null && loserSeed != null && winnerSeed > loserSeed) {
            upsetBonus += bonusMultiplier * (winnerSeed - loserSeed);
          }
        }
      }
    }

    rounds.push({ correct, points: points + upsetBonus, upsetBonus });
  }

  return rounds;
}

/** Score a bracket and return a full BracketScore object. */
export function scoreBracket(
  bracketId: number,
  bracketName: string,
  username: string,
  userId: number,
  picks: Picks,
  results: Results,
  settings: ScoringSettings,
  regions: RegionData[],
  tiebreaker: number | null,
  actualTotal: number | null
): BracketScore {
  const rounds = scorePicks(picks, results, settings, regions);
  const total = rounds.reduce((sum, r) => sum + r.points, 0);
  const tiebreakerDiff = tiebreaker != null && actualTotal != null
    ? Math.abs(tiebreaker - actualTotal)
    : null;

  return { bracketId, bracketName, username, userId, total, rounds, tiebreaker, tiebreakerDiff };
}
