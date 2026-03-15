"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { LeaderboardEntry } from "@/types/scoring";
import { ROUND_NAMES } from "@/lib/bracket-constants";
import ScoringBreakdownDialog from "@/components/ScoringBreakdownDialog";
import TeamLogo from "@/components/TeamLogo";

type SortKey = "rank" | "total" | "maxPossible" | "bestPossibleFinish" | "correctPicks" | "tiebreaker" | "percentile" | `round-${number}`;

interface Props {
  entries: LeaderboardEntry[];
  actualTotal: number | null;
  groupId?: string;
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

export default function GroupLeaderboard({ entries, actualTotal, groupId }: Props) {
  const router = useRouter();
  const [selectedBracketId, setSelectedBracketId] = useState<number | null>(null);
  const [sortKey, setSortKey] = useState<SortKey>("rank");
  const [sortAsc, setSortAsc] = useState(true);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!search.trim()) return entries;
    const q = search.toLowerCase();
    return entries.filter((e) => e.username.toLowerCase().includes(q) || e.bracketName.toLowerCase().includes(q));
  }, [entries, search]);

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
  }, [entries, sortKey, sortAsc]);

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

  if (entries.length === 0) {
    return <div className="bg-white rounded-lg shadow p-6 text-gray-500">No brackets to score yet.</div>;
  }

  return (
    <>
      <div className="mb-3">
        <input
          type="text"
          placeholder="Search by username or bracket name…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border rounded text-sm dark:bg-gray-800 dark:border-gray-600 dark:text-gray-200"
        />
        {search && (
          <span className="ml-2 text-xs text-gray-500">{sorted.length} of {entries.length}</span>
        )}
      </div>
      <div className="bg-white rounded-lg shadow overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className={`text-left ${thClass}`} onClick={() => handleSort("rank")}>#</th>
              <th className="text-left px-3 py-2 font-medium">Bracket</th>
              <th className="text-left px-3 py-2 font-medium">User</th>
              <th className="text-left px-3 py-2 font-medium">Champion</th>
              <th className="text-left px-3 py-2 font-medium">Final Four</th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort("total")}>Total{arrow("total")}</th>
              <th className={`text-right ${thClass}`} onClick={() => handleSort("correctPicks")} title="Correct picks out of resolved games">Correct{arrow("correctPicks")}</th>
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
              <tr key={e.bracketId} className="border-t hover:bg-gray-50">
                <td className="px-3 py-2 text-gray-400 font-medium">{e.rank}</td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => router.push(`/bracket/${e.bracketId}`)}
                    className="text-blue-600 hover:underline"
                  >
                    {e.bracketName}
                  </button>
                </td>
                <td className="px-3 py-2">
                  <button
                    onClick={() => router.push(`/profile/${encodeURIComponent(e.username)}`)}
                    className="text-gray-600 hover:text-blue-600 hover:underline"
                  >
                    {e.username}
                  </button>
                  {e.eliminated && <span className="ml-1" title="Eliminated — can't catch the leader">🚫</span>}
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
    </>
  );
}
