import type { LeaderboardEntry } from "@/types/scoring";
import { ROUND_NAMES } from "@/lib/bracket-constants";

function escapeCSV(val: string): string {
  if (val.includes(",") || val.includes('"') || val.includes("\n")) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}

export function leaderboardToCSV(entries: LeaderboardEntry[]): string {
  const headers = [
    "Rank", "Username", "Bracket", "Champion", "Total", "Correct", "Max Possible",
    "Best Finish", "Luck", ...ROUND_NAMES, "Tiebreaker", "Percentile",
  ];

  const rows = entries.map((e) => [
    String(e.rank),
    escapeCSV(e.username),
    escapeCSV(e.bracketName),
    escapeCSV(e.championPick ?? ""),
    String(e.total),
    `${e.correctPicks}/${e.totalResolved}`,
    String(e.maxPossible),
    String(e.bestPossibleFinish),
    e.luckScore != null ? String(e.luckScore) : "",
    ...e.rounds.map((r) => String(r.points)),
    e.tiebreaker != null ? String(e.tiebreaker) : "",
    String(e.percentile),
  ]);

  return [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
}

export function downloadCSV(csv: string, filename: string) {
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
