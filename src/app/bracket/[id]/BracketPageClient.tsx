"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { REGIONS } from "@/lib/bracket-constants";
import RegionBracket from "@/components/bracket/RegionBracket";
import FinalFour from "@/components/bracket/FinalFour";
import MobileBracket from "@/components/bracket/MobileBracket";
import ExportButton from "@/components/bracket/ExportButton";
import PrintButton from "@/components/bracket/PrintButton";
import LiveScores from "@/components/LiveScores";
import { useBracketPicks } from "@/hooks/useBracketPicks";
import { generateAutofill, type AutofillMode } from "@/lib/autofill";
import { parseBracketData } from "@/lib/bracket-utils";
import AutofillDropdown from "@/components/bracket/AutofillDropdown";
import ShareButton from "@/components/bracket/ShareButton";
import PublicShareButton from "@/components/bracket/PublicShareButton";
import LockCountdown from "@/components/LockCountdown";
import AddToCalendarButton from "@/components/AddToCalendarButton";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { Bracket, RegionData, Tournament } from "@/types/tournament";
import type { Picks, Results, PickDistribution } from "@/types/bracket";
import BracketInsights from "@/components/bracket/BracketInsights";
import BracketScoringSummary from "@/components/bracket/BracketScoringSummary";
import PickListView from "@/components/bracket/PickListView";
import BracketSwitcher from "@/components/bracket/BracketSwitcher";
import BracketWizard from "@/components/bracket/BracketWizard";
import { useBracketKeyboard } from "@/hooks/useBracketKeyboard";
import { buildTeamSeedMap } from "@/lib/scoring";

interface LoadedData {
  bracket: Bracket;
  tournament: Tournament;
  regions: RegionData[];
  results: Results;
  isOwner: boolean;
  locked: boolean;
  distribution: PickDistribution;
  isSecondChance: boolean;
}

export default function BracketPageClient() {
  const params = useParams();
  const router = useRouter();
  const bracketId = Number(params.id);
  const [data, setData] = useState<LoadedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [bracketRes, meRes] = await Promise.all([
          fetch(`/api/brackets/${bracketId}`),
          fetch("/api/auth/me"),
        ]);
        if (!bracketRes.ok) {
          setLoadError("Bracket not found");
          return;
        }
        const { bracket } = await bracketRes.json() as { bracket: Bracket & { username: string } };
        const tournamentRes = await fetch(`/api/tournaments/${bracket.tournament_id}`);
        if (!tournamentRes.ok) {
          setLoadError("Tournament not found");
          return;
        }
        const { tournament } = await tournamentRes.json() as { tournament: Tournament };
        const regions: RegionData[] = parseBracketData(tournament.bracket_data);
        const results: Results = JSON.parse(tournament.results_data);
        const meData = meRes.ok ? await meRes.json() : null;
        const isOwner = meData?.user?.id === bracket.user_id;
        const isSecondChance = bracket.is_second_chance === 1;
        // Second chance brackets are editable for unresolved games even after lock time
        const locked = !isOwner || (!isSecondChance && new Date(tournament.lock_time) <= new Date());

        let distribution: PickDistribution = {};
        try {
          const distRes = await fetch(`/api/brackets/distribution?tournament_id=${bracket.tournament_id}`);
          if (distRes.ok) {
            const distData = await distRes.json();
            distribution = distData.distribution ?? {};
          }
        } catch { /* ignore */ }

        setData({ bracket, tournament, regions, results, isOwner, locked, distribution, isSecondChance });
      } catch {
        setLoadError("Failed to load bracket");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [bracketId]);

  if (loading) {
    return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading bracket...</p></main>;
  }
  if (loadError || !data) {
    return (
      <main className="flex min-h-screen items-center justify-center flex-col gap-4">
        <p className="text-red-600">{loadError}</p>
      </main>
    );
  }

  return <BracketView data={data} />;
}

function BracketView({ data }: { data: LoadedData }) {
  const router = useRouter();
  const bracketRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const [teamSearch, setTeamSearch] = useState("");
  const [viewMode, setViewMode] = useState<"bracket" | "list">("bracket");
  const [showWizard, setShowWizard] = useState(false);
  const highlightTeam = teamSearch.trim().toLowerCase() || undefined;
  const initialPicks: Picks = useMemo(() => JSON.parse(data.bracket.picks), [data.bracket.picks]);
  const { picks, tiebreaker, dirty, saving, error, lastSavedAt, makePick, bulkSetPicks, updateTiebreaker, save, undo, redo, canUndo, canRedo } = useBracketPicks({
    initialPicks,
    initialTiebreaker: data.bracket.tiebreaker,
    bracketId: data.bracket.id,
    locked: data.locked,
  });

  // For second chance brackets, prevent editing games that already have results
  const handlePick = useCallback((gameId: string, team: string) => {
    if (data.isSecondChance && data.results[gameId]) return;
    makePick(gameId, team);
  }, [data.isSecondChance, data.results, makePick]);

  const { focusedGameId, setFocusedGameId } = useBracketKeyboard({
    regions: data.regions,
    picks,
    locked: data.locked,
    onPick: handlePick,
  });

  const seedLookup: Record<string, number> = {};
  const seedMap = buildTeamSeedMap(data.regions);
  seedMap.forEach((seed, name) => { seedLookup[name] = seed; });

  function handleAutofill(mode: AutofillMode) {
    const filled = generateAutofill(mode, data.regions, picks);
    bulkSetPicks(filled);
  }

  return (
    <main className="min-h-screen p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">🏀 {data.bracket.name}</h1>
          {data.isSecondChance && (
            <span className="text-xs bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded">🔄 2nd Chance</span>
          )}
          <BracketSwitcher currentBracketId={data.bracket.id} tournamentId={data.bracket.tournament_id} />
          <LockCountdown lockTime={data.tournament.lock_time} />
          <AddToCalendarButton lockTime={data.tournament.lock_time} />
        </div>
        <div className="flex items-center gap-2 no-print">
          <div className="flex items-center border rounded overflow-hidden text-xs">
            <button
              onClick={() => setViewMode("bracket")}
              className={`px-2 py-1 transition ${viewMode === "bracket" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"}`}
            >
              🏀 Bracket
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`px-2 py-1 transition ${viewMode === "list" ? "bg-blue-600 text-white" : "bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600"}`}
            >
              📋 List
            </button>
          </div>
          <div className="relative">
            <input
              type="text"
              placeholder="🔍 Find team…"
              value={teamSearch}
              onChange={(e) => setTeamSearch(e.target.value)}
              className="w-36 border rounded px-2 py-1 text-xs dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            />
            {teamSearch && (
              <button onClick={() => setTeamSearch("")} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xs">✕</button>
            )}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          {error && <span className="text-red-600 text-xs">{error}</span>}
          {saving && <span className="text-blue-500 text-xs">Saving...</span>}
          {!saving && dirty && !data.locked && (
            <span className="text-yellow-600 text-xs">Auto-saving…</span>
          )}
          {!saving && !dirty && lastSavedAt && !data.locked && (
            <span className="text-green-600 text-xs">✓ Saved {lastSavedAt.toLocaleTimeString()}</span>
          )}
          {!data.locked && (
            <div className="flex items-center gap-1">
              <label htmlFor="tiebreaker" className="text-xs text-gray-500 whitespace-nowrap">TB:</label>
              <input
                id="tiebreaker"
                type="number"
                min={0}
                max={999}
                placeholder="Total"
                value={tiebreaker ?? ""}
                onChange={(e) => updateTiebreaker(e.target.value === "" ? null : Number(e.target.value))}
                className="w-16 border rounded px-2 py-1 text-xs"
                title="Predicted total combined score of the championship game"
              />
            </div>
          )}
          {data.locked && tiebreaker != null && (
            <span className="text-xs text-gray-500">TB: {tiebreaker}</span>
          )}
          {!isMobile && <ExportButton bracketRef={bracketRef} bracketName={data.bracket.name} />}
          {!isMobile && <PrintButton />}
          <ShareButton bracketName={data.bracket.name} bracketId={data.bracket.id} picks={picks} regions={data.regions} />
          {data.isOwner && <PublicShareButton bracketId={data.bracket.id} />}
          {!data.locked && (
            <>
              <button
                onClick={undo}
                disabled={!canUndo}
                className="px-2 py-1.5 text-sm rounded border hover:bg-gray-100 disabled:opacity-30 transition"
                title="Undo (⌘Z)"
              >
                ↩️
              </button>
              <button
                onClick={redo}
                disabled={!canRedo}
                className="px-2 py-1.5 text-sm rounded border hover:bg-gray-100 disabled:opacity-30 transition"
                title="Redo (⌘⇧Z)"
              >
                ↪️
              </button>
              <span className="text-[10px] text-gray-400 hidden lg:inline" title="Arrow keys to navigate, 1/2 to pick, Tab for next unfilled">⌨️ Keys</span>
              <AutofillDropdown onSelect={handleAutofill} disabled={saving} />
              <button
                onClick={() => setShowWizard(true)}
                className="px-2 py-1.5 text-sm rounded border border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/30 transition"
                title="Step-by-step bracket fill"
              >
                🧙 Wizard
              </button>
              <button
                onClick={() => { if (confirm("Reset all picks and tiebreaker? This cannot be undone.")) { bulkSetPicks({}); updateTiebreaker(null); } }}
                className="px-2 py-1.5 text-sm rounded border text-red-600 border-red-200 hover:bg-red-50 transition"
                title="Reset all picks"
              >
                🔄 Reset
              </button>
              <button
                onClick={save}
                disabled={saving || !dirty}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 transition"
              >
                {saving ? "Saving..." : "Save"}
              </button>
            </>
          )}
        </div>
      </div>

      <BracketInsights picks={picks} regions={data.regions} distribution={data.distribution} />

      <BracketScoringSummary bracketId={data.bracket.id} />

      <div className="max-w-screen-2xl mx-auto mb-3 no-print">
        <details className="bg-gray-50 dark:bg-gray-800 rounded p-2">
          <summary className="text-sm font-semibold text-gray-600 dark:text-gray-300 cursor-pointer">📺 Live Scores</summary>
          <div className="mt-2"><LiveScores /></div>
        </details>
      </div>

      {viewMode === "list" ? (
        <PickListView regions={data.regions} picks={picks} results={data.results} seedLookup={seedLookup} />
      ) : isMobile ? (
        <div className="bg-white dark:bg-gray-800 p-3 rounded">
          <MobileBracket
            regions={data.regions}
            picks={picks}
            results={data.results}
            onPick={handlePick}
            locked={data.locked}
            distribution={data.distribution}
            seedLookup={seedLookup}
            highlightTeam={highlightTeam}
          />
        </div>
      ) : (
        <div ref={bracketRef} className="overflow-x-auto bg-white p-4">
          <div className="min-w-[1200px] max-w-screen-2xl mx-auto">
            <div className="flex items-stretch">
              <div className="flex-1">
                <RegionBracket
                  region={REGIONS[0]}
                  regions={data.regions}
                  picks={picks}
                  results={data.results}
                  onPick={handlePick}
                  locked={data.locked}
                  side="left"
                  distribution={data.distribution}
                  seedLookup={seedLookup}
                  focusedGameId={focusedGameId}
                  onFocusGame={setFocusedGameId}
                  highlightTeam={highlightTeam}
                />
              </div>
              <FinalFour
                regions={data.regions}
                picks={picks}
                results={data.results}
                onPick={handlePick}
                locked={data.locked}
                distribution={data.distribution}
                seedLookup={seedLookup}
                focusedGameId={focusedGameId}
                onFocusGame={setFocusedGameId}
                highlightTeam={highlightTeam}
              />
              <div className="flex-1">
                <RegionBracket
                  region={REGIONS[1]}
                  regions={data.regions}
                  picks={picks}
                  results={data.results}
                  onPick={handlePick}
                  locked={data.locked}
                  side="right"
                  distribution={data.distribution}
                  seedLookup={seedLookup}
                  focusedGameId={focusedGameId}
                  onFocusGame={setFocusedGameId}
                  highlightTeam={highlightTeam}
                />
              </div>
            </div>
            <div className="flex items-stretch mt-8">
              <div className="flex-1">
                <RegionBracket
                  region={REGIONS[2]}
                  regions={data.regions}
                  picks={picks}
                  results={data.results}
                  onPick={handlePick}
                  locked={data.locked}
                  side="left"
                  distribution={data.distribution}
                  seedLookup={seedLookup}
                  focusedGameId={focusedGameId}
                  onFocusGame={setFocusedGameId}
                  highlightTeam={highlightTeam}
                />
              </div>
              <div style={{ minWidth: 160 }} />
              <div className="flex-1">
                <RegionBracket
                  region={REGIONS[3]}
                  regions={data.regions}
                  picks={picks}
                  results={data.results}
                  onPick={handlePick}
                  locked={data.locked}
                  side="right"
                  distribution={data.distribution}
                  seedLookup={seedLookup}
                  focusedGameId={focusedGameId}
                  onFocusGame={setFocusedGameId}
                  highlightTeam={highlightTeam}
                />
              </div>
            </div>
          </div>
        </div>
      )}
      {showWizard && !data.locked && (
        <BracketWizard
          regions={data.regions}
          picks={picks}
          onPick={handlePick}
          seedLookup={seedLookup}
          onClose={() => setShowWizard(false)}
        />
      )}
    </main>
  );
}
