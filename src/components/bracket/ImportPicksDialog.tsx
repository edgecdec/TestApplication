"use client";

import { useState, useMemo } from "react";
import type { RegionData } from "@/types/tournament";
import type { Picks } from "@/types/bracket";
import { fuzzyMatchTeams } from "@/lib/fuzzy-match";
import { REGIONS } from "@/lib/bracket-constants";
import { gameId, getTeamsForGame, gamesInRound } from "@/lib/bracket-utils";

interface Props {
  regions: RegionData[];
  existingPicks: Picks;
  onImport: (picks: Picks) => void;
  onClose: () => void;
}

/** Parse input text into team name candidates. */
function parseInput(text: string): string[] {
  // Split by newlines or commas, filter empty
  return text
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Get all team names from regions. */
function getAllTeams(regions: RegionData[]): string[] {
  const teams: string[] = [];
  for (const r of regions) {
    for (const t of r.seeds) teams.push(t.name);
  }
  return teams;
}

/**
 * Given a set of teams to advance, fill picks by processing rounds in order.
 * For each game, if one of the target teams is playing, pick them.
 */
function fillPicksForTeams(
  targetTeams: Set<string>,
  regions: RegionData[],
  existingPicks: Picks
): Picks {
  const picks: Picks = { ...existingPicks };

  // Process regional rounds 0-3
  for (const region of REGIONS) {
    for (let round = 0; round <= 3; round++) {
      const count = gamesInRound(round);
      for (let i = 0; i < count; i++) {
        const gId = gameId(region, round, i);
        if (picks[gId]) continue;
        const [top, bottom] = getTeamsForGame(gId, regions, picks);
        if (top && targetTeams.has(top)) picks[gId] = top;
        else if (bottom && targetTeams.has(bottom)) picks[gId] = bottom;
      }
    }
  }

  // Final Four
  for (let i = 0; i < 2; i++) {
    const gId = gameId("ff", 4, i);
    if (picks[gId]) continue;
    const [top, bottom] = getTeamsForGame(gId, regions, picks);
    if (top && targetTeams.has(top)) picks[gId] = top;
    else if (bottom && targetTeams.has(bottom)) picks[gId] = bottom;
  }

  // Championship
  const champId = gameId("ff", 5, 0);
  if (!picks[champId]) {
    const [top, bottom] = getTeamsForGame(champId, regions, picks);
    if (top && targetTeams.has(top)) picks[champId] = top;
    else if (bottom && targetTeams.has(bottom)) picks[champId] = bottom;
  }

  return picks;
}

export default function ImportPicksDialog({ regions, existingPicks, onImport, onClose }: Props) {
  const [text, setText] = useState("");
  const allTeams = useMemo(() => getAllTeams(regions), [regions]);

  const parsed = useMemo(() => parseInput(text), [text]);
  const matches = useMemo(() => fuzzyMatchTeams(parsed, allTeams), [parsed, allTeams]);

  const matchedTeams = useMemo(() => {
    const set = new Set<string>();
    for (const m of matches) if (m.match) set.add(m.match);
    return set;
  }, [matches]);

  const previewPicks = useMemo(
    () => fillPicksForTeams(matchedTeams, regions, existingPicks),
    [matchedTeams, regions, existingPicks]
  );

  const newPickCount = Object.keys(previewPicks).length - Object.keys(existingPicks).length;

  function handleImport() {
    onImport(previewPicks);
    onClose();
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] flex flex-col">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg font-bold">📋 Import Picks</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-xl">×</button>
        </div>

        <div className="p-4 flex-1 overflow-auto space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Paste team names (one per line or comma-separated). Teams will be advanced through the bracket.
          </p>

          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Duke&#10;UConn&#10;Gonzaga&#10;..."
            className="w-full h-32 border rounded p-2 text-sm dark:bg-gray-700 dark:border-gray-600 dark:text-white"
          />

          {matches.length > 0 && (
            <div className="border rounded dark:border-gray-600 max-h-48 overflow-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700 sticky top-0">
                  <tr>
                    <th className="text-left p-2">Input</th>
                    <th className="text-left p-2">Matched Team</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((m, i) => (
                    <tr key={i} className="border-t dark:border-gray-600">
                      <td className="p-2">{m.input}</td>
                      <td className="p-2">
                        {m.match ? (
                          <span className="text-green-600 dark:text-green-400">✓ {m.match}</span>
                        ) : (
                          <span className="text-red-500">✗ No match</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {matchedTeams.size > 0 && (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              {matchedTeams.size} team{matchedTeams.size !== 1 ? "s" : ""} matched → {newPickCount} new pick{newPickCount !== 1 ? "s" : ""} will be added
            </p>
          )}
        </div>

        <div className="p-4 border-t dark:border-gray-700 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={matchedTeams.size === 0}
            className="px-4 py-2 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition"
          >
            Import {matchedTeams.size > 0 ? `(${newPickCount} picks)` : ""}
          </button>
        </div>
      </div>
    </div>
  );
}
