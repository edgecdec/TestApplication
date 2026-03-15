/**
 * Historical NCAA Tournament seed matchup win rates (1985–2024).
 * Key format: "higherSeed-lowerSeed" (lower number = higher seed).
 * Value: win rate of the HIGHER seed (the favorite).
 * Source: aggregated from publicly available NCAA tournament results.
 */
export const SEED_WIN_RATES: Record<string, number> = {
  // Round of 64 matchups
  "1-16": 99.3,
  "2-15": 93.8,
  "3-14": 85.4,
  "4-13": 78.5,
  "5-12": 64.3,
  "6-11": 62.5,
  "7-10": 60.4,
  "8-9": 51.4,
  // Common later-round matchups
  "1-8": 78.9,
  "1-9": 86.7,
  "2-7": 66.7,
  "2-10": 73.3,
  "3-6": 56.3,
  "3-11": 68.8,
  "4-5": 53.8,
  "4-12": 71.4,
  "1-4": 68.2,
  "1-5": 76.5,
  "1-12": 85.7,
  "1-13": 90.0,
  "2-3": 55.6,
  "2-6": 62.5,
  "2-11": 70.0,
  "1-2": 52.9,
  "1-3": 63.6,
  "1-6": 72.7,
  "1-7": 77.8,
  "1-10": 83.3,
  "1-11": 84.6,
  "2-4": 58.3,
  "2-5": 61.5,
  "3-5": 52.6,
  "3-7": 57.1,
  "3-10": 63.6,
  "4-8": 60.0,
  "4-9": 62.5,
  "5-8": 55.6,
  "5-9": 57.1,
  "6-7": 51.9,
  "6-10": 55.0,
};

/**
 * Get the historical win rate for the higher seed in a matchup.
 * Returns { favoriteRate, underdogRate, favoriteSeed, underdogSeed } or null if no data.
 */
export function getSeedMatchupRate(
  seedA: number,
  seedB: number
): { favoriteRate: number; underdogRate: number; favoriteSeed: number; underdogSeed: number } | null {
  if (seedA === seedB) return null;
  const higher = Math.min(seedA, seedB);
  const lower = Math.max(seedA, seedB);
  const key = `${higher}-${lower}`;
  const rate = SEED_WIN_RATES[key];
  if (rate === undefined) return null;
  return {
    favoriteRate: rate,
    underdogRate: Math.round((100 - rate) * 10) / 10,
    favoriteSeed: higher,
    underdogSeed: lower,
  };
}
