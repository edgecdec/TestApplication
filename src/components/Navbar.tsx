"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";
import NotificationBell from "@/components/NotificationBell";
import type { GroupSummaryItem } from "@/app/api/groups/my-summary/route";

const PUBLIC_PATHS = ["/login", "/register", "/"] as const;

interface NavUser {
  id: number;
  username: string;
  isAdmin: boolean;
}

interface BestRank {
  rank: number;
  score: number;
  groupName: string;
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/groups", label: "Groups" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/results", label: "Results" },
  { href: "/stats", label: "Stats" },
  { href: "/whos-left", label: "Who's Left?" },
  { href: "/upsets", label: "Upsets" },
  { href: "/party", label: "📺 Party" },
  { href: "/rules", label: "Rules" },
] as const;

function computeBestRank(summaries: GroupSummaryItem[]): BestRank | null {
  let best: BestRank | null = null;
  for (const s of summaries) {
    if (s.totalBrackets === 0 || s.myBestRank === 0) continue;
    if (!best || s.myBestRank < best.rank || (s.myBestRank === best.rank && s.myBestScore > best.score)) {
      best = { rank: s.myBestRank, score: s.myBestScore, groupName: s.groupName };
    }
  }
  return best;
}

function rankLabel(rank: number): string {
  if (rank === 1) return "🥇";
  if (rank === 2) return "🥈";
  if (rank === 3) return "🥉";
  return `#${rank}`;
}

export default function Navbar() {
  const [user, setUser] = useState<NavUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [bestRank, setBestRank] = useState<BestRank | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.user) setUser(data.user); })
      .catch(() => {});
  }, [pathname]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/groups/my-summary")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.summaries) setBestRank(computeBestRank(data.summaries));
      })
      .catch(() => {});
  }, [user]);

  // Close menu on route change
  useEffect(() => { setMenuOpen(false); }, [pathname]);

  if (!user || PUBLIC_PATHS.includes(pathname as typeof PUBLIC_PATHS[number])) return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  function navigate(href: string) {
    setMenuOpen(false);
    router.push(href);
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2 text-sm relative">
      <div className="flex items-center justify-between">
        {/* Logo + desktop nav */}
        <div className="flex items-center gap-4">
          <span
            className="font-bold text-base cursor-pointer"
            onClick={() => navigate("/dashboard")}
          >
            🏀 March Madness
          </span>
          {/* Desktop links */}
          <div className="hidden md:flex items-center gap-2">
            {NAV_LINKS.map((link) => (
              <button
                key={link.href}
                onClick={() => navigate(link.href)}
                className={`px-2 py-1 rounded transition ${
                  pathname.startsWith(link.href)
                    ? "bg-blue-100 text-blue-700 font-semibold"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {link.label}
              </button>
            ))}
            {user.isAdmin && (
              <button
                onClick={() => navigate("/admin")}
                className={`px-2 py-1 rounded transition ${
                  pathname.startsWith("/admin")
                    ? "bg-yellow-200 text-yellow-800 font-semibold"
                    : "text-yellow-700 hover:bg-yellow-50"
                }`}
              >
                ⚙️ Admin
              </button>
            )}
          </div>
        </div>

        {/* Desktop right side */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }))}
            className="flex items-center gap-1.5 px-2 py-1 text-gray-400 bg-gray-100 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600 hover:border-gray-300 transition text-xs"
            title="Search (⌘K)"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <span>Search</span>
            <kbd className="ml-1 text-[10px] bg-gray-200 dark:bg-gray-600 px-1 rounded">⌘K</kbd>
          </button>
          <NotificationBell />
          <ThemeToggle />
          {bestRank && (
            <span
              className="px-2 py-0.5 bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-700 rounded-full text-xs font-semibold text-yellow-800 dark:text-yellow-300 cursor-default"
              title={`Best rank: ${rankLabel(bestRank.rank)} in ${bestRank.groupName}`}
            >
              {rankLabel(bestRank.rank)} · {bestRank.score}pts
            </span>
          )}
          <button
            onClick={() => navigate(`/profile/${user.username}`)}
            className="text-gray-600 hover:text-blue-600 transition"
          >
            {user.username}
          </button>
          <button
            onClick={handleLogout}
            className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300 transition"
          >
            Log Out
          </button>
        </div>

        {/* Mobile: theme toggle + hamburger */}
        <div className="flex md:hidden items-center gap-2">
          <NotificationBell />
          <ThemeToggle />
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1.5 rounded hover:bg-gray-100 transition"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
          >
            {menuOpen ? (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden absolute left-0 right-0 top-full bg-white border-b border-gray-200 shadow-lg z-50 py-2 px-4 flex flex-col gap-1">
          {NAV_LINKS.map((link) => (
            <button
              key={link.href}
              onClick={() => navigate(link.href)}
              className={`text-left px-3 py-2 rounded transition ${
                pathname.startsWith(link.href)
                  ? "bg-blue-100 text-blue-700 font-semibold"
                  : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {link.label}
            </button>
          ))}
          {user.isAdmin && (
            <button
              onClick={() => navigate("/admin")}
              className={`text-left px-3 py-2 rounded transition ${
                pathname.startsWith("/admin")
                  ? "bg-yellow-200 text-yellow-800 font-semibold"
                  : "text-yellow-700 hover:bg-yellow-50"
              }`}
            >
              ⚙️ Admin
            </button>
          )}
          <hr className="my-1 border-gray-200" />
          {bestRank && (
            <div className="px-3 py-1 text-xs font-semibold text-yellow-800 dark:text-yellow-300">
              {rankLabel(bestRank.rank)} · {bestRank.score}pts — {bestRank.groupName}
            </div>
          )}
          <button
            onClick={() => navigate(`/profile/${user.username}`)}
            className="text-left px-3 py-2 text-gray-600 hover:bg-gray-100 rounded transition"
          >
            👤 {user.username}
          </button>
          <button
            onClick={handleLogout}
            className="text-left px-3 py-2 text-red-600 hover:bg-red-50 rounded transition"
          >
            Log Out
          </button>
        </div>
      )}
    </nav>
  );
}
