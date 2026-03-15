"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Tournament, Bracket } from "@/types/tournament";
import LiveScores from "@/components/LiveScores";
import EspnSyncButton from "@/components/EspnSyncButton";

interface UserInfo {
  id: number;
  username: string;
  isAdmin: boolean;
}

export default function DashboardPage() {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
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
      if (tRes.ok) {
        const tData = await tRes.json();
        setTournaments(tData.tournaments ?? []);
      }
      if (bRes.ok) {
        const bData = await bRes.json();
        setBrackets(bData.brackets ?? []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

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
        <div className="flex gap-2">
          {user.isAdmin && (
            <button onClick={() => router.push("/admin")} className="px-4 py-2 text-sm bg-yellow-100 text-yellow-800 rounded-lg hover:bg-yellow-200 transition">
              ⚙️ Admin
            </button>
          )}
          <button onClick={() => router.push("/groups")} className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition">
            My Groups
          </button>
          <button onClick={handleLogout} className="px-4 py-2 text-sm bg-gray-200 rounded-lg hover:bg-gray-300 transition">
            Log Out
          </button>
        </div>
      </div>

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
          return (
            <div key={t.id} className="bg-white rounded-lg shadow p-6 mb-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold">{t.name} ({t.year})</h2>
                <div className="flex items-center gap-2">
                  {user.isAdmin && <EspnSyncButton tournamentId={t.id} />}
                  <button
                    onClick={() => createBracket(t.id)}
                    className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  >
                    + New Bracket
                  </button>
                </div>
              </div>
              {myBrackets.length === 0 ? (
                <p className="text-gray-400 text-sm">No brackets yet. Create one to start picking!</p>
              ) : (
                <ul className="space-y-2">
                  {myBrackets.map((b) => (
                    <li key={b.id}>
                      <button
                        onClick={() => router.push(`/bracket/${b.id}`)}
                        className="w-full text-left px-4 py-2 rounded border hover:bg-gray-50 transition flex justify-between items-center"
                      >
                        <span className="font-medium">{b.name}</span>
                        <span className="text-xs text-gray-400">
                          Updated {new Date(b.updated_at).toLocaleDateString()}
                        </span>
                      </button>
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
