"use client";

import { useState, useCallback, useMemo } from "react";
import type { Results } from "@/types/bracket";
import { cascadeClear } from "@/lib/bracket-utils";

/**
 * Hook to manage hypothetical results in the What-If simulator.
 * Merges actual results with user-set hypothetical results.
 * Actual results are immutable; only unresolved games can be set.
 */
export function useSimulatorResults(actualResults: Results) {
  const [hypothetical, setHypothetical] = useState<Results>({});

  const mergedResults = useMemo<Results>(
    () => ({ ...hypothetical, ...actualResults }),
    [actualResults, hypothetical]
  );

  const setResult = useCallback(
    (gameId: string, team: string) => {
      if (actualResults[gameId]) return; // can't override actual results
      setHypothetical((prev) => {
        const old = prev[gameId];
        if (old === team) return prev;
        let next = { ...prev };
        if (old) {
          next = cascadeClear(next, gameId, old);
        }
        next[gameId] = team;
        return next;
      });
    },
    [actualResults]
  );

  const resetHypothetical = useCallback(() => setHypothetical({}), []);

  return { mergedResults, hypothetical, setResult, resetHypothetical };
}
