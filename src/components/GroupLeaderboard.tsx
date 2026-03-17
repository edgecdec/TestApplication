"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import type { LeaderboardEntry } from "@/types/scoring";
import type { BracketReactions as BracketReactionsMap } from "@/types/reactions";
import { ROUND_NAMES } from "@/lib/bracket-constants";
import ScoringBreakdownDialog from "@/components/ScoringBreakdownDialog";
import HeadToHeadDialog from "@/components/HeadToHeadDialog";
import TeamLogo from "@/components/TeamLogo";
import StreakBadge from "@/components/StreakBadge";
import MiniBracketPreview from "@/components/MiniBracketPreview";
import BracketReactions from "@/components/BracketReactions";
import { leaderboardToCSV, downloadCSV } from "@/lib/csv-export";
import { leaderboardToText } from "@/lib/standings-text";
import { generateTrashTalk } from "@/lib/trash-talk";

type SortKey = "rank" | "total" | "maxPossible" | "bestPossibleFinish" | "correctPicks" | "tiebreaker" | "percentile" | "luckScore" | `round-${number}`;

const MAX_H2H_SELECTIONS = 2;

interface Props {
  entries: LeaderboardEntry[];
  actualTotal: number | null;
  groupId?: string;
  groupName?: string;
  paymentLink?: string;
  fetchUrl?: string;
  completedRounds?: number[];
}

function parseSortKey(key: SortKey): { type: "field"; field: keyof LeaderboardEntry } | { type: "round"; index: number } {
  if (key.startsWith("round-")) return { type: "round", index: parseInt(key.split("-")[1], 10) };
  return { type: "field", field: key as keyof LeaderboardEntry };
}

function getSortValue(entry: LeaderboardEntry, key: SortKey): number {
  const parsed = parseSortKey(key);
  if (parsed.type === "round") return entry.rounds[parsed.index]?.points ?? 0;
  const val = entry[parsed.field];
  return typeof val === "number" ? val : 0;
}

export default function GroupLeaderboard({ entries, actualTotal, groupId, groupName, paymentLink, fetchUrl, completedRounds }: Props) {
  const router = useRouter();
  const [selectedBracketId, setSelectedBracketId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState("");
  const [h2hIds, setH2hIds] = useState<number[]>([]);
  const [showH2h, setShowH2h] = useState(false);
  const [copied, setCopied] = useState(false);
  const [trashCopied, setTrashCopied] = useState(false);
  const [reactions, setReactions] = useState<BracketReactionsMap>({});
  const [asOfRound, setAsOfRound] = useState<number | null>(null);
  const [timeMachineEntries, setTimeMachineEntries] = useState<LeaderboardEntry[] | null>(null);
  const [tmLoading, setTmLoading] = useState(false);

  // Fetch historical leaderboard when asOfRound changes
  useEffect(() => {
    if (asOfRound === null || !fetchUrl) {
      setTimeMachineEntries(null);
      return;
    }
    setTmLoading(true);
    fetch(`${fetchUrl}?asOfRound=${asOfRound}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.leaderboard) setTimeMachineEntries(data.leaderboard);
      })
      .catch(() => {})
      .finally(() => setTmLoading(false));
  }, [asOfRound, fetchUrl]);

  const activeEntries = timeMachineEntries ?? entries;

  // Fetch reactions for group leaderboards
  useEffect(() => {
    if (!groupId) return;
    fetch(`/api/groups/${groupId}/reactions`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.reactions) setReactions(data.reactions); })
      .catch(() => {});
  }, [groupId]);

  const toggleReaction = useCallback(async (bracketId: number, emoji: string) => {
    if (!groupId) return;
    const res = await fetch(`/api/groups/${groupId}/reactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bracketId, emoji }),
    });
    if (!res.ok) return;
    const { action } = await res.json() as { action: "added" | "removed" };
    setReactions((prev) => {
      const updated = { ...prev };
      const list = [...(updated[bracketId] || [])];
      const idx = list.findIndex((r) => r.emoji === emoji);
      if (action === "added") {
        if (idx >= 0) { list[idx] = { ...list[idx], count: list[idx].count + 1, reacted: true }; }
        else { list.push({ emoji: emoji as import("@/types/reactions").ReactionEmoji, count: 1, reacted: true }); }
      } else {
        if (idx >= 0) {
          const newCount = list[idx].count - 1;
          if (newCount <= 0) list.splice(idx, 1);
          else list[idx] = { ...list[idx], count: newCount, reacted: false };
        }
      }
      updated[bracketId] = list;
      return updated;
    });
  }, [groupId]);

  function toggleH2h(bracketId: number) {
    setH2hIds((prev) => {
      if (prev.includes(bracketId)) return prev.filter((id) => id !== bracketId);
      if (prev.length >= MAX_H2H_SELECTIONS) return [prev[1], bracketId];
      return [...prev, bracketId];
    });
  }

  const filtered = useMemo(() => {
    if (!search.trim()) return activeEntries;
    const q = search.toLowerCase();
    return activeEntries.filter((e) => e.username.toLowerCase().includes(q) || e.bracketName.toLowerCase().includes(q));
  }, [activeEntries, search]);

  const sorted = useMemo(() => {
    if (sortKey === "rank") return filtered;
    const copy = [...filtered];
    const lowerIsBetter = sortKey === "bestPossibleFinish" || sortKey === "tiebreaker";
    copy.sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      const diff = sortAsc ? av - bv : bv - av;
      return diff !== 0 ? diff : a.rank - b.rank;
    });
    // For "lower is better" columns, ascending means smallest first (which is the natural sort)
    // For "higher is better" columns, we want descending by default
    if (!lowerIsBetter) {
      // Default click should show highest first
    }
    return copy;
  }, [activeEntries, sortKey, sortAsc]);

  function handleSort(key: SortKey) {
    if (sortKey === key) {
      if (sortKey === "rank") return;
      setSortAsc((prev) => !prev);
    } else {
      setSortKey(key);
      const lowerIsBetter = key === "bestPossibleFinish" || key === "tiebreaker";
      setSortAsc(lowerIsBetter);
    }
  }

  const arrow = (key: SortKey) => {
    if (sortKey !== key) return "";
    return sortAsc ? " ▲" : " ▼";
  };

  const thClass = "px-3 py-2 font-medium cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap";

  if (entries.length === 0 && !timeMachineEntries) {
    return <div className="bg-white rounded-lg shadow p-6 text-gray-500">No brackets to score yet.</div>;
  }

  const hasTimeMachine = completedRounds && completedRounds.length > 1 && fetchUrl;

  return (
    <>
      <div className="mb-3 flex items-center gap-2 flex-wrap">
        <input
          type="text"
          placeholder="Search by username or bracket name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
        />
        {search && (
          <span className="text-xs text-gray-500">{sorted.length} of {activeEntries.length}</span>
        )}
        {groupId && h2hIds.length === MAX_H2H_SELECTIONS && (
          <button
            onClick={() => setShowH2h(true)}
            className="px-3 py-2 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition"
          >
            ⚔️ Head-to-Head
          </button>
        )}
        {groupId && h2hIds.length > 0 && h2hIds.length < MAX_H2H_SELECTIONS && (
          <span className="text-xs text-gray-500">Select {MAX_H2H_SELECTIONS - h2hIds.length} more to compare</span>
        )}
        <button
          onClick={() => {
            const csv = leaderboardToCSV(activeEntries);
            const name = groupName ? groupName.replace(/[^a-zA-Z0-9]/g, "_") : "leaderboard";
            downloadCSV(csv, `${name}_standings.csv`);
          }}
          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition whitespace-nowrap"
          title="Export leaderboard as CSV"
        >
          📥 Export CSV
        </button>
        <button
          onClick={() => {
            const text = leaderboardToText(activeEntries, groupName);
            navigator.clipboard.writeText(text).then(() => {
              setCopied(true);
              setTimeout(() => setCopied(false), 2000);
            });
          }}
          className="px-3 py-2 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition whitespace-nowrap"
          title="Copy standings to clipboard"
        >
          {copied ? "✅ Copied!" : "📋 Copy Standings"}
        </button>
        <button
          onClick={() => {
            const text = generateTrashTalk(activeEntries, groupName);
            navigator.clipboard.writeText(text).then(() => {
              setTrashCopied(true);
              setTimeout(() => setTrashCopied(false), 2000);
            });
          }}
          className="px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded hover:bg-orange-200 transition whitespace-nowrap"
          title="Generate trash talk based on current standings"
        >
          {trashCopied ? "✅ Copied!" : "🗣️ Trash Talk"}
        </button>
        {hasTimeMachine && (
          <select
            value={asOfRound ?? "current"}
            onChange={(e) => setAsOfRound(e.target.value === "current" ? null : parseInt(e.target.value, 10))}
            className="px-3 py-2 text-sm border rounded bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-700 cursor-pointer"
            title="View standings as of a specific round"
          >
            <option value="current">⏱️ Current</option>
            {completedRounds!.map((r) => (
              <option key={r} value={r}>⏱️ After {ROUND_NAMES[r]}</option>
            ))}
          </select>
        )}
        {tmLoading && <span className="text-xs text-gray-400">Loading…</span>}
        {asOfRound !== null && !tmLoading && (
          <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
            📸 Viewing after {ROUND_NAMES[asOfRound]}
          </span>
        )}
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              {groupId && <th className="px-2 py-2 font-medium w-8" title="Select two brackets for head-to-head">⚔️</th>}
              <th className={`text-left ${thClass}`} onClick={() => handleSort("rank")}>#</th>
              <th className="text-left px-3 py-2 font-medium">Bracket</th>
              <th className="text-left px-3 py-2 font-medium">User</th>
              <th className="text-left px-3 py-2 font-medium">Champion</th>
              <th className="text-left px-3 py-2 font-medium">Final Four</th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort("total")}>Total{arrow("total")}</th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort("correctPicks")} title="Correct picks out of resolved games">Correct{arrow("correctPicks")}</th>
              <th className="text-right px-3 py-2 font-medium whitespace-nowrap" title="Pick streak">Streak</th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort("luckScore")} title="Luck score: actual minus expected score based on pick popularity. Positive = lucky, negative = unlucky.">🍀{arrow("luckScore")}</th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort("maxPossible")} title="Maximum possible score if all remaining alive picks win">Max{arrow("maxPossible")}</th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort("bestPossibleFinish")} title="Best rank this bracket can still achieve">Best{arrow("bestPossibleFinish")}</th>
              {ROUND_NAMES.map((rn, i) => (
                <th key={rn} className={`text-right ${thClass} text-xs`} onClick={() => handleSort(`round-${i}` as SortKey)}>{rn}{arrow(`round-${i}` as SortKey)}</th>
              ))}
              <th className={`text-right ${thClass}`} onClick={() => handleSort("tiebreaker")}>TB{arrow("tiebreaker")}</th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort("percentile")}>%ile{arrow("percentile")}</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((e) => (
              <tr key={e.bracketId} className={`border-t hover:bg-gray-50 ${h2hIds.includes(e.bracketId) ? "bg-purple-50 dark:bg-purple-900/20" : ""}`}>
                {groupId && (
                  <td className="px-2 py-2 text-center">
                    <input
                      type="checkbox"
                      checked={h2hIds.includes(e.bracketId)}
                      onChange={() => toggleH2h(e.bracketId)}
                      className="accent-purple-600"
                    />
                  </td>
                )}
                <td className="px-3 py-2 text-gray-400 font-medium">
                  {e.rank}
                  {e.rankChange != null && e.rankChange !== 0 && (
                    <span className={`ml-1 text-xs font-semibold ${e.rankChange > 0 ? "text-green-600" : "text-red-500"}`} title={`${e.rankChange > 0 ? "Up" : "Down"} ${Math.abs(e.rankChange)} from last round`}>
                      {e.rankChange > 0 ? `↑${e.rankChange}` : `↓${Math.abs(e.rankChange)}`}
                    </span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <MiniBracketPreview
                    finalFourPicks={e.finalFourPicks}
                    semifinalPicks={e.semifinalPicks ?? [null, null]}
                    championPick={e.championPick}
                    busted={e.busted}
                  >
                    <button
                      onClick={() => router.push(`/bracket/${e.bracketId}`)}
                      className="text-blue-600 hover:underline"
                    >
                      {e.bracketName}
                    </button>
                    {e.isSecondChance && (
                      <span className="ml-1 text-[9px] bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300 px-1 py-0.5 rounded">2nd</span>
                    )}
                  </MiniBracketPreview>
                  {groupId && (
                    <BracketReactions
                      bracketId={e.bracketId}
                      reactions={reactions[e.bracketId] || []}
                      onToggle={toggleReaction}
                    />
                  )}
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => router.push(`/profile/${encodeURIComponent(e.username)}`)}
                    className="text-gray-600 hover:text-blue-600 hover:underline"
                  >
                    {e.username}
                  </button>
                  {e.eliminated && <span className="ml-1" title="Eliminated — can't catch the leader">🚫</span>}
                  {e.paid === true && <span className="ml-1" title="Paid">💰</span>}
                  {e.paid === false && (
                    <>
                      <span className="ml-1" title="Unpaid">⚠️</span>
                      {paymentLink && (
                        <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="ml-1 text-xs text-blue-600 hover:underline" title="Pay now">💸 Pay</a>
                      )}
                    </>
                  )}
                </td>
                <td className="px-3 py-2 text-sm whitespace-nowrap">
                  {e.championPick ? (
                    <span className={`flex items-center gap-1 ${e.busted ? "text-gray-400 line-through" : ""}`}>
                      <TeamLogo team={e.championPick} />
                      {e.championPick}
                      {e.busted && <span className="ml-1 no-underline" style={{ textDecoration: "none" }} title="Champion pick eliminated">💀</span>}
                    </span>
                  ) : (
                    <span className="text-gray-300">—</span>
                  )}
                </td>
                <td className="px-3 py-2">
                  <div className="flex gap-1">
                    {e.finalFourPicks?.map((ff) => (
                      ff.team ? (
                        <span
                          key={ff.region}
                          className={`inline-flex items-center gap-0.5 text-xs px-1 py-0.5 rounded ${ff.eliminated ? "bg-red-50 text-gray-400 line-through" : "bg-gray-100"}`}
                          title={`${ff.region}: (${ff.seed}) ${ff.team}${ff.eliminated ? " — eliminated" : ""}`}
                        >
                          <TeamLogo team={ff.team} />
                          <span className="text-[10px] text-gray-500">{ff.seed}</span>
                        </span>
                      ) : (
                        <span key={ff.region} className="text-gray-300 text-xs px-1">—</span>
                      )
                    ))}
                  </div>
                </td>
                <td className="px-3 py-2 text-right font-bold">
                  {groupId ? (
                    <button
                      onClick={() => setSelectedBracketId(e.bracketId)}
                      className="text-blue-600 hover:underline font-bold"
                      title="Click for scoring breakdown"
                    >
                      {e.total}
                    </button>
                  ) : (
                    e.total
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-600">
                  {e.correctPicks}/{e.totalResolved}
                </td>
                <td className="px-3 py-2 text-right">
                  <StreakBadge streak={e.streak} />
                </td>
                <td className="px-3 py-2 text-right text-xs font-medium whitespace-nowrap" title={e.luckScore != null ? `Luck: ${e.luckScore > 0 ? "+" : ""}${e.luckScore}` : "No data"}>
                  {e.luckScore != null ? (
                    <span className={e.luckScore > 0 ? "text-green-600" : e.luckScore < 0 ? "text-red-500" : "text-gray-400"}>
                      {e.luckScore > 0 ? "+" : ""}{e.luckScore}
                    </span>
                  ) : "—"}
                </td>
                <td className="px-3 py-2 text-right text-gray-500" title="Max possible score">
                  {e.maxPossible}
                </td>
                <td className="px-3 py-2 text-right text-gray-500" title="Best possible finish">
                  #{e.bestPossibleFinish}
                </td>
                {e.rounds.map((r, i) => (
                  <td key={i} className="px-3 py-2 text-right text-xs">
                    <span>{r.points}</span>
                    {r.upsetBonus > 0 && (
                      <span className="text-green-600 ml-0.5" title={`+${r.upsetBonus} upset bonus`}>*</span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-2 text-right text-gray-500">
                  {e.tiebreaker != null ? e.tiebreaker : "—"}
                  {e.tiebreakerDiff != null && (
                    <span className="text-xs text-gray-400 ml-1">(±{e.tiebreakerDiff})</span>
                  )}
                </td>
                <td className="px-3 py-2 text-right text-gray-500">{e.percentile}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedBracketId !== null && groupId && (
        <ScoringBreakdownDialog
          groupId={groupId}
          bracketId={selectedBracketId}
          onClose={() => setSelectedBracketId(null)}
        />
      )}

      {showH2h && h2hIds.length === MAX_H2H_SELECTIONS && groupId && (
        <HeadToHeadDialog
          bracketIdA={h2hIds[0]}
          bracketIdB={h2hIds[1]}
          groupId={groupId}
          onClose={() => setShowH2h(false)}
        />
      )}
    </>
  );
}
