import { getDb } from "@/lib/db";
import { scorePicks, getCurrentRound, filterResultsBeforeRound } from "@/lib/scoring";
import { parseBracketData } from "@/lib/bracket-utils";
import type { NotificationType } from "@/types/notification";
import type { Picks, Results } from "@/types/bracket";
import type { ScoringSettings } from "@/types/group";
import type { RegionData, Tournament } from "@/types/tournament";

const NOTIFICATIONS_LIMIT = 50;
const MIN_RANK_CHANGE = 2;

/** Create a notification for a single user. */
export function notify(
  userId: number,
  type: NotificationType,
  message: string,
  link: string = ""
): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)"
  ).run(userId, type, message, link);
}

/** Create a notification for multiple users (batch). */
export function notifyMany(
  userIds: number[],
  type: NotificationType,
  message: string,
  link: string = ""
): void {
  if (userIds.length === 0) return;
  const db = getDb();
  const stmt = db.prepare(
    "INSERT INTO notifications (user_id, type, message, link) VALUES (?, ?, ?, ?)"
  );
  const batch = db.transaction(() => {
    for (const uid of userIds) {
      stmt.run(uid, type, message, link);
    }
  });
  batch();
}

/** Notify all members of a group except the actor. */
export function notifyGroupMembers(
  groupId: number | string,
  excludeUserId: number,
  type: NotificationType,
  message: string,
  link: string = ""
): void {
  const db = getDb();
  const members = db.prepare(
    "SELECT user_id FROM group_members WHERE group_id = ? AND user_id != ?"
  ).all(groupId, excludeUserId) as { user_id: number }[];
  notifyMany(members.map((m) => m.user_id), type, message, link);
}

/** Get recent notifications for a user. */
export function getUserNotifications(userId: number) {
  const db = getDb();
  return db.prepare(
    "SELECT id, type, message, link, read, created_at FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ?"
  ).all(userId, NOTIFICATIONS_LIMIT) as {
    id: number;
    type: string;
    message: string;
    link: string;
    read: number;
    created_at: string;
  }[];
}

/** Count unread notifications for a user. */
export function getUnreadCount(userId: number): number {
  const db = getDb();
  const row = db.prepare(
    "SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND read = 0"
  ).get(userId) as { count: number };
  return row.count;
}

/** Mark all notifications as read for a user. */
export function markAllRead(userId: number): void {
  const db = getDb();
  db.prepare("UPDATE notifications SET read = 1 WHERE user_id = ? AND read = 0").run(userId);
}

/** Notify all users in the tournament that results were synced. */
export function notifyResultsSynced(tournamentId: number, newCount: number): void {
  const db = getDb();
  const users = db.prepare(
    "SELECT DISTINCT user_id FROM brackets WHERE tournament_id = ?"
  ).all(tournamentId) as { user_id: number }[];
  notifyMany(
    users.map((u) => u.user_id),
    "results_synced",
    `🏀 ${newCount} new game result${newCount === 1 ? "" : "s"} synced! Check the leaderboard.`,
    "/dashboard"
  );
}

/** Notify all registered users (for admin broadcasts). */
export function notifyAllUsers(
  message: string,
  link: string = ""
): number {
  const db = getDb();
  const users = db.prepare("SELECT id FROM users").all() as { id: number }[];
  notifyMany(users.map((u) => u.id), "admin_broadcast", message, link);
  return users.length;
}

interface RankedBracket {
  bracketId: number;
  userId: number;
  total: number;
  rank: number;
}

/** Compute simple ranked list from brackets + results. */
function rankBrackets(
  brackets: { id: number; user_id: number; picks: string }[],
  results: Results,
  settings: ScoringSettings,
  regions: RegionData[]
): RankedBracket[] {
  const scored = brackets.map((b) => {
    const picks: Picks = JSON.parse(b.picks);
    const total = scorePicks(picks, results, settings, regions).reduce((s, r) => s + r.points, 0);
    return { bracketId: b.id, userId: b.user_id, total, rank: 0 };
  });
  scored.sort((a, b) => b.total - a.total);
  for (let i = 0; i < scored.length; i++) {
    scored[i].rank = i > 0 && scored[i].total === scored[i - 1].total
      ? scored[i - 1].rank
      : i + 1;
  }
  return scored;
}

/**
 * After results sync, compute rank changes per group and notify users
 * who moved up or down by MIN_RANK_CHANGE or more positions.
 */
export function notifyRankChanges(tournamentId: number): number {
  const db = getDb();
  const tournament = db.prepare("SELECT * FROM tournaments WHERE id = ?").get(tournamentId) as Tournament | undefined;
  if (!tournament) return 0;

  const regions: RegionData[] = parseBracketData(tournament.bracket_data);
  if (regions.length === 0) return 0;

  const results: Results = JSON.parse(tournament.results_data || "{}");
  const currentRound = getCurrentRound(results);
  if (currentRound < 0) return 0;

  const prevResults = filterResultsBeforeRound(results, currentRound);
  // Skip if no previous results to compare against
  if (Object.keys(prevResults).length === 0 && currentRound === 0) return 0;

  // Get all groups that have brackets in this tournament
  const groups = db.prepare(`
    SELECT DISTINCT g.id, g.name, g.scoring_settings
    FROM groups g
    JOIN group_brackets gb ON gb.group_id = g.id
    JOIN brackets b ON b.id = gb.bracket_id
    WHERE b.tournament_id = ?
  `).all(tournamentId) as { id: number; name: string; scoring_settings: string }[];

  let totalNotifications = 0;

  for (const group of groups) {
    const settings: ScoringSettings = JSON.parse(group.scoring_settings);
    const brackets = db.prepare(`
      SELECT b.id, b.user_id, b.picks
      FROM group_brackets gb
      JOIN brackets b ON b.id = gb.bracket_id
      WHERE gb.group_id = ? AND b.tournament_id = ?
    `).all(group.id, tournamentId) as { id: number; user_id: number; picks: string }[];

    if (brackets.length < 2) continue;

    const currentRanks = rankBrackets(brackets, results, settings, regions);
    const prevRanks = rankBrackets(brackets, prevResults, settings, regions);
    const prevRankMap = new Map(prevRanks.map((r) => [r.bracketId, r.rank]));

    for (const entry of currentRanks) {
      const prevRank = prevRankMap.get(entry.bracketId);
      if (prevRank == null) continue;
      const change = prevRank - entry.rank; // positive = moved up
      if (Math.abs(change) < MIN_RANK_CHANGE) continue;

      const arrow = change > 0 ? "📈" : "📉";
      const direction = change > 0 ? "up" : "down";
      const msg = `${arrow} You moved ${direction} to #${entry.rank} in ${group.name}!`;
      notify(entry.userId, "rank_change", msg, `/groups/${group.id}`);
      totalNotifications++;
    }
  }

  return totalNotifications;
}
