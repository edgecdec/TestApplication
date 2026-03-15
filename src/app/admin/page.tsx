"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { Tournament } from "@/types/tournament";
import TournamentForm from "@/components/admin/TournamentForm";
import TournamentList from "@/components/admin/TournamentList";

export default function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const router = useRouter();

  const loadTournaments = useCallback(async () => {
    const res = await fetch("/api/tournaments");
    if (res.ok) {
      const data = await res.json();
      setTournaments(data.tournaments ?? []);
    }
  }, []);

  const loadFullTournaments = useCallback(async () => {
    const listRes = await fetch("/api/tournaments");
    if (!listRes.ok) return;
    const listData = await listRes.json();
    const ids: number[] = (listData.tournaments ?? []).map((t: Tournament) => t.id);
    const full = await Promise.all(
      ids.map(async (id) => {
        const r = await fetch(`/api/tournaments/${id}`);
        if (r.ok) {
          const d = await r.json();
          return d.tournament as Tournament;
        }
        return null;
      })
    );
    setTournaments(full.filter((t): t is Tournament => t !== null));
  }, []);

  useEffect(() => {
    async function init() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      const meData = await meRes.json();
      if (!meData.user?.isAdmin) { router.push("/dashboard"); return; }
      setIsAdmin(true);
      await loadFullTournaments();
      setLoading(false);
    }
    init();
  }, [router, loadFullTournaments]);

  function handleCreated(_id: number) {
    setShowCreate(false);
    loadFullTournaments();
  }

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading...</p></main>;
  }
  if (!isAdmin) return null;

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold">⚙️ Admin Panel</h1>
          <p className="text-gray-500 text-sm">Manage tournaments, bracket data, and ESPN sync</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowCreate(!showCreate)}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition"
          >
            + New Tournament
          </button>
        </div>
      </div>

      {showCreate && (
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">Create Tournament</h2>
          <TournamentForm onCreated={handleCreated} />
        </div>
      )}

      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="font-semibold text-lg mb-4">Tournaments ({tournaments.length})</h2>
        <TournamentList tournaments={tournaments} onRefresh={loadFullTournaments} />
      </div>
    </main>
  );
}
