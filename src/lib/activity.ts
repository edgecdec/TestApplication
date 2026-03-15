import { getDb } from "@/lib/db";
import type { ActivityType } from "@/types/activity";

export function logGroupActivity(
  groupId: number | string,
  userId: number,
  activityType: ActivityType,
  metadata: Record<string, string | number> = {}
): void {
  const db = getDb();
  db.prepare(
    "INSERT INTO group_activity (group_id, user_id, activity_type, metadata) VALUES (?, ?, ?, ?)"
  ).run(groupId, userId, activityType, JSON.stringify(metadata));
}

/** Log activity to all groups a bracket belongs to */
export function logBracketActivityToGroups(
  bracketId: number,
  userId: number,
  activityType: ActivityType,
  metadata: Record<string, string | number> = {}
): void {
  const db = getDb();
  const groups = db.prepare(
    "SELECT group_id FROM group_brackets WHERE bracket_id = ?"
  ).all(bracketId) as { group_id: number }[];

  for (const { group_id } of groups) {
    logGroupActivity(group_id, userId, activityType, metadata);
  }
}
