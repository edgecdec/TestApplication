"use client";

import { useEffect, useState } from "react";

interface GroupRank {
  groupId: number;
  groupName: string;
  rank: number;
  total: number;
}

interface SummaryData {
  score: number;
  correct: number;
  wrong: number;
  pending: number;
  resolved: number;
  totalGames: number;
  maxPossible: number;
  groupRanks: GroupRank[];
}

export default function BracketScoringSummary({ bracketId }: { bracketId: number }) {
  const [data, setData] = useState<SummaryData | null>(null);

  useEffect(() => {
    fetch(`/api/brackets/${bracketId}/summary`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d) setData(d); })
      .catch(() => {});
  }, [bracketId]);

  if (!data || data.resolved === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 text-xs mb-3 max-w-screen-2xl mx-auto no-print">
      <span className="font-semibold text-gray-700 dark:text-gray-300">📊 Score:</span>
      <span className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 px-2 py-0.5 rounded-full font-bold">
        {data.score} pts
      </span>
      <span className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-200 px-2 py-0.5 rounded-full">
        ✅ {data.correct}
      </span>
      <span className="bg-red-100 dark:bg-red-900/40 text-red-800 dark:text-red-200 px-2 py-0.5 rounded-full">
        ❌ {data.wrong}
      </span>
      <span className="bg-yellow-100 dark:bg-yellow-900/40 text-yellow-800 dark:text-yellow-200 px-2 py-0.5 rounded-full">
        ⏳ {data.pending}
      </span>
      <span className="bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-200 px-2 py-0.5 rounded-full">
        Max: {data.maxPossible}
      </span>
      {data.groupRanks.map((gr) => (
        <a
          key={gr.groupId}
          href={`/groups/${gr.groupId}`}
          className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full hover:bg-gray-200 dark:hover:bg-gray-600 transition"
        >
          {gr.groupName}: #{gr.rank}/{gr.total}
        </a>
      ))}
    </div>
  );
}
