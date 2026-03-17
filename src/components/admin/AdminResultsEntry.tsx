"use client";

import { useState, useCallback } from "react";
import RegionBracket from "@/components/bracket/RegionBracket";
import FinalFour from "@/components/bracket/FinalFour";
import MobileBracket from "@/components/bracket/MobileBracket";
import { useIsMobile } from "@/hooks/useIsMobile";
import { cascadeClear } from "@/lib/bracket-utils";
import { REGIONS } from "@/lib/bracket-constants";
import type { RegionData } from "@/types/tournament";
import type { Results } from "@/types/bracket";

interface Props {
  tournamentId: number;
  regions: RegionData[];
  initialResults: Results;
  onSaved: () => void;
}

export default function AdminResultsEntry({ tournamentId, regions, initialResults, onSaved }: Props) {
  const [results, setResults] = useState<Results>(initialResults);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isMobile = useIsMobile();

  const handlePick = useCallback((gameId: string, team: string) => {
    setResults(prev => {
      if (prev[gameId] === team) {
        // Toggle off: remove this result and cascade clear downstream
        const next = cascadeClear({ ...prev }, gameId, team);
        delete next[gameId];
        return next;
      }
      const oldWinner = prev[gameId];
      let next = { ...prev };
      if (oldWinner) {
        next = cascadeClear(next, gameId, oldWinner);
      }
      next[gameId] = team;
      return next;
    });
    setDirty(true);
    setError(null);
  }, []);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ results_data: results }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        return;
      }
      setDirty(false);
      onSaved();
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }

  function handleReset() {
    setResults(initialResults);
    setDirty(false);
    setError(null);
  }

  const resultCount = Object.keys(results).length;

  return (
    <div>
      <div className="flex items-center gap-3 mb-3 flex-wrap">
        <button
          onClick={handleSave}
          disabled={saving || !dirty}
          className="px-3 py-1.5 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50 transition"
        >
          {saving ? "Saving..." : `💾 Save Results (${resultCount})`}
        </button>
        {dirty && (
          <button
            onClick={handleReset}
            className="px-3 py-1.5 text-sm bg-gray-200 dark:bg-gray-700 rounded hover:bg-gray-300 dark:hover:bg-gray-600 transition"
          >
            Reset
          </button>
        )}
        {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
        {error && <span className="text-xs text-red-600">{error}</span>}
      </div>
      <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Click a team to set them as the winner. Click the current winner again to remove the result. Changes cascade to later rounds.
      </p>

      {isMobile ? (
        <MobileBracket
          regions={regions}
          picks={results}
          results={{}}
          onPick={handlePick}
          locked={false}
        />
      ) : (
        <div className="overflow-x-auto">
          <div className="flex gap-2 min-w-[1200px]">
            <RegionBracket region={REGIONS[0]} regions={regions} picks={results} results={{}} onPick={handlePick} locked={false} side="left" />
            <RegionBracket region={REGIONS[1]} regions={regions} picks={results} results={{}} onPick={handlePick} locked={false} side="left" />
            <FinalFour regions={regions} picks={results} results={{}} onPick={handlePick} locked={false} />
            <RegionBracket region={REGIONS[2]} regions={regions} picks={results} results={{}} onPick={handlePick} locked={false} side="right" />
            <RegionBracket region={REGIONS[3]} regions={regions} picks={results} results={{}} onPick={handlePick} locked={false} side="right" />
          </div>
        </div>
      )}
    </div>
  );
}
