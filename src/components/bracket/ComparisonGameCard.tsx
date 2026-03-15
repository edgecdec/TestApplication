"use client";

import TeamLogo from "@/components/TeamLogo";
import type { ComparisonBracket } from "@/types/comparison";
import type { Results } from "@/types/bracket";

interface ComparisonGameCardProps {
  gameId: string;
  topTeam: string | null;
  bottomTeam: string | null;
  results: Results;
  brackets: ComparisonBracket[];
}

/** Color for unanimous agreement */
const UNANIMOUS_BG = "bg-green-100";
/** Color for split picks */
const SPLIT_BG = "bg-amber-50";

function AgreementBadge({ team, gameId, brackets }: { team: string | null; gameId: string; brackets: ComparisonBracket[] }) {
  if (!team || brackets.length === 0) return null;
  const count = brackets.filter((b) => b.picks[gameId] === team).length;
  if (count === 0) return null;
  const total = brackets.length;
  const unanimous = count === total;
  return (
    <span className="flex items-center gap-0.5 ml-1 flex-shrink-0">
      <span className={`text-[10px] font-medium px-1 rounded ${unanimous ? "text-green-700 bg-green-200" : "text-amber-700 bg-amber-200"}`}>
        {count}/{total}
      </span>
      {brackets.filter((b) => b.picks[gameId] === team).map((b) => (
        <span
          key={b.bracketId}
          className="inline-block w-2 h-2 rounded-full border border-white"
          style={{ backgroundColor: b.color }}
          title={`${b.username} — ${b.bracketName}`}
        />
      ))}
    </span>
  );
}

export default function ComparisonGameCard({ gameId, topTeam, bottomTeam, results, brackets }: ComparisonGameCardProps) {
  const result = results[gameId] ?? null;
  const total = brackets.length;

  // Determine if this game has unanimous agreement (all selected brackets pick the same winner)
  const topCount = topTeam ? brackets.filter((b) => b.picks[gameId] === topTeam).length : 0;
  const bottomCount = bottomTeam ? brackets.filter((b) => b.picks[gameId] === bottomTeam).length : 0;
  const hasPicks = topCount + bottomCount > 0;
  const isUnanimous = hasPicks && (topCount === total || bottomCount === total);

  function teamRowBg(team: string | null): string {
    if (!team || !hasPicks) return "";
    const count = brackets.filter((b) => b.picks[gameId] === team).length;
    if (count === 0) return "";
    return isUnanimous ? UNANIMOUS_BG : SPLIT_BG;
  }

  function teamClass(team: string | null): string {
    const base = "px-2 py-1 text-xs truncate flex items-center justify-between";
    if (!team) return base + " text-gray-300";
    if (result && result === team) return base + " bg-green-50";
    if (result && result !== team) return base + " text-gray-400";
    return base + " " + teamRowBg(team);
  }

  return (
    <div className="border rounded bg-white shadow-sm w-44 overflow-hidden">
      <div className={teamClass(topTeam)}>
        <span className="flex items-center gap-1 truncate">
          {topTeam && <TeamLogo team={topTeam} />}
          <span className="truncate">{topTeam ?? "TBD"}</span>
        </span>
        <AgreementBadge team={topTeam} gameId={gameId} brackets={brackets} />
      </div>
      <div className="border-t border-gray-200" />
      <div className={teamClass(bottomTeam)}>
        <span className="flex items-center gap-1 truncate">
          {bottomTeam && <TeamLogo team={bottomTeam} />}
          <span className="truncate">{bottomTeam ?? "TBD"}</span>
        </span>
        <AgreementBadge team={bottomTeam} gameId={gameId} brackets={brackets} />
      </div>
    </div>
  );
}
