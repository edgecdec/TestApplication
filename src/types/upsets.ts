export interface UpsetInfo {
  gameId: string;
  round: number;
  winner: string;
  winnerSeed: number;
  loser: string;
  loserSeed: number;
  seedDiff: number;
  predictedBy: number;
  totalBrackets: number;
  predictedPct: number;
}
