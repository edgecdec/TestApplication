"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import type { EspnGameResult } from "@/types/espn";
import type { LeaderboardEntry } from "@/types/scoring";
import type { GroupRow } from "@/types/group";
import TeamLogo from "@/components/TeamLogo";

const REFRESH_INTERVAL_MS = 30_000;

interface PartyGroup {
  id: number;
  name: string;
}

export default function PartyPage() {
  const router = useRouter();
  const [games, setGames] = useState<EspnGameResult[]>([]);
  const [groups, setGroups] = useState<PartyGroup[]>([]);
  const [selectedGroupId, setSelectedGroupId] = useState<number | null>(null);
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [authed, setAuthed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auth check + load groups
  useEffect(() => {
    async function init() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      setAuthed(true);
      const gRes = await fetch("/api/groups");
      if (gRes.ok) {
        const data = await gRes.json();
        const list: PartyGroup[] = (data.groups ?? []).map((g: GroupRow) => ({ id: g.id, name: g.name }));
        setGroups(list);
        if (list.length > 0) setSelectedGroupId(list[0].id);
      }
    }
    init();
  }, [router]);

  // Fetch live scores
  const fetchScores = useCallback(async () => {
    try {
      const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
      const res = await fetch(`/api/espn/scores?dates=${today}`);
      if (res.ok) {
        const data = await res.json();
        setGames(data.games ?? []);
      }
    } catch { /* ignore */ }
    setLastRefresh(new Date());
  }, []);

  // Fetch leaderboard for selected group
  const fetchLeaderboard = useCallback(async () => {
    if (!selectedGroupId) return;
    try {
      const res = await fetch(`/api/groups/${selectedGroupId}/leaderboard`);
      if (res.ok) {
        const data = await res.json();
        setEntries(data.leaderboard ?? []);
      }
    } catch { /* ignore */ }
  }, [selectedGroupId]);

  // Auto-refresh loop
  useEffect(() => {
    if (!authed) return;
    fetchScores();
    fetchLeaderboard();
    const interval = setInterval(() => {
      fetchScores();
      fetchLeaderboard();
    }, REFRESH_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [authed, fetchScores, fetchLeaderboard]);

  // Fullscreen toggle
  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  }, []);

  useEffect(() => {
    function onFsChange() { setIsFullscreen(!!document.fullscreenElement); }
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  if (!authed) return null;

  return (
    <div ref={containerRef} className="min-h-screen bg-gray-950 text-white p-4 md:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl md:text-5xl font-black">🏀 Watch Party</h1>
        <div className="flex items-center gap-3">
          <span className="text-gray-400 text-sm">
            Updated {lastRefresh.toLocaleTimeString()}
          </span>
          <button
            onClick={toggleFullscreen}
            className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition"
          >
            {isFullscreen ? "⬜ Exit" : "⛶ Fullscreen"}
          </button>
          <button
            onClick={() => router.push("/dashboard")}
            className="px-3 py-1.5 bg-gray-800 rounded-lg text-sm hover:bg-gray-700 transition"
          >
            ← Back
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Live Scores — takes 2 columns on large screens */}
        <div className="lg:col-span-2">
          <h2 className="text-xl md:text-2xl font-bold mb-4 text-yellow-400">🔴 Live Scores</h2>
          {games.length === 0 ? (
            <p className="text-gray-500 text-lg">No games today.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {games.map((g, i) => (
                <div key={i} className="bg-gray-900 rounded-xl p-4 border border-gray-800">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TeamLogo team={g.winner} size={28} />
                      <span className="text-lg md:text-xl font-bold text-green-400">{g.winner}</span>
                    </div>
                    <span className="text-2xl md:text-3xl font-black text-green-400">{g.winnerScore}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <TeamLogo team={g.loser} size={28} />
                      <span className="text-lg md:text-xl font-medium text-gray-400">{g.loser}</span>
                    </div>
                    <span className="text-2xl md:text-3xl font-bold text-gray-500">{g.loserScore}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Group Standings — right column */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <h2 className="text-xl md:text-2xl font-bold text-blue-400">🏆 Standings</h2>
            {groups.length > 1 && (
              <select
                value={selectedGroupId ?? ""}
                onChange={(e) => setSelectedGroupId(Number(e.target.value))}
                className="bg-gray-800 border border-gray-700 rounded-lg px-2 py-1 text-sm"
              >
                {groups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            )}
          </div>

          {groups.length === 0 ? (
            <p className="text-gray-500">No groups joined yet.</p>
          ) : entries.length === 0 ? (
            <p className="text-gray-500">No brackets in this group.</p>
          ) : (
            <div className="space-y-2">
              {entries.slice(0, 20).map((e) => (
                <div
                  key={e.bracketId}
                  className={`flex items-center justify-between bg-gray-900 rounded-lg px-4 py-3 border ${
                    e.rank === 1 ? "border-yellow-500" : "border-gray-800"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className={`text-lg font-black w-8 text-center ${
                      e.rank === 1 ? "text-yellow-400" : e.rank === 2 ? "text-gray-300" : e.rank === 3 ? "text-orange-400" : "text-gray-500"
                    }`}>
                      {e.rank === 1 ? "🥇" : e.rank === 2 ? "🥈" : e.rank === 3 ? "🥉" : `#${e.rank}`}
                    </span>
                    <div>
                      <div className="font-semibold text-sm">{e.bracketName}</div>
                      <div className="text-xs text-gray-500">{e.username}</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black">{e.total}</div>
                    {e.championPick && (
                      <div className="flex items-center gap-1 justify-end">
                        <TeamLogo team={e.championPick} size={14} />
                        <span className={`text-xs ${e.busted ? "text-red-400 line-through" : "text-gray-400"}`}>
                          {e.championPick}
                        </span>
                        {e.busted && <span className="text-xs">💀</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
