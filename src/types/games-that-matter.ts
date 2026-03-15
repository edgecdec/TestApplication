export interface SwingGame {
  gameId: string;
  round: number;
  teamA: string | null;
  teamB: string | null;
  userPick: string;
  rivals: { username: string; bracketName: string; pick: string; rank: number }[];
  groupId: number;
  groupName: string;
}
