"use client";

import { useEffect, useState } from "react";

const MS_PER_SECOND = 1000;
const MS_PER_MINUTE = 60 * MS_PER_SECOND;
const MS_PER_HOUR = 60 * MS_PER_MINUTE;
const MS_PER_DAY = 24 * MS_PER_HOUR;
const TICK_INTERVAL = MS_PER_SECOND;

interface LockCountdownProps {
  lockTime: string;
}

function formatRemaining(ms: number): string {
  const days = Math.floor(ms / MS_PER_DAY);
  const hours = Math.floor((ms % MS_PER_DAY) / MS_PER_HOUR);
  const minutes = Math.floor((ms % MS_PER_HOUR) / MS_PER_MINUTE);
  const seconds = Math.floor((ms % MS_PER_MINUTE) / MS_PER_SECOND);

  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

export default function LockCountdown({ lockTime }: LockCountdownProps) {
  const [remaining, setRemaining] = useState<number>(() => new Date(lockTime).getTime() - Date.now());

  useEffect(() => {
    setRemaining(new Date(lockTime).getTime() - Date.now());
    const id = setInterval(() => {
      setRemaining(new Date(lockTime).getTime() - Date.now());
    }, TICK_INTERVAL);
    return () => clearInterval(id);
  }, [lockTime]);

  if (remaining <= 0) {
    return <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded font-medium">🔒 Locked</span>;
  }

  return (
    <span className="text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded font-medium">
      ⏱ Locks in {formatRemaining(remaining)}
    </span>
  );
}
