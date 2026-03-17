"use client";

import { useEffect, useState } from "react";
import type { Award } from "@/types/awards";

interface GroupAwardsProps {
  groupId: string;
}

export default function GroupAwards({ groupId }: GroupAwardsProps) {
  const [awards, setAwards] = useState<Award[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/groups/${groupId}/awards`)
      .then((r) => r.ok ? r.json() : { awards: [] })
      .then((d) => setAwards(d.awards ?? []))
      .finally(() => setLoading(false));
  }, [groupId]);

  if (loading) return <p className="text-sm text-gray-400">Loading awards...</p>;
  if (awards.length === 0) return <p className="text-sm text-gray-500">No awards yet — results needed to compute awards.</p>;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {awards.map((a) => (
        <div key={a.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex items-start gap-3">
          <span className="text-2xl">{a.emoji}</span>
          <div className="min-w-0">
            <h4 className="font-semibold text-sm">{a.name}</h4>
            <p className="text-xs text-gray-500 dark:text-gray-400">{a.description}</p>
            {a.winner ? (
              <div className="mt-1.5">
                <span className="text-sm font-medium text-blue-600 dark:text-blue-400">{a.winner.username}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">({a.winner.bracketName})</span>
                <div className="text-xs text-gray-600 dark:text-gray-300 mt-0.5">{a.winner.value}</div>
              </div>
            ) : (
              <p className="text-xs text-gray-400 mt-1">TBD</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
