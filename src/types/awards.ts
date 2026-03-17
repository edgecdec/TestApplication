export interface Award {
  id: string;
  emoji: string;
  name: string;
  description: string;
  winner: {
    bracketId: number;
    bracketName: string;
    username: string;
    value: string;
  } | null;
}
