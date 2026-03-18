"use client";

import { useEffect, useState } from "react";
import LoadingSkeleton from "@/components/LoadingSkeleton";
import { useRouter } from "next/navigation";
import type { Tournament, RegionData, TeamSeed } from "@/types/tournament";
import type { Results } from "@/types/bracket";
import { parseBracketData, getEliminatedTeams } from "@/lib/bracket-utils";
import { REGIONS, REGION_COLORS, ROUND_NAMES, type RegionName } from "@/lib/bracket-constants";
import TeamLogo from "@/components/TeamLogo";
import { getTeamAdvancement } from "@/lib/whos-left";

export default function WhosLeftPage() {
  const router = useRouter();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const meRes = await fetch("/api/auth/me");
      if (!meRes.ok) { router.push("/login"); return; }
      const tRes = await fetch("/api/tournaments");
      if (tRes.ok) {
        const { tournaments } = await tRes.json();
        if (tournaments?.length > 0) setTournament(tournaments[0]);
      }
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return <LoadingSkeleton />;
  if (!tournament) return <main className="p-8 max-w-4xl mx-auto"><p className="text-gray-500">No tournament found.</p></main>;

  const regions = parseBracketData(tournament.bracket_data);
  const results: Results = JSON.parse(tournament.results_data || "{}");
  const eliminated = getEliminatedTeams(results, regions);
  const advancement = getTeamAdvancement(results, regions);
  const totalTeams = regions.reduce((sum, r) => sum + r.seeds.length, 0);
  const aliveCount = totalTeams - eliminated.size;

  return (
    <main className="min-h-screen p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">🏀 Who&apos;s Left?</h1>
        <p className="text-gray-600 mt-1">
          <span className="font-semibold text-green-700">{aliveCount}</span> of {totalTeams} teams remaining
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {REGIONS.map((regionName) => {
          const region = regions.find((r) => r.name === regionName);
          if (!region) return null;
          const color = REGION_COLORS[regionName as RegionName];
          const aliveInRegion = region.seeds.filter((t) => !eliminated.has(t.name)).length;

          return (
            <div key={regionName} className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-4 py-3 font-bold text-white" style={{ backgroundColor: color }}>
                {regionName} — {aliveInRegion} alive
              </div>
              <div className="divide-y">
                {region.seeds
                  .slice()
                  .sort((a, b) => a.seed - b.seed)
                  .map((team) => {
                    const isEliminated = eliminated.has(team.name);
                    const round = advancement.get(team.name) ?? 0;
                    return (
                      <TeamRow key={team.name} team={team} eliminated={isEliminated} advancedToRound={round} />
                    );
                  })}
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}

function TeamRow({ team, eliminated, advancedToRound }: { team: TeamSeed; eliminated: boolean; advancedToRound: number }) {
  const roundLabel = advancedToRound > 0 ? ROUND_NAMES[advancedToRound] ?? `R${advancedToRound}` : null;

  return (
    <div className={`flex items-center gap-3 px-4 py-2 ${eliminated ? "opacity-40" : ""}`}>
      <span className="text-xs font-bold text-gray-400 w-5 text-right">{team.seed}</span>
      <TeamLogo team={team.name} />
      <span className={`flex-1 text-sm font-medium ${eliminated ? "line-through text-gray-400" : ""}`}>
        {team.name}
      </span>
      {eliminated ? (
        <span className="text-xs text-red-400">Eliminated</span>
      ) : roundLabel ? (
        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">{roundLabel}</span>
      ) : (
        <span className="text-xs text-gray-400">R64</span>
      )}
    </div>
  );
}
