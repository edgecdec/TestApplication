export interface RoundScore {
  correct: number;
  points: number;
  upsetBonus: number;
}

export interface PickDetail {
  gameId: string;
  round: number;
  pick: string;
  result: string | null;
  correct: boolean;
  basePoints: number;
  upsetBonus: number;
}

export interface BracketScore {
  bracketId: number;
  bracketName: string;
  username: string;
  userId: number;
  total: number;
  rounds: RoundScore[];
  tiebreaker: number | null;
  tiebreakerDiff: number | null;
}

export interface FinalFourPick {
  region: string;
  team: string | null;
  seed: number | null;
  eliminated: boolean;
}

/** Pick streak: positive = correct streak, negative = incorrect streak, 0 = no resolved picks */
export type PickStreak = number;

export interface LeaderboardEntry extends BracketScore {
  rank: number;
  percentile: number;
  championPick: string | null;
  busted: boolean;
  maxPossible: number;
  eliminated: boolean;
  bestPossibleFinish: number;
  finalFourPicks: FinalFourPick[];
  correctPicks: number;
  totalResolved: number;
  streak: PickStreak;
  paid?: boolean;
}

export interface RecentResultItem {
  gameId: string;
  round: number;
  winner: string;
  loser: string | null;
  winnerSeed: number | null;
  loserSeed: number | null;
  isUpset: boolean;
  brackets: {
    bracketId: number;
    bracketName: string;
    correct: boolean;
    points: number;
  }[];
}

export interface HeadToHeadGame {
  gameId: string;
  round: number;
  result: string;
  pickA: string;
  pickB: string;
  correctA: boolean;
  correctB: boolean;
}

export interface HeadToHeadResult {
  bracketA: { id: number; name: string; username: string; total: number; championPick: string | null; correctPicks: number; maxPossible: number };
  bracketB: { id: number; name: string; username: string; total: number; championPick: string | null; correctPicks: number; maxPossible: number };
  winsA: number;
  winsB: number;
  ties: number;
  games: HeadToHeadGame[];
}
