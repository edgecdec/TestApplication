"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { GroupRow, ScoringSettings } from "@/types/group";
import { DEFAULT_SCORING, ROUND_NAMES, EVERYONE_GROUP_NAME } from "@/lib/bracket-constants";

const MAX_BRACKETS_OPTIONS = [1, 2, 3, 5, 10] as const;

export default function GroupsPage() {
  const [groups, setGroups] = useState<GroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [maxBrackets, setMaxBrackets] = useState(1);
  const [scoring, setScoring] = useState<ScoringSettings>({ ...DEFAULT_SCORING });
  const [creating, setCreating] = useState(false);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      const res = await fetch("/api/groups");
      if (res.ok) {
        const data = await res.json();
        setGroups(data.groups ?? []);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || creating) return;
    setCreating(true);
    const res = await fetch("/api/groups", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), max_brackets: maxBrackets, scoring_settings: scoring, description: description.trim() }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/groups/${data.id}`);
    }
    setCreating(false);
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading...</p></main>;

  return (
    <main className="min-h-screen p-8 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">🏀 My Groups</h1>
        <div className="flex gap-2">
          <button onClick={() => setShowCreate(!showCreate)} className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            + Create Group
          </button>
        </div>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-white rounded-lg shadow p-6 mb-6 space-y-4">
          <h2 className="font-semibold text-lg">Create New Group</h2>
          <div>
            <label className="block text-sm font-medium mb-1">Group Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} className="w-full border rounded px-3 py-2" required />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400 font-normal">(optional — pool rules, entry fee, payout, etc.)</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full border rounded px-3 py-2 text-sm" placeholder="e.g. $20 buy-in, winner takes 70%, runner-up 30%. No changing picks after Thursday." />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Max Brackets Per User</label>
            <select value={maxBrackets} onChange={(e) => setMaxBrackets(Number(e.target.value))} className="border rounded px-3 py-2">
              {MAX_BRACKETS_OPTIONS.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Points Per Round</label>
            <div className="grid grid-cols-6 gap-2">
              {ROUND_NAMES.map((rn, i) => (
                <div key={rn}>
                  <label className="text-xs text-gray-500">{rn}</label>
                  <input type="number" min={0} value={scoring.pointsPerRound[i]} onChange={(e) => {
                    const next = [...scoring.pointsPerRound];
                    next[i] = Number(e.target.value);
                    setScoring({ ...scoring, pointsPerRound: next });
                  }} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Upset Bonus Per Round</label>
            <div className="grid grid-cols-6 gap-2">
              {ROUND_NAMES.map((rn, i) => (
                <div key={rn}>
                  <label className="text-xs text-gray-500">{rn}</label>
                  <input type="number" min={0} value={scoring.upsetBonusPerRound[i]} onChange={(e) => {
                    const next = [...scoring.upsetBonusPerRound];
                    next[i] = Number(e.target.value);
                    setScoring({ ...scoring, upsetBonusPerRound: next });
                  }} className="w-full border rounded px-2 py-1 text-sm" />
                </div>
              ))}
            </div>
          </div>
          <button type="submit" disabled={creating} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50">
            {creating ? "Creating..." : "Create Group"}
          </button>
        </form>
      )}

      {groups.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-6 text-gray-500">No groups yet. Create one or join via invite link!</div>
      ) : (
        <div className="space-y-3">
          {groups.map((g) => (
            <button key={g.id} onClick={() => router.push(`/groups/${g.id}`)} className="w-full text-left bg-white rounded-lg shadow p-4 hover:bg-gray-50 transition flex justify-between items-center">
              <div>
                <span className="font-semibold">{g.name}</span>
                {g.name === EVERYONE_GROUP_NAME && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Global</span>}
                <p className="text-sm text-gray-500">Created by {g.creator_name} · {g.member_count} member{g.member_count !== 1 ? "s" : ""}</p>
              </div>
              <span className="text-gray-400">→</span>
            </button>
          ))}
        </div>
      )}
    </main>
  );
}
