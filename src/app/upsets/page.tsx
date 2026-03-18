"use client";

import { useEffect, useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useRouter } from "next/navigation";
import type { UpsetInfo } from "@/types/upsets";
import { ROUND_NAMES } from "@/lib/bracket-constants";
import TeamLogo from "@/components/TeamLogo";

export default function UpsetsPage() {
  const router = useRouter();
  const [upsets, setUpsets] = useState<UpsetInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      const tRes = await fetch("/api/tournaments");
      if (!tRes.ok) { setLoading(false); return; }
      const { tournaments } = await tRes.json();
      if (!tournaments?.length) { setLoading(false); return; }
      const uRes = await fetch(`/api/tournaments/upsets?tournament_id=${tournaments[0].id}`);
      if (uRes.ok) {
        const data = await uRes.json();
        setUpsets(data.upsets ?? []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <LoadingSkeleton />;

  const biggest = upsets.length > 0 ? upsets[0] : null;
  const mostPredicted = upsets.length > 0 ? upsets.reduce((best, u) => u.predictedPct > best.predictedPct ? u : best, upsets[0]) : null;

  // Group by round
  const byRound = new Map<number, UpsetInfo[]>();
  for (const u of upsets) {
    const arr = byRound.get(u.round) ?? [];
    arr.push(u);
    byRound.set(u.round, arr);
  }

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-2">🚨 Upset Tracker</h1>
      <p className="text-gray-600 mb-6">{upsets.length} upset{upsets.length !== 1 ? "s" : ""} so far</p>

      {upsets.length === 0 ? (
        <p className="text-gray-500">No upsets yet — or no results have been entered.</p>
      ) : (
        <>
          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
            {biggest && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-red-600 mb-1">🔥 Biggest Upset</p>
                <div className="flex items-center gap-2">
                  <TeamLogo team={biggest.winner} size={24} />
                  <span className="font-bold">({biggest.winnerSeed}) {biggest.winner}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  over ({biggest.loserSeed}) {biggest.loser} · {ROUND_NAMES[biggest.round]}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {biggest.predictedBy}/{biggest.totalBrackets} predicted ({biggest.predictedPct}%)
                </p>
              </div>
            )}
            {mostPredicted && mostPredicted !== biggest && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <p className="text-xs font-semibold text-blue-600 mb-1">🎯 Most Predicted Upset</p>
                <div className="flex items-center gap-2">
                  <TeamLogo team={mostPredicted.winner} size={24} />
                  <span className="font-bold">({mostPredicted.winnerSeed}) {mostPredicted.winner}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  over ({mostPredicted.loserSeed}) {mostPredicted.loser} · {ROUND_NAMES[mostPredicted.round]}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {mostPredicted.predictedBy}/{mostPredicted.totalBrackets} predicted ({mostPredicted.predictedPct}%)
                </p>
              </div>
            )}
          </div>

          {/* By round */}
          {Array.from(byRound.entries())
            .sort(([a], [b]) => a - b)
            .map(([round, roundUpsets]) => (
              <div key={round} className="mb-6">
                <h2 className="text-lg font-semibold mb-3">{ROUND_NAMES[round]}</h2>
                <div className="space-y-2">
                  {roundUpsets
                    .sort((a, b) => b.seedDiff - a.seedDiff)
                    .map((u) => (
                      <div key={u.gameId} className="flex items-center gap-3 bg-white rounded-lg shadow px-4 py-3">
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs font-bold text-gray-400 w-5 text-right">{u.winnerSeed}</span>
                          <TeamLogo team={u.winner} />
                          <span className="font-medium text-sm truncate">{u.winner}</span>
                        </div>
                        <span className="text-xs text-gray-400">over</span>
                        <div className="flex items-center gap-2 flex-1 min-w-0">
                          <span className="text-xs font-bold text-gray-400 w-5 text-right">{u.loserSeed}</span>
                          <TeamLogo team={u.loser} />
                          <span className="text-sm text-gray-500 truncate">{u.loser}</span>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <div className="text-xs font-semibold">
                            {u.predictedBy}/{u.totalBrackets}
                          </div>
                          <div className={`text-xs ${u.predictedPct <= 10 ? "text-red-500" : u.predictedPct <= 30 ? "text-yellow-600" : "text-green-600"}`}>
                            {u.predictedPct}% predicted
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            ))}
        </>
      )}
    </main>
  );
}
