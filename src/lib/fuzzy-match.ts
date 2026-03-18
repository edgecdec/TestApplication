/**
 * Simple fuzzy matching for team names.
 * Normalizes strings and finds the best match from a list of candidates.
 */

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Score how well `input` matches `candidate`. Lower = better. -1 = no match. */
function matchScore(input: string, candidate: string): number {
  const a = normalize(input);
  const b = normalize(candidate);
  if (!a || !b) return -1;
  if (a === b) return 0;
  if (b.startsWith(a) || a.startsWith(b)) return 1;
  if (b.includes(a) || a.includes(b)) return 2;
  return -1;
}

export interface FuzzyResult {
  input: string;
  match: string | null;
  score: number;
}

/**
 * For each input string, find the best matching team name from candidates.
 * Returns results in input order.
 */
export function fuzzyMatchTeams(inputs: string[], candidates: string[]): FuzzyResult[] {
  return inputs.map((input) => {
    let bestMatch: string | null = null;
    let bestScore = Infinity;
    for (const c of candidates) {
      const s = matchScore(input.trim(), c);
      if (s >= 0 && s < bestScore) {
        bestScore = s;
        bestMatch = c;
        if (s === 0) break; // exact match
      }
    }
    return { input: input.trim(), match: bestMatch, score: bestMatch ? bestScore : -1 };
  });
}
