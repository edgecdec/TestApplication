import { REGIONS } from "@/lib/bracket-constants";
import { gameId, getTeamsForGame, gamesInRound } from "@/lib/bracket-utils";
import { buildTeamSeedMap } from "@/lib/scoring";
import type { RegionData } from "@/types/tournament";
import type { Picks } from "@/types/bracket";

export type AutofillMode = "chalk" | "random" | "smart";

interface AutofillOption {
  mode: AutofillMode;
  label: string;
  description: string;
}

export const AUTOFILL_OPTIONS: AutofillOption[] = [
  { mode: "chalk", label: "Chalk", description: "Always picks the higher seed" },
  { mode: "random", label: "Random", description: "50/50 coin flip each game" },
  { mode: "smart", label: "Smart", description: "Higher seeds win more often, with some upsets" },
];

/** Seed-based win probability for "smart" mode. Lower seed number = higher chance. */
function smartWinProbability(seedA: number, seedB: number): number {
  const diff = seedB - seedA;
  // Sigmoid-ish: bigger seed difference = higher probability for better seed
  return 1 / (1 + Math.pow(10, -diff / 5));
}

/**
 * Generate autofill picks for all empty slots.
 * Processes rounds in order so later rounds can use earlier autofilled picks.
 */
export function generateAutofill(
  mode: AutofillMode,
  regions: RegionData[],
  existingPicks: Picks
): Picks {
  const seedMap = buildTeamSeedMap(regions);
  const picks: Picks = { ...existingPicks };

  function pickWinner(teamA: string | null, teamB: string | null): string | null {
    if (!teamA && !teamB) return null;
    if (!teamA) return teamB;
    if (!teamB) return teamA;

    const seedA = seedMap.get(teamA) ?? 8;
    const seedB = seedMap.get(teamB) ?? 8;

    switch (mode) {
      case "chalk":
        return seedA <= seedB ? teamA : teamB;
      case "random":
        return Math.random() < 0.5 ? teamA : teamB;
      case "smart": {
        const prob = smartWinProbability(seedA, seedB);
        return Math.random() < prob ? teamA : teamB;
      }
    }
  }

  // Process regional rounds 0-3, then Final Four (4) and Championship (5)
  for (const region of REGIONS) {
    for (let round = 0; round <= 3; round++) {
      const count = gamesInRound(round);
      for (let i = 0; i < count; i++) {
        const gId = gameId(region, round, i);
        if (picks[gId]) continue; // skip filled slots
        const [top, bottom] = getTeamsForGame(gId, regions, picks);
        const winner = pickWinner(top, bottom);
        if (winner) picks[gId] = winner;
      }
    }
  }

  // Final Four
  for (let i = 0; i < 2; i++) {
    const gId = gameId("ff", 4, i);
    if (picks[gId]) continue;
    const [top, bottom] = getTeamsForGame(gId, regions, picks);
    const winner = pickWinner(top, bottom);
    if (winner) picks[gId] = winner;
  }

  // Championship
  const champId = gameId("ff", 5, 0);
  if (!picks[champId]) {
    const [top, bottom] = getTeamsForGame(champId, regions, picks);
    const winner = pickWinner(top, bottom);
    if (winner) picks[champId] = winner;
  }

  return picks;
}
