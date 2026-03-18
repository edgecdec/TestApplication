"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Tournament, Bracket } from "@/types/tournament";
import LiveScores from "@/components/LiveScores";
import EspnSyncButton from "@/components/EspnSyncButton";
import BracketProgress from "@/components/BracketProgress";
import BracketMiniSummary from "@/components/BracketMiniSummary";
import LockCountdown from "@/components/LockCountdown";
import PickReminderBanner from "@/components/PickReminderBanner";
import ResultsBanner from "@/components/ResultsBanner";
import TournamentProgress from "@/components/TournamentProgress";
import BracketHealth from "@/components/BracketHealth";
import BracketGrade from "@/components/BracketGrade";
import RecentResults from "@/components/RecentResults";
import StreakBadge from "@/components/StreakBadge";
import MyGroupsSummary from "@/components/MyGroupsSummary";
import BracketAchievements from "@/components/BracketAchievements";
import MyPicksTonight from "@/components/MyPicksTonight";
import AddToCalendarButton from "@/components/AddToCalendarButton";
import GamesThatMatter from "@/components/GamesThatMatter";
import OnboardingChecklist from "@/components/OnboardingChecklist";
import SpoilerGuard from "@/components/SpoilerGuard";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import type { RegionData } from "@/types/tournament";
import type { Picks } from "@/types/bracket";
import type { BracketGradeInfo } from "@/lib/grading";
import type { Achievement } from "@/lib/achievements";
import { parseBracketData } from "@/lib/bracket-utils";
import { computeStreak, getCurrentRound } from "@/lib/scoring";
import { useAutoSync } from "@/hooks/useAutoSync";
import { useSpoilerFree } from "@/contexts/SpoilerContext";

function safeParsePicks(raw: string | Record<string, string> | null | undefined): Picks {
  if (!raw) return {};
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return {}; } }
  return raw;
}

interface UserInfo {
  id: number;
  username: string;
  isAdmin: boolean;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [grades, setGrades] = useState<Record<number, BracketGradeInfo & { percentile: number }>>({});
  const [achievements, setAchievements] = useState<Record<number, Achievement[]>>({});
  const [loading, setLoading] = useState(true);
  const [renamingId, setRenamingId] = useState<number | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [hasGroups, setHasGroups] = useState(false);
  const router = useRouter();
  useAutoSync();
  const { spoilerFree } = useSpoilerFree();

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      const meData = await meRes.json();
      if (meData?.user) setUser(meData.user);

      const [tRes, bRes, gSumRes] = await Promise.all([
        fetch("/api/tournaments"),
        fetch("/api/brackets"),
        fetch("/api/groups/my-summary"),
      ]);
      let loadedTournaments: Tournament[] = [];
      if (tRes.ok) {
        const tData = await tRes.json();
        loadedTournaments = tData.tournaments ?? [];
        setTournaments(loadedTournaments);
      }
      if (bRes.ok) {
        const bData = await bRes.json();
        setBrackets(bData.brackets ?? []);
      }
      if (gSumRes.ok) {
        const gData = await gSumRes.json();
        setHasGroups((gData.summaries ?? []).length > 0);
      }

      // Fetch grades for each tournament
      const allGrades: Record<number, BracketGradeInfo & { percentile: number }> = {};
      const allAchievements: Record<number, Achievement[]> = {};
      await Promise.all(loadedTournaments.map(async (t) => {
        try {
          const [gRes, aRes] = await Promise.all([
            fetch(`/api/brackets/grades?tournament_id=${t.id}`),
            fetch(`/api/brackets/achievements?tournament_id=${t.id}`),
          ]);
          if (gRes.ok) {
            const gData = await gRes.json();
            Object.assign(allGrades, gData.grades ?? {});
          }
          if (aRes.ok) {
            const aData = await aRes.json();
            Object.assign(allAchievements, aData.achievements ?? {});
          }
        } catch { /* ignore */ }
      }));
      setGrades(allGrades);
      setAchievements(allAchievements);

      setLoading(false);
    }
    load();
  }, [router]);

  async function createBracket(tournamentId: number) {
    const name = prompt("Bracket name:");
    if (!name) return;
    const res = await fetch("/api/brackets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournament_id: tournamentId, name }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/bracket/${id}`);
    }
  }

  async function duplicateBracket(bracketId: number) {
    const res = await fetch(`/api/brackets/${bracketId}/duplicate`, { method: "POST" });
    if (res.ok) {
      const { id, name } = await res.json();
      const original = brackets.find((b) => b.id === bracketId);
      if (original) {
        setBrackets((prev) => [...prev, { ...original, id, name, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }]);
      }
    } else {
      const err = await res.json();
      alert(err.error || "Failed to duplicate");
    }
  }

  async function deleteBracket(bracketId: number) {
    if (!confirm("Delete this bracket? This cannot be undone.")) return;
    const res = await fetch(`/api/brackets/${bracketId}`, { method: "DELETE" });
    if (res.ok) {
      setBrackets((prev) => prev.filter((b) => b.id !== bracketId));
    }
  }

  async function renameBracket(bracketId: number) {
    const trimmed = renameValue.trim();
    if (!trimmed) return;
    const res = await fetch(`/api/brackets/${bracketId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: trimmed }),
    });
    if (res.ok) {
      setBrackets((prev) => prev.map((b) => b.id === bracketId ? { ...b, name: trimmed } : b));
      setRenamingId(null);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to rename");
    }
  }

  async function createSecondChance(tournamentId: number) {
    const name = prompt("Second Chance bracket name:", "Second Chance");
    if (!name) return;
    const res = await fetch("/api/brackets/second-chance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tournament_id: tournamentId, name }),
    });
    if (res.ok) {
      const { id } = await res.json();
      router.push(`/bracket/${id}`);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to create second chance bracket");
    }
  }

  if (loading) {
    return <LoadingSkeleton />;
  }
  if (!user) return null;

  return (
    <main className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold dark:text-white">🏀 Dashboard</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Welcome, {user.username}
            {user.isAdmin && (
              <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">Admin</span>
            )}
          </p>
        </div>
      </div>

      {/* Full-width banners */}
      <ResultsBanner />
      <PickReminderBanner brackets={brackets} tournaments={tournaments} />
      <OnboardingChecklist brackets={brackets} hasGroups={hasGroups} hasTournaments={tournaments.length > 0} />

      {/* Two-column grid: on mobile, right column (scores) stacks on top */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* RIGHT column — time-sensitive content (appears first on mobile via order) */}
        <div className="order-1 lg:order-2 lg:col-span-2 space-y-4">
          <SpoilerGuard label="🙈 Scores & results hidden — spoiler-free mode is on">
          {/* Tournament Progress */}
          {tournaments.map((t) => {
            const results = JSON.parse(t.results_data || "{}");
            return Object.keys(results).length > 0 ? (
              <TournamentProgress key={`prog-${t.id}`} results={results} />
            ) : null;
          })}

          {/* Live Scores */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
            <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">📺 Live Scores</h2>
            <LiveScores />
          </div>

          {/* My Picks Tonight */}
          {tournaments.map((t) => {
            const results = safeParsePicks(t.results_data);
            const regions = parseBracketData(t.bracket_data);
            const myBrackets = brackets.filter((b) => b.tournament_id === t.id);
            if (regions.length === 0 || myBrackets.length === 0) return null;
            return (
              <MyPicksTonight
                key={`picks-tonight-${t.id}`}
                regions={regions}
                results={results}
                brackets={myBrackets.map((b) => ({ name: b.name, picks: safeParsePicks(b.picks) }))}
              />
            );
          })}

          {/* Games That Matter */}
          <GamesThatMatter />

          {/* Recent Results */}
          {tournaments.map((t) => (
            <RecentResults key={`recent-${t.id}`} tournamentId={t.id} />
          ))}
          </SpoilerGuard>
        </div>

        {/* LEFT column — groups + brackets */}
        <div className="order-2 lg:order-1 lg:col-span-3 space-y-4">
          {/* My Groups Summary */}
          <SpoilerGuard label="🙈 Group standings hidden — spoiler-free mode is on">
            <MyGroupsSummary />
          </SpoilerGuard>

          {/* Tournaments & Brackets */}
          {tournaments.length === 0 ? (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <p className="text-gray-500 dark:text-gray-400">No tournaments yet. {user.isAdmin ? "Create one from the admin panel." : "Ask an admin to create a tournament."}</p>
            </div>
          ) : (
            tournaments.map((t) => {
              const myBrackets = brackets.filter((b) => b.tournament_id === t.id);
              const isLocked = new Date(t.lock_time) <= new Date();
              const results = safeParsePicks(t.results_data);
              const tournamentRound = getCurrentRound(results);
              const canSecondChance = tournamentRound >= 1;
              return (
                <div key={t.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <h2 className="text-lg font-semibold dark:text-white">{t.name} ({t.year})</h2>
                    <LockCountdown lockTime={t.lock_time} />
                    <AddToCalendarButton lockTime={t.lock_time} />
                    <div className="flex items-center gap-2">
                      {user.isAdmin && <EspnSyncButton tournamentId={t.id} />}
                      {!isLocked && (
                        <button
                          onClick={() => createBracket(t.id)}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                        >
                          + New Bracket
                        </button>
                      )}
                      {canSecondChance && (
                        <button
                          onClick={() => createSecondChance(t.id)}
                          className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition"
                        >
                          🔄 2nd Chance
                        </button>
                      )}
                    </div>
                  </div>
                  {myBrackets.length === 0 ? (
                    <p className="text-gray-400 text-sm">No brackets yet. Create one to start picking!</p>
                  ) : (
                    <ul className="space-y-2">
                      {myBrackets.map((b) => (
                        <li key={b.id} className="flex items-center gap-2">
                          <button
                            onClick={() => router.push(`/bracket/${b.id}`)}
                            className="flex-1 text-left px-4 py-3 rounded border dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
                          >
                            <div className="flex justify-between items-center mb-1 flex-wrap gap-1">
                              <span className="font-medium flex items-center gap-2 flex-wrap dark:text-white">
                                {renamingId === b.id ? (
                                  <span className="inline-flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                                    <input
                                      autoFocus
                                      value={renameValue}
                                      onChange={(e) => setRenameValue(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === "Enter") renameBracket(b.id); if (e.key === "Escape") setRenamingId(null); }}
                                      className="border rounded px-2 py-0.5 text-sm w-40 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <button onClick={(e) => { e.stopPropagation(); renameBracket(b.id); }} className="text-green-600 text-xs font-bold">✓</button>
                                    <button onClick={(e) => { e.stopPropagation(); setRenamingId(null); }} className="text-gray-400 text-xs">✕</button>
                                  </span>
                                ) : b.name}
                                {b.is_second_chance === 1 && (
                                  <span className="text-[10px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1.5 py-0.5 rounded">🔄 2nd Chance</span>
                                )}
                                {!spoilerFree && grades[b.id] && <BracketGrade grade={grades[b.id]} />}
                                {!spoilerFree && <StreakBadge streak={computeStreak(safeParsePicks(b.picks), safeParsePicks(t.results_data))} />}
                              </span>
                              <span className="text-xs text-gray-400">
                                Updated {new Date(b.updated_at).toLocaleDateString()}
                              </span>
                            </div>
                            <BracketProgress picks={b.picks} />
                            <BracketMiniSummary picks={b.picks} />
                            {!spoilerFree && (
                              <>
                                <BracketHealth
                                  picks={safeParsePicks(b.picks)}
                                  results={safeParsePicks(t.results_data)}
                                  regions={parseBracketData(t.bracket_data)}
                                />
                                <BracketAchievements achievements={achievements[b.id] ?? []} />
                              </>
                            )}
                          </button>
                          {!isLocked && (
                            <div className="flex flex-col gap-1">
                              <button
                                onClick={() => { setRenamingId(b.id); setRenameValue(b.name); }}
                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                title="Rename bracket"
                              >
                                ✏️ Rename
                              </button>
                              <button
                                onClick={() => duplicateBracket(b.id)}
                                className="px-2 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 transition"
                                title="Duplicate bracket"
                              >
                                📋 Duplicate
                              </button>
                              <button
                                onClick={() => deleteBracket(b.id)}
                                className="px-2 py-1 text-xs bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded hover:bg-red-100 dark:hover:bg-red-900/50 transition"
                                title="Delete bracket"
                              >
                                🗑️ Delete
                              </button>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </main>
  );
}
