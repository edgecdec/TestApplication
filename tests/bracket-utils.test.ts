import { describe, it, expect } from "vitest";
import {
  parseBracketData,
  gameId,
  feederGameIds,
  getTeamsForGame,
  buildR64Matchups,
  getDownstreamGames,
  cascadeClear,
  gamesInRound,
  getEliminatedTeams,
} from "@/lib/bracket-utils";
import { REGIONS } from "@/lib/bracket-constants";
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

describe("parseBracketData", () => {
  it("parses a JSON string with regions array", () => {
    const data = JSON.stringify({ regions: [{ name: "East", seeds: [{ seed: 1, name: "Duke" }] }] });
    const result = parseBracketData(data);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("East");
    expect(result[0].seeds[0].name).toBe("Duke");
  });

  it("parses a plain array JSON string", () => {
    const data = JSON.stringify([{ name: "West", seeds: [{ seed: 2, name: "UNC" }] }]);
    const result = parseBracketData(data);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe("West");
  });

  it("returns empty array for null/undefined", () => {
    expect(parseBracketData(null)).toEqual([]);
    expect(parseBracketData(undefined)).toEqual([]);
    expect(parseBracketData("")).toEqual([]);
  });

  it("handles teams key instead of seeds", () => {
    const data = JSON.stringify([{ name: "South", teams: [{ seed: 3, name: "Kansas" }] }]);
    const result = parseBracketData(data);
    expect(result[0].seeds[0].name).toBe("Kansas");
  });
});

describe("gameId", () => {
  it("creates regional game IDs", () => {
    expect(gameId("East", 0, 3)).toBe("East-0-3");
    expect(gameId("West", 2, 1)).toBe("West-2-1");
  });

  it("creates Final Four game IDs for round >= 4", () => {
    expect(gameId("ff", 4, 0)).toBe("ff-4-0");
    expect(gameId("ff", 5, 0)).toBe("ff-5-0");
    expect(gameId("East", 4, 0)).toBe("ff-4-0");
  });
});

describe("feederGameIds", () => {
  it("returns null for R64 games", () => {
    expect(feederGameIds("East-0-0")).toBeNull();
  });

  it("returns correct feeders for R32", () => {
    const feeders = feederGameIds("East-1-0");
    expect(feeders).toEqual(["East-0-0", "East-0-1"]);
  });

  it("returns correct feeders for Sweet 16", () => {
    const feeders = feederGameIds("East-2-0");
    expect(feeders).toEqual(["East-1-0", "East-1-1"]);
  });

  it("returns correct feeders for Elite 8", () => {
    const feeders = feederGameIds("East-3-0");
    expect(feeders).toEqual(["East-2-0", "East-2-1"]);
  });

  it("returns correct feeders for Final Four", () => {
    const feeders = feederGameIds("ff-4-0");
    expect(feeders).toEqual(["East-3-0", "West-3-0"]);
    const feeders2 = feederGameIds("ff-4-1");
    expect(feeders2).toEqual(["South-3-0", "Midwest-3-0"]);
  });

  it("returns correct feeders for Championship", () => {
    const feeders = feederGameIds("ff-5-0");
    expect(feeders).toEqual(["ff-4-0", "ff-4-1"]);
  });
});

describe("buildR64Matchups", () => {
  it("returns 8 matchups with standard NCAA seeding", () => {
    const matchups = buildR64Matchups();
    expect(matchups).toHaveLength(8);
    expect(matchups[0]).toEqual([1, 16]);
    expect(matchups[7]).toEqual([2, 15]);
  });
});

describe("getTeamsForGame", () => {
  it("returns seeded teams for R64", () => {
    const [top, bottom] = getTeamsForGame("East-0-0", regions, {});
    expect(top).toBe("East-1");
    expect(bottom).toBe("East-16");
  });

  it("returns picked winners for R32", () => {
    const picks: Picks = { "East-0-0": "East-1", "East-0-1": "East-8" };
    const [top, bottom] = getTeamsForGame("East-1-0", regions, picks);
    expect(top).toBe("East-1");
    expect(bottom).toBe("East-8");
  });

  it("returns null for missing picks in later rounds", () => {
    const [top, bottom] = getTeamsForGame("East-1-0", regions, {});
    expect(top).toBeNull();
    expect(bottom).toBeNull();
  });
});

describe("getDownstreamGames", () => {
  it("returns all downstream games from an R64 game", () => {
    const downstream = getDownstreamGames("East-0-0");
    // R32 (East-1-0), Sweet16 (East-2-0), Elite8 (East-3-0), FF (ff-4-0), Champ (ff-5-0)
    expect(downstream).toContain("East-1-0");
    expect(downstream).toContain("East-2-0");
    expect(downstream).toContain("East-3-0");
    expect(downstream).toContain("ff-4-0");
    expect(downstream).toContain("ff-5-0");
    expect(downstream).toHaveLength(5);
  });

  it("returns only championship from Final Four game", () => {
    const downstream = getDownstreamGames("ff-4-0");
    expect(downstream).toEqual(["ff-5-0"]);
  });

  it("returns empty for championship game", () => {
    expect(getDownstreamGames("ff-5-0")).toEqual([]);
  });
});

describe("cascadeClear", () => {
  it("removes old winner from downstream games", () => {
    const picks: Picks = {
      "East-0-0": "East-1",
      "East-1-0": "East-1",
      "East-2-0": "East-1",
    };
    const cleared = cascadeClear(picks, "East-0-0", "East-1");
    expect(cleared["East-0-0"]).toBe("East-1"); // unchanged — it's the changed game itself
    expect(cleared["East-1-0"]).toBeUndefined(); // cleared
    expect(cleared["East-2-0"]).toBeUndefined(); // cleared
  });

  it("does not clear downstream games with different teams", () => {
    const picks: Picks = {
      "East-0-0": "East-1",
      "East-1-0": "East-8",
    };
    const cleared = cascadeClear(picks, "East-0-0", "East-1");
    expect(cleared["East-1-0"]).toBe("East-8"); // not cleared — different team
  });

  it("does nothing when oldWinner is empty", () => {
    const picks: Picks = { "East-1-0": "East-1" };
    const cleared = cascadeClear(picks, "East-0-0", "");
    expect(cleared).toEqual(picks);
  });
});

describe("gamesInRound", () => {
  it("returns correct game counts per round", () => {
    expect(gamesInRound(0)).toBe(8);  // R64: 8 per region
    expect(gamesInRound(1)).toBe(4);  // R32
    expect(gamesInRound(2)).toBe(2);  // Sweet 16
    expect(gamesInRound(3)).toBe(1);  // Elite 8
    expect(gamesInRound(4)).toBe(2);  // Final Four
    expect(gamesInRound(5)).toBe(1);  // Championship
    expect(gamesInRound(6)).toBe(0);  // invalid
  });
});

describe("getEliminatedTeams", () => {
  it("identifies losers as eliminated", () => {
    const results: Picks = { "East-0-0": "East-1" };
    const eliminated = getEliminatedTeams(results, regions);
    expect(eliminated.has("East-16")).toBe(true);
    expect(eliminated.has("East-1")).toBe(false);
  });

  it("returns empty set for no results", () => {
    expect(getEliminatedTeams({}, regions).size).toBe(0);
  });
});
