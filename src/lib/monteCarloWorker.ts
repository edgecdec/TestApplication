/**
 * Web Worker for Monte Carlo bracket simulation.
 * Self-contained — no imports (workers can't use path aliases).
 * Runs N simulations of remaining tournament games using seed win rates,
 * scores all brackets in each sim, and computes win probability / avg score / avg finish.
 */

interface SimRequest {
  entries: { key: string; picks: Record<string, string> }[];
  results: Record<string, string>;
  hypo: Record<string, string>;
  regionNames: string[];
  teamSeeds: Record<string, number>;
  scoring: { pointsPerRound: number[]; upsetBonusPerRound: number[] };
  seedWinRates: Record<string, number>;
  totalSims: number;
}

const SEED_PAIRS: [number, number][] = [
  [1, 16], [8, 9], [5, 12], [4, 13], [6, 11], [3, 14], [7, 10], [2, 15],
];

function getWinProb(seedA: number, seedB: number, rates: Record<string, number>): number {
  if (seedA === seedB) return 0.5;
  const hi = Math.min(seedA, seedB);
  const lo = Math.max(seedA, seedB);
  const key = `${hi}-${lo}`;
  if (rates[key] !== undefined) return seedA === hi ? rates[key] : 1 - rates[key];
  // Fallback: logistic estimate based on seed difference
  const diff = seedB - seedA;
  return 1 / (1 + Math.exp(-0.15 * diff));
}

function buildGameIds(regionNames: string[]): string[] {
  const ids: string[] = [];
  for (const r of regionNames) {
    for (let round = 0; round < 4; round++) {
      const count = 8 / Math.pow(2, round);
      for (let i = 0; i < count; i++) ids.push(`${r}-${round}-${i}`);
    }
  }
  ids.push("ff-4-0", "ff-4-1", "ff-5-0");
  return ids;
}

function feeders(gameId: string, regionNames: string[]): [string, string] | null {
  const p = gameId.split("-");
  const region = p[0];
  const round = parseInt(p[1]);
  const idx = parseInt(p[2]);
  if (region === "ff") {
    if (round === 4 && idx === 0) return [`${regionNames[0]}-3-0`, `${regionNames[2]}-3-0`];
    if (round === 4 && idx === 1) return [`${regionNames[1]}-3-0`, `${regionNames[3]}-3-0`];
    if (round === 5) return ["ff-4-0", "ff-4-1"];
    return null;
  }
  if (round === 0) return null;
  return [`${region}-${round - 1}-${idx * 2}`, `${region}-${round - 1}-${idx * 2 + 1}`];
}

function r64Teams(gameId: string): [string, string] {
  const p = gameId.split("-");
  const region = p[0];
  const idx = parseInt(p[2]);
  const pair = SEED_PAIRS[idx];
  return [`${region}-${pair[0]}`, `${region}-${pair[1]}`];
}

function scorePicks(
  picks: Record<string, string>,
  simResults: Record<string, string>,
  pts: number[],
  bonus: number[],
  teamSeeds: Record<string, number>,
  gameIds: string[],
  regionNames: string[],
): number {
  let score = 0;
  for (const gid of gameIds) {
    const winner = simResults[gid];
    if (!winner || picks[gid] !== winner) continue;
    const round = parseInt(gid.split("-")[1]);
    score += pts[round] || 0;
    if (bonus[round] > 0) {
      let loser: string | undefined;
      if (round === 0 && gid.split("-")[0] !== "ff") {
        const [a, b] = r64Teams(gid);
        loser = winner === a ? b : a;
      } else {
        const f = feeders(gid, regionNames);
        if (f) {
          const a = simResults[f[0]];
          const b = simResults[f[1]];
          loser = winner === a ? b : (winner === b ? a : undefined);
        }
      }
      if (loser) {
        const ws = teamSeeds[winner];
        const ls = teamSeeds[loser];
        if (ws !== undefined && ls !== undefined && ws > ls) {
          score += bonus[round] * (ws - ls);
        }
      }
    }
  }
  return score;
}

self.onmessage = (e: MessageEvent<SimRequest>) => {
  const { entries, results, hypo, regionNames, teamSeeds, scoring, seedWinRates, totalSims } = e.data;
  const gameIds = buildGameIds(regionNames);
  const fixed = { ...results, ...hypo };
  const pts = scoring.pointsPerRound;
  const bonus = scoring.upsetBonusPerRound;

  const totals: Record<string, { score: number; rank: number; wins: number }> = {};
  for (const ent of entries) totals[ent.key] = { score: 0, rank: 0, wins: 0 };

  const BATCH = 100;
  for (let s = 0; s < totalSims; s++) {
    const sim: Record<string, string> = { ...fixed };
    for (const gid of gameIds) {
      if (sim[gid]) continue;
      const p = gid.split("-");
      const region = p[0];
      const round = parseInt(p[1]);
      let teamA: string | undefined, teamB: string | undefined;
      if (round === 0 && region !== "ff") {
        [teamA, teamB] = r64Teams(gid);
      } else {
        const f = feeders(gid, regionNames);
        if (f) { teamA = sim[f[0]]; teamB = sim[f[1]]; }
      }
      if (!teamA || !teamB) continue;
      const seedA = teamSeeds[teamA] ?? 8;
      const seedB = teamSeeds[teamB] ?? 8;
      const prob = getWinProb(seedA, seedB, seedWinRates);
      sim[gid] = Math.random() < prob ? teamA : teamB;
    }

    const scores: { key: string; score: number }[] = [];
    for (const ent of entries) {
      scores.push({ key: ent.key, score: scorePicks(ent.picks, sim, pts, bonus, teamSeeds, gameIds, regionNames) });
    }
    scores.sort((a, b) => b.score - a.score);
    for (let i = 0; i < scores.length; i++) {
      const t = totals[scores[i].key];
      t.score += scores[i].score;
      t.rank += i + 1;
      if (i === 0) t.wins++;
    }

    if ((s + 1) % BATCH === 0) {
      (self as unknown as Worker).postMessage({ type: "progress", progress: s + 1 });
    }
  }

  const out = entries.map((ent) => {
    const t = totals[ent.key];
    return {
      key: ent.key,
      avgScore: Math.round((t.score / totalSims) * 10) / 10,
      avgPlace: Math.round((t.rank / totalSims) * 10) / 10,
      winPct: Math.round((t.wins / totalSims) * 1000) / 10,
    };
  });
  out.sort((a, b) => b.winPct - a.winPct || a.avgPlace - b.avgPlace || b.avgScore - a.avgScore);
  (self as unknown as Worker).postMessage({ type: "done", results: out });
};
