import { describe, it, expect } from "vitest";
import { generateAutofill, AUTOFILL_OPTIONS } from "@/lib/autofill";
import { REGIONS, TOTAL_GAMES } from "@/lib/bracket-constants";
import type { RegionData } from "@/types/tournament";
import type { Picks } from "@/types/bracket";

function makeRegions(): RegionData[] {
  return REGIONS.map((name) => ({
    name,
    seeds: Array.from({ length: 16 }, (_, i) => ({
      seed: i + 1,
      name: `${name}-${i + 1}`,
    })),
  }));
}

const regions = makeRegions();

describe("AUTOFILL_OPTIONS", () => {
  it("has chalk, random, and smart modes", () => {
    const modes = AUTOFILL_OPTIONS.map((o) => o.mode);
    expect(modes).toContain("chalk");
    expect(modes).toContain("random");
    expect(modes).toContain("smart");
  });
});

describe("generateAutofill — chalk", () => {
  it("fills all 63 games", () => {
    const picks = generateAutofill("chalk", regions, {});
    expect(Object.keys(picks)).toHaveLength(TOTAL_GAMES);
  });

  it("always picks the higher (lower number) seed", () => {
    const picks = generateAutofill("chalk", regions, {});
    // R64 game 0 in East: 1 vs 16 → should pick 1 seed
    expect(picks["East-0-0"]).toBe("East-1");
    // R64 game 7 in East: 2 vs 15 → should pick 2 seed
    expect(picks["East-0-7"]).toBe("East-2");
    // Championship should be a 1 seed
    const champ = picks["ff-5-0"];
    expect(champ).toMatch(/-1$/);
  });

  it("does not overwrite existing picks", () => {
    const existing: Picks = { "East-0-0": "East-16" };
    const picks = generateAutofill("chalk", regions, existing);
    expect(picks["East-0-0"]).toBe("East-16"); // preserved
  });
});

describe("generateAutofill — random", () => {
  it("fills all 63 games", () => {
    const picks = generateAutofill("random", regions, {});
    expect(Object.keys(picks)).toHaveLength(TOTAL_GAMES);
  });

  it("picks are valid team names from the bracket", () => {
    const picks = generateAutofill("random", regions, {});
    const allTeams = new Set(regions.flatMap((r) => r.seeds.map((s) => s.name)));
    for (const team of Object.values(picks)) {
      expect(allTeams.has(team)).toBe(true);
    }
  });
});

describe("generateAutofill — smart", () => {
  it("fills all 63 games", () => {
    const picks = generateAutofill("smart", regions, {});
    expect(Object.keys(picks)).toHaveLength(TOTAL_GAMES);
  });
});
