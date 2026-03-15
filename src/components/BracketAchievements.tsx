"use client";

import type { Achievement } from "@/lib/achievements";

interface Props {
  achievements: Achievement[];
}

export default function BracketAchievements({ achievements }: Props) {
  if (achievements.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-1 mt-1">
      {achievements.map((a, i) => (
        <span
          key={`${a.id}-${i}`}
          className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-700 rounded text-[10px] text-amber-800 dark:text-amber-200"
          title={a.description}
        >
          {a.emoji} {a.name}
        </span>
      ))}
    </div>
  );
}
