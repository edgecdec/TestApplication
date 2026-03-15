"use client";

import type { PickStreak } from "@/types/scoring";

const HOT_THRESHOLD = 3;
const COLD_THRESHOLD = 3;

interface Props {
  streak: PickStreak;
}

export default function StreakBadge({ streak }: Props) {
  if (streak >= HOT_THRESHOLD) {
    return <span className="text-xs" title={`${streak} correct in a row`}>🔥 {streak}</span>;
  }
  if (streak <= -COLD_THRESHOLD) {
    return <span className="text-xs" title={`${-streak} wrong in a row`}>❄️ {-streak}</span>;
  }
  return null;
}
