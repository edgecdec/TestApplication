import type { RegionData } from "@/types/tournament";
import type { Results } from "@/types/bracket";

/**
 * Compute how far each team has advanced based on results.
 * Returns a map of team name → highest round they've won in.
 * Round 0 = R64, 1 = R32, 2 = Sweet 16, 3 = Elite 8, 4 = Final Four, 5 = Championship.
 */
export function getTeamAdvancement(results: Results, regions: RegionData[]): Map<string, number> {
  const advancement = new Map<string, number>();

  for (const [gameId, winner] of Object.entries(results)) {
    if (!winner) continue;
    const parts = gameId.split("-");
    const round = parseInt(parts[parts.length - 2], 10);
    const current = advancement.get(winner) ?? 0;
    if (round > current) advancement.set(winner, round);
  }

  return advancement;
}
