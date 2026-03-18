"use client";

import { useEffect, useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useRouter } from "next/navigation";
import { ROUND_NAMES } from "@/lib/bracket-constants";
import TeamLogo from "@/components/TeamLogo";
import type { Tournament } from "@/types/tournament";
import type { TournamentStats } from "@/types/stats";

const MAX_CHAMPIONS_SHOWN = 10;

export default function StatsPage() {
  const [stats, setStats] = useState<TournamentStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }

      const tRes = await fetch("/api/tournaments");
      if (!tRes.ok) { setLoading(false); return; }
      const { tournaments } = await tRes.json();
      const t = tournaments?.[0] as Tournament | undefined;
      if (!t) { setLoading(false); return; }
      setTournament(t);

      const sRes = await fetch(`/api/stats?tournament_id=${t.id}`);
      if (sRes.ok) {
        const data = await sRes.json();
        setStats(data.stats);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <LoadingSkeleton />;

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">📊 Bracket Stats</h1>
      </div>

      {!tournament && <p className="text-gray-500">No tournament found.</p>}
      {tournament && !stats && <p className="text-gray-500">Stats will be available after brackets lock.</p>}

      {stats && (
        <div className="space-y-6">
          <p className="text-gray-600">{stats.totalBrackets} bracket{stats.totalBrackets !== 1 ? "s" : ""} submitted</p>

          {/* Most Popular Champions */}
          <section className="bg-white rounded-lg shadow p-6">
            <h2 className="text-lg font-semibold mb-4">🏆 Most Popular Champions</h2>
            {stats.champions.length === 0 ? (
              <p className="text-gray-400 text-sm">No champion picks yet.</p>
            ) : (
              <div className="space-y-3">
                {stats.champions.slice(0, MAX_CHAMPIONS_SHOWN).map((c) => (
                  <div key={c.team} className="flex items-center gap-3">
                    <span className="text-sm text-gray-500 w-8 text-right">({c.seed})</span>
                    <TeamLogo team={c.team} />
                    <span className="text-sm font-medium w-36 truncate">{c.team}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden">
                      <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${c.pct}%`, minWidth: c.pct > 0 ? "8px" : "0" }} />
                    </div>
                    <span className="text-xs text-gray-500 w-16 text-right">{c.count} ({c.pct}%)</span>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Biggest Upset Pick */}
          {stats.biggestUpset && (
            <section className="bg-white rounded-lg shadow p-6">
              <h2 className="text-lg font-semibold mb-3">🔥 Biggest Upset Pick</h2>
              <div>
                <p className="text-xl font-bold flex items-center gap-2">
                  <TeamLogo team={stats.biggestUpset.team} size={24} />
                  ({stats.biggestUpset.seed}) {stats.biggestUpset.team}
                </p>
                <p className="text-gray-500 text-sm">
                  Picked to win {ROUND_NAMES[stats.biggestUpset.round] ?? `Round ${stats.biggestUpset.round}`} by {stats.biggestUpset.count} bracket{stats.biggestUpset.count !== 1 ? "s" : ""}
                </p>
              </div>
            </section>
          )}

          {/* Chalk vs Contrarian */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {stats.mostChalk && (
              <section className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-2">📈 Most Chalk</h2>
                <p className="font-bold">{stats.mostChalk.username}</p>
                <p className="text-gray-500 text-sm">{stats.mostChalk.bracketName}</p>
                <span className="inline-block mt-2 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                  Chalk score: {stats.mostChalk.chalkScore}
                </span>
              </section>
            )}
            {stats.mostContrarian && (
              <section className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold mb-2">📉 Most Contrarian</h2>
                <p className="font-bold">{stats.mostContrarian.username}</p>
                <p className="text-gray-500 text-sm">{stats.mostContrarian.bracketName}</p>
                <span className="inline-block mt-2 text-xs bg-red-100 text-red-700 px-2 py-1 rounded">
                  Chalk score: {stats.mostContrarian.chalkScore}
                </span>
              </section>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
