"use client";

import { useState, useRef } from "react";
import type { FinalFourPick } from "@/types/scoring";
import TeamLogo from "@/components/TeamLogo";

interface Props {
  finalFourPicks: FinalFourPick[];
  semifinalPicks: [string | null, string | null];
  championPick: string | null;
  busted: boolean;
  children: React.ReactNode;
}

function MiniTeam({ name, seed, eliminated, bold }: { name: string | null; seed: number | null; eliminated?: boolean; bold?: boolean }) {
  if (!name) return <div className="h-5 px-1 text-[10px] text-gray-400">—</div>;
  return (
    <div className={`flex items-center gap-0.5 px-1 h-5 text-[10px] rounded ${eliminated ? "bg-red-50 text-gray-400 line-through dark:bg-red-900/20" : bold ? "bg-blue-50 font-bold dark:bg-blue-900/20" : ""}`}>
      <span className="text-gray-400 w-3 text-right">{seed}</span>
      <TeamLogo team={name} />
      <span className="truncate max-w-[60px]">{name}</span>
    </div>
  );
}

export default function MiniBracketPreview({ finalFourPicks, semifinalPicks, championPick, busted, children }: Props) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const ff = finalFourPicks;
  const seedMap = new Map(ff.filter((f) => f.team).map((f) => [f.team!, f.seed]));
  const elimMap = new Map(ff.filter((f) => f.team).map((f) => [f.team!, f.eliminated]));

  function enter() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShow(true), 300);
  }
  function leave() {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShow(false), 200);
  }

  return (
    <div ref={containerRef} className="relative inline-block" onMouseEnter={enter} onMouseLeave={leave}>
      {children}
      {show && (
        <div className="absolute z-50 left-0 top-full mt-1 bg-white dark:bg-gray-800 border dark:border-gray-600 rounded-lg shadow-lg p-2 whitespace-nowrap" onMouseEnter={enter} onMouseLeave={leave}>
          <div className="text-[9px] text-gray-400 mb-1 font-semibold uppercase tracking-wide">Final Four Preview</div>
          <div className="flex items-center gap-1">
            {/* Semis */}
            <div className="flex flex-col gap-1">
              <div className="border dark:border-gray-600 rounded">
                <MiniTeam name={ff[0]?.team ?? null} seed={ff[0]?.seed ?? null} eliminated={ff[0]?.eliminated} bold={semifinalPicks[0] === ff[0]?.team && !!ff[0]?.team} />
                <MiniTeam name={ff[1]?.team ?? null} seed={ff[1]?.seed ?? null} eliminated={ff[1]?.eliminated} bold={semifinalPicks[0] === ff[1]?.team && !!ff[1]?.team} />
              </div>
              <div className="border dark:border-gray-600 rounded">
                <MiniTeam name={ff[2]?.team ?? null} seed={ff[2]?.seed ?? null} eliminated={ff[2]?.eliminated} bold={semifinalPicks[1] === ff[2]?.team && !!ff[2]?.team} />
                <MiniTeam name={ff[3]?.team ?? null} seed={ff[3]?.seed ?? null} eliminated={ff[3]?.eliminated} bold={semifinalPicks[1] === ff[3]?.team && !!ff[3]?.team} />
              </div>
            </div>
            {/* Championship */}
            <div className="border dark:border-gray-600 rounded">
              <MiniTeam name={semifinalPicks[0]} seed={semifinalPicks[0] ? (seedMap.get(semifinalPicks[0]) ?? null) : null} eliminated={semifinalPicks[0] ? elimMap.get(semifinalPicks[0]) : false} bold={championPick === semifinalPicks[0] && !!semifinalPicks[0]} />
              <MiniTeam name={semifinalPicks[1]} seed={semifinalPicks[1] ? (seedMap.get(semifinalPicks[1]) ?? null) : null} eliminated={semifinalPicks[1] ? elimMap.get(semifinalPicks[1]) : false} bold={championPick === semifinalPicks[1] && !!semifinalPicks[1]} />
            </div>
            {/* Champion */}
            {championPick && (
              <div className="flex flex-col items-center px-1">
                <span className="text-sm">🏆</span>
                <TeamLogo team={championPick} />
                <span className={`text-[10px] font-bold truncate max-w-[60px] ${busted ? "text-gray-400 line-through" : ""}`}>
                  {championPick}
                  {busted && <span className="ml-0.5" style={{ textDecoration: "none" }}>💀</span>}
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
