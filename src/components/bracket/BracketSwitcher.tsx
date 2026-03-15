"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import type { Bracket } from "@/types/tournament";
import { TOTAL_GAMES } from "@/lib/bracket-constants";

interface Props {
  currentBracketId: number;
  tournamentId: number;
}

/** Dropdown to quickly switch between the user's brackets for the same tournament */
export default function BracketSwitcher({ currentBracketId, tournamentId }: Props) {
  const router = useRouter();
  const [brackets, setBrackets] = useState<Bracket[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`/api/brackets?tournament_id=${tournamentId}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { if (d?.brackets) setBrackets(d.brackets); })
      .catch(() => {});
  }, [tournamentId]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (brackets.length < 2) return null;

  const others = brackets.filter((b) => b.id !== currentBracketId);

  return (
    <div ref={ref} className="relative inline-block no-print">
      <button
        onClick={() => setOpen((p) => !p)}
        className="text-xs px-1.5 py-0.5 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition"
        title="Switch bracket"
      >
        ⇅ {brackets.length}
      </button>
      {open && (
        <div className="absolute left-0 top-full mt-1 z-50 bg-white dark:bg-gray-800 border dark:border-gray-700 rounded shadow-lg min-w-[200px]">
          {others.map((b) => {
            const pickCount = Object.keys(JSON.parse(b.picks || "{}")).length;
            return (
              <button
                key={b.id}
                onClick={() => { setOpen(false); router.push(`/bracket/${b.id}`); }}
                className="w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center justify-between gap-2 transition"
              >
                <span className="truncate">{b.name}</span>
                <span className="text-xs text-gray-400 whitespace-nowrap">
                  {pickCount}/{TOTAL_GAMES}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
