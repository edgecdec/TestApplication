import type { EspnScoreboardResponse, EspnGameResult } from "@/types/espn";
import type { RegionData } from "@/types/tournament";
import type { Results } from "@/types/bracket";
import { REGIONS } from "@/lib/bracket-constants";
import { gameId, buildR64Matchups, feederGameIds } from "@/lib/bracket-utils";

const ESPN_SCOREBOARD_URL =
  "https://site.api.espn.com/apis/site/v2/sports/basketball/mens-college-basketball/scoreboard";

/** Fetch completed game results from ESPN for a given date range or group. */
export async function fetchEspnScores(dates?: string, groups?: string): Promise<EspnGameResult[]> {
  const params = new URLSearchParams({ limit: "100" });
  if (dates) params.set("dates", dates);
  if (groups) params.set("groups", groups);

  const res = await fetch(`${ESPN_SCOREBOARD_URL}?${params}`, { cache: "no-store" });
  if (!res.ok) throw new Error(`ESPN API returned ${res.status}`);

  const data: EspnScoreboardResponse = await res.json();
  return parseCompletedGames(data);
}

function parseCompletedGames(data: EspnScoreboardResponse): EspnGameResult[] {
  const results: EspnGameResult[] = [];
  for (const event of data.events) {
    if (!event.status.type.completed) continue;
    const comp = event.competitions[0];
    if (!comp || comp.competitors.length < 2) continue;

    const winner = comp.competitors.find((c) => c.winner);
    const loser = comp.competitors.find((c) => !c.winner);
    if (!winner || !loser) continue;

    results.push({
      winner: winner.team.displayName,
      loser: loser.team.displayName,
      winnerScore: parseInt(winner.score, 10),
      loserScore: parseInt(loser.score, 10),
    });
  }
  return results;
}

/**
 * Build a lookup of all team names in the bracket, mapping each to the
 * list of game IDs where that team could appear.
 */
function buildTeamGameMap(
  regions: RegionData[],
  currentResults: Results
): Map<string, string[]> {
  const map = new Map<string, string[]>();

  function addTeamGame(team: string | null, gId: string) {
    if (!team) return;
    const normalized = team.toLowerCase();
    const arr = map.get(normalized);
    if (arr) { arr.push(gId); } else { map.set(normalized, [gId]); }
  }

  // R64: teams come from seed data
  const matchups = buildR64Matchups();
  for (const regionName of REGIONS) {
    const region = regions.find((r) => r.name === regionName);
    if (!region) continue;
    for (let i = 0; i < matchups.length; i++) {
      const [topSeed, bottomSeed] = matchups[i];
      const gId = gameId(regionName, 0, i);
      const topTeam = region.seeds.find((s) => s.seed === topSeed);
      const bottomTeam = region.seeds.find((s) => s.seed === bottomSeed);
      addTeamGame(topTeam?.name ?? null, gId);
      addTeamGame(bottomTeam?.name ?? null, gId);
    }
  }

  // Later rounds: teams come from results of feeder games
  for (let round = 1; round <= 3; round++) {
    const gamesPerRegion = 8 / Math.pow(2, round);
    for (const regionName of REGIONS) {
      for (let i = 0; i < gamesPerRegion; i++) {
        const gId = gameId(regionName, round, i);
        const feeders = feederGameIds(gId);
        if (!feeders) continue;
        addTeamGame(currentResults[feeders[0]] ?? null, gId);
        addTeamGame(currentResults[feeders[1]] ?? null, gId);
      }
    }
  }

  // Final Four (round 4) and Championship (round 5)
  for (let i = 0; i < 2; i++) {
    const gId = gameId("ff", 4, i);
    const feeders = feederGameIds(gId);
    if (!feeders) continue;
    addTeamGame(currentResults[feeders[0]] ?? null, gId);
    addTeamGame(currentResults[feeders[1]] ?? null, gId);
  }
  {
    const gId = gameId("ff", 5, 0);
    const feeders = feederGameIds(gId);
    if (feeders) {
      addTeamGame(currentResults[feeders[0]] ?? null, gId);
      addTeamGame(currentResults[feeders[1]] ?? null, gId);
    }
  }

  return map;
}

/** Collect all team names from bracket data for fuzzy matching. */
function collectBracketTeams(regions: RegionData[]): string[] {
  const teams: string[] = [];
  const seen = new Map<string, boolean>();
  for (const region of regions) {
    for (const ts of region.seeds) {
      const lower = ts.name.toLowerCase();
      if (!seen.has(lower)) {
        seen.set(lower, true);
        teams.push(lower);
      }
    }
  }
  return teams;
}

/**
 * Try to match an ESPN team name to a bracket team name.
 * Tries exact match first, then substring containment.
 */
function matchTeamName(espnName: string, bracketTeams: string[]): string | null {
  const lower = espnName.toLowerCase();
  // Exact match
  for (let i = 0; i < bracketTeams.length; i++) {
    if (bracketTeams[i] === lower) return bracketTeams[i];
  }
  // ESPN name contains bracket name or vice versa
  for (let i = 0; i < bracketTeams.length; i++) {
    if (lower.includes(bracketTeams[i]) || bracketTeams[i].includes(lower)) return bracketTeams[i];
  }
  return null;
}

/** Get the original-cased team name from regions. */
function getOriginalName(regions: RegionData[], lowerName: string): string | null {
  for (const region of regions) {
    for (const ts of region.seeds) {
      if (ts.name.toLowerCase() === lowerName) return ts.name;
    }
  }
  return null;
}

/**
 * Resolve ESPN game results into our bracket results format.
 * Iteratively resolves rounds — each pass may unlock the next round.
 */
export function resolveResults(
  espnGames: EspnGameResult[],
  regions: RegionData[],
  currentResults: Results
): { results: Results; newCount: number } {
  const results = { ...currentResults };
  let newCount = 0;
  const bracketTeams = collectBracketTeams(regions);

  // Multiple passes to resolve cascading rounds
  const MAX_PASSES = 6;
  for (let pass = 0; pass < MAX_PASSES; pass++) {
    const teamGameMap = buildTeamGameMap(regions, results);
    let foundNew = false;

    for (const game of espnGames) {
      const winnerLower = matchTeamName(game.winner, bracketTeams);
      const loserLower = matchTeamName(game.loser, bracketTeams);
      if (!winnerLower || !loserLower) continue;

      const winnerGames = teamGameMap.get(winnerLower);
      const loserGames = teamGameMap.get(loserLower);
      if (!winnerGames || !loserGames) continue;

      // Find game ID where both teams compete and no result yet
      for (let i = 0; i < winnerGames.length; i++) {
        const gId = winnerGames[i];
        if (loserGames.includes(gId) && !results[gId]) {
          const originalName = getOriginalName(regions, winnerLower);
          if (originalName) {
            results[gId] = originalName;
            newCount++;
            foundNew = true;
          }
        }
      }
    }

    if (!foundNew) break;
  }

  return { results, newCount };
}
