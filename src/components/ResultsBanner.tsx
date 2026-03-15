"use client";

import { useState, useEffect } from "react";

const DISMISSED_KEY = "results_banner_dismissed_at";
const STALE_HOURS = 24;

/** Dismissible banner showing when ESPN results were last synced. */
export default function ResultsBanner() {
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    fetch("/api/tournaments/updates")
      .then((r) => r.json())
      .then(({ results_updated_at }) => {
        if (!results_updated_at) return;
        const dismissed = localStorage.getItem(DISMISSED_KEY);
        if (dismissed && dismissed >= results_updated_at) return;
        const ageMs = Date.now() - new Date(results_updated_at + "Z").getTime();
        if (ageMs < STALE_HOURS * 60 * 60 * 1000) {
          setUpdatedAt(results_updated_at);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  if (!visible || !updatedAt) return null;

  const timeStr = new Date(updatedAt + "Z").toLocaleString();

  function dismiss() {
    setVisible(false);
    localStorage.setItem(DISMISSED_KEY, updatedAt!);
  }

  return (
    <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-800 rounded px-4 py-2 mb-4 text-sm">
      <span>🏀 Results updated — {timeStr}</span>
      <button onClick={dismiss} className="ml-4 text-blue-500 hover:text-blue-700 font-bold">✕</button>
    </div>
  );
}
