"use client";

import { useState, useMemo } from "react";
import type { RegionData } from "@/types/tournament";
import type { Picks, Results } from "@/types/bracket";
import { REGIONS, ROUND_NAMES } from "@/lib/bracket-constants";
import {
  gameId,
  buildR64Matchups,
  getTeamsForGameFromResults,
  getEliminatedTeams,
} from "@/lib/bracket-utils";
import { getSeedMatchupRate } from "@/lib/seed-matchup-history";
import { buildTeamSeedMap } from "@/lib/scoring";
import TeamLogo from "@/components/TeamLogo";

interface TeamPathModalProps {
  regions: RegionData[];
  results: Results;
  onClose: () => void;
}

interface PathStep {
  round: number;
  roundName: string;
  gameIdStr: string;
  opponent: string | null;
  /** "won" | "lost" | "pending" */
  status: "won" | "lost" | "pending";
  opponentSeed: number | null;
}

/**
 * Find which region and R64 game index a team belongs to.
 */
function findTeamLocation(
  teamName: string,
  regions: RegionData[]
): { region: string; seed: number; r64Index: number } | null {
  const matchups = buildR64Matchups();
  for (const region of regions) {
    const teamSeed = region.seeds.find(
      (s) => s.name.toLowerCase() === teamName.toLowerCase()
    );
    if (!teamSeed) continue;
    for (let i = 0; i < matchups.length; i++) {
      if (matchups[i][0] === teamSeed.seed || matchups[i][1] === teamSeed.seed) {
        return { region: region.name, seed: teamSeed.seed, r64Index: i };
      }
    }
  }
  return null;
}

/**
 * Trace a team's path through the bracket using results data.
 */
function buildTeamPath(
  teamName: string,
  regions: RegionData[],
  results: Results,
  seedMap: Map<string, number>
): PathStep[] {
  const loc = findTeamLocation(teamName, regions);
  if (!loc) return [];

  const steps: PathStep[] = [];
  const regionIdx = REGIONS.indexOf(loc.region as (typeof REGIONS)[number]);

  // Regional rounds 0-3
  let currentGameIdx = loc.r64Index;
  for (let round = 0; round <= 3; round++) {
    const gId = gameId(loc.region, round, currentGameIdx);
    const [teamA, teamB] = getTeamsForGameFromResults(gId, results, regions);
    const winner = results[gId] ?? null;
    const opponent =
      teamA?.toLowerCase() === teamName.toLowerCase() ? teamB : teamA;

    let status: PathStep["status"] = "pending";
    if (winner) {
      status =
        winner.toLowerCase() === teamName.toLowerCase() ? "won" : "lost";
    }

    steps.push({
      round,
      roundName: String(ROUND_NAMES[round]),
      gameIdStr: gId,
      opponent,
      status,
      opponentSeed: opponent ? seedMap.get(opponent) ?? null : null,
    });

    // If team lost, stop
    if (status === "lost") return steps;
    // If pending and no winner, stop (can't trace further)
    if (status === "pending" && !winner) return steps;

    currentGameIdx = Math.floor(currentGameIdx / 2);
  }

  // Final Four (round 4)
  const ffIdx = Math.floor(regionIdx / 2);
  const ffGId = gameId("ff", 4, ffIdx);
  const [ffA, ffB] = getTeamsForGameFromResults(ffGId, results, regions);
  const ffWinner = results[ffGId] ?? null;
  const ffOpponent =
    ffA?.toLowerCase() === teamName.toLowerCase() ? ffB : ffA;

  let ffStatus: PathStep["status"] = "pending";
  if (ffWinner) {
    ffStatus =
      ffWinner.toLowerCase() === teamName.toLowerCase() ? "won" : "lost";
  }

  steps.push({
    round: 4,
    roundName: String(ROUND_NAMES[4]),
    gameIdStr: ffGId,
    opponent: ffOpponent,
    status: ffStatus,
    opponentSeed: ffOpponent ? seedMap.get(ffOpponent) ?? null : null,
  });

  if (ffStatus === "lost" || (ffStatus === "pending" && !ffWinner))
    return steps;

  // Championship (round 5)
  const champGId = gameId("ff", 5, 0);
  const [cA, cB] = getTeamsForGameFromResults(champGId, results, regions);
  const champWinner = results[champGId] ?? null;
  const champOpponent =
    cA?.toLowerCase() === teamName.toLowerCase() ? cB : cA;

  let champStatus: PathStep["status"] = "pending";
  if (champWinner) {
    champStatus =
      champWinner.toLowerCase() === teamName.toLowerCase() ? "won" : "lost";
  }

  steps.push({
    round: 5,
    roundName: String(ROUND_NAMES[5]),
    gameIdStr: champGId,
    opponent: champOpponent,
    status: champStatus,
    opponentSeed: champOpponent ? seedMap.get(champOpponent) ?? null : null,
  });

  return steps;
}

export default function TeamPathModal({
  regions,
  results,
  onClose,
}: TeamPathModalProps) {
  const [search, setSearch] = useState("");

  const allTeams = useMemo(() => {
    const teams: { name: string; seed: number; region: string }[] = [];
    for (const r of regions) {
      for (const s of r.seeds) {
        teams.push({ name: s.name, seed: s.seed, region: r.name });
      }
    }
    teams.sort((a, b) => a.seed - b.seed || a.name.localeCompare(b.name));
    return teams;
  }, [regions]);

  const seedMap = useMemo(() => buildTeamSeedMap(regions), [regions]);
  const eliminated = useMemo(
    () => getEliminatedTeams(results, regions),
    [results, regions]
  );

  const [selectedTeam, setSelectedTeam] = useState<string | null>(null);

  const filteredTeams = useMemo(() => {
    if (!search.trim()) return allTeams;
    const q = search.toLowerCase();
    return allTeams.filter(
      (t) =>
        t.name.toLowerCase().includes(q) ||
        String(t.seed).includes(q) ||
        t.region.toLowerCase().includes(q)
    );
  }, [allTeams, search]);

  const path = useMemo(() => {
    if (!selectedTeam) return [];
    return buildTeamPath(selectedTeam, regions, results, seedMap);
  }, [selectedTeam, regions, results, seedMap]);

  const teamSeed = selectedTeam ? seedMap.get(selectedTeam) ?? null : null;
  const isEliminated = selectedTeam ? eliminated.has(selectedTeam) : false;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-bold">🛤️ Team Path to Championship</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 text-xl"
          >
            ✕
          </button>
        </div>

        <div className="p-4">
          {/* Team search/select */}
          <input
            type="text"
            placeholder="Search teams…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm mb-3 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            autoFocus
          />

          {!selectedTeam ? (
            <div className="max-h-64 overflow-y-auto space-y-0.5">
              {filteredTeams.map((t) => (
                <button
                  key={`${t.region}-${t.name}`}
                  onClick={() => {
                    setSelectedTeam(t.name);
                    setSearch("");
                  }}
                  className={`w-full text-left px-3 py-2 rounded text-sm flex items-center gap-2 transition ${
                    eliminated.has(t.name)
                      ? "text-gray-400 line-through hover:bg-gray-50 dark:hover:bg-gray-700"
                      : "hover:bg-blue-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <TeamLogo team={t.name} size={20} />
                  <span className="text-xs text-gray-400 w-5 text-right">
                    {t.seed}
                  </span>
                  <span className="flex-1">{t.name}</span>
                  <span className="text-xs text-gray-400">{t.region}</span>
                  {eliminated.has(t.name) && (
                    <span className="text-xs">💀</span>
                  )}
                </button>
              ))}
              {filteredTeams.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">
                  No teams found
                </p>
              )}
            </div>
          ) : (
            <>
              {/* Selected team header */}
              <div className="flex items-center gap-3 mb-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <TeamLogo team={selectedTeam} size={32} />
                <div>
                  <div className="font-bold flex items-center gap-2">
                    <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">
                      #{teamSeed}
                    </span>
                    {selectedTeam}
                    {isEliminated && (
                      <span className="text-xs bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 px-2 py-0.5 rounded">
                        💀 Eliminated
                      </span>
                    )}
                    {!isEliminated && (
                      <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-2 py-0.5 rounded">
                        🟢 Alive
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-gray-500">
                    {
                      regions.find((r) =>
                        r.seeds.some((s) => s.name === selectedTeam)
                      )?.name
                    }{" "}
                    Region
                  </div>
                </div>
                <button
                  onClick={() => setSelectedTeam(null)}
                  className="ml-auto text-xs text-blue-600 hover:underline"
                >
                  ← Pick another
                </button>
              </div>

              {/* Path steps */}
              <div className="space-y-2">
                {path.map((step, i) => {
                  const matchupRate =
                    teamSeed && step.opponentSeed
                      ? getSeedMatchupRate(teamSeed, step.opponentSeed)
                      : null;

                  return (
                    <div
                      key={step.gameIdStr}
                      className={`flex items-center gap-3 p-3 rounded border text-sm ${
                        step.status === "won"
                          ? "bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800"
                          : step.status === "lost"
                          ? "bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800"
                          : "bg-gray-50 border-gray-200 dark:bg-gray-700 dark:border-gray-600"
                      }`}
                    >
                      {/* Round indicator */}
                      <div className="flex flex-col items-center w-12 flex-shrink-0">
                        <span className="text-[10px] text-gray-400 uppercase">
                          Rd {step.round + 1}
                        </span>
                        <span className="text-xs font-semibold">
                          {step.roundName}
                        </span>
                      </div>

                      {/* Connector line */}
                      {i > 0 && (
                        <div className="w-px h-4 bg-gray-300 dark:bg-gray-600 absolute -mt-6 ml-6" />
                      )}

                      {/* Matchup info */}
                      <div className="flex-1 min-w-0">
                        {step.opponent ? (
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500">vs</span>
                            <TeamLogo team={step.opponent} size={18} />
                            {step.opponentSeed && (
                              <span className="text-xs text-gray-400">
                                #{step.opponentSeed}
                              </span>
                            )}
                            <span
                              className={
                                eliminated.has(step.opponent)
                                  ? "line-through text-gray-400"
                                  : ""
                              }
                            >
                              {step.opponent}
                            </span>
                            {step.status === "pending" &&
                              eliminated.has(step.opponent) && (
                                <span className="text-[10px] text-gray-400">
                                  💀
                                </span>
                              )}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">TBD</span>
                        )}

                        {/* Seed matchup rate for pending games */}
                        {step.status === "pending" && matchupRate && (
                          <div className="text-[10px] text-gray-400 mt-0.5">
                            📊 #{matchupRate.favoriteSeed} seeds win{" "}
                            {matchupRate.favoriteRate}% vs #
                            {matchupRate.underdogSeed} historically
                          </div>
                        )}
                      </div>

                      {/* Status badge */}
                      <div className="flex-shrink-0">
                        {step.status === "won" && (
                          <span className="text-green-600 font-semibold text-xs">
                            ✅ Won
                          </span>
                        )}
                        {step.status === "lost" && (
                          <span className="text-red-600 font-semibold text-xs">
                            ❌ Lost
                          </span>
                        )}
                        {step.status === "pending" && (
                          <span className="text-gray-400 text-xs">
                            ⏳ Pending
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Champion indicator */}
                {path.length > 0 &&
                  path[path.length - 1].status === "won" &&
                  path[path.length - 1].round === 5 && (
                    <div className="text-center py-3 text-lg font-bold text-yellow-600">
                      🏆 National Champion!
                    </div>
                  )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
