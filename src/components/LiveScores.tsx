"use client";

import { useEffect, useState, useCallback } from "react";
import type { EspnGameResult } from "@/types/espn";

const POLL_INTERVAL_MS = 60_000; // refresh every 60 seconds

export default function LiveScores() {
  const [games, setGames] = useState<EspnGameResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchScores = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const res = await fetch(`/api/espn/scores?dates=${today}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setGames(data.games ?? []);
      setError(null);
    } catch {
      setError("Could not load scores");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchScores();
    const interval = setInterval(fetchScores, POLL_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [fetchScores]);

  if (loading) return <p className="text-gray-400 text-sm">Loading scores...</p>;
  if (error) return <p className="text-red-500 text-sm">{error}</p>;
  if (games.length === 0) return <p className="text-gray-400 text-sm">No games today.</p>;

  return (
    <ul className="space-y-1">
      {games.map((g, i) => (
        <li key={i} className="flex justify-between text-sm px-2 py-1 rounded bg-gray-50">
          <span className="font-medium">{g.winner}</span>
          <span className="text-gray-600">
            {g.winnerScore} – {g.loserScore}
          </span>
          <span className="text-gray-400">{g.loser}</span>
        </li>
      ))}
    </ul>
  );
}
