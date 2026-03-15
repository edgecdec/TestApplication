import type { ScoringSettings } from "@/types/group";

export const REGIONS = ["East", "West", "South", "Midwest"] as const;
export type RegionName = (typeof REGIONS)[number];

export const REGION_COLORS: Record<RegionName, string> = {
  East: "#2563eb",
  West: "#dc2626",
  South: "#16a34a",
  Midwest: "#ea580c",
};

export const ROUND_NAMES = ["R64", "R32", "Sweet 16", "Elite 8", "Final Four", "Championship"] as const;
export const ROUND_GAME_COUNTS = [32, 16, 8, 4, 2, 1] as const;
export const TOTAL_GAMES = 63;
export const FIRST_FOUR_GAMES = 4;
export const SEEDS_PER_REGION = 16;
export const TOTAL_TEAMS = 68;

export const DEFAULT_SCORING: ScoringSettings = {
  pointsPerRound: [1, 2, 4, 8, 16, 32],
  upsetBonusPerRound: [0, 0, 0, 0, 0, 0],
};

export const INVITE_CODE_LENGTH = 8;
export const EVERYONE_GROUP_NAME = "Everyone";
export const CHAMPIONSHIP_GAME_ID = "ff-5-0";

export interface ScoringPreset {
  id: string;
  name: string;
  emoji: string;
  description: string;
  scoring: ScoringSettings;
}

export const SCORING_PRESETS: ScoringPreset[] = [
  {
    id: "standard",
    name: "Standard",
    emoji: "📊",
    description: "Classic doubling format — later rounds worth more",
    scoring: { pointsPerRound: [1, 2, 4, 8, 16, 32], upsetBonusPerRound: [0, 0, 0, 0, 0, 0] },
  },
  {
    id: "upset-heavy",
    name: "Upset Heavy",
    emoji: "🔥",
    description: "Standard points plus upset bonuses that reward bold picks",
    scoring: { pointsPerRound: [1, 2, 4, 8, 16, 32], upsetBonusPerRound: [1, 2, 3, 5, 8, 13] },
  },
  {
    id: "progressive",
    name: "Progressive",
    emoji: "📈",
    description: "Fibonacci-style scaling — big rewards for deep runs",
    scoring: { pointsPerRound: [2, 3, 5, 8, 13, 21], upsetBonusPerRound: [0, 0, 0, 0, 0, 0] },
  },
  {
    id: "flat",
    name: "Flat",
    emoji: "⚖️",
    description: "Every correct pick worth the same — early rounds matter equally",
    scoring: { pointsPerRound: [10, 10, 10, 10, 10, 10], upsetBonusPerRound: [0, 0, 0, 0, 0, 0] },
  },
];
