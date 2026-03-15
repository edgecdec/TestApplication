"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GroupSummaryItem } from "@/app/api/groups/my-summary/route";

function rankEmoji(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function MyGroupsSummary() {
  const [summaries, setSummaries] = useState<GroupSummaryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/groups/my-summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.summaries) setSummaries(data.summaries); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-xs text-gray-400 mb-4">Loading groups...</div>;
  if (summaries.length === 0) return null;

  return (
    <div className="mb-6">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">👥 My Groups</h2>
      <div className="grid gap-2 sm:grid-cols-2">
        {summaries.map((s) => (
          <button
            key={s.groupId}
            onClick={() => router.push(`/groups/${s.groupId}`)}
            className="text-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-3 hover:border-blue-400 transition shadow-sm"
          >
            <div className="flex items-center justify-between mb-1">
              <span className="font-medium text-sm truncate">{s.groupName}</span>
              <span className="text-xs text-gray-400">{s.memberCount} members</span>
            </div>
            {s.totalBrackets === 0 ? (
              <p className="text-xs text-gray-400">No brackets yet</p>
            ) : (
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold">
                  {rankEmoji(s.myBestRank)}{" "}
                  <span className="text-gray-600 dark:text-gray-400">{s.myBestScore} pts</span>
                </span>
                <span className="text-gray-400 truncate ml-2">
                  Leader: {s.leaderUsername} ({s.leaderScore})
                </span>
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
