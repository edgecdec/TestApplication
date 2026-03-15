/** Distinct colors for up to 10 brackets in comparison view */
export const COMPARISON_COLORS = [
  "#2563eb", // blue
  "#dc2626", // red
  "#16a34a", // green
  "#ea580c", // orange
  "#7c3aed", // violet
  "#db2777", // pink
  "#0891b2", // cyan
  "#ca8a04", // yellow
  "#4f46e5", // indigo
  "#059669", // emerald
] as const;

export const MAX_COMPARISON_BRACKETS = COMPARISON_COLORS.length;
