"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { REGIONS } from "@/lib/bracket-constants";
import { parseBracketData } from "@/lib/bracket-utils";
import RegionBracket from "@/components/bracket/RegionBracket";
import FinalFour from "@/components/bracket/FinalFour";
import MobileBracket from "@/components/bracket/MobileBracket";
import ExportButton from "@/components/bracket/ExportButton";
import PrintButton from "@/components/bracket/PrintButton";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";

interface SharedData {
  bracket: { id: number; name: string; picks: string; tiebreaker: number | null; username: string; notes?: string };
  tournament: { name: string; year: number; bracket_data: string; results_data: string };
}

export default function SharedBracketClient() {
  const { token } = useParams<{ token: string }>();
  const [data, setData] = useState<SharedData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const bracketRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();

  useEffect(() => {
    fetch(`/api/brackets/share/${token}`)
      .then((r) => (r.ok ? r.json() : Promise.reject("Not found")))
      .then((d: SharedData) => setData(d))
      .catch(() => setError("Bracket not found or link is invalid."))
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) return <main className="flex min-h-screen items-center justify-center"><p className="text-gray-500">Loading bracket…</p></main>;
  if (error || !data) return (
    <main className="flex min-h-screen items-center justify-center flex-col gap-4">
      <p className="text-red-600">{error}</p>
      <a href="/" className="text-blue-600 underline text-sm">Go to homepage</a>
    </main>
  );

  return <SharedBracketView data={data} bracketRef={bracketRef} isMobile={isMobile} />;
}

function SharedBracketView({ data, bracketRef, isMobile }: { data: SharedData; bracketRef: React.RefObject<HTMLDivElement | null>; isMobile: boolean }) {
  const regions: RegionData[] = useMemo(() => parseBracketData(data.tournament.bracket_data), [data.tournament.bracket_data]);
  const picks: Picks = useMemo(() => {
    try { return typeof data.bracket.picks === "string" ? JSON.parse(data.bracket.picks) : data.bracket.picks; }
    catch { return {}; }
  }, [data.bracket.picks]);
  const results: Results = useMemo(() => {
    try { return JSON.parse(data.tournament.results_data); }
    catch { return {}; }
  }, [data.tournament.results_data]);

  const noop = () => {};

  return (
    <main className="min-h-screen p-4">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 max-w-screen-2xl mx-auto">
        <div>
          <h1 className="text-lg font-bold dark:text-white">🏀 {data.bracket.name}</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">by {data.bracket.username} · {data.tournament.name} ({data.tournament.year})</p>
        </div>
        <div className="flex items-center gap-2 no-print">
          {data.bracket.tiebreaker != null && (
            <span className="text-xs text-gray-500">TB: {data.bracket.tiebreaker}</span>
          )}
          {!isMobile && <ExportButton bracketRef={bracketRef} bracketName={data.bracket.name} />}
          {!isMobile && <PrintButton />}
          <a href="/" className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition">Sign Up / Login</a>
        </div>
      </div>

      {data.bracket.notes && (
        <div className="max-w-screen-2xl mx-auto mb-3 bg-gray-50 dark:bg-gray-800 rounded p-3">
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">📝 Notes</p>
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{data.bracket.notes}</p>
        </div>
      )}

      {isMobile ? (
        <div className="bg-white dark:bg-gray-800 p-3 rounded">
          <MobileBracket regions={regions} picks={picks} results={results} onPick={noop} locked distribution={{}} seedLookup={{}} />
        </div>
      ) : (
        <div ref={bracketRef} className="overflow-x-auto bg-white p-4">
          <div className="min-w-[1200px] max-w-screen-2xl mx-auto">
            <div className="flex items-stretch">
              <div className="flex-1">
                <RegionBracket region={REGIONS[0]} regions={regions} picks={picks} results={results} onPick={noop} locked side="left" distribution={{}} seedLookup={{}} />
              </div>
              <FinalFour regions={regions} picks={picks} results={results} onPick={noop} locked distribution={{}} seedLookup={{}} />
              <div className="flex-1">
                <RegionBracket region={REGIONS[1]} regions={regions} picks={picks} results={results} onPick={noop} locked side="right" distribution={{}} seedLookup={{}} />
              </div>
            </div>
            <div className="flex items-stretch mt-8">
              <div className="flex-1">
                <RegionBracket region={REGIONS[2]} regions={regions} picks={picks} results={results} onPick={noop} locked side="left" distribution={{}} seedLookup={{}} />
              </div>
              <div style={{ minWidth: 160 }} />
              <div className="flex-1">
                <RegionBracket region={REGIONS[3]} regions={regions} picks={picks} results={results} onPick={noop} locked side="right" distribution={{}} seedLookup={{}} />
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
