"use client";

import type { GamePicks } from "@/types/whopicked";

interface Props {
  game: GamePicks;
  totalBrackets: number;
  regionColor: string;
}

export default function WhoPickedGameCard({ game, totalBrackets, regionColor }: Props) {
  if (game.picks.length === 0) return null;

  const label = game.teamA && game.teamB
    ? `${game.teamA} vs ${game.teamB}`
    : game.gameId;

  return (
    <div className="border rounded p-2 mb-2 bg-white">
      <div className="text-xs font-bold mb-1" style={{ color: regionColor }}>{label}</div>
      {game.picks.map((tp) => {
        const pct = totalBrackets > 0 ? Math.round((tp.count / totalBrackets) * 100) : 0;
        return (
          <div key={tp.team} className="relative mb-1">
            <div
              className="absolute inset-y-0 left-0 rounded opacity-20"
              style={{ width: `${pct}%`, backgroundColor: regionColor }}
            />
            <div className="relative flex items-center gap-2 py-0.5 px-1">
              <span className="text-sm font-semibold min-w-[120px]">{tp.team}</span>
              <span className="text-xs bg-gray-100 rounded px-1.5 py-0.5">
                {tp.count}/{totalBrackets} ({pct}%)
              </span>
              <div className="flex flex-wrap gap-1">
                {tp.users.map((u, i) => (
                  <span key={i} className="text-xs border rounded-full px-1.5 py-0.5 text-gray-600" title={`${u.username} — ${u.bracketName}`}>
                    {u.username}
                  </span>
                ))}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
