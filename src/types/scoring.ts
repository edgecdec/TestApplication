export interface RoundScore {
  correct: number;
  points: number;
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

export interface LeaderboardEntry extends BracketScore {
  rank: number;
  percentile: number;
}
