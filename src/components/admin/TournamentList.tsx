"use client";

import { useState } from "react";
import type { Tournament, RegionData } from "@/types/tournament";
import type { Results } from "@/types/bracket";
import { parseBracketData } from "@/lib/bracket-utils";
import BracketDataImport from "@/components/admin/BracketDataImport";
import EspnSyncButton from "@/components/EspnSyncButton";

interface Props {
  tournaments: Tournament[];
  onRefresh: () => void;
}

export default function TournamentList({ tournaments, onRefresh }: Props) {
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editLockTime, setEditLockTime] = useState("");
  const [saving, setSaving] = useState(false);
  const [dates, setDates] = useState("");

  function toggleExpand(id: number) {
    setExpandedId(expandedId === id ? null : id);
    setEditingId(null);
  }

  function startEdit(t: Tournament) {
    setEditingId(t.id);
    setEditName(t.name);
    setEditLockTime(t.lock_time);
  }

  async function saveEdit(id: number) {
    setSaving(true);
    try {
      const res = await fetch(`/api/tournaments/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: editName, lock_time: editLockTime }),
      });
      if (res.ok) {
        setEditingId(null);
        onRefresh();
      }
    } finally {
      setSaving(false);
    }
  }

  if (tournaments.length === 0) {
    return <p className="text-gray-500">No tournaments yet. Create one above.</p>;
  }

  return (
    <div className="space-y-3">
      {tournaments.map((t) => {
        const regions: RegionData[] = parseBracketData(t.bracket_data);
        const results: Results = JSON.parse(t.results_data || "{}");
        const teamCount = regions.reduce((sum, r) => sum + r.seeds.length, 0);
        const resultCount = Object.keys(results).length;
        const isExpanded = expandedId === t.id;

        return (
          <div key={t.id} className="border rounded-lg overflow-hidden">
            <button
              onClick={() => toggleExpand(t.id)}
              className="w-full text-left p-4 hover:bg-gray-50 transition flex justify-between items-center"
            >
              <div>
                <span className="font-semibold">{t.name}</span>
                <span className="ml-2 text-sm text-gray-500">({t.year})</span>
                <div className="text-xs text-gray-400 mt-1">
                  {teamCount} teams · {resultCount} results · Lock: {new Date(t.lock_time).toLocaleString()}
                </div>
              </div>
              <span className="text-gray-400">{isExpanded ? "▼" : "▶"}</span>
            </button>

            {isExpanded && (
              <div className="border-t p-4 space-y-6 bg-gray-50">
                {/* Edit basic info */}
                <section>
                  <h3 className="text-sm font-semibold mb-2">Tournament Settings</h3>
                  {editingId === t.id ? (
                    <div className="space-y-2">
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                      />
                      <input
                        type="datetime-local"
                        value={editLockTime}
                        onChange={(e) => setEditLockTime(e.target.value)}
                        className="w-full border rounded px-3 py-2"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => saveEdit(t.id)}
                          disabled={saving}
                          className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                        >
                          {saving ? "Saving..." : "Save"}
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="px-3 py-1 text-sm bg-gray-200 rounded hover:bg-gray-300"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => startEdit(t)}
                      className="text-sm text-blue-600 hover:underline"
                    >
                      Edit name / lock time
                    </button>
                  )}
                </section>

                {/* Bracket data import */}
                <section>
                  <h3 className="text-sm font-semibold mb-2">Bracket Data ({teamCount} teams loaded)</h3>
                  <BracketDataImport
                    tournamentId={t.id}
                    existingData={regions}
                    onImported={onRefresh}
                  />
                </section>

                {/* ESPN Sync */}
                <section>
                  <h3 className="text-sm font-semibold mb-2">ESPN Results Sync ({resultCount} games resolved)</h3>
                  <div className="flex items-center gap-3">
                    <div>
                      <label className="text-xs text-gray-500">Date range (optional, YYYYMMDD)</label>
                      <input
                        value={dates}
                        onChange={(e) => setDates(e.target.value)}
                        placeholder="20260319-20260322"
                        className="border rounded px-2 py-1 text-sm w-48"
                      />
                    </div>
                    <EspnSyncButton tournamentId={t.id} />
                  </div>
                </section>

                {/* Results summary */}
                {resultCount > 0 && (
                  <section>
                    <h3 className="text-sm font-semibold mb-2">Resolved Results</h3>
                    <div className="max-h-40 overflow-y-auto text-xs font-mono bg-white border rounded p-2">
                      {Object.entries(results).map(([gId, winner]) => (
                        <div key={gId} className="flex justify-between py-0.5">
                          <span className="text-gray-500">{gId}</span>
                          <span className="font-medium">{winner}</span>
                        </div>
                      ))}
                    </div>
                  </section>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
