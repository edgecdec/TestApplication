import { getDb } from "@/lib/db";
import { parseBracketData } from "@/lib/bracket-utils";
import { generateAutofill } from "@/lib/autofill";
import { notify } from "@/lib/notifications";
import { TOTAL_GAMES } from "@/lib/bracket-constants";
import type { Picks } from "@/types/bracket";

/**
 * Auto-fill all incomplete brackets for a tournament with chalk picks.
 * Only runs if the tournament is past lock time.
 * Returns the number of brackets that were auto-filled.
 */
export function autoFillIncompleteBrackets(tournamentId: number): number {
  const db = getDb();
  const tournament = db.prepare(
    "SELECT lock_time, bracket_data FROM tournaments WHERE id = ?"
  ).get(tournamentId) as { lock_time: string; bracket_data: string } | undefined;

  if (!tournament?.lock_time || new Date(tournament.lock_time) > new Date()) return 0;

  const regions = parseBracketData(tournament.bracket_data);
  if (regions.length === 0) return 0;

  const rows = db.prepare(
    "SELECT id, user_id, picks FROM brackets WHERE tournament_id = ? AND is_second_chance = 0"
  ).all(tournamentId) as { id: number; user_id: number; picks: string }[];

  const update = db.prepare(
    "UPDATE brackets SET picks = ?, updated_at = datetime('now') WHERE id = ?"
  );

  let filled = 0;
  const affectedUsers = new Set<number>();

  const batch = db.transaction(() => {
    for (const row of rows) {
      const picks: Picks = JSON.parse(row.picks || "{}");
      if (Object.keys(picks).length >= TOTAL_GAMES) continue;

      const completed = generateAutofill("chalk", regions, picks);
      update.run(JSON.stringify(completed), row.id);
      filled++;
      affectedUsers.add(row.user_id);
    }
  });
  batch();

  for (const userId of Array.from(affectedUsers)) {
    notify(
      userId,
      "bracket_autofilled",
      "🤖 Your incomplete bracket was auto-filled with chalk picks at lock time.",
      "/dashboard"
    );
  }

  return filled;
}
