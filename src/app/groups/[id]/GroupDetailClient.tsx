"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import type { Group, ScoringSettings, PayoutStructure } from "@/types/group";
import type { BracketRow } from "@/types/tournament";
import type { LeaderboardEntry } from "@/types/scoring";
import { ROUND_NAMES, EVERYONE_GROUP_NAME } from "@/lib/bracket-constants";
import GroupLeaderboard from "@/components/GroupLeaderboard";
import BracketProgress from "@/components/BracketProgress";
import GroupChat from "@/components/GroupChat";
import GroupActivityFeed from "@/components/GroupActivityFeed";
import StandingsChart from "@/components/StandingsChart";
import BracketSimilarityMatrix from "@/components/BracketSimilarityMatrix";
import InviteQRCode from "@/components/InviteQRCode";
import PoolPayoutSettings from "@/components/PoolPayoutSettings";
import PoolPayoutDisplay from "@/components/PoolPayoutDisplay";
import PaymentTracker from "@/components/PaymentTracker";
import ScoringPresetPicker from "@/components/ScoringPresetPicker";
import { parsePayoutStructure } from "@/lib/payouts";
import type { StandingsHistoryData } from "@/types/standings-history";

interface GroupDetail extends Group {
  member_count: number;
  creator_name: string;
}

interface UserInfo {
  id: number;
  username: string;
  isAdmin: boolean;
}

interface BracketWithUser extends BracketRow {
  username: string;
}

type Tab = "leaderboard" | "brackets" | "standings" | "similarity" | "activity" | "chat" | "settings";

export default function GroupDetailClient() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [user, setUser] = useState<UserInfo | null>(null);
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [brackets, setBrackets] = useState<BracketWithUser[]>([]);
  const [myBrackets, setMyBrackets] = useState<BracketRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("leaderboard");
  const [scoring, setScoring] = useState<ScoringSettings | null>(null);
  const [maxBrackets, setMaxBrackets] = useState(1);
  const [description, setDescription] = useState("");
  const [buyIn, setBuyIn] = useState(0);
  const [payout, setPayout] = useState<PayoutStructure>({ places: [100] });
  const [saving, setSaving] = useState(false);
  const [addingBracketId, setAddingBracketId] = useState<number | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [actualTotal, setActualTotal] = useState<number | null>(null);
  const [standingsData, setStandingsData] = useState<StandingsHistoryData | null>(null);

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      const meData = await meRes.json();
      setUser(meData.user);

      const [gRes, bRes, myRes, lbRes] = await Promise.all([
        fetch(`/api/groups/${id}`),
        fetch(`/api/groups/${id}/brackets`),
        fetch("/api/brackets"),
        fetch(`/api/groups/${id}/leaderboard`),
      ]);

      if (gRes.ok) {
        const gData = await gRes.json();
        const g = gData.group as GroupDetail;
        setGroup(g);
        const parsed: ScoringSettings = typeof g.scoring_settings === "string" ? JSON.parse(g.scoring_settings) : g.scoring_settings;
        setScoring(parsed);
        setMaxBrackets(g.max_brackets);
        setDescription(g.description || "");
        setBuyIn(g.buy_in || 0);
        setPayout(parsePayoutStructure(g.payout_structure));
      }
      if (bRes.ok) {
        const bData = await bRes.json();
        setBrackets(bData.brackets ?? []);
      }
      if (myRes.ok) {
        const myData = await myRes.json();
        setMyBrackets(myData.brackets ?? []);
      }
      if (lbRes.ok) {
        const lbData = await lbRes.json();
        setLeaderboard(lbData.leaderboard ?? []);
        setActualTotal(lbData.actualTotal ?? null);
      }

      // Fetch standings history
      try {
        const shRes = await fetch(`/api/groups/${id}/standings-history`);
        if (shRes.ok) setStandingsData(await shRes.json());
      } catch { /* ignore */ }

      setLoading(false);
    }
    load();
  }, [id, router]);

  const canEdit = group && user && (group.created_by === user.id || user.isAdmin);
  const isEveryone = group?.name === EVERYONE_GROUP_NAME;
  const inviteUrl = group ? `${typeof window !== "undefined" ? window.location.origin : ""}/join/${group.invite_code}` : "";

  async function handleAddBracket(bracketId: number) {
    setAddingBracketId(bracketId);
    const res = await fetch(`/api/groups/${id}/brackets`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bracket_id: bracketId }),
    });
    if (res.ok) {
      const bRes = await fetch(`/api/groups/${id}/brackets`);
      if (bRes.ok) setBrackets((await bRes.json()).brackets ?? []);
    } else {
      const err = await res.json();
      alert(err.error || "Failed to add bracket");
    }
    setAddingBracketId(null);
  }

  async function handleRemoveBracket(bracketId: number) {
    if (!confirm("Remove this bracket from the group?")) return;
    const res = await fetch(`/api/groups/${id}/brackets`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bracket_id: bracketId }),
    });
    if (res.ok) {
      setBrackets((prev) => prev.filter((b) => b.id !== bracketId));
    }
  }

  async function handleSaveSettings() {
    if (!scoring) return;
    setSaving(true);
    await fetch(`/api/groups/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scoring_settings: scoring, max_brackets: maxBrackets, description, buy_in: buyIn, payout_structure: payout }),
    });
    setSaving(false);
  }

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading...</p></main>;
  if (!group || !user) return <main className="p-8"><p>Group not found.</p></main>;

  const bracketIdsInGroup = new Set(brackets.map((b) => b.id));
  const addableBrackets = myBrackets.filter((b) => !bracketIdsInGroup.has(b.id));

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <button onClick={() => router.push("/groups")} className="text-sm text-blue-600 hover:underline mb-4 inline-block">← All Groups</button>
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold">{group.name}</h1>
        {isEveryone && <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">Global</span>}
      </div>
      <p className="text-sm text-gray-500 mb-4">Created by {group.creator_name} · {group.member_count} member{group.member_count !== 1 ? "s" : ""}</p>

      {group.description && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3 mb-4 text-sm text-blue-800 dark:text-blue-200 whitespace-pre-wrap">
          📋 {group.description}
        </div>
      )}

      <div className="mb-4 flex gap-2 flex-wrap">
        <button onClick={() => router.push(`/simulator/${id}`)} className="px-4 py-2 text-sm bg-purple-100 text-purple-700 rounded-lg hover:bg-purple-200 transition">
          🔮 What-If Simulator
        </button>
        <button onClick={() => router.push(`/groups/${id}/compare`)} className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition">
          📊 Compare Brackets
        </button>
        <button onClick={() => router.push(`/groups/${id}/whopicked`)} className="px-4 py-2 text-sm bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition">
          🔍 Who Picked Whom
        </button>
        <button onClick={() => router.push(`/groups/${id}/recap`)} className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition">
          📋 Round Recap
        </button>
      </div>

      {!isEveryone && (
        <div className="bg-gray-100 rounded-lg p-3 mb-6 flex items-center gap-2">
          <span className="text-sm font-medium">Invite Link:</span>
          <code className="text-sm bg-white px-2 py-1 rounded border flex-1 truncate">{inviteUrl}</code>
          <button onClick={() => navigator.clipboard.writeText(inviteUrl)} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition">
            Copy
          </button>
          <InviteQRCode url={inviteUrl} groupName={group.name} />
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 border-b overflow-x-auto">
        {(["leaderboard", "brackets", "standings", "similarity", "activity", "chat", "settings"] as const).map((t) => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-sm font-medium border-b-2 transition whitespace-nowrap ${tab === t ? "border-blue-600 text-blue-600" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            {t === "leaderboard" ? "Leaderboard" : t === "brackets" ? "Brackets" : t === "standings" ? "📈 Standings" : t === "similarity" ? "🔀 Similarity" : t === "activity" ? "📰 Activity" : t === "chat" ? "💬 Chat" : "Settings"}
          </button>
        ))}
      </div>

      {tab === "leaderboard" && (
        <>
          {group.buy_in > 0 && (
            <>
              <PoolPayoutDisplay buyIn={buyIn} payoutStructure={JSON.stringify(payout)} memberCount={group.member_count} />
              {(() => {
                const paidCount = leaderboard.filter(e => e.paid).length;
                const totalCount = leaderboard.length;
                return (
                  <div className="text-xs text-gray-500 mb-3">
                    💰 {paidCount}/{totalCount} paid (${paidCount * buyIn} of ${totalCount * buyIn} collected)
                  </div>
                );
              })()}
            </>
          )}
          <GroupLeaderboard entries={leaderboard} actualTotal={actualTotal} groupId={id} groupName={group?.name} />
        </>
      )}

      {tab === "brackets" && (
        <div>
          {/* Add bracket */}
          {addableBrackets.length > 0 && (
            <div className="bg-white rounded-lg shadow p-4 mb-4">
              <h3 className="text-sm font-medium mb-2">Add Your Bracket</h3>
              <div className="space-y-2">
                {addableBrackets.map((b) => (
                  <div key={b.id} className="flex items-center justify-between">
                    <span className="text-sm">{b.name}</span>
                    <button onClick={() => handleAddBracket(b.id)} disabled={addingBracketId === b.id} className="px-3 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700 transition disabled:opacity-50">
                      {addingBracketId === b.id ? "Adding..." : "Add"}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Group brackets / leaderboard */}
          {brackets.length === 0 ? (
            <div className="bg-white rounded-lg shadow p-6 text-gray-500">No brackets in this group yet.</div>
          ) : (
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">#</th>
                    <th className="text-left px-4 py-2 font-medium">Bracket</th>
                    <th className="text-left px-4 py-2 font-medium">User</th>
                    <th className="text-left px-4 py-2 font-medium min-w-[140px]">Progress</th>
                    {canEdit && <th className="px-4 py-2"></th>}
                  </tr>
                </thead>
                <tbody>
                  {brackets.map((b, i) => (
                    <tr key={b.id} className="border-t hover:bg-gray-50">
                      <td className="px-4 py-2 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2">
                        <button onClick={() => router.push(`/bracket/${b.id}`)} className="text-blue-600 hover:underline">{b.name}</button>
                      </td>
                      <td className="px-4 py-2">
                        <button onClick={() => router.push(`/profile/${encodeURIComponent(b.username)}`)} className="text-gray-600 hover:text-blue-600 hover:underline">{b.username}</button>
                      </td>
                      <td className="px-4 py-2">
                        <BracketProgress picks={b.picks} />
                      </td>
                      {canEdit && (
                        <td className="px-4 py-2 text-right">
                          <button onClick={() => handleRemoveBracket(b.id)} className="text-xs text-red-500 hover:text-red-700">Remove</button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {tab === "standings" && (
        <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-900">
          <h3 className="text-sm font-medium mb-4">📈 Standings History</h3>
          <p className="text-xs text-gray-500 mb-4">How rankings changed after each round. Hover to see details.</p>
          {standingsData ? (
            <StandingsChart data={standingsData} />
          ) : (
            <p className="text-gray-400 text-sm">Loading standings data...</p>
          )}
        </div>
      )}

      {tab === "similarity" && (
        <div className="bg-white rounded-lg shadow p-6 dark:bg-gray-900">
          <h3 className="text-sm font-medium mb-2">🔀 Bracket Similarity</h3>
          <p className="text-xs text-gray-500 mb-4">How similar each pair of brackets is based on matching picks.</p>
          <BracketSimilarityMatrix groupId={id} />
        </div>
      )}

      {tab === "activity" && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-sm font-medium mb-3">Recent Activity</h3>
          <GroupActivityFeed groupId={id} />
        </div>
      )}

      {tab === "chat" && user && (
        <GroupChat groupId={id} currentUser={user.username} />
      )}

      {tab === "settings" && scoring && (
        <div className="bg-white rounded-lg shadow p-6 space-y-4">
          {!canEdit && <p className="text-sm text-gray-500 mb-2">Only the group creator can edit settings.</p>}
          <div>
            <label className="block text-sm font-medium mb-1">Description <span className="text-gray-400 font-normal">(pool rules, entry fee, payout, etc.)</span></label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} disabled={!canEdit} className="w-full border rounded px-3 py-2 text-sm disabled:opacity-50" placeholder="e.g. $20 buy-in, winner takes 70%, runner-up 30%." />
          </div>
          <PoolPayoutSettings buyIn={buyIn} setBuyIn={setBuyIn} payout={payout} setPayout={setPayout} memberCount={group.member_count} disabled={!canEdit} />
          {canEdit && buyIn > 0 && (
            <PaymentTracker groupId={id} buyIn={buyIn} />
          )}
          <div>
            <label className="block text-sm font-medium mb-1">Max Brackets Per User</label>
            <select value={maxBrackets} onChange={(e) => setMaxBrackets(Number(e.target.value))} disabled={!canEdit} className="border rounded px-3 py-2 disabled:opacity-50">
              {[1, 2, 3, 5, 10].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          {canEdit && <ScoringPresetPicker onSelect={setScoring} />}
          <div>
            <label className="block text-sm font-medium mb-1">Points Per Round</label>
            <div className="grid grid-cols-6 gap-2">
              {ROUND_NAMES.map((rn, i) => (
                <div key={rn}>
                  <label className="text-xs text-gray-500">{rn}</label>
                  <input type="number" min={0} value={scoring.pointsPerRound[i]} disabled={!canEdit} onChange={(e) => {
                    const next = [...scoring.pointsPerRound];
                    next[i] = Number(e.target.value);
                    setScoring({ ...scoring, pointsPerRound: next });
                  }} className="w-full border rounded px-2 py-1 text-sm disabled:opacity-50" />
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
                  <input type="number" min={0} value={scoring.upsetBonusPerRound[i]} disabled={!canEdit} onChange={(e) => {
                    const next = [...scoring.upsetBonusPerRound];
                    next[i] = Number(e.target.value);
                    setScoring({ ...scoring, upsetBonusPerRound: next });
                  }} className="w-full border rounded px-2 py-1 text-sm disabled:opacity-50" />
                </div>
              ))}
            </div>
          </div>
          {canEdit && (
            <button onClick={handleSaveSettings} disabled={saving} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-50">
              {saving ? "Saving..." : "Save Settings"}
            </button>
          )}
        </div>
      )}
    </main>
  );
}
