import { TOTAL_GAMES } from "@/lib/bracket-constants";

/**
 * Count the number of picks in a bracket's picks data.
 * Handles: JSON string, parsed object, null/undefined.
 */
export function countPicks(picks: string | Record<string, string> | null | undefined): number {
  if (!picks) return 0;
  const parsed = typeof picks === "string" ? JSON.parse(picks) : picks;
  if (!parsed || typeof parsed !== "object") return 0;
  return Object.keys(parsed).length;
}

export function isComplete(pickCount: number): boolean {
  return pickCount >= TOTAL_GAMES;
}
