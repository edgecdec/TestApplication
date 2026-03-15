export interface Group {
  id: number;
  name: string;
  description: string;
  invite_code: string;
  scoring_settings: string; // JSON: ScoringSettings
  max_brackets: number;
  created_by: number;
  created_at: string;
  buy_in: number;
  payout_structure: string; // JSON: PayoutStructure
}

export interface ScoringSettings {
  pointsPerRound: number[];
  upsetBonusPerRound: number[];
}

/** Payout percentages for each place (1st, 2nd, 3rd, etc.). Must sum to 100. */
export interface PayoutStructure {
  places: number[]; // e.g. [70, 20, 10] means 1st gets 70%, 2nd 20%, 3rd 10%
}

export interface GroupMember {
  group_id: number;
  user_id: number;
  joined_at: string;
}

export interface GroupBracket {
  group_id: number;
  bracket_id: number;
  added_at: string;
}

export interface GroupRow extends Group {
  member_count?: number;
  creator_name?: string;
}
