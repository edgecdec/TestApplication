"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import ThemeToggle from "@/components/ThemeToggle";

const PUBLIC_PATHS = ["/login", "/register", "/"] as const;

interface NavUser {
  id: number;
  username: string;
  isAdmin: boolean;
}

const NAV_LINKS = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/groups", label: "Groups" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/stats", label: "Stats" },
  { href: "/whos-left", label: "Who's Left?" },
  { href: "/upsets", label: "Upsets" },
  { href: "/rules", label: "Rules" },
] as const;

export default function Navbar() {
  const [user, setUser] = useState<NavUser | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.user) setUser(data.user); })
      .catch(() => {});
  }, [pathname]);

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
          <ThemeToggle />
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
