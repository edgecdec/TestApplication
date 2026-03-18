export interface RootingEntry {
  gameId: string;
  round: number;
  teamA: string | null;
  teamB: string | null;
  /** The team the user should root for (most brackets picked this team) */
  rootFor: string;
  /** Number of user's brackets that picked this team */
  bracketCount: number;
  /** Total potential points at stake across all groups */
  totalPoints: number;
  /** Bracket names that picked this team */
  bracketNames: string[];
}
