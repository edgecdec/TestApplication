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
