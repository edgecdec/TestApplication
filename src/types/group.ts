export interface Group {
  id: number;
  name: string;
  invite_code: string;
  scoring_settings: string; // JSON: ScoringSettings
  max_brackets: number;
  created_by: number;
  created_at: string;
}

export interface ScoringSettings {
  pointsPerRound: number[];
  upsetBonusPerRound: number[];
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
