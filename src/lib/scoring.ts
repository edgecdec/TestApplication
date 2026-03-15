import type { RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { ScoringSettings } from "@/types/group";
import type { RoundScore, BracketScore, PickDetail, PickStreak } from "@/types/scoring";
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

/**
 * Count total resolved games from results.
 */
export function countResolvedGames(results: Results): number {
  return Object.keys(results).length;
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

/**
 * Calculate the maximum points a bracket can still earn.
 * For each undecided game where the user made a pick,
 * check if the picked team is still alive (not eliminated).
 * If alive, add the round's base points.
 * Upset bonus is excluded since it's unpredictable.
 */
export function maxPossibleRemaining(
  picks: Picks,
  results: Results,
  settings: ScoringSettings,
  eliminatedTeams: Set<string>
): number {
  let remaining = 0;
  for (const [gId, pickedTeam] of Object.entries(picks)) {
    if (results[gId]) continue; // game already decided
    if (eliminatedTeams.has(pickedTeam)) continue; // team is out
    const round = parseRoundFromGameId(gId);
    remaining += settings.pointsPerRound[round] ?? 0;
  }
  return remaining;
}

/** Extract the round number from a game ID like "East-2-1" or "ff-5-0". */
function parseRoundFromGameId(gId: string): number {
  const parts = gId.split("-");
  return parseInt(parts[parts.length - 2], 10);
}

/**
 * Return per-game scoring details for a bracket.
 * Only includes games where the user made a pick AND a result exists.
 */
export function scorePicksDetailed(
  picks: Picks,
  results: Results,
  settings: ScoringSettings,
  regions: RegionData[]
): PickDetail[] {
  const teamSeedMap = buildTeamSeedMap(regions);
  const details: PickDetail[] = [];

  for (let round = 0; round < NUM_ROUNDS; round++) {
    const gameIds = allGameIdsForRound(round);
    const roundPoints = settings.pointsPerRound[round] ?? 0;
    const bonusMultiplier = settings.upsetBonusPerRound[round] ?? 0;

    for (const gId of gameIds) {
      const pick = picks[gId];
      if (!pick) continue;
      const result = results[gId] ?? null;
      const isCorrect = result !== null && pick === result;
      let bonus = 0;

      if (isCorrect && bonusMultiplier > 0) {
        const winnerSeed = teamSeedMap.get(result);
        const [teamA, teamB] = getTeamsInGame(gId, results, regions);
        const loser = teamA === result ? teamB : teamA;
        const loserSeed = loser ? teamSeedMap.get(loser) : undefined;
        if (winnerSeed != null && loserSeed != null && winnerSeed > loserSeed) {
          bonus = bonusMultiplier * (winnerSeed - loserSeed);
        }
      }

      details.push({
        gameId: gId,
        round,
        pick,
        result,
        correct: isCorrect,
        basePoints: isCorrect ? roundPoints : 0,
        upsetBonus: isCorrect ? bonus : 0,
      });
    }
  }

  return details;
}

/**
 * Compute the current pick streak for a bracket.
 * Positive = consecutive correct picks from most recent, negative = consecutive wrong.
 * Games are ordered by round descending (most recent first), then by gameId descending.
 * Only considers games where the user made a pick AND a result exists.
 */
export function computeStreak(picks: Picks, results: Results): PickStreak {
  const resolved: { gameId: string; round: number; correct: boolean }[] = [];
  for (const [gId, result] of Object.entries(results)) {
    const pick = picks[gId];
    if (!pick) continue;
    const parts = gId.split("-");
    const round = parseInt(parts[parts.length - 2], 10);
    resolved.push({ gameId: gId, round, correct: pick === result });
  }
  if (resolved.length === 0) return 0;

  // Most recent games first
  resolved.sort((a, b) => b.round - a.round || b.gameId.localeCompare(a.gameId));

  const firstCorrect = resolved[0].correct;
  let count = 0;
  for (const r of resolved) {
    if (r.correct !== firstCorrect) break;
    count++;
  }
  return firstCorrect ? count : -count;
}

/**
 * Determine the highest round number that has at least one result.
 * Returns -1 if no results exist.
 */
export function getCurrentRound(results: Results): number {
  let maxRound = -1;
  for (const gId of Object.keys(results)) {
    const round = parseRoundFromGameId(gId);
    if (round > maxRound) maxRound = round;
  }
  return maxRound;
}

/**
 * Filter results to only include games from rounds strictly before the given round.
 */
export function filterResultsBeforeRound(results: Results, round: number): Results {
  const filtered: Results = {};
  for (const [gId, winner] of Object.entries(results)) {
    if (parseRoundFromGameId(gId) < round) {
      filtered[gId] = winner;
    }
  }
  return filtered;
}
