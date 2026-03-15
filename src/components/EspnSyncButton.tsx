"use client";

import { useState } from "react";

interface Props {
  tournamentId: number;
}

export default function EspnSyncButton({ tournamentId }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  async function handleSync() {
    setSyncing(true);
    setResult(null);
    try {
      const res = await fetch("/api/espn/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tournamentId }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult(data.error ?? "Sync failed");
      } else {
        setResult(
          `Found ${data.espnGamesFound} ESPN games, resolved ${data.newResultsResolved} new (${data.totalResultsResolved} total)`
        );
      }
    } catch {
      setResult("Network error");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleSync}
        disabled={syncing}
        className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition"
      >
        {syncing ? "Syncing..." : "🔄 Sync ESPN"}
      </button>
      {result && <span className="text-xs text-gray-600">{result}</span>}
    </div>
  );
}
