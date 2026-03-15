export interface StandingsHistoryBracket {
  bracketId: number;
  bracketName: string;
  username: string;
}

export interface StandingsRoundRank {
  round: number;
  roundName: string;
  rankings: Record<number, number>; // bracketId -> rank
  scores: Record<number, number>;   // bracketId -> cumulative score
}

export interface StandingsHistoryData {
  brackets: StandingsHistoryBracket[];
  rounds: StandingsRoundRank[];
}
