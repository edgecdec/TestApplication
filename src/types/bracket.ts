export interface GameSlot {
  gameId: string;
  round: number;
  index: number;
  region: string;
  topSeed?: number;
  bottomSeed?: number;
  topTeam?: string;
  bottomTeam?: string;
}

export interface Picks {
  [gameId: string]: string;
}

export interface Results {
  [gameId: string]: string;
}

/** Per-game pick distribution: gameId -> teamName -> percentage (0-100) */
export interface PickDistribution {
  [gameId: string]: Record<string, number>;
}

export interface BracketHistoryEntry {
  id: number;
  bracket_id: number;
  picks: string;
  tiebreaker: number | null;
  changed_at: string;
}

export interface PickChange {
  gameId: string;
  from: string | null;
  to: string | null;
}
