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
import type { RegionData, Tournament } from "@/types/tournament";
import type { Results } from "@/types/bracket";

export default function ResultsPage() {
  const [regions, setRegions] = useState<RegionData[]>([]);
  const [results, setResults] = useState<Results>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bracketRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

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
      } catch {
        setError("Failed to load results");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading results...</p></main>;
  if (error) return <main className="flex min-h-screen items-center justify-center"><p className="text-red-600">{error}</p></main>;

  const noop = () => {};
  const resolvedCount = Object.keys(results).length;

  return (
    <main className="min-h-screen p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 max-w-screen-2xl mx-auto">
        <div>
          <h1 className="text-lg font-bold">🏆 Tournament Results</h1>
          <p className="text-xs text-gray-500">{resolvedCount} of 63 games resolved</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          {!isMobile && <ExportButton bracketRef={bracketRef} bracketName="Tournament Results" />}
          {!isMobile && <PrintButton />}
        </div>
      </div>

      {isMobile ? (
        <div className="bg-white dark:bg-gray-800 p-3 rounded">
          <MobileBracket
            regions={regions}
            picks={results}
            results={results}
            onPick={noop}
            locked={true}
          />
        </div>
      ) : (
        <div ref={bracketRef} className="overflow-x-auto bg-white p-4">
          <div className="min-w-[1200px] max-w-screen-2xl mx-auto">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
              <RegionBracket region={REGIONS[0]} regions={regions} picks={results} results={results} onPick={noop} locked={true} side="left" />
              <FinalFour regions={regions} picks={results} results={results} onPick={noop} locked={true} />
              <RegionBracket region={REGIONS[1]} regions={regions} picks={results} results={results} onPick={noop} locked={true} side="right" />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start mt-8">
              <RegionBracket region={REGIONS[2]} regions={regions} picks={results} results={results} onPick={noop} locked={true} side="left" />
              <div className="w-40" />
              <RegionBracket region={REGIONS[3]} regions={regions} picks={results} results={results} onPick={noop} locked={true} side="right" />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
