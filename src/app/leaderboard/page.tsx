"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Tournament } from "@/types/tournament";
import type { LeaderboardEntry } from "@/types/scoring";
import GroupLeaderboard from "@/components/GroupLeaderboard";

export default function LeaderboardPage() {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [lbLoading, setLbLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      const tRes = await fetch("/api/tournaments");
      if (tRes.ok) {
        const data = await tRes.json();
        const list: Tournament[] = data.tournaments ?? [];
        setTournaments(list);
        if (list.length > 0) setSelectedId(list[0].id);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  useEffect(() => {
    if (selectedId == null) return;
    setLbLoading(true);
    fetch(`/api/tournaments/${selectedId}/leaderboard`)
      .then((r) => r.json())
      .then((data) => setEntries(data.leaderboard ?? []))
      .catch(() => setEntries([]))
      .finally(() => setLbLoading(false));
  }, [selectedId]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading...</p></main>;
  }

  return (
    <main className="min-h-screen p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🏆 Overall Leaderboard</h1>
        {tournaments.length > 1 && (
          <select
            value={selectedId ?? ""}
            onChange={(e) => setSelectedId(Number(e.target.value))}
            className="border rounded px-3 py-1 text-sm"
          >
            {tournaments.map((t) => (
              <option key={t.id} value={t.id}>{t.name} ({t.year})</option>
            ))}
          </select>
        )}
      </div>
      <p className="text-gray-500 text-sm mb-4">
        All brackets across the tournament, scored with default settings (no group-specific scoring).
      </p>
      {lbLoading ? (
        <p className="text-gray-400">Loading leaderboard...</p>
      ) : (
        <GroupLeaderboard entries={entries} actualTotal={null} groupName="Overall_Leaderboard" />
      )}
    </main>
  );
}
