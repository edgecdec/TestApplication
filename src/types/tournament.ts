export interface Tournament {
  id: number;
  name: string;
  year: number;
  bracket_data: string; // JSON: RegionData[]
  results_data: string; // JSON: Record<string, string> (gameId -> winnerName)
  lock_time: string;
  created_at: string;
}

export interface RegionData {
  name: string;
  seeds: TeamSeed[];
}

export interface TeamSeed {
  seed: number;
  name: string;
  logo_url?: string;
}

export interface Bracket {
  id: number;
  user_id: number;
  tournament_id: number;
  name: string;
  picks: string; // JSON: Record<string, string> (gameId -> winnerName)
  tiebreaker: number | null;
  notes: string;
  is_second_chance: number;
  second_chance_round: number;
  share_token: string | null;
  created_at: string;
  updated_at: string;
}

export interface BracketRow extends Bracket {
  username?: string;
}
