import type { Picks, Results } from "@/types/bracket";
import type { RegionData } from "@/types/tournament";
import { REGIONS, ROUND_NAMES, CHAMPIONSHIP_GAME_ID } from "@/lib/bracket-constants";
import { gameId, gamesInRound, buildR64Matchups } from "@/lib/bracket-utils";
import { buildTeamSeedMap, computeStreak } from "@/lib/scoring";

export interface Achievement {
  id: string;
  emoji: string;
  name: string;
  description: string;
}

const PERFECT_ROUND_ID = "perfect_round";
const ORACLE_ID = "oracle";
const CHALK_MASTER_ID = "chalk_master";
const DIAMOND_ROUGH_ID = "diamond_rough";
const CHAMPION_CALLER_ID = "champion_caller";
const HOT_HAND_ID = "hot_hand";
const SWEEP_ID = "sweep";

const ORACLE_UPSET_THRESHOLD = 3;
const HOT_HAND_THRESHOLD = 10;
const DIAMOND_SEED_THRESHOLD = 12;
const SWEET_16_ROUND = 2;

/** All possible achievements with metadata. */
const ACHIEVEMENT_DEFS: Record<string, { emoji: string; name: string; descriptionTemplate: string }> = {
  [PERFECT_ROUND_ID]: { emoji: "🎯", name: "Perfect Round", descriptionTemplate: "Got every pick right in {detail}" },
  [ORACLE_ID]: { emoji: "🔮", name: "Oracle", descriptionTemplate: "Correctly predicted {detail} upsets" },
  [CHALK_MASTER_ID]: { emoji: "📏", name: "Chalk Master", descriptionTemplate: "Picked all higher seeds in Round of 64" },
  [DIAMOND_ROUGH_ID]: { emoji: "💎", name: "Diamond in the Rough", descriptionTemplate: "Correctly picked {detail} to the Sweet 16" },
  [CHAMPION_CALLER_ID]: { emoji: "🏆", name: "Champion Caller", descriptionTemplate: "Correctly picked the champion" },
  [HOT_HAND_ID]: { emoji: "⚡", name: "Hot Hand", descriptionTemplate: "{detail}+ correct picks in a row" },
  [SWEEP_ID]: { emoji: "🧹", name: "Clean Sweep", descriptionTemplate: "Got all {detail} region picks right in a round" },
};

/** Compute achievements for a bracket. */
export function computeAchievements(
  picks: Picks,
  results: Results,
  regions: RegionData[]
): Achievement[] {
  const achievements: Achievement[] = [];
  const teamSeedMap = buildTeamSeedMap(regions);

  // Check each round for perfect round
  for (let round = 0; round < ROUND_NAMES.length; round++) {
    const gameIds = allGameIdsForRound(round);
    const resolved = gameIds.filter((g) => results[g]);
    if (resolved.length === 0) continue;
    const allCorrect = resolved.every((g) => picks[g] === results[g]);
    if (allCorrect && resolved.length === gameIds.length) {
      achievements.push(makeAchievement(PERFECT_ROUND_ID, ROUND_NAMES[round]));
    }
    // Check per-region sweep within a round (rounds 0-3 only)
    if (round <= 3) {
      for (const region of REGIONS) {
        const count = gamesInRound(round);
        const regionGames = Array.from({ length: count }, (_, i) => gameId(region, round, i));
        const regionResolved = regionGames.filter((g) => results[g]);
        if (regionResolved.length === regionGames.length && regionResolved.length > 1) {
          const regionAllCorrect = regionResolved.every((g) => picks[g] === results[g]);
          if (regionAllCorrect) {
            achievements.push(makeAchievement(SWEEP_ID, `${region} ${ROUND_NAMES[round]}`));
          }
        }
      }
    }
  }

  // Oracle: correctly predicted 3+ upsets
  let correctUpsets = 0;
  for (const [gId, result] of Object.entries(results)) {
    if (picks[gId] !== result) continue;
    const winnerSeed = teamSeedMap.get(result);
    // Find the loser
    const parts = gId.split("-");
    const round = parseInt(parts[parts.length - 2], 10);
    const index = parseInt(parts[parts.length - 1], 10);
    const regionName = parts[0];
    let loser: string | null = null;
    if (round === 0 && regionName !== "ff") {
      const region = regions.find((r) => r.name === regionName);
      if (region) {
        const matchups = buildR64Matchups();
        const [topSeed, bottomSeed] = matchups[index];
        const topTeam = region.seeds.find((s) => s.seed === topSeed);
        const bottomTeam = region.seeds.find((s) => s.seed === bottomSeed);
        loser = topTeam?.name === result ? bottomTeam?.name ?? null : topTeam?.name ?? null;
      }
    }
    const loserSeed = loser ? teamSeedMap.get(loser) : undefined;
    if (winnerSeed != null && loserSeed != null && winnerSeed > loserSeed) {
      correctUpsets++;
    }
  }
  if (correctUpsets >= ORACLE_UPSET_THRESHOLD) {
    achievements.push(makeAchievement(ORACLE_ID, String(correctUpsets)));
  }

  // Chalk Master: picked all higher seeds in R64
  const r64Games = allGameIdsForRound(0);
  const r64Resolved = r64Games.filter((g) => results[g]);
  if (r64Resolved.length === r64Games.length) {
    let allChalk = true;
    for (const gId of r64Games) {
      const pick = picks[gId];
      if (!pick) { allChalk = false; break; }
      const parts = gId.split("-");
      const regionName = parts[0];
      const index = parseInt(parts[parts.length - 1], 10);
      const region = regions.find((r) => r.name === regionName);
      if (!region) { allChalk = false; break; }
      const matchups = buildR64Matchups();
      const [topSeed] = matchups[index];
      const topTeam = region.seeds.find((s) => s.seed === topSeed);
      if (pick !== topTeam?.name) { allChalk = false; break; }
    }
    if (allChalk) {
      achievements.push(makeAchievement(CHALK_MASTER_ID, ""));
    }
  }

  // Diamond in the Rough: correctly picked a 12+ seed to Sweet 16
  const s16Games = allGameIdsForRound(SWEET_16_ROUND);
  for (const gId of s16Games) {
    const result = results[gId];
    if (!result || picks[gId] !== result) continue;
    const seed = teamSeedMap.get(result);
    if (seed != null && seed >= DIAMOND_SEED_THRESHOLD) {
      achievements.push(makeAchievement(DIAMOND_ROUGH_ID, `(${seed}) ${result}`));
    }
  }

  // Champion Caller
  const champResult = results[CHAMPIONSHIP_GAME_ID];
  if (champResult && picks[CHAMPIONSHIP_GAME_ID] === champResult) {
    achievements.push(makeAchievement(CHAMPION_CALLER_ID, ""));
  }

  // Hot Hand: 10+ correct streak
  const streak = computeStreak(picks, results);
  if (streak >= HOT_HAND_THRESHOLD) {
    achievements.push(makeAchievement(HOT_HAND_ID, String(streak)));
  }

  return achievements;
}

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

function makeAchievement(id: string, detail: string): Achievement {
  const def = ACHIEVEMENT_DEFS[id];
  return {
    id,
    emoji: def.emoji,
    name: def.name,
    description: def.descriptionTemplate.replace("{detail}", detail),
  };
}
