import { getDb } from "@/lib/db";
import type { NotificationType } from "@/types/notification";

const NOTIFICATIONS_LIMIT = 50;

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
