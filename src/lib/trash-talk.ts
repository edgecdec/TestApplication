import type { LeaderboardEntry } from "@/types/scoring";

/**
 * Generate a contextual trash talk message based on current group standings.
 * Uses template strings with dynamic data — no AI, no external services.
 */

const LEADER_TAUNTS = [
  (name: string, pts: number) => `👑 ${name} is running away with it at ${pts} pts. The rest of you are just playing for second.`,
  (name: string, pts: number) => `${name} sitting pretty at ${pts} pts while the rest of you fight over scraps. 😏`,
  (name: string) => `All hail ${name}, the bracket genius. Or maybe just the luckiest person in the pool. 🍀`,
];

const LAST_PLACE_BURNS = [
  (name: string) => `${name}, your bracket belongs in a museum — as a cautionary tale. 🏛️`,
  (name: string) => `${name} is proof that a coin flip would've been a better strategy. 🪙`,
  (name: string) => `Somebody check on ${name}. Their bracket is in critical condition. 🚑`,
];

const BUSTED_CHAMP = [
  (name: string, team: string) => `${name} picked ${team} to win it all. ${team} said "nah." 💀`,
  (name: string, team: string) => `RIP to ${name}'s bracket. ${team} was supposed to be the one. 🪦`,
  (name: string, team: string) => `${name} really thought ${team} was going all the way. Bold. Wrong, but bold. 💀`,
];

const HOT_STREAK = [
  (name: string, n: number) => `🔥 ${name} is on a ${n}-game heater. Somebody stop them!`,
  (name: string, n: number) => `${name} has gotten ${n} straight right. Are they from the future? 🔮`,
];

const COLD_STREAK = [
  (name: string, n: number) => `❄️ ${name} has gotten ${n} straight WRONG. Maybe try picking with your eyes open?`,
  (name: string, n: number) => `${name}: ${n} wrong in a row. At this point it's impressive. ❄️`,
];

const ELIMINATED_BURNS = [
  (name: string) => `${name} is mathematically eliminated. Time to start rooting for chaos. 🚫`,
  (name: string) => `${name} can't win even if they get every remaining pick right. Brutal. 🚫`,
];

const CLOSE_RACE = [
  (a: string, b: string, diff: number) => `${a} leads ${b} by just ${diff} pts. This is going down to the wire! ⚡`,
  (a: string, b: string) => `${a} and ${b} are neck and neck. Somebody's about to get their heart broken. 💔`,
];

const GENERIC_CLOSERS = [
  "March Madness doesn't care about your feelings. 🏀",
  "Chalk is boring. Chaos is king. 👑",
  "Your bracket is only as good as your worst pick.",
  "Remember: nobody has ever picked a perfect bracket. You're in good company. 📉",
  "The tournament doesn't end until someone cuts down the nets. 🏀✂️",
];

const LUCKY_TAUNTS = [
  (name: string, luck: number) => `🍀 ${name} has a luck score of +${luck}. Skill? Nah. Pure horseshoes. 🐴`,
  (name: string, luck: number) => `${name} is +${luck} on luck. Even their wrong picks somehow work out. 🍀`,
];

const UNLUCKY_BURNS = [
  (name: string, luck: number) => `${name} is ${luck} on luck. The universe is actively working against them. 😤`,
  (name: string, luck: number) => `${name} at ${luck} luck — they made the right calls, the teams just didn't cooperate. 🫠`,
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function generateTrashTalk(entries: LeaderboardEntry[], groupName?: string): string {
  if (entries.length === 0) return "No brackets to roast yet. 🦗";

  const lines: string[] = [];
  if (groupName) lines.push(`🗣️ ${groupName} Trash Talk Report\n`);

  const leader = entries[0];
  const last = entries[entries.length - 1];

  // Leader taunt
  lines.push(pick(LEADER_TAUNTS)(leader.bracketName, leader.total));

  // Last place burn (only if more than 2 entries and last != leader)
  if (entries.length > 2 && last.bracketId !== leader.bracketId) {
    lines.push(pick(LAST_PLACE_BURNS)(last.bracketName));
  }

  // Busted champion picks
  const busted = entries.filter((e) => e.busted && e.championPick);
  if (busted.length > 0) {
    const victim = pick(busted);
    lines.push(pick(BUSTED_CHAMP)(victim.bracketName, victim.championPick!));
  }

  // Hot streaks (5+)
  const hot = entries.filter((e) => e.streak >= 5);
  if (hot.length > 0) {
    const h = pick(hot);
    lines.push(pick(HOT_STREAK)(h.bracketName, h.streak));
  }

  // Cold streaks (3+)
  const cold = entries.filter((e) => e.streak <= -3);
  if (cold.length > 0) {
    const c = pick(cold);
    lines.push(pick(COLD_STREAK)(c.bracketName, Math.abs(c.streak)));
  }

  // Eliminated brackets
  const elim = entries.filter((e) => e.eliminated);
  if (elim.length > 0 && elim.length < entries.length) {
    const e = pick(elim);
    lines.push(pick(ELIMINATED_BURNS)(e.bracketName));
  }

  // Close race at the top
  if (entries.length >= 2) {
    const diff = entries[0].total - entries[1].total;
    if (diff > 0 && diff <= 10) {
      lines.push(pick(CLOSE_RACE)(entries[0].bracketName, entries[1].bracketName, diff));
    }
  }

  // Luckiest bracket
  const withLuck = entries.filter((e) => e.luckScore != null && e.luckScore !== 0);
  if (withLuck.length > 0) {
    const luckiest = withLuck.reduce((a, b) => (a.luckScore! > b.luckScore! ? a : b));
    const unluckiest = withLuck.reduce((a, b) => (a.luckScore! < b.luckScore! ? a : b));
    if (luckiest.luckScore! > 5) {
      lines.push(pick(LUCKY_TAUNTS)(luckiest.bracketName, Math.round(luckiest.luckScore!)));
    }
    if (unluckiest.luckScore! < -5) {
      lines.push(pick(UNLUCKY_BURNS)(unluckiest.bracketName, Math.round(unluckiest.luckScore!)));
    }
  }

  // Generic closer
  lines.push(`\n${pick(GENERIC_CLOSERS)}`);

  return lines.join("\n");
}
