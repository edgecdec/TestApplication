"use client";

import { useEffect, useState, useCallback, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import type { CommandItem } from "@/types/command-palette";

const STATIC_PAGES: CommandItem[] = [
  { id: "p-dashboard", label: "Dashboard", category: "page", href: "/dashboard", icon: "🏠" },
  { id: "p-groups", label: "Groups", category: "page", href: "/groups", icon: "👥" },
  { id: "p-leaderboard", label: "Leaderboard", category: "page", href: "/leaderboard", icon: "🏆" },
  { id: "p-results", label: "Results", category: "page", href: "/results", icon: "📊" },
  { id: "p-stats", label: "Stats", category: "page", href: "/stats", icon: "📈" },
  { id: "p-whos-left", label: "Who's Left?", category: "page", href: "/whos-left", icon: "🏀" },
  { id: "p-upsets", label: "Upsets", category: "page", href: "/upsets", icon: "⚡" },
  { id: "p-party", label: "Party Mode", category: "page", href: "/party", icon: "📺" },
  { id: "p-rules", label: "Rules", category: "page", href: "/rules", icon: "📖" },
];

const CATEGORY_LABELS: Record<CommandItem["category"], string> = {
  page: "Pages",
  group: "Groups",
  bracket: "Brackets",
  team: "Teams",
};

function fuzzyMatch(query: string, text: string): boolean {
  const q = query.toLowerCase();
  const t = text.toLowerCase();
  if (t.includes(q)) return true;
  let qi = 0;
  for (let ti = 0; ti < t.length && qi < q.length; ti++) {
    if (t[ti] === q[qi]) qi++;
  }
  return qi === q.length;
}

interface DynamicData {
  groups: { id: number; name: string }[];
  brackets: { id: number; name: string }[];
  teams: { name: string; seed: number; region: string }[];
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [dynamicData, setDynamicData] = useState<DynamicData | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Global keyboard shortcut
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 0);
    }
  }, [open]);

  // Fetch dynamic data once when opened
  useEffect(() => {
    if (!open || dynamicData) return;
    Promise.all([
      fetch("/api/groups").then((r) => (r.ok ? r.json() : { groups: [] })),
      fetch("/api/brackets").then((r) => (r.ok ? r.json() : { brackets: [] })),
      fetch("/api/tournaments").then((r) => (r.ok ? r.json() : { tournaments: [] })),
    ]).then(([gData, bData, tData]) => {
      const teams: DynamicData["teams"] = [];
      const tournaments = tData.tournaments || [];
      if (tournaments.length > 0) {
        const t = tournaments[0];
        const bd = typeof t.bracket_data === "string" ? (() => { try { return JSON.parse(t.bracket_data); } catch { return null; } })() : t.bracket_data;
        if (bd?.regions) {
          for (const region of bd.regions) {
            for (const team of region.teams || []) {
              if (team.name) teams.push({ name: team.name, seed: team.seed, region: region.name });
            }
          }
        }
      }
      setDynamicData({
        groups: (gData.groups || []).map((g: { id: number; name: string }) => ({ id: g.id, name: g.name })),
        brackets: (bData.brackets || []).map((b: { id: number; name: string }) => ({ id: b.id, name: b.name })),
        teams,
      });
    });
  }, [open, dynamicData]);

  // Build items list
  const items = useMemo((): CommandItem[] => {
    const all: CommandItem[] = [...STATIC_PAGES];
    if (dynamicData) {
      for (const g of dynamicData.groups) {
        all.push({ id: `g-${g.id}`, label: g.name, category: "group", href: `/groups/${g.id}`, icon: "👥" });
      }
      for (const b of dynamicData.brackets) {
        all.push({ id: `b-${b.id}`, label: b.name, category: "bracket", href: `/bracket/${b.id}`, icon: "📋" });
      }
      for (const t of dynamicData.teams) {
        all.push({ id: `t-${t.name}`, label: `(${t.seed}) ${t.name}`, category: "team", href: `/whos-left`, icon: "🏀" });
      }
    }
    if (!query) return all.filter((i) => i.category !== "team");
    return all.filter((i) => fuzzyMatch(query, i.label));
  }, [query, dynamicData]);

  // Group by category
  const grouped = useMemo(() => {
    const map: Record<string, CommandItem[]> = {};
    for (const item of items) {
      if (!map[item.category]) map[item.category] = [];
      map[item.category].push(item);
    }
    return map;
  }, [items]);

  // Flat list for keyboard navigation
  const flatItems = useMemo(() => {
    const result: CommandItem[] = [];
    for (const key of Object.keys(grouped)) result.push(...grouped[key]);
    return result;
  }, [grouped]);

  const navigate = useCallback(
    (item: CommandItem) => {
      setOpen(false);
      router.push(item.href);
    },
    [router]
  );

  // Keyboard navigation inside palette
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIdx((i) => Math.min(i + 1, flatItems.length - 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIdx((i) => Math.max(i - 1, 0));
      } else if (e.key === "Enter" && flatItems[selectedIdx]) {
        e.preventDefault();
        navigate(flatItems[selectedIdx]);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    },
    [flatItems, selectedIdx, navigate]
  );

  // Reset selection when query changes
  useEffect(() => { setSelectedIdx(0); }, [query]);

  // Scroll selected item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${selectedIdx}"]`);
    el?.scrollIntoView({ block: "nearest" });
  }, [selectedIdx]);

  if (!open) return null;

  let flatIdx = 0;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]" onClick={() => setOpen(false)}>
      <div className="fixed inset-0 bg-black/50" />
      <div
        className="relative w-full max-w-lg bg-white dark:bg-gray-800 rounded-xl shadow-2xl border border-gray-200 dark:border-gray-700 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search input */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Search pages, groups, brackets, teams…"
            className="flex-1 bg-transparent outline-none text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400"
          />
          <kbd className="hidden sm:inline text-xs text-gray-400 bg-gray-100 dark:bg-gray-700 px-1.5 py-0.5 rounded">esc</kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-80 overflow-y-auto py-2">
          {flatItems.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-8">No results found</p>
          )}
          {Object.entries(grouped).map(([category, categoryItems]) => (
            <div key={category}>
              <p className="text-xs font-semibold text-gray-400 uppercase px-4 py-1">{CATEGORY_LABELS[category as CommandItem["category"]]}</p>
              {categoryItems.map((item) => {
                const idx = flatIdx++;
                return (
                  <button
                    key={item.id}
                    data-idx={idx}
                    onClick={() => navigate(item)}
                    onMouseEnter={() => setSelectedIdx(idx)}
                    className={`w-full text-left px-4 py-2 flex items-center gap-2 text-sm transition-colors ${
                      idx === selectedIdx
                        ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                        : "text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50"
                    }`}
                  >
                    <span className="text-base">{item.icon}</span>
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Footer hint */}
        <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-2 flex items-center gap-4 text-xs text-gray-400">
          <span>↑↓ navigate</span>
          <span>↵ open</span>
          <span>esc close</span>
        </div>
      </div>
    </div>
  );
}
