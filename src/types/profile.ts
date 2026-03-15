import type { RoundScore } from "@/types/scoring";
import type { BracketGradeInfo } from "@/lib/grading";
import type { Achievement } from "@/lib/achievements";

export interface ProfileBracket {
  id: number;
  name: string;
  tournamentName: string;
  total: number;
  rounds: RoundScore[];
  tiebreaker: number | null;
  updatedAt: string;
  grade: BracketGradeInfo | null;
  achievements: Achievement[];
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
