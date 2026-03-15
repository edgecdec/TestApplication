import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getCurrentUser } from "@/lib/auth";
import { logGroupActivity } from "@/lib/activity";
import { notifyGroupMembers } from "@/lib/notifications";
import { EVERYONE_GROUP_NAME } from "@/lib/bracket-constants";
import type { Group } from "@/types/group";

/** DELETE /api/groups/[id]/members — leave group (self) or remove member (admin). */
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const { id } = await params;
  const groupId = Number(id);
  const { user_id: targetUserId } = await req.json() as { user_id: number };

  if (!targetUserId) {
    return NextResponse.json({ error: "user_id is required" }, { status: 400 });
  }

  const db = getDb();
  const group = db.prepare("SELECT * FROM groups WHERE id = ?").get(groupId) as Group | undefined;
  if (!group) {
    return NextResponse.json({ error: "Group not found" }, { status: 404 });
  }

  // Can't leave the "Everyone" group
  if (group.name === EVERYONE_GROUP_NAME) {
    return NextResponse.json({ error: "Cannot leave the Everyone group" }, { status: 400 });
  }

  const isCreator = group.created_by === user.id;
  const isSelf = targetUserId === user.id;

  // Authorization: self can leave, creator/admin can remove others
  if (!isSelf && !isCreator && !user.isAdmin) {
    return NextResponse.json({ error: "Not authorized" }, { status: 403 });
  }

  // Creator can't leave their own group (they should delete it instead)
  if (isSelf && isCreator) {
    return NextResponse.json({ error: "Group creator cannot leave. Transfer ownership or delete the group." }, { status: 400 });
  }

  // Check membership
  const membership = db.prepare("SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?").get(groupId, targetUserId);
  if (!membership) {
    return NextResponse.json({ error: "User is not a member of this group" }, { status: 404 });
  }

  // Get target username for activity/notification
  const targetUser = db.prepare("SELECT username FROM users WHERE id = ?").get(targetUserId) as { username: string } | undefined;
  const targetName = targetUser?.username ?? "Unknown";

  // Remove all of this user's brackets from the group
  db.prepare(`
    DELETE FROM group_brackets WHERE group_id = ? AND bracket_id IN (
      SELECT id FROM brackets WHERE user_id = ?
    )
  `).run(groupId, targetUserId);

  // Remove bracket reactions by this user in this group
  db.prepare("DELETE FROM bracket_reactions WHERE group_id = ? AND user_id = ?").run(groupId, targetUserId);

  // Remove membership
  db.prepare("DELETE FROM group_members WHERE group_id = ? AND user_id = ?").run(groupId, targetUserId);

  // Log activity and notify
  const action = isSelf ? "left" : "was removed from";
  logGroupActivity(groupId, targetUserId, "member_left", {});
  notifyGroupMembers(groupId, targetUserId, "member_left", `👋 ${targetName} ${action} ${group.name}`, `/groups/${id}`);

  return NextResponse.json({ success: true });
}
