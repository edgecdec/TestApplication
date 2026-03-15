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
import type { RegionData } from "@/types/tournament";
import type { Picks } from "@/types/bracket";
import type { BracketGradeInfo } from "@/lib/grading";
import { parseBracketData } from "@/lib/bracket-utils";

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
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      const meData = await meRes.json();
      if (meData?.user) setUser(meData.user);

      const [tRes, bRes] = await Promise.all([
        fetch("/api/tournaments"),
        fetch("/api/brackets"),
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

      // Fetch grades for each tournament
      const allGrades: Record<number, BracketGradeInfo & { percentile: number }> = {};
      await Promise.all(loadedTournaments.map(async (t) => {
        try {
          const gRes = await fetch(`/api/brackets/grades?tournament_id=${t.id}`);
          if (gRes.ok) {
            const gData = await gRes.json();
            Object.assign(allGrades, gData.grades ?? {});
          }
        } catch { /* ignore */ }
      }));
      setGrades(allGrades);

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

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading...</p></main>;
  }
  if (!user) return null;

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">🏀 Dashboard</h1>
          <p className="text-gray-600">
            Welcome, {user.username}
            {user.isAdmin && (
              <span className="ml-2 text-xs bg-yellow-200 text-yellow-800 px-2 py-0.5 rounded">Admin</span>
            )}
          </p>
        </div>
      </div>

      {/* Results Updated Banner */}
      <ResultsBanner />

      {/* Pick Reminder Banner */}
      <PickReminderBanner brackets={brackets} tournaments={tournaments} />

      {/* Tournament Progress */}
      {tournaments.map((t) => {
        const results = JSON.parse(t.results_data || "{}");
        return Object.keys(results).length > 0 ? (
          <TournamentProgress key={`prog-${t.id}`} results={results} />
        ) : null;
      })}

      {/* Live Scores */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-2">📺 Live Scores</h2>
        <LiveScores />
      </div>

      {/* Tournaments */}
      {tournaments.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500">No tournaments yet. {user.isAdmin ? "Create one from the admin panel." : "Ask an admin to create a tournament."}</p>
        </div>
      ) : (
        tournaments.map((t) => {
          const myBrackets = brackets.filter((b) => b.tournament_id === t.id);
          const isLocked = new Date(t.lock_time) <= new Date();
          return (
            <div key={t.id} className="bg-white rounded-lg shadow p-6 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">{t.name} ({t.year})</h2>
                <LockCountdown lockTime={t.lock_time} />
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
                        className="flex-1 text-left px-4 py-3 rounded border hover:bg-gray-50 transition"
                      >
                        <div className="flex justify-between items-center mb-1">
                          <span className="font-medium flex items-center gap-2">
                            {b.name}
                            {grades[b.id] && <BracketGrade grade={grades[b.id]} />}
                          </span>
                          <span className="text-xs text-gray-400">
                            Updated {new Date(b.updated_at).toLocaleDateString()}
                          </span>
                        </div>
                        <BracketProgress picks={b.picks} />
                        <BracketMiniSummary picks={b.picks} />
                        <BracketHealth
                          picks={safeParsePicks(b.picks)}
                          results={safeParsePicks(t.results_data)}
                          regions={parseBracketData(t.bracket_data)}
                        />
                      </button>
                      {!isLocked && (
                        <div className="flex flex-col gap-1">
                          <button
                            onClick={() => duplicateBracket(b.id)}
                            className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded hover:bg-gray-200 transition"
                            title="Duplicate bracket"
                          >
                            📋 Duplicate
                          </button>
                          <button
                            onClick={() => deleteBracket(b.id)}
                            className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100 transition"
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
    </main>
  );
}
