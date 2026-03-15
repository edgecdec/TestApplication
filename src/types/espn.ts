/** Minimal types for ESPN public scoreboard API response. */

export interface EspnScoreboardResponse {
  events: EspnEvent[];
}

export interface EspnEvent {
  id: string;
  status: {
    type: {
      completed: boolean;
      name: string; // "STATUS_FINAL", "STATUS_IN_PROGRESS", etc.
    };
  };
  competitions: EspnCompetition[];
}

export interface EspnCompetition {
  competitors: EspnCompetitor[];
}

export interface EspnCompetitor {
  team: {
    shortDisplayName: string;
    displayName: string;
    abbreviation: string;
  };
  score: string;
  winner: boolean;
  curatedRank?: { current: number };
}

/** A resolved game result parsed from ESPN data. */
export interface EspnGameResult {
  winner: string;
  loser: string;
  winnerScore: number;
  loserScore: number;
}
