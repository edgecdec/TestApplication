"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Picks } from "@/types/bracket";
import { cascadeClear } from "@/lib/bracket-utils";

const MAX_UNDO_HISTORY = 50;
const AUTO_SAVE_DELAY_MS = 2000;

interface UseBracketPicksOptions {
  initialPicks: Picks;
  initialTiebreaker: number | null;
  bracketId: number;
  locked: boolean;
}

export function useBracketPicks({ initialPicks, initialTiebreaker, bracketId, locked }: UseBracketPicksOptions) {
  const [picks, setPicks] = useState<Picks>(initialPicks);
  const [tiebreaker, setTiebreaker] = useState<number | null>(initialTiebreaker);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);

  // Undo/redo history stacks (store picks snapshots)
  const undoStack = useRef<Picks[]>([]);
  const redoStack = useRef<Picks[]>([]);
  const [historyVersion, setHistoryVersion] = useState(0); // trigger re-render for canUndo/canRedo

  // Sync if initialPicks changes (e.g. bracket reload)
  useEffect(() => {
    setPicks(initialPicks);
    setTiebreaker(initialTiebreaker);
    setDirty(false);
    undoStack.current = [];
    redoStack.current = [];
    setHistoryVersion(0);
  }, [initialPicks, initialTiebreaker]);

  // Warn on navigation away with unsaved changes
  useEffect(() => {
    function handleBeforeUnload(e: BeforeUnloadEvent) {
      if (dirty) { e.preventDefault(); }
    }
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [dirty]);

  // Push current picks to undo stack before a change
  const pushUndo = useCallback((currentPicks: Picks) => {
    undoStack.current = [...undoStack.current.slice(-(MAX_UNDO_HISTORY - 1)), currentPicks];
    redoStack.current = [];
    setHistoryVersion((v) => v + 1);
  }, []);

  const makePick = useCallback(
    (gameId: string, team: string) => {
      if (locked) return;
      setPicks((prev) => {
        const oldWinner = prev[gameId];
        if (oldWinner === team) return prev;
        // Save snapshot before change
        pushUndo(prev);
        let newPicks = { ...prev };
        if (oldWinner) {
          newPicks = cascadeClear(newPicks, gameId, oldWinner);
        }
        newPicks[gameId] = team;
        return newPicks;
      });
      setDirty(true);
    },
    [locked, pushUndo]
  );

  const bulkSetPicks = useCallback(
    (newPicks: Picks) => {
      if (locked) return;
      setPicks((prev) => {
        pushUndo(prev);
        return newPicks;
      });
      setDirty(true);
    },
    [locked, pushUndo]
  );

  const undo = useCallback(() => {
    if (locked || undoStack.current.length === 0) return;
    const prev = undoStack.current.pop()!;
    setPicks((current) => {
      redoStack.current.push(current);
      return prev;
    });
    setDirty(true);
    setHistoryVersion((v) => v + 1);
  }, [locked]);

  const redo = useCallback(() => {
    if (locked || redoStack.current.length === 0) return;
    const next = redoStack.current.pop()!;
    setPicks((current) => {
      undoStack.current.push(current);
      return next;
    });
    setDirty(true);
    setHistoryVersion((v) => v + 1);
  }, [locked]);

  const canUndo = undoStack.current.length > 0 && !locked;
  const canRedo = redoStack.current.length > 0 && !locked;

  // Keyboard shortcuts for undo/redo
  useEffect(() => {
    if (locked) return;
    function handleKeyDown(e: KeyboardEvent) {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod || e.key.toLowerCase() !== "z") return;
      // Don't intercept when typing in an input
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      e.preventDefault();
      if (e.shiftKey) { redo(); } else { undo(); }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [locked, undo, redo]);

  const updateTiebreaker = useCallback(
    (value: number | null) => {
      if (locked) return;
      setTiebreaker(value);
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
        body: JSON.stringify({ picks, tiebreaker }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error ?? "Failed to save");
        return;
      }
      setDirty(false);
      setLastSavedAt(new Date());
    } catch {
      setError("Network error");
    } finally {
      setSaving(false);
    }
  }, [bracketId, picks, tiebreaker]);

  // Auto-save: debounce save when dirty
  const autoSaveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!dirty || locked || saving) return;
    autoSaveTimer.current = setTimeout(() => { save(); }, AUTO_SAVE_DELAY_MS);
    return () => { if (autoSaveTimer.current) clearTimeout(autoSaveTimer.current); };
  }, [dirty, locked, saving, picks, tiebreaker, save]);

  return {
    picks, tiebreaker, dirty, saving, error, lastSavedAt,
    makePick, bulkSetPicks, updateTiebreaker, save,
    undo, redo, canUndo, canRedo,
  };
}
