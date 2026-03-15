import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { getUserNotifications, getUnreadCount, markAllRead } from "@/lib/notifications";

/** GET /api/notifications — get recent notifications + unread count */
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  const notifications = getUserNotifications(user.id);
  const unreadCount = getUnreadCount(user.id);

  return NextResponse.json({
    notifications: notifications.map((n) => ({
      ...n,
      read: Boolean(n.read),
    })),
    unreadCount,
  });
}

/** PATCH /api/notifications — mark all as read */
export async function PATCH() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });

  markAllRead(user.id);
  return NextResponse.json({ success: true });
}
