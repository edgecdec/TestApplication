import { getDb } from "@/lib/db";

const MAX_SNAPSHOTS_PER_BRACKET = 50;

/**
 * Save a pick snapshot if picks actually changed from the previous snapshot.
 * Limits to MAX_SNAPSHOTS_PER_BRACKET entries per bracket.
 */
export function saveBracketSnapshot(
  bracketId: number,
  newPicks: string,
  tiebreaker: number | null
): void {
  const db = getDb();

  // Get the most recent snapshot to compare
  const latest = db.prepare(
    "SELECT picks, tiebreaker FROM bracket_history WHERE bracket_id = ? ORDER BY changed_at DESC LIMIT 1"
  ).get(bracketId) as { picks: string; tiebreaker: number | null } | undefined;

  // Skip if nothing changed
  if (latest && latest.picks === newPicks && latest.tiebreaker === tiebreaker) {
    return;
  }

  db.prepare(
    "INSERT INTO bracket_history (bracket_id, picks, tiebreaker) VALUES (?, ?, ?)"
  ).run(bracketId, newPicks, tiebreaker);

  // Prune old snapshots beyond the limit
  const count = (db.prepare(
    "SELECT COUNT(*) as cnt FROM bracket_history WHERE bracket_id = ?"
  ).get(bracketId) as { cnt: number }).cnt;

  if (count > MAX_SNAPSHOTS_PER_BRACKET) {
    db.prepare(`
      DELETE FROM bracket_history WHERE id IN (
        SELECT id FROM bracket_history WHERE bracket_id = ?
        ORDER BY changed_at ASC LIMIT ?
      )
    `).run(bracketId, count - MAX_SNAPSHOTS_PER_BRACKET);
  }
}
