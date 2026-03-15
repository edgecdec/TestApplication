import { TOTAL_GAMES } from "@/lib/bracket-constants";
import { countPicks, isComplete } from "@/lib/pick-count";

interface BracketProgressProps {
  picks: string | Record<string, string> | null | undefined;
}

export default function BracketProgress({ picks }: BracketProgressProps) {
  const count = countPicks(picks);
  const complete = isComplete(count);
  const pct = Math.min(100, Math.round((count / TOTAL_GAMES) * 100));

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden min-w-[60px]">
        <div
          className={`h-full rounded-full transition-all ${complete ? "bg-green-500" : "bg-blue-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs text-gray-500 whitespace-nowrap">
        {count}/{TOTAL_GAMES}
      </span>
      {complete && (
        <span className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-medium">
          Complete
        </span>
      )}
    </div>
  );
}
