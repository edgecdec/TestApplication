"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { Results, Picks } from "@/types/bracket";
import type { ScoringSettings } from "@/types/group";
import type { RegionData } from "@/types/tournament";
import { SEED_WIN_RATES } from "@/lib/seed-matchup-history";

export interface MCResult {
  key: string;
  avgScore: number;
  avgPlace: number;
  winPct: number;
}

interface MCEntry {
  key: string;
  picks: Picks;
}

const TOTAL_SIMS = 1000;
const DEBOUNCE_MS = 500;

/**
 * Hook that runs Monte Carlo simulations in a Web Worker.
 * Re-runs (debounced) when hypothetical results change.
 */
export function useMonteCarlo(
  entries: MCEntry[],
  results: Results,
  hypo: Results,
  regions: RegionData[],
  scoring: ScoringSettings | undefined,
) {
  const [mcResults, setMcResults] = useState<MCResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [running, setRunning] = useState(false);
  const workerRef = useRef<Worker | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const run = useCallback(() => {
    if (!entries.length || !regions.length || !scoring) return;
    workerRef.current?.terminate();
    setRunning(true);
    setProgress(0);

    const teamSeeds: Record<string, number> = {};
    for (const r of regions) {
      for (const t of r.seeds) {
        teamSeeds[`${r.name}-${t.seed}`] = t.seed;
      }
    }

    // Convert percentage-based rates to 0-1 probabilities for the worker
    const ratesAsProb: Record<string, number> = {};
    for (const [k, v] of Object.entries(SEED_WIN_RATES)) {
      ratesAsProb[k] = v / 100;
    }

    const worker = new Worker(new URL("../lib/monteCarloWorker.ts", import.meta.url));
    workerRef.current = worker;
    worker.onmessage = (e) => {
      if (e.data.type === "progress") setProgress(e.data.progress);
      else if (e.data.type === "done") {
        setMcResults(e.data.results);
        setProgress(TOTAL_SIMS);
        setRunning(false);
      }
    };
    worker.postMessage({
      entries: entries.map((e) => ({ key: e.key, picks: e.picks })),
      results,
      hypo,
      regionNames: regions.map((r) => r.name),
      teamSeeds,
      scoring,
      seedWinRates: ratesAsProb,
      totalSims: TOTAL_SIMS,
    });
  }, [entries, results, hypo, regions, scoring]);

  // Debounce re-runs when hypothetical results change
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(run, DEBOUNCE_MS);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [run]);

  useEffect(() => () => workerRef.current?.terminate(), []);

  return { mcResults, progress, running, totalSims: TOTAL_SIMS };
}
