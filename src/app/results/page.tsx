"use client";

import { useEffect, useRef, useState } from "react";
import { REGIONS } from "@/lib/bracket-constants";
import RegionBracket from "@/components/bracket/RegionBracket";
import FinalFour from "@/components/bracket/FinalFour";
import MobileBracket from "@/components/bracket/MobileBracket";
import ExportButton from "@/components/bracket/ExportButton";
import PrintButton from "@/components/bracket/PrintButton";
import { parseBracketData } from "@/lib/bracket-utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { useSpoilerFree } from "@/contexts/SpoilerContext";
import type { RegionData, Tournament, Bracket } from "@/types/tournament";
import type { Results, Picks } from "@/types/bracket";

export default function ResultsPage() {
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [results, setResults] = useState<Results>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [selectedBracketId, setSelectedBracketId] = useState<string>("");
  const [userPicks, setUserPicks] = useState<Picks | undefined>(undefined);
  const bracketRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();
  const { spoilerFree } = useSpoilerFree();

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/tournaments");
        if (!res.ok) { setError("Failed to load tournaments"); return; }
        const { tournaments } = await res.json() as { tournaments: Tournament[] };
        if (!tournaments?.length) { setError("No tournaments found"); return; }
        const tRes = await fetch(`/api/tournaments/${tournaments[0].id}`);
        if (!tRes.ok) { setError("Failed to load tournament"); return; }
        const { tournament } = await tRes.json() as { tournament: Tournament };
        setRegions(parseBracketData(tournament.bracket_data));
        setResults(JSON.parse(tournament.results_data || "{}"));

        // Fetch user's brackets (will 401 if not logged in — that's fine)
        const bRes = await fetch(`/api/brackets?tournament_id=${tournaments[0].id}`);
        if (bRes.ok) {
          const { brackets: userBrackets } = await bRes.json() as { brackets: Bracket[] };
          setBrackets(userBrackets || []);
        }
      } catch {
        setError("Failed to load results");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    if (!selectedBracketId) {
      setUserPicks(undefined);
      return;
    }
    const bracket = brackets.find((b) => String(b.id) === selectedBracketId);
    if (bracket) {
      const parsed = typeof bracket.picks === "string" ? JSON.parse(bracket.picks || "{}") : bracket.picks;
      setUserPicks(parsed as Picks);
    }
  }, [selectedBracketId, brackets]);

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading results...</p></main>;
  if (error) return <main className="flex min-h-screen items-center justify-center"><p className="text-red-600">{error}</p></main>;
  if (spoilerFree) return (
    <main className="min-h-screen p-8 flex items-center justify-center">
      <div className="rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 p-12 text-center text-gray-400 dark:text-gray-500">
        <p className="text-3xl mb-2">🙈</p>
        <p className="text-lg font-medium">Results hidden</p>
        <p className="text-sm mt-1">Spoiler-free mode is on. Toggle it off in the navbar to view results.</p>
      </div>
    </main>
  );

  const resolvedCount = Object.keys(results).length;

  // Compute overlay summary
  let correct = 0, wrong = 0, pending = 0;
  if (userPicks) {
    const resolvedIds = Object.keys(results);
    for (const gId of resolvedIds) {
      const pick = userPicks[gId];
      if (!pick) { wrong++; }
      else if (pick === results[gId]) { correct++; }
      else { wrong++; }
    }
    const totalPicked = Object.keys(userPicks).length;
    pending = totalPicked - correct - Object.keys(results).reduce((n, gId) => n + (userPicks[gId] ? 1 : 0), 0);
    if (pending < 0) pending = 0;
  }

  const noop = () => {};

  return (
    <main className="min-h-screen p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 max-w-screen-2xl mx-auto">
        <div>
          <h1 className="text-lg font-bold">🏆 Tournament Results</h1>
          <p className="text-xs text-gray-500">{resolvedCount} of 63 games resolved</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          {brackets.length > 0 && (
            <select
              value={selectedBracketId}
              onChange={(e) => setSelectedBracketId(e.target.value)}
              className="text-xs border rounded px-2 py-1 bg-white dark:bg-gray-700 dark:text-white"
            >
              <option value="">My Picks: Off</option>
              {brackets.map((b) => (
                <option key={b.id} value={String(b.id)}>{b.name}</option>
              ))}
            </select>
          )}
          {!isMobile && <ExportButton bracketRef={bracketRef} bracketName="Tournament Results" />}
          {!isMobile && <PrintButton />}
        </div>
      </div>

      {userPicks && resolvedCount > 0 && (
        <div className="flex items-center gap-3 text-xs mb-3 max-w-screen-2xl mx-auto px-1">
          <span className="font-semibold">My Picks:</span>
          <span className="text-green-700 dark:text-green-400">✅ {correct} correct</span>
          <span className="text-red-700 dark:text-red-400">❌ {wrong} wrong</span>
          {pending > 0 && <span className="text-gray-500">⏳ {pending} pending</span>}
          <span className="text-gray-400">({correct}/{resolvedCount} resolved)</span>
        </div>
      )}

      {isMobile ? (
        <div className="bg-white dark:bg-gray-800 p-3 rounded">
          <MobileBracket
            regions={regions}
            picks={results}
            results={results}
            onPick={noop}
            locked={true}
            userPicks={userPicks}
          />
        </div>
      ) : (
        <div ref={bracketRef} className="overflow-x-auto bg-white p-4">
          <div className="min-w-[1200px] max-w-screen-2xl mx-auto">
            <div className="flex items-stretch">
              <div className="flex-1"><RegionBracket region={REGIONS[0]} regions={regions} picks={results} results={results} onPick={noop} locked={true} side="left" userPicks={userPicks} /></div>
              <FinalFour regions={regions} picks={results} results={results} onPick={noop} locked={true} userPicks={userPicks} />
              <div className="flex-1"><RegionBracket region={REGIONS[1]} regions={regions} picks={results} results={results} onPick={noop} locked={true} side="right" userPicks={userPicks} /></div>
            </div>
            <div className="flex items-stretch mt-8">
              <div className="flex-1"><RegionBracket region={REGIONS[2]} regions={regions} picks={results} results={results} onPick={noop} locked={true} side="left" userPicks={userPicks} /></div>
              <div style={{ minWidth: 160 }} />
              <div className="flex-1"><RegionBracket region={REGIONS[3]} regions={regions} picks={results} results={results} onPick={noop} locked={true} side="right" userPicks={userPicks} /></div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
