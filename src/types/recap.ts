export interface RoundRecapEntry {
  username: string;
  bracketName: string;
  bracketId: number;
  points: number;
  correct: number;
  upsetBonus: number;
  cumulativeTotal: number;
  rankAfterRound: number;
  rankChange: number | null; // null for round 0 (no previous rank)
}

export interface UpsetHit {
  gameId: string;
  winner: string;
  winnerSeed: number;
  loser: string;
  loserSeed: number;
  pickedBy: string[]; // usernames who got it right
  totalBrackets: number;
}

export interface RoundRecap {
  round: number;
  roundName: string;
  gamesResolved: number;
  totalGames: number;
  entries: RoundRecapEntry[];
  upsetHits: UpsetHit[];
}
