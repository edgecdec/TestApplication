import type { Picks } from "@/types/bracket";

export interface ComparisonBracket {
  bracketId: number;
  bracketName: string;
  username: string;
  picks: Picks;
  color: string;
}
