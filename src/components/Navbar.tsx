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
  { href: "/stats", label: "Stats" },
] as const;

export default function Navbar() {
  const [user, setUser] = useState<NavUser | null>(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => { if (data?.user) setUser(data.user); })
      .catch(() => {});
  }, [pathname]);

  if (!user || PUBLIC_PATHS.includes(pathname as typeof PUBLIC_PATHS[number])) return null;

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav className="bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between text-sm">
      <div className="flex items-center gap-4">
        <span
          className="font-bold text-base cursor-pointer"
          onClick={() => router.push("/dashboard")}
        >
          🏀 March Madness
        </span>
        {NAV_LINKS.map((link) => (
          <button
            key={link.href}
            onClick={() => router.push(link.href)}
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
            onClick={() => router.push("/admin")}
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
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <button
          onClick={() => router.push(`/profile/${user.username}`)}
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
    </nav>
  );
}
