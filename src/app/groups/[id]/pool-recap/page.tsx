"use client";

import { useEffect, useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useParams, useRouter } from "next/navigation";
import type { LeaderboardEntry } from "@/types/scoring";
import type { Award } from "@/types/awards";
import TeamLogo from "@/components/TeamLogo";
import { ROUND_NAMES } from "@/lib/bracket-constants";

const MEDAL_EMOJIS = ["🥇", "🥈", "🥉"] as const;
const TOP_N_STANDINGS = 50;

interface GroupInfo {
  id: string;
  name: string;
  buy_in: number | null;
  payout_structure: string | null;
}

export default function PoolRecapPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [awards, setAwards] = useState<Award[]>([]);
  const [group, setGroup] = useState<GroupInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }

      // Get tournament ID
      const tRes = await fetch("/api/tournaments");
      if (!tRes.ok) { setLoading(false); return; }
      const tData = await tRes.json();
      const tournament = tData.tournaments?.[0];
      if (!tournament) { setLoading(false); return; }

      // Fetch leaderboard, awards, and group info in parallel
      const [lbRes, awRes, grRes] = await Promise.all([
        fetch(`/api/groups/${id}/leaderboard?tournament_id=${tournament.id}`),
        fetch(`/api/groups/${id}/awards`),
        fetch(`/api/groups/${id}/simulator`),
      ]);

      if (lbRes.ok) {
        const lbData = await lbRes.json();
        setLeaderboard(lbData.leaderboard ?? []);
      }
      if (awRes.ok) {
        const awData = await awRes.json();
        setAwards(awData.awards ?? []);
      }
      if (grRes.ok) {
        const grData = await grRes.json();
        setGroup({ id, name: grData.groupName ?? "Group", buy_in: null, payout_structure: null });
      }
      setLoading(false);
    }
    load();
  }, [id, router]);

  function generateRecapText(): string {
    if (!group || leaderboard.length === 0) return "";
    const lines: string[] = [];
    lines.push(`🏀 ${group.name} — Pool Recap`);
    lines.push("═".repeat(30));
    lines.push("");

    // Champion
    const winner = leaderboard[0];
    if (winner) {
      lines.push(`🏆 POOL CHAMPION: ${winner.username} (${winner.bracketName})`);
      lines.push(`   Score: ${winner.total} pts · ${winner.correctPicks}/${winner.totalResolved} correct`);
      if (winner.championPick) lines.push(`   Champion Pick: ${winner.championPick}`);
      lines.push("");
    }

    // Final standings
    lines.push("📊 FINAL STANDINGS");
    lines.push("─".repeat(25));
    const top = leaderboard.slice(0, TOP_N_STANDINGS);
    for (const e of top) {
      const medal = e.rank <= 3 ? MEDAL_EMOJIS[e.rank - 1] + " " : `#${e.rank} `;
      const champ = e.championPick ? ` [${e.championPick}]` : "";
      lines.push(`${medal}${e.username} — ${e.bracketName}: ${e.total} pts (${e.correctPicks}/${e.totalResolved})${champ}`);
    }
    if (leaderboard.length > TOP_N_STANDINGS) {
      lines.push(`   ... and ${leaderboard.length - TOP_N_STANDINGS} more`);
    }
    lines.push("");

    // Awards
    const wonAwards = awards.filter((a) => a.winner);
    if (wonAwards.length > 0) {
      lines.push("🏅 AWARDS");
      lines.push("─".repeat(25));
      for (const a of wonAwards) {
        lines.push(`${a.emoji} ${a.name}: ${a.winner!.username} (${a.winner!.value})`);
      }
      lines.push("");
    }

    // Stats
    const champPicks = new Map<string, number>();
    for (const e of leaderboard) {
      if (e.championPick) champPicks.set(e.championPick, (champPicks.get(e.championPick) ?? 0) + 1);
    }
    const sortedChamps = Array.from(champPicks.entries()).sort((a, b) => b[1] - a[1]);
    if (sortedChamps.length > 0) {
      lines.push("👑 CHAMPION PICKS");
      lines.push("─".repeat(25));
      for (const [team, count] of sortedChamps.slice(0, 5)) {
        const pct = Math.round((count / leaderboard.length) * 100);
        lines.push(`   ${team}: ${count}/${leaderboard.length} (${pct}%)`);
      }
      lines.push("");
    }

    lines.push(`📈 ${leaderboard.length} brackets · ${group.name}`);
    return lines.join("\n");
  }

  function copyRecap() {
    const text = generateRecapText();
    navigator.clipboard.writeText(text);
  }

  if (loading) return <LoadingSkeleton />;

  if (leaderboard.length === 0) {
    return (
      <main className="min-h-screen p-8 max-w-3xl mx-auto">
        <button onClick={() => router.push(`/groups/${id}`)} className="text-sm text-blue-600 hover:underline mb-4 inline-block">← Back to Group</button>
        <h1 className="text-2xl font-bold mb-4">🏆 Pool Recap</h1>
        <p className="text-gray-500">No results yet. The recap will appear after games are resolved.</p>
      </main>
    );
  }

  const winner = leaderboard[0];
  const wonAwards = awards.filter((a) => a.winner);

  // Champion pick distribution
  const champPicks = new Map<string, number>();
  for (const e of leaderboard) {
    if (e.championPick) champPicks.set(e.championPick, (champPicks.get(e.championPick) ?? 0) + 1);
  }
  const sortedChamps = Array.from(champPicks.entries()).sort((a, b) => b[1] - a[1]);

  // Best per-round scorers
  const bestByRound: { round: number; entry: LeaderboardEntry }[] = [];
  for (let r = 0; r < 6; r++) {
    let best: LeaderboardEntry | null = null;
    let bestPts = -1;
    for (const e of leaderboard) {
      const pts = e.rounds[r]?.points ?? 0;
      if (pts > bestPts) { bestPts = pts; best = e; }
    }
    if (best && bestPts > 0) bestByRound.push({ round: r, entry: best });
  }

  // Busted count
  const bustedCount = leaderboard.filter((e) => e.busted).length;

  return (
    <main className="min-h-screen p-8 max-w-4xl mx-auto">
      <button onClick={() => router.push(`/groups/${id}`)} className="text-sm text-blue-600 hover:underline mb-4 inline-block">← Back to Group</button>

      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-2xl font-bold">🏆 {group?.name ?? "Pool"} — Recap</h1>
        <button onClick={copyRecap} className="px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
          📋 Copy Recap
        </button>
      </div>

      {/* Pool Champion */}
      {winner && (
        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 dark:from-yellow-900/20 dark:to-amber-900/20 border border-yellow-300 dark:border-yellow-700 rounded-xl p-6 mb-6 text-center">
          <div className="text-4xl mb-2">🏆</div>
          <h2 className="text-xl font-bold text-yellow-900 dark:text-yellow-100">{winner.username}</h2>
          <p className="text-sm text-yellow-700 dark:text-yellow-300">{winner.bracketName}</p>
          <div className="mt-3 flex items-center justify-center gap-4 text-sm">
            <span className="font-bold text-lg text-yellow-900 dark:text-yellow-100">{winner.total} pts</span>
            <span className="text-yellow-700 dark:text-yellow-300">{winner.correctPicks}/{winner.totalResolved} correct</span>
          </div>
          {winner.championPick && (
            <div className="mt-2 flex items-center justify-center gap-1 text-sm text-yellow-800 dark:text-yellow-200">
              <TeamLogo team={winner.championPick} />
              <span>Champion: {winner.championPick}</span>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold">{leaderboard.length}</div>
          <div className="text-xs text-gray-500">Brackets</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold">{leaderboard[0]?.totalResolved ?? 0}</div>
          <div className="text-xs text-gray-500">Games Resolved</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold">{bustedCount}</div>
          <div className="text-xs text-gray-500">💀 Busted Champs</div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg border dark:border-gray-700 p-4 text-center">
          <div className="text-2xl font-bold">{sortedChamps.length}</div>
          <div className="text-xs text-gray-500">Unique Champ Picks</div>
        </div>
      </div>

      {/* Final Standings */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-x-auto mb-6">
        <h2 className="font-semibold text-lg p-4 pb-2">📊 Final Standings</h2>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="text-left px-3 py-2 font-medium">#</th>
              <th className="text-left px-3 py-2 font-medium">Bracket</th>
              {ROUND_NAMES.map((name, i) => (
                <th key={i} className="text-right px-2 py-2 font-medium text-xs hidden sm:table-cell">{name.replace("Round of ", "R")}</th>
              ))}
              <th className="text-right px-3 py-2 font-medium">Total</th>
              <th className="text-right px-3 py-2 font-medium">Correct</th>
              <th className="text-left px-3 py-2 font-medium">Champion</th>
            </tr>
          </thead>
          <tbody>
            {leaderboard.map((e) => (
              <tr key={e.bracketId} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                <td className="px-3 py-2 font-medium">
                  {e.rank <= 3 ? MEDAL_EMOJIS[e.rank - 1] : `#${e.rank}`}
                </td>
                <td className="px-3 py-2">
                  <button onClick={() => router.push(`/bracket/${e.bracketId}`)} className="text-blue-600 hover:underline font-medium">{e.bracketName}</button>
                  <div className="text-xs text-gray-500">{e.username}</div>
                </td>
                {ROUND_NAMES.map((_, i) => (
                  <td key={i} className="text-right px-2 py-2 text-xs hidden sm:table-cell">{e.rounds[i]?.points ?? 0}</td>
                ))}
                <td className="text-right px-3 py-2 font-bold">{e.total}</td>
                <td className="text-right px-3 py-2">{e.correctPicks}/{e.totalResolved}</td>
                <td className="px-3 py-2">
                  {e.championPick && (
                    <span className="inline-flex items-center gap-1 text-xs">
                      <TeamLogo team={e.championPick} />
                      {e.championPick}
                      {e.busted && <span title="Busted">💀</span>}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Awards */}
      {wonAwards.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold text-lg mb-3">🏅 Awards</h2>
          <div className="grid gap-3 sm:grid-cols-2">
            {wonAwards.map((a) => (
              <div key={a.id} className="border dark:border-gray-700 rounded-lg p-3 flex items-start gap-3">
                <span className="text-2xl">{a.emoji}</span>
                <div className="min-w-0">
                  <h4 className="font-semibold text-sm">{a.name}</h4>
                  <span className="text-sm text-blue-600 dark:text-blue-400">{a.winner!.username}</span>
                  <span className="text-xs text-gray-500 ml-1">({a.winner!.bracketName})</span>
                  <div className="text-xs text-gray-600 dark:text-gray-300">{a.winner!.value}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Champion Pick Distribution */}
      {sortedChamps.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold text-lg mb-3">👑 Champion Picks</h2>
          <div className="space-y-2">
            {sortedChamps.map(([team, count]) => {
              const pct = Math.round((count / leaderboard.length) * 100);
              return (
                <div key={team} className="flex items-center gap-2">
                  <TeamLogo team={team} />
                  <span className="text-sm font-medium w-32 truncate">{team}</span>
                  <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full transition-all" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-xs text-gray-500 w-16 text-right">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Best Per Round */}
      {bestByRound.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <h2 className="font-semibold text-lg mb-3">🎯 Best Per Round</h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {bestByRound.map(({ round, entry }) => (
              <div key={round} className="border dark:border-gray-700 rounded-lg p-3">
                <div className="text-xs text-gray-500 mb-1">{ROUND_NAMES[round]}</div>
                <div className="font-medium text-sm">{entry.username}</div>
                <div className="text-xs text-gray-500">{entry.bracketName} — {entry.rounds[round]?.points ?? 0} pts</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
