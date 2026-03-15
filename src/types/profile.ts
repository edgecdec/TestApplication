import type { RoundScore } from "@/types/scoring";

export interface ProfileBracket {
  id: number;
  name: string;
  tournamentName: string;
  total: number;
  rounds: RoundScore[];
  tiebreaker: number | null;
  updatedAt: string;
}

export interface ProfileGroup {
  id: number;
  name: string;
  memberCount: number;
}

export interface ProfileData {
  username: string;
  createdAt: string;
  brackets: ProfileBracket[];
  groups: ProfileGroup[];
}
