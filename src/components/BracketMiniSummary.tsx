import { REGIONS, CHAMPIONSHIP_GAME_ID } from "@/lib/bracket-constants";
import TeamLogo from "@/components/TeamLogo";

interface BracketMiniSummaryProps {
  picks: string | Record<string, string> | null | undefined;
}

function parsePicks(picks: string | Record<string, string> | null | undefined): Record<string, string> {
  if (!picks) return {};
  if (typeof picks === "string") {
    try { return JSON.parse(picks); } catch { return {}; }
  }
  return picks;
}

/** Shows champion pick and Final Four team logos for a bracket. */
export default function BracketMiniSummary({ picks }: BracketMiniSummaryProps) {
  const p = parsePicks(picks);
  const champion = p[CHAMPIONSHIP_GAME_ID] ?? null;
  const ffTeams = REGIONS.map((r) => p[`${r}-3-0`] ?? null);

  if (!champion && ffTeams.every((t) => !t)) return null;

  return (
    <div className="flex items-center gap-2 mt-1">
      {champion && (
        <span className="inline-flex items-center gap-1 text-xs text-yellow-700 bg-yellow-50 px-1.5 py-0.5 rounded">
          🏆 <TeamLogo team={champion} size={14} /> {champion}
        </span>
      )}
      {ffTeams.some(Boolean) && (
        <span className="inline-flex items-center gap-0.5 text-xs text-gray-500">
          FF:
          {ffTeams.map((team, i) =>
            team ? (
              <span key={REGIONS[i]} title={`${REGIONS[i]}: ${team}`}>
                <TeamLogo team={team} size={14} />
              </span>
            ) : (
              <span key={REGIONS[i]} className="text-gray-300 text-[10px]">—</span>
            )
          )}
        </span>
      )}
    </div>
  );
}
