"use client";

import { useState, useCallback, useEffect } from "react";
import type { Picks } from "@/types/bracket";
import { cascadeClear } from "@/lib/bracket-utils";

interface UseBracketPicksOptions {
  initialPicks: Picks;
  bracketId: number;
  locked: boolean;
}

export function useBracketPicks({ initialPicks, bracketId, locked }: UseBracketPicksOptions) {
  const [picks, setPicks] = useState<Picks>(initialPicks);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sync if initialPicks changes (e.g. bracket reload)
  useEffect(() => {
    setPicks(initialPicks);
    setDirty(false);
  }, [initialPicks]);

  // Warn on navigation away with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) {
        e.preventDefault();
      }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  const makePick = useCallback(
    (gameId: string, team: string) => {
      if (locked) return;
      setPicks((prev) => {
        const oldWinner = prev[gameId];
        if (oldWinner === team) return prev; // same pick, no-op
        let newPicks = { ...prev };
        // Cascade clear if changing an existing pick
        if (oldWinner) {
          newPicks = cascadeClear(newPicks, gameId, oldWinner);
        }
        newPicks[gameId] = team;
        return newPicks;
      });
      setDirty(true);
    },
    [locked]
  );

  const save = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/brackets/${bracketId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ picks }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        return;
      }
      setDirty(false);
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }, [bracketId, picks]);

  return { picks, dirty, saving, error, makePick, save };
}
