"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { REGIONS } from "@/lib/bracket-constants";
import RegionBracket from "@/components/bracket/RegionBracket";
import FinalFour from "@/components/bracket/FinalFour";
import MobileBracket from "@/components/bracket/MobileBracket";
import ExportButton from "@/components/bracket/ExportButton";
import PrintButton from "@/components/bracket/PrintButton";
import { useBracketPicks } from "@/hooks/useBracketPicks";
import { generateAutofill, type AutofillMode } from "@/lib/autofill";
import { parseBracketData } from "@/lib/bracket-utils";
import AutofillDropdown from "@/components/bracket/AutofillDropdown";
import ShareButton from "@/components/bracket/ShareButton";
import LockCountdown from "@/components/LockCountdown";
import { useIsMobile } from "@/hooks/useIsMobile";
import type { Bracket, RegionData, Tournament } from "@/types/tournament";
import type { Picks, Results, PickDistribution } from "@/types/bracket";

interface LoadedData {
  bracket: Bracket;
  tournament: Tournament;
  regions: RegionData[];
  results: Results;
  isOwner: boolean;
  locked: boolean;
  distribution: PickDistribution;
}

export default function BracketPage() {
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
        const locked = !isOwner || new Date(tournament.lock_time) <= new Date();

        // Fetch pick distribution (only returns data after lock time)
        let distribution: PickDistribution = {};
        try {
          const distRes = await fetch(`/api/brackets/distribution?tournament_id=${bracket.tournament_id}`);
          if (distRes.ok) {
            const distData = await distRes.json();
            distribution = distData.distribution ?? {};
          }
        } catch { /* ignore */ }

        setData({ bracket, tournament, regions, results, isOwner, locked, distribution });
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
  const initialPicks: Picks = JSON.parse(data.bracket.picks);
  const { picks, tiebreaker, dirty, saving, error, makePick, bulkSetPicks, updateTiebreaker, save } = useBracketPicks({
    initialPicks,
    initialTiebreaker: data.bracket.tiebreaker,
    bracketId: data.bracket.id,
    locked: data.locked,
  });

  function handleAutofill(mode: AutofillMode) {
    const filled = generateAutofill(mode, data.regions, picks);
    bulkSetPicks(filled);
  }

  return (
    <main className="min-h-screen p-4">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4 max-w-screen-2xl mx-auto">
        <div className="flex items-center gap-2">
          <h1 className="text-lg font-bold">🏀 {data.bracket.name}</h1>
          <LockCountdown lockTime={data.tournament.lock_time} />
        </div>
        <div className="flex flex-wrap items-center gap-2 no-print">
          {error && <span className="text-red-600 text-xs">{error}</span>}
          {dirty && !data.locked && (
            <span className="text-yellow-600 text-xs">Unsaved</span>
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
          {!data.locked && (
            <>
              <AutofillDropdown onSelect={handleAutofill} disabled={saving} />
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

      {/* Bracket — mobile vs desktop */}
      {isMobile ? (
        <div className="bg-white dark:bg-gray-800 p-3 rounded">
          <MobileBracket
            regions={data.regions}
            picks={picks}
            results={data.results}
            onPick={makePick}
            locked={data.locked}
            distribution={data.distribution}
          />
        </div>
      ) : (
        <div ref={bracketRef} className="overflow-x-auto bg-white p-4">
          <div className="min-w-[1200px] max-w-screen-2xl mx-auto">
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
              <RegionBracket
                region={REGIONS[0]}
                regions={data.regions}
                picks={picks}
                results={data.results}
                onPick={makePick}
                locked={data.locked}
                side="left"
                distribution={data.distribution}
              />
              <FinalFour
                regions={data.regions}
                picks={picks}
                results={data.results}
                onPick={makePick}
                locked={data.locked}
                distribution={data.distribution}
              />
              <RegionBracket
                region={REGIONS[1]}
                regions={data.regions}
                picks={picks}
                results={data.results}
                onPick={makePick}
                locked={data.locked}
                side="right"
                distribution={data.distribution}
              />
            </div>
            <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start mt-8">
              <RegionBracket
                region={REGIONS[2]}
                regions={data.regions}
                picks={picks}
                results={data.results}
                onPick={makePick}
                locked={data.locked}
                side="left"
                distribution={data.distribution}
              />
              <div className="w-40" />
              <RegionBracket
                region={REGIONS[3]}
                regions={data.regions}
                picks={picks}
                results={data.results}
                onPick={makePick}
                locked={data.locked}
                side="right"
                distribution={data.distribution}
              />
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
