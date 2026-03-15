import { getDb } from "@/lib/db";
import { generateInviteCode } from "@/lib/invite";
import { EVERYONE_GROUP_NAME } from "@/lib/bracket-constants";

/**
 * Ensures the "Everyone" group exists and the given user is a member.
 * Called on register and login.
 */
export function ensureEveryoneGroup(userId: number): void {
  const db = getDb();

  let group = db.prepare("SELECT id FROM groups WHERE name = ?").get(EVERYONE_GROUP_NAME) as { id: number } | undefined;

  if (!group) {
    const admin = db.prepare("SELECT id FROM users WHERE is_admin = 1 LIMIT 1").get() as { id: number } | undefined;
    const creatorId = admin?.id ?? userId;
    const result = db.prepare(
      "INSERT INTO groups (name, invite_code, created_by) VALUES (?, ?, ?)"
    ).run(EVERYONE_GROUP_NAME, generateInviteCode(), creatorId);
    group = { id: Number(result.lastInsertRowid) };
  }

  const existing = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(group.id, userId);
  if (!existing) {
    db.prepare("INSERT INTO group_members (group_id, user_id) VALUES (?, ?)").run(group.id, userId);
  }
}
