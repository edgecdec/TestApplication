"use client";

import { useEffect, useState } from "react";
import { TOTAL_GAMES } from "@/lib/bracket-constants";
import { countPicks } from "@/lib/pick-count";
import type { Bracket, Tournament } from "@/types/tournament";

const MS_PER_HOUR = 3_600_000;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const TICK_INTERVAL = 60_000;

interface PickReminderBannerProps {
  brackets: Bracket[];
  tournaments: Tournament[];
}

export default function PickReminderBanner({ brackets, tournaments }: PickReminderBannerProps) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), TICK_INTERVAL);
    return () => clearInterval(id);
  }, []);

  const lockMap = new Map(tournaments.map((t) => [t.id, t.lock_time]));

  const incomplete = brackets.filter((b) => {
    const lockTime = lockMap.get(b.tournament_id);
    if (!lockTime) return false;
    const ms = new Date(lockTime).getTime() - now;
    return ms > 0 && ms <= MS_PER_DAY && countPicks(b.picks) < TOTAL_GAMES;
  });

  if (incomplete.length === 0) return null;

  return (
    <div className="space-y-2 mb-4">
      {incomplete.map((b) => {
        const ms = new Date(lockMap.get(b.tournament_id)!).getTime() - now;
        const urgent = ms < MS_PER_HOUR;
        const remaining = TOTAL_GAMES - countPicks(b.picks);
        const hours = Math.floor(ms / MS_PER_HOUR);

        return (
          <a
            key={b.id}
            href={`/bracket/${b.id}`}
            className={`block px-4 py-3 rounded-lg text-sm font-medium ${
              urgent
                ? "bg-red-100 text-red-800 border border-red-300"
                : "bg-yellow-100 text-yellow-800 border border-yellow-300"
            }`}
          >
            ⚠️ &ldquo;{b.name}&rdquo; has {remaining} empty {remaining === 1 ? "slot" : "slots"} — picks lock in{" "}
            {hours > 0 ? `${hours}h` : "less than 1h"}! Click to complete →
          </a>
        );
      })}
    </div>
  );
}
