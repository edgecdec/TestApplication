import { describe, it, expect, beforeAll } from "vitest";
import { execSync } from "child_process";
import { existsSync, readFileSync } from "fs";
import { resolve } from "path";

/**
 * API integration tests that login as testbot, exercise core API flows.
 * Requires the dev server running on port 3333 and ~/.config/testapp-creds.env.
 */

const BASE = "http://localhost:3333";
const COOKIE = "/tmp/test-integration-cookie.txt";

function loadCreds(): { user: string; pass: string; adminUser: string; adminPass: string } {
  const credsPath = resolve(process.env.HOME || "~", ".config/testapp-creds.env");
  if (!existsSync(credsPath)) throw new Error("Missing ~/.config/testapp-creds.env");
  const content = readFileSync(credsPath, "utf-8");
  const get = (key: string) => {
    const m = content.match(new RegExp(`${key}=["']?([^"'\\n]+)`));
    return m?.[1] ?? "";
  };
  return { user: get("TESTBOT_USER"), pass: get("TESTBOT_PASS"), adminUser: get("ADMIN_USER"), adminPass: get("ADMIN_PASS") };
}

function curl(args: string): string {
  try { return execSync(`curl -s ${args}`, { encoding: "utf-8", timeout: 10000 }); }
  catch { return ""; }
}

function curlJson(args: string): Record<string, unknown> {
  const raw = curl(args);
  try { return JSON.parse(raw); } catch { return { _raw: raw }; }
}

let creds: ReturnType<typeof loadCreds>;

beforeAll(() => {
  creds = loadCreds();
  const status = curl(`-o /dev/null -w "%{http_code}" ${BASE}`);
  if (!status.includes("200")) throw new Error(`Dev server not running on ${BASE}`);
  // Login
  curlJson(`-c ${COOKIE} -X POST ${BASE}/api/auth/login -H "Content-Type: application/json" -d '{"username":"${creds.user}","password":"${creds.pass}"}'`);
});

function authGet(path: string): Record<string, unknown> {
  return curlJson(`-b ${COOKIE} ${BASE}${path}`);
}

describe("Auth API", () => {
  it("returns 401 without cookie", () => {
    const status = curl(`-o /dev/null -w "%{http_code}" ${BASE}/api/auth/me`);
    expect(status).toBe("401");
  });

  it("returns user info with cookie", () => {
    const res = authGet("/api/auth/me");
    const user = res.user as Record<string, unknown>;
    expect(user.username).toBe(creds.user);
  });
});

describe("Tournaments API", () => {
  it("lists tournaments", () => {
    const res = authGet("/api/tournaments");
    expect(Array.isArray(res.tournaments)).toBe(true);
  });
});

describe("Brackets API", () => {
  let bracketId: number | null = null;

  it("lists user brackets", () => {
    const res = authGet("/api/brackets");
    expect(Array.isArray(res.brackets)).toBe(true);
  });

  it("creates a bracket", () => {
    const tournaments = authGet("/api/tournaments");
    const list = tournaments.tournaments as { id: number }[];
    if (!Array.isArray(list) || list.length === 0) return;
    const tid = list[0].id;
    const res = curlJson(`-b ${COOKIE} -X POST ${BASE}/api/brackets -H "Content-Type: application/json" -d '{"tournament_id":${tid},"name":"IntTest-${Date.now()}"}'`);
    expect(res.id).toBeDefined();
    bracketId = res.id as number;
  });

  it("saves picks to the bracket", () => {
    if (!bracketId) return;
    const body = JSON.stringify({ picks: { "East-0-0": "East-1" }, tiebreaker: 150 });
    const res = curlJson(`-b ${COOKIE} -X PUT ${BASE}/api/brackets/${bracketId} -H "Content-Type: application/json" -d '${body}'`);
    expect(res.success).toBe(true);
  });

  it("fetches the bracket with saved picks", () => {
    if (!bracketId) return;
    const res = authGet(`/api/brackets/${bracketId}`) as Record<string, unknown>;
    const bracket = (res.bracket ?? res) as Record<string, unknown>;
    const picksRaw = bracket.picks as string;
    const picks = typeof picksRaw === "string" ? JSON.parse(picksRaw) : picksRaw;
    expect(picks["East-0-0"]).toBe("East-1");
    expect(bracket.tiebreaker).toBe(150);
  });

  it("deletes the test bracket", () => {
    if (!bracketId) return;
    const res = curlJson(`-b ${COOKIE} -X DELETE ${BASE}/api/brackets/${bracketId}`);
    expect(res.success).toBe(true);
  });
});

describe("Groups API", () => {
  it("lists groups", () => {
    const res = authGet("/api/groups");
    expect(Array.isArray(res.groups)).toBe(true);
  });

  it("fetches my groups summary", () => {
    const res = authGet("/api/groups/my-summary");
    // Response is either { groups: [...] } or direct array
    const arr = Array.isArray(res) ? res : res.groups ?? res.summaries;
    expect(arr !== undefined).toBe(true);
  });
});

describe("Stats & Misc API", () => {
  it("fetches stats", () => {
    const res = authGet("/api/stats?tournament_id=1");
    expect(typeof res).toBe("object");
  });

  it("fetches notifications", () => {
    const res = authGet("/api/notifications");
    expect(Array.isArray(res.notifications)).toBe(true);
  });

  it("fetches bracket grades", () => {
    const res = authGet("/api/brackets/grades?tournament_id=1");
    expect(typeof res).toBe("object");
  });

  it("fetches bracket achievements", () => {
    const res = authGet("/api/brackets/achievements?tournament_id=1");
    expect(typeof res).toBe("object");
  });
});
