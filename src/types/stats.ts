export interface ChampionPick {
  team: string;
  seed: number;
  count: number;
  pct: number;
}

export interface UpsetPick {
  team: string;
  seed: number;
  round: number;
  count: number;
}

export interface BracketProfile {
  username: string;
  bracketName: string;
  chalkScore: number;
}

export interface TournamentStats {
  totalBrackets: number;
  champions: ChampionPick[];
  biggestUpset: UpsetPick | null;
  mostChalk: BracketProfile | null;
  mostContrarian: BracketProfile | null;
}
