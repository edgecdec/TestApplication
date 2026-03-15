import type { PayoutStructure } from "@/types/group";

/** Common payout presets as percentage arrays. */
export const PAYOUT_PRESETS: { label: string; places: number[] }[] = [
  { label: "Winner Take All", places: [100] },
  { label: "Top 2 (70/30)", places: [70, 30] },
  { label: "Top 3 (60/25/15)", places: [60, 25, 15] },
  { label: "Top 3 (50/30/20)", places: [50, 30, 20] },
  { label: "Top 5 (40/25/15/12/8)", places: [40, 25, 15, 12, 8] },
];

/** Calculate dollar payouts from buy-in, member count, and payout structure. */
export function calculatePayouts(
  buyIn: number,
  memberCount: number,
  structure: PayoutStructure
): { place: number; percent: number; amount: number }[] {
  const pool = buyIn * memberCount;
  return structure.places.map((pct, i) => ({
    place: i + 1,
    percent: pct,
    amount: Math.round((pool * pct) / 100 * 100) / 100,
  }));
}

export function parsePayoutStructure(raw: string | PayoutStructure | null | undefined): PayoutStructure {
  if (!raw) return { places: [100] };
  if (typeof raw === "string") { try { return JSON.parse(raw); } catch { return { places: [100] }; } }
  return raw;
}
