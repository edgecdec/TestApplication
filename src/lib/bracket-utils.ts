import { REGIONS, SEEDS_PER_REGION } from "@/lib/bracket-constants";
import type { RegionData, TeamSeed } from "@/types/tournament";
import type { Picks } from "@/types/bracket";

/**
 * Safely parse bracket_data from the DB (a JSON string) into RegionData[].
 * Handles: plain array, object with `.regions` key, and `teams` vs `seeds` key mismatch.
 */
export function parseBracketData(raw: string | undefined | null): RegionData[] {
  if (!raw) return [];
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  const arr: unknown[] = Array.isArray(parsed) ? parsed : Array.isArray(parsed?.regions) ? parsed.regions : [];
  return arr.map((item) => {
    const r = item as Record<string, unknown>;
    return {
      name: String(r.name ?? ""),
      seeds: (Array.isArray(r.seeds) ? r.seeds : Array.isArray(r.teams) ? r.teams : []) as TeamSeed[],
    };
  });
}

/**
 * Build a game ID for a regional game.
 * Rounds 0-3 are regional (R64, R32, Sweet16, Elite8).
 * Round 4 = Final Four, Round 5 = Championship.
 */
export function gameId(region: string, round: number, index: number): string {
  if (round >= 4) return `ff-${round}-${index}`;
  return `${region}-${round}-${index}`;
}

/**
 * Get the two feeder game IDs that produce the teams for a given game.
 * Returns null for R64 games (round 0) since those are seeded directly.
 */
export function feederGameIds(gId: string): [string, string] | null {
  const parts = gId.split("-");
  const region = parts.length === 3 && parts[0] !== "ff" ? parts[0] : parts[0];
  const round = parseInt(parts[parts.length - 2], 10);
  const index = parseInt(parts[parts.length - 1], 10);

  if (round === 0) return null;

  if (region === "ff" && round === 5) {
    return [gameId("ff", 4, 0), gameId("ff", 4, 1)];
  }
  if (region === "ff" && round === 4) {
    // Final Four: index 0 = East winner vs West winner, index 1 = South winner vs Midwest winner
    const regionPairs: [string, string][] = [
      [REGIONS[0], REGIONS[1]],
      [REGIONS[2], REGIONS[3]],
    ];
    const [r1, r2] = regionPairs[index];
    return [gameId(r1, 3, 0), gameId(r2, 3, 0)];
  }

  return [gameId(region, round - 1, index * 2), gameId(region, round - 1, index * 2 + 1)];
}

/**
 * Get the two teams competing in a game based on current picks and bracket data.
 * For R64, teams come from the seed data. For later rounds, from picks.
 */
export function getTeamsForGame(
  gId: string,
  regions: RegionData[],
  picks: Picks
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

  const feeders = feederGameIds(gId);
  if (!feeders) return [null, null];
  return [picks[feeders[0]] ?? null, picks[feeders[1]] ?? null];
}

/**
 * Standard R64 matchup order by seed: 1v16, 8v9, 5v12, 4v13, 6v11, 3v14, 7v10, 2v15
 */
export function buildR64Matchups(): [number, number][] {
  return [
    [1, 16], [8, 9], [5, 12], [4, 13],
    [6, 11], [3, 14], [7, 10], [2, 15],
  ];
}

/**
 * Get all downstream game IDs that could be affected by changing a pick.
 * Used for cascade clearing.
 */
export function getDownstreamGames(gId: string): string[] {
  const downstream: string[] = [];
  const parts = gId.split("-");
  const regionName = parts[0];
  const round = parseInt(parts[parts.length - 2], 10);
  const index = parseInt(parts[parts.length - 1], 10);

  // Walk up the bracket from this game
  if (regionName !== "ff") {
    // Regional games: go up rounds within region
    for (let r = round + 1; r <= 3; r++) {
      const idx = Math.floor(index / Math.pow(2, r - round));
      downstream.push(gameId(regionName, r, idx));
    }
    // Then Final Four and Championship
    const regionIdx = REGIONS.indexOf(regionName as typeof REGIONS[number]);
    if (regionIdx !== -1) {
      const ffIdx = Math.floor(regionIdx / 2);
      downstream.push(gameId("ff", 4, ffIdx));
      downstream.push(gameId("ff", 5, 0));
    }
  } else if (round === 4) {
    downstream.push(gameId("ff", 5, 0));
  }

  return downstream;
}

/**
 * Apply cascade clearing: when a pick changes, remove all downstream picks
 * that contained the old winner.
 */
export function cascadeClear(picks: Picks, changedGameId: string, oldWinner: string): Picks {
  if (!oldWinner) return picks;
  const newPicks = { ...picks };
  const downstream = getDownstreamGames(changedGameId);
  for (const gId of downstream) {
    if (newPicks[gId] === oldWinner) {
      delete newPicks[gId];
    }
  }
  return newPicks;
}

/**
 * Count total games per region per round.
 */
export function gamesInRound(round: number): number {
  if (round === 0) return 8;
  if (round === 1) return 4;
  if (round === 2) return 2;
  if (round === 3) return 1;
  if (round === 4) return 2;
  if (round === 5) return 1;
  return 0;
}
