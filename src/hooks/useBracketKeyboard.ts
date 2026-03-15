"use client";

import { useState, useCallback, useEffect } from "react";
import { REGIONS } from "@/lib/bracket-constants";
import { gameId, gamesInRound, getTeamsForGame } from "@/lib/bracket-utils";
import type { RegionData } from "@/types/tournament";
import type { Picks } from "@/types/bracket";

/**
 * Build ordered list of all game IDs for keyboard navigation.
 * Order: East R64→E8, West R64→E8, South R64→E8, Midwest R64→E8, FF, Championship.
 */
function buildGameOrder(): string[] {
  const order: string[] = [];
  for (const region of REGIONS) {
    for (let round = 0; round <= 3; round++) {
      const count = gamesInRound(round);
      for (let i = 0; i < count; i++) {
        order.push(gameId(region, round, i));
      }
    }
  }
  // Final Four
  order.push(gameId("ff", 4, 0));
  order.push(gameId("ff", 4, 1));
  // Championship
  order.push(gameId("ff", 5, 0));
  return order;
}

const GAME_ORDER = buildGameOrder();

interface UseBracketKeyboardOptions {
  regions: RegionData[];
  picks: Picks;
  locked: boolean;
  onPick: (gameId: string, team: string) => void;
}

export function useBracketKeyboard({ regions, picks, locked, onPick }: UseBracketKeyboardOptions) {
  const [focusedGameId, setFocusedGameId] = useState<string | null>(null);

  const focusGame = useCallback((gId: string | null) => {
    setFocusedGameId(gId);
    if (gId) {
      // Scroll the focused game into view
      const el = document.querySelector(`[data-game-id="${gId}"]`);
      el?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
  }, []);

  const findNextUnfilled = useCallback((fromIndex: number, direction: 1 | -1 = 1): string | null => {
    const len = GAME_ORDER.length;
    for (let step = 1; step <= len; step++) {
      const idx = (fromIndex + step * direction + len) % len;
      const gId = GAME_ORDER[idx];
      if (!picks[gId]) {
        const [top, bottom] = getTeamsForGame(gId, regions, picks);
        if (top && bottom) return gId;
      }
    }
    return null;
  }, [regions, picks]);

  useEffect(() => {
    if (locked) return;

    function handleKeyDown(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Undo/redo is handled by useBracketPicks — skip those
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z") return;

      const currentIdx = focusedGameId ? GAME_ORDER.indexOf(focusedGameId) : -1;

      if (e.key === "ArrowDown" || e.key === "ArrowRight") {
        e.preventDefault();
        const nextIdx = currentIdx < GAME_ORDER.length - 1 ? currentIdx + 1 : 0;
        focusGame(GAME_ORDER[nextIdx]);
        return;
      }

      if (e.key === "ArrowUp" || e.key === "ArrowLeft") {
        e.preventDefault();
        const prevIdx = currentIdx > 0 ? currentIdx - 1 : GAME_ORDER.length - 1;
        focusGame(GAME_ORDER[prevIdx]);
        return;
      }

      if (e.key === "Tab") {
        e.preventDefault();
        const startIdx = currentIdx >= 0 ? currentIdx : -1;
        const next = findNextUnfilled(startIdx, e.shiftKey ? -1 : 1);
        if (next) focusGame(next);
        return;
      }

      if (!focusedGameId) return;

      const [topTeam, bottomTeam] = getTeamsForGame(focusedGameId, regions, picks);

      if (e.key === "1" && topTeam) {
        e.preventDefault();
        onPick(focusedGameId, topTeam);
        // Auto-advance to next unfilled
        const next = findNextUnfilled(currentIdx);
        if (next) focusGame(next);
        return;
      }

      if (e.key === "2" && bottomTeam) {
        e.preventDefault();
        onPick(focusedGameId, bottomTeam);
        const next = findNextUnfilled(currentIdx);
        if (next) focusGame(next);
        return;
      }

      if (e.key === "Enter") {
        e.preventDefault();
        // Pick top team if no pick yet, otherwise toggle
        if (!picks[focusedGameId] && topTeam) {
          onPick(focusedGameId, topTeam);
        } else if (picks[focusedGameId] === topTeam && bottomTeam) {
          onPick(focusedGameId, bottomTeam);
        } else if (topTeam) {
          onPick(focusedGameId, topTeam);
        }
        return;
      }

      if (e.key === "Escape") {
        setFocusedGameId(null);
        return;
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [locked, focusedGameId, regions, picks, onPick, focusGame, findNextUnfilled]);

  return { focusedGameId, setFocusedGameId: focusGame };
}
