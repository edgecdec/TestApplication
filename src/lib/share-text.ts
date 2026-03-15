import type { Picks } from "@/types/bracket";
import type { RegionData } from "@/types/tournament";
import { REGIONS, CHAMPIONSHIP_GAME_ID } from "@/lib/bracket-constants";
import { gameId } from "@/lib/bracket-utils";

const CHALK_SEED_THRESHOLD = 5;

interface ShareTextOptions {
  bracketName: string;
  picks: Picks;
  regions: RegionData[];
  bracketUrl: string;
}

function findSeed(regions: RegionData[], teamName: string): number | undefined {
  for (const r of regions) {
    const t = r.seeds.find((s) => s.name === teamName);
    if (t) return t.seed;
  }
  return undefined;
}

/**
 * Generate a formatted text summary of a bracket's key picks for sharing.
 */
export function generateShareText({ bracketName, picks, regions, bracketUrl }: ShareTextOptions): string {
  const lines: string[] = [`🏀 ${bracketName}`];

  // Champion
  const champ = picks[CHAMPIONSHIP_GAME_ID];
  if (champ) {
    const seed = findSeed(regions, champ);
    lines.push(`🏆 Champion: ${seed ? `(${seed}) ` : ""}${champ}`);
  }

  // Final Four
  const ffTeams = REGIONS.map((r) => picks[gameId(r, 3, 0)]).filter(Boolean);
  if (ffTeams.length > 0) {
    const formatted = ffTeams.map((t) => {
      const seed = findSeed(regions, t!);
      return seed ? `(${seed}) ${t}` : t;
    });
    lines.push(`🏟️ Final Four: ${formatted.join(", ")}`);
  }

  // Elite Eight
  const e8Teams = REGIONS.flatMap((r) => [picks[gameId(r, 2, 0)], picks[gameId(r, 2, 1)]]).filter(Boolean);
  if (e8Teams.length > 0) {
    const formatted = e8Teams.map((t) => {
      const seed = findSeed(regions, t!);
      return seed ? `(${seed}) ${t}` : t;
    });
    lines.push(`🎯 Elite Eight: ${formatted.join(", ")}`);
  }

  // Notable upsets: picks where a higher seed beats a lower seed (seed > CHALK_SEED_THRESHOLD winning in early rounds)
  const upsets: string[] = [];
  for (const r of REGIONS) {
    // Check R64 and R32 for upset picks
    for (let round = 0; round <= 1; round++) {
      const gamesInRound = round === 0 ? 8 : 4;
      for (let i = 0; i < gamesInRound; i++) {
        const gId = gameId(r, round, i);
        const winner = picks[gId];
        if (!winner) continue;
        const seed = findSeed(regions, winner);
        if (seed && seed >= CHALK_SEED_THRESHOLD + 1) {
          upsets.push(`(${seed}) ${winner}`);
        }
      }
    }
  }
  if (upsets.length > 0) {
    lines.push(`🔥 Upset picks: ${upsets.slice(0, 6).join(", ")}${upsets.length > 6 ? "..." : ""}`);
  }

  lines.push("", bracketUrl);
  return lines.join("\n");
}
