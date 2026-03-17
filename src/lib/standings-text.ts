import type { LeaderboardEntry } from "@/types/scoring";

const MEDALS = ["🥇", "🥈", "🥉"] as const;

/**
 * Format leaderboard entries as a human-readable text summary for pasting into
 * group chats, iMessage, Slack, Discord, etc.
 */
export function leaderboardToText(entries: LeaderboardEntry[], groupName?: string): string {
  const lines: string[] = [];

  if (groupName) lines.push(`📊 ${groupName} Standings`);
  lines.push(`${entries.length} bracket${entries.length !== 1 ? "s" : ""}`);
  lines.push("");

  for (const e of entries) {
    const medal = e.rank <= MEDALS.length ? MEDALS[e.rank - 1] : `${e.rank}.`;
    const champ = e.championPick ? ` | 🏆 ${e.championPick}${e.busted ? " 💀" : ""}` : "";
    const streak = e.streak > 0 ? ` | 🔥${e.streak}` : e.streak < 0 ? ` | ❄️${Math.abs(e.streak)}` : "";
    const luck = e.luckScore != null && e.luckScore !== 0 ? ` | 🍀${e.luckScore > 0 ? "+" : ""}${e.luckScore}` : "";
    const eliminated = e.eliminated ? " 🚫" : "";
    lines.push(`${medal} ${e.bracketName} (${e.username}) — ${e.total} pts${champ}${streak}${luck}${eliminated}`);
  }

  return lines.join("\n");
}
