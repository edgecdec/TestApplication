"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import type { RoundRecap } from "@/types/recap";
import TeamLogo from "@/components/TeamLogo";

export default function RoundRecapPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [rounds, setRounds] = useState<RoundRecap[]>([]);
  const [selectedRound, setSelectedRound] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      const res = await fetch(`/api/groups/${id}/recap`);
      if (res.ok) {
        const data = await res.json();
        const r: RoundRecap[] = data.rounds ?? [];
        setRounds(r);
        if (r.length > 0) setSelectedRound(r.length - 1);
      }
      setLoading(false);
    }
    load();
  }, [id, router]);

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading...</p></main>;

  if (rounds.length === 0) {
    return (
      <main className="min-h-screen p-8 max-w-3xl mx-auto">
        <button onClick={() => router.push(`/groups/${id}`)} className="text-sm text-blue-600 hover:underline mb-4 inline-block">← Back to Group</button>
        <h1 className="text-2xl font-bold mb-4">📋 Round Recap</h1>
        <p className="text-gray-500">No results yet. Recaps will appear after games are resolved.</p>
      </main>
    );
  }

  const recap = rounds[selectedRound];
  const mvp = recap.entries[0];
  const isComplete = recap.gamesResolved === recap.totalGames;

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <button onClick={() => router.push(`/groups/${id}`)} className="text-sm text-blue-600 hover:underline mb-4 inline-block">← Back to Group</button>
      <h1 className="text-2xl font-bold mb-4">📋 Round Recap</h1>

      {/* Round selector */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {rounds.map((r, i) => (
          <button
            key={r.round}
            onClick={() => setSelectedRound(i)}
            className={`px-4 py-2 text-sm rounded-lg transition ${
              selectedRound === i
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300"
            }`}
          >
            {r.roundName}
            {!isComplete && i === rounds.length - 1 && (
              <span className="ml-1 text-xs opacity-75">({r.gamesResolved}/{r.totalGames})</span>
            )}
          </button>
        ))}
      </div>

      {/* MVP highlight */}
      {mvp && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4 mb-6">
          <div className="text-sm font-medium text-yellow-800 dark:text-yellow-200 mb-1">
            🏅 {recap.roundName} MVP
          </div>
          <div className="text-lg font-bold text-yellow-900 dark:text-yellow-100">
            {mvp.username} — {mvp.bracketName}
          </div>
          <div className="text-sm text-yellow-700 dark:text-yellow-300">
            {mvp.points} pts · {mvp.correct} correct
            {mvp.upsetBonus > 0 && ` · +${mvp.upsetBonus} upset bonus`}
          </div>
        </div>
      )}

      {/* Leaderboard for this round */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto mb-6">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="text-left px-3 py-2 font-medium">Bracket</th>
              <th className="text-left px-3 py-2 font-medium">User</th>
              <th className="text-right px-3 py-2 font-medium">Round Pts</th>
              <th className="text-right px-3 py-2 font-medium">Correct</th>
              <th className="text-right px-3 py-2 font-medium">Upset Bonus</th>
              <th className="text-right px-3 py-2 font-medium">Cumulative</th>
              <th className="text-right px-3 py-2 font-medium">Rank</th>
              <th className="text-right px-3 py-2 font-medium">Movement</th>
            </tr>
          </thead>
          <tbody>
            {recap.entries.map((e) => (
              <tr key={e.bracketId} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-3 py-2">
                  <button onClick={() => router.push(`/bracket/${e.bracketId}`)} className="text-blue-600 hover:underline">{e.bracketName}</button>
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => router.push(`/profile/${encodeURIComponent(e.username)}`)} className="text-gray-600 dark:text-gray-300 hover:text-blue-600 hover:underline">{e.username}</button>
                </td>
                <td className="px-3 py-2 text-right font-bold">{e.points}</td>
                <td className="px-3 py-2 text-right">{e.correct}</td>
                <td className="px-3 py-2 text-right text-green-600">{e.upsetBonus > 0 ? `+${e.upsetBonus}` : "—"}</td>
                <td className="px-3 py-2 text-right font-medium">{e.cumulativeTotal}</td>
                <td className="px-3 py-2 text-right">#{e.rankAfterRound}</td>
                <td className="px-3 py-2 text-right">
                  {e.rankChange == null ? (
                    <span className="text-gray-400">—</span>
                  ) : e.rankChange > 0 ? (
                    <span className="text-green-600">▲{e.rankChange}</span>
                  ) : e.rankChange < 0 ? (
                    <span className="text-red-600">▼{Math.abs(e.rankChange)}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Upsets */}
      {recap.upsetHits.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
          <h2 className="text-sm font-semibold mb-3">🔥 Upsets This Round</h2>
          <div className="space-y-3">
            {recap.upsetHits.map((u) => (
              <div key={u.gameId} className="flex items-center justify-between border-b dark:border-gray-700 pb-2 last:border-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1">
                    <TeamLogo team={u.winner} />
                    <span className="font-medium">({u.winnerSeed}) {u.winner}</span>
                  </span>
                  <span className="text-gray-400 text-xs">beat</span>
                  <span className="inline-flex items-center gap-1 text-gray-500">
                    <TeamLogo team={u.loser} />
                    <span>({u.loserSeed}) {u.loser}</span>
                  </span>
                </div>
                <div className="text-right text-xs">
                  <span className={`px-2 py-0.5 rounded ${
                    u.pickedBy.length === 0
                      ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                      : "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                  }`}>
                    {u.pickedBy.length}/{u.totalBrackets} picked it
                  </span>
                  {u.pickedBy.length > 0 && (
                    <div className="text-gray-500 mt-0.5">{u.pickedBy.join(", ")}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
