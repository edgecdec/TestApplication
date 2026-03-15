/** Bracket grading based on percentile ranking. */

export interface BracketGradeInfo {
  letter: string;
  color: string;
}

const GRADE_THRESHOLDS: { min: number; letter: string; color: string }[] = [
  { min: 95, letter: "A+", color: "#16a34a" },
  { min: 85, letter: "A",  color: "#22c55e" },
  { min: 80, letter: "A-", color: "#4ade80" },
  { min: 75, letter: "B+", color: "#84cc16" },
  { min: 65, letter: "B",  color: "#a3e635" },
  { min: 60, letter: "B-", color: "#facc15" },
  { min: 55, letter: "C+", color: "#fbbf24" },
  { min: 45, letter: "C",  color: "#f59e0b" },
  { min: 40, letter: "C-", color: "#fb923c" },
  { min: 30, letter: "D+", color: "#f97316" },
  { min: 20, letter: "D",  color: "#ef4444" },
  { min: 10, letter: "D-", color: "#dc2626" },
  { min: 0,  letter: "F",  color: "#991b1b" },
];

/** Compute a letter grade from a percentile (0–100). */
export function computeGrade(percentile: number): BracketGradeInfo {
  for (const t of GRADE_THRESHOLDS) {
    if (percentile >= t.min) return { letter: t.letter, color: t.color };
  }
  return { letter: "F", color: "#991b1b" };
}
