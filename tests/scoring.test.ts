import { describe, it, expect } from "vitest";
import {
  scorePicks,
  scoreBracket,
  maxPossibleRemaining,
  scorePicksDetailed,
  computeStreak,
  getCurrentRound,
  filterResultsBeforeRound,
  buildTeamSeedMap,
  countResolvedGames,
} from "@/lib/scoring";
import type { RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import type { ScoringSettings } from "@/types/group";
import { DEFAULT_SCORING, REGIONS } from "@/lib/bracket-constants";

// Minimal region data for testing: 4 regions with 16 seeds each
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
const settings: ScoringSettings = DEFAULT_SCORING;

describe("buildTeamSeedMap", () => {
  it("maps every team to its seed", () => {
    const map = buildTeamSeedMap(regions);
    expect(map.get("East-1")).toBe(1);
    expect(map.get("West-16")).toBe(16);
    expect(map.size).toBe(64);
  });
});

describe("scorePicks", () => {
  it("returns 6 rounds with zero scores when no picks/results", () => {
    const rounds = scorePicks({}, {}, settings, regions);
    expect(rounds).toHaveLength(6);
    rounds.forEach((r) => {
      expect(r.correct).toBe(0);
      expect(r.points).toBe(0);
      expect(r.upsetBonus).toBe(0);
    });
  });

  it("scores a correct R64 pick", () => {
    // East-0-0 is 1 vs 16 seed. Pick the 1 seed to win.
    const picks: Picks = { "East-0-0": "East-1" };
    const results: Results = { "East-0-0": "East-1" };
    const rounds = scorePicks(picks, results, settings, regions);
    expect(rounds[0].correct).toBe(1);
    expect(rounds[0].points).toBe(1); // R64 = 1 point
  });

  it("scores an incorrect pick as 0", () => {
    const picks: Picks = { "East-0-0": "East-16" };
    const results: Results = { "East-0-0": "East-1" };
    const rounds = scorePicks(picks, results, settings, regions);
    expect(rounds[0].correct).toBe(0);
    expect(rounds[0].points).toBe(0);
  });

  it("applies upset bonus when enabled", () => {
    const upsetSettings: ScoringSettings = {
      pointsPerRound: [1, 2, 4, 8, 16, 32],
      upsetBonusPerRound: [1, 1, 1, 1, 1, 1],
    };
    // 16 seed beats 1 seed — upset bonus = 1 * (16 - 1) = 15
    const picks: Picks = { "East-0-0": "East-16" };
    const results: Results = { "East-0-0": "East-16" };
    const rounds = scorePicks(picks, results, upsetSettings, regions);
    expect(rounds[0].correct).toBe(1);
    expect(rounds[0].upsetBonus).toBe(15);
    expect(rounds[0].points).toBe(16); // 1 base + 15 upset
  });

  it("no upset bonus when higher seed wins", () => {
    const upsetSettings: ScoringSettings = {
      pointsPerRound: [1, 2, 4, 8, 16, 32],
      upsetBonusPerRound: [1, 1, 1, 1, 1, 1],
    };
    const picks: Picks = { "East-0-0": "East-1" };
    const results: Results = { "East-0-0": "East-1" };
    const rounds = scorePicks(picks, results, upsetSettings, regions);
    expect(rounds[0].upsetBonus).toBe(0);
    expect(rounds[0].points).toBe(1);
  });

  it("scores multiple rounds correctly", () => {
    const picks: Picks = {
      "East-0-0": "East-1",
      "East-1-0": "East-1",
    };
    const results: Results = {
      "East-0-0": "East-1",
      "East-1-0": "East-1",
    };
    const rounds = scorePicks(picks, results, settings, regions);
    expect(rounds[0].correct).toBe(1);
    expect(rounds[0].points).toBe(1);
    expect(rounds[1].correct).toBe(1);
    expect(rounds[1].points).toBe(2);
  });
});

describe("scoreBracket", () => {
  it("returns a complete BracketScore object", () => {
    const picks: Picks = { "East-0-0": "East-1" };
    const results: Results = { "East-0-0": "East-1" };
    const score = scoreBracket(1, "My Bracket", "testuser", 1, picks, results, settings, regions, 150, 140);
    expect(score.bracketId).toBe(1);
    expect(score.bracketName).toBe("My Bracket");
    expect(score.username).toBe("testuser");
    expect(score.total).toBe(1);
    expect(score.tiebreaker).toBe(150);
    expect(score.tiebreakerDiff).toBe(10);
  });

  it("tiebreakerDiff is null when tiebreaker or actualTotal is null", () => {
    const score = scoreBracket(1, "B", "u", 1, {}, {}, settings, regions, null, null);
    expect(score.tiebreakerDiff).toBeNull();
  });
});

describe("maxPossibleRemaining", () => {
  it("counts points for alive picks in undecided games", () => {
    const picks: Picks = { "East-0-0": "East-1", "East-0-1": "East-8" };
    const results: Results = { "East-0-0": "East-1" }; // only first game decided
    const eliminated = new Set<string>();
    const remaining = maxPossibleRemaining(picks, results, settings, eliminated);
    expect(remaining).toBe(1); // East-0-1 undecided, East-8 alive = 1 point
  });

  it("excludes eliminated teams", () => {
    const picks: Picks = { "East-0-1": "East-8" };
    const results: Results = {};
    const eliminated = new Set(["East-8"]);
    const remaining = maxPossibleRemaining(picks, results, settings, eliminated);
    expect(remaining).toBe(0);
  });

  it("returns 0 when all games decided", () => {
    const picks: Picks = { "East-0-0": "East-1" };
    const results: Results = { "East-0-0": "East-1" };
    const remaining = maxPossibleRemaining(picks, results, settings, new Set());
    expect(remaining).toBe(0);
  });
});

describe("scorePicksDetailed", () => {
  it("returns per-game detail for resolved picks", () => {
    const picks: Picks = { "East-0-0": "East-1", "East-0-1": "East-9" };
    const results: Results = { "East-0-0": "East-1", "East-0-1": "East-8" };
    const details = scorePicksDetailed(picks, results, settings, regions);
    const correct = details.find((d) => d.gameId === "East-0-0");
    const wrong = details.find((d) => d.gameId === "East-0-1");
    expect(correct?.correct).toBe(true);
    expect(correct?.basePoints).toBe(1);
    expect(wrong?.correct).toBe(false);
    expect(wrong?.basePoints).toBe(0);
  });

  it("includes picks without results (result is null)", () => {
    const picks: Picks = { "East-0-0": "East-1" };
    const results: Results = {};
    const details = scorePicksDetailed(picks, results, settings, regions);
    const d = details.find((d) => d.gameId === "East-0-0");
    expect(d?.result).toBeNull();
    expect(d?.correct).toBe(false);
  });
});

describe("computeStreak", () => {
  it("returns 0 when no resolved picks", () => {
    expect(computeStreak({}, {})).toBe(0);
  });

  it("returns positive streak for consecutive correct picks", () => {
    const picks: Picks = { "East-0-0": "A", "East-0-1": "B" };
    const results: Results = { "East-0-0": "A", "East-0-1": "B" };
    expect(computeStreak(picks, results)).toBe(2);
  });

  it("returns negative streak for consecutive wrong picks", () => {
    const picks: Picks = { "East-0-0": "A", "East-0-1": "B" };
    const results: Results = { "East-0-0": "X", "East-0-1": "Y" };
    expect(computeStreak(picks, results)).toBe(-2);
  });

  it("streak breaks at first mismatch from most recent", () => {
    // Round 1 game is more recent than round 0
    const picks: Picks = { "East-0-0": "A", "East-1-0": "B" };
    const results: Results = { "East-0-0": "A", "East-1-0": "X" };
    // Most recent (round 1) is wrong, so streak = -1
    expect(computeStreak(picks, results)).toBe(-1);
  });
});

describe("getCurrentRound", () => {
  it("returns -1 for empty results", () => {
    expect(getCurrentRound({})).toBe(-1);
  });

  it("returns highest round with results", () => {
    expect(getCurrentRound({ "East-0-0": "A", "East-2-0": "B" })).toBe(2);
  });

  it("handles Final Four round", () => {
    expect(getCurrentRound({ "ff-4-0": "A" })).toBe(4);
  });
});

describe("filterResultsBeforeRound", () => {
  it("filters out results from the given round and later", () => {
    const results: Results = { "East-0-0": "A", "East-1-0": "B", "East-2-0": "C" };
    const filtered = filterResultsBeforeRound(results, 2);
    expect(Object.keys(filtered)).toEqual(["East-0-0", "East-1-0"]);
  });

  it("returns empty for round 0", () => {
    const results: Results = { "East-0-0": "A" };
    expect(Object.keys(filterResultsBeforeRound(results, 0))).toHaveLength(0);
  });
});

describe("countResolvedGames", () => {
  it("counts keys in results", () => {
    expect(countResolvedGames({})).toBe(0);
    expect(countResolvedGames({ "East-0-0": "A", "East-0-1": "B" })).toBe(2);
  });
});
