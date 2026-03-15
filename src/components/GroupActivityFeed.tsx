"use client";

import { useEffect, useState } from "react";
import type { GroupActivity } from "@/types/activity";

const ACTIVITY_ICONS: Record<string, string> = {
  member_joined: "👋",
  bracket_added: "📋",
  bracket_completed: "✅",
  bracket_updated: "✏️",
};

const ACTIVITY_LABELS: Record<string, string> = {
  member_joined: "joined the group",
  bracket_added: "added a bracket",
  bracket_completed: "completed their bracket",
  bracket_updated: "updated their bracket",
};

function formatTime(dateStr: string): string {
  const d = new Date(dateStr + "Z");
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.floor(diffHr / 24);
  if (diffDay < 7) return `${diffDay}d ago`;
  return d.toLocaleDateString();
}

export default function GroupActivityFeed({ groupId }: { groupId: string }) {
  const [activities, setActivities] = useState<GroupActivity[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/activity`)
      .then((r) => r.ok ? r.json() : { activities: [] })
      .then((d) => setActivities(d.activities ?? []))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <p className="text-gray-400 text-sm">Loading activity...</p>;
  if (activities.length === 0) return <p className="text-gray-400 text-sm">No activity yet.</p>;

  return (
    <div className="space-y-2">
      {activities.map((a) => {
        const meta = typeof a.metadata === "string" ? JSON.parse(a.metadata) : a.metadata;
        const bracketName = meta.bracket_name as string | undefined;
        return (
          <div key={a.id} className="flex items-start gap-2 py-2 border-b border-gray-100 last:border-0">
            <span className="text-lg">{ACTIVITY_ICONS[a.activity_type] ?? "📌"}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm">
                <span className="font-medium">{a.username}</span>{" "}
                {ACTIVITY_LABELS[a.activity_type] ?? a.activity_type}
                {bracketName && (
                  <span className="text-gray-500"> — {bracketName}</span>
                )}
              </p>
              <p className="text-xs text-gray-400">{formatTime(a.created_at)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
