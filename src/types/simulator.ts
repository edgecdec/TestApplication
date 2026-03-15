import type { RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { ScoringSettings } from "@/types/group";

export interface SimulatorBracketData {
  bracketId: number;
  bracketName: string;
  username: string;
  userId: number;
  picks: Picks;
  tiebreaker: number | null;
}

export interface SimulatorData {
  groupId: number;
  groupName: string;
  regions: RegionData[];
  results: Results;
  scoringSettings: ScoringSettings;
  brackets: SimulatorBracketData[];
}
