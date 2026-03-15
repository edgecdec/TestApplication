export interface PickerInfo {
  username: string;
  bracketName: string;
}

export interface TeamPickers {
  team: string;
  count: number;
  users: PickerInfo[];
}

export interface GamePicks {
  gameId: string;
  teamA: string | null;
  teamB: string | null;
  picks: TeamPickers[];
}

export interface WhoPickedResponse {
  groupName: string;
  totalBrackets: number;
  regions: { name: string; rounds: GamePicks[][] }[];
  finalFour: GamePicks[];
  championship: GamePicks | null;
}
