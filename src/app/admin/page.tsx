"use client";

import { useEffect, useState, useCallback } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useRouter } from "next/navigation";
import type { Tournament } from "@/types/tournament";
import TournamentForm from "@/components/admin/TournamentForm";
import TournamentList from "@/components/admin/TournamentList";
import AdminUserManagement from "@/components/admin/AdminUserManagement";
import AdminBroadcast from "@/components/admin/AdminBroadcast";
import AdminAddUserToGroup from "@/components/admin/AdminAddUserToGroup";

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
    return <LoadingSkeleton />;
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
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
          <h2 className="font-semibold text-lg mb-4">Create Tournament</h2>
          <TournamentForm onCreated={handleCreated} />
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h2 className="font-semibold text-lg mb-4">Tournaments ({tournaments.length})</h2>
        <TournamentList tournaments={tournaments} onRefresh={loadFullTournaments} />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
        <h2 className="font-semibold text-lg mb-4">👥 User Management</h2>
        <AdminUserManagement />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
        <h2 className="font-semibold text-lg mb-4">💾 Database Backup</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Download a full backup of the SQLite database (users, brackets, groups, scores).</p>
        <a
          href="/api/admin/backup"
          className="inline-block px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition"
          download
        >
          💾 Download Backup
        </a>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
        <h2 className="font-semibold text-lg mb-4">📢 Broadcast Notification</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Send a notification to all registered users. Appears in their notification bell.</p>
        <AdminBroadcast />
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mt-6">
        <h2 className="font-semibold text-lg mb-4">👥 Add User to Group</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">Search for a user, select a group, and optionally assign their brackets.</p>
        <AdminAddUserToGroup />
      </div>
    </main>
  );
}
