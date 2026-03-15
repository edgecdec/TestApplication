import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { getCurrentRound } from "@/lib/scoring";
import { ROUND_NAMES, TOTAL_GAMES } from "@/lib/bracket-constants";
import type { Results } from "@/types/bracket";

const FEATURES = [
  { emoji: "📝", title: "Fill Your Bracket", desc: "Pick winners for all 63 games with an interactive bracket UI" },
  { emoji: "👥", title: "Create Pools", desc: "Invite friends via link or QR code with custom scoring rules" },
  { emoji: "📊", title: "Live Leaderboards", desc: "Track standings with sortable columns, streaks, and achievements" },
  { emoji: "📺", title: "Watch Party Mode", desc: "TV-optimized view with live scores and group standings" },
  { emoji: "🔮", title: "What-If Simulator", desc: "Simulate remaining games and see how standings would change" },
  { emoji: "📱", title: "Mobile Friendly", desc: "Full bracket experience on any device with responsive design" },
] as const;

export default async function Home() {
  const user = await getCurrentUser();
  if (user) redirect("/dashboard");

  const db = getDb();
  const tournament = db.prepare("SELECT * FROM tournaments ORDER BY year DESC LIMIT 1").get() as
    | { name: string; year: number; results_data: string; lock_time: string; bracket_data: string }
    | undefined;

  let tournamentStatus: { name: string; year: number; round: string; gamesResolved: number; locked: boolean } | null = null;
  if (tournament) {
    const results: Results = JSON.parse(tournament.results_data || "{}");
    const resolved = Object.keys(results).length;
    const roundIdx = getCurrentRound(results);
    const locked = new Date(tournament.lock_time) <= new Date();
    tournamentStatus = {
      name: tournament.name,
      year: tournament.year,
      round: roundIdx >= 0 ? ROUND_NAMES[roundIdx] : "Not Started",
      gamesResolved: resolved,
      locked,
    };
  }

  return (
    <main className="min-h-screen flex flex-col">
      {/* Hero */}
      <section className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center bg-gradient-to-b from-blue-600 to-blue-800 text-white">
        <div className="text-6xl mb-4">🏀</div>
        <h1 className="text-4xl md:text-5xl font-bold mb-3">March Madness Picker</h1>
        <p className="text-lg md:text-xl text-blue-100 mb-8 max-w-xl">
          Fill out your bracket, create pools with friends, and compete with live scoring and leaderboards.
        </p>
        <div className="flex gap-4">
          <a href="/register" className="px-8 py-3 bg-white text-blue-700 font-semibold rounded-lg hover:bg-blue-50 transition shadow-lg">
            Get Started
          </a>
          <a href="/login" className="px-8 py-3 bg-blue-500 text-white font-semibold rounded-lg hover:bg-blue-400 transition">
            Log In
          </a>
        </div>
      </section>

      {/* Tournament status */}
      {tournamentStatus && (
        <section className="bg-white border-b border-gray-200 py-6 px-6">
          <div className="max-w-3xl mx-auto flex flex-wrap items-center justify-center gap-8 text-center">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Tournament</p>
              <p className="font-bold text-lg">{tournamentStatus.name}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Current Round</p>
              <p className="font-bold text-lg">{tournamentStatus.round}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Games Resolved</p>
              <p className="font-bold text-lg">{tournamentStatus.gamesResolved} / {TOTAL_GAMES}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wide">Brackets</p>
              <p className="font-bold text-lg">{tournamentStatus.locked ? "🔒 Locked" : "🟢 Open"}</p>
            </div>
          </div>
        </section>
      )}

      {/* Features */}
      <section className="py-12 px-6 bg-gray-50">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-8">Everything you need for your bracket pool</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map((f) => (
              <div key={f.title} className="bg-white rounded-lg shadow p-5 text-center">
                <div className="text-3xl mb-2">{f.emoji}</div>
                <h3 className="font-semibold mb-1">{f.title}</h3>
                <p className="text-sm text-gray-600">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-10 px-6 text-center bg-gray-900 text-white">
        <h2 className="text-xl font-bold mb-2">Ready to play?</h2>
        <p className="text-gray-400 mb-4">Free to use. No ads. No tracking.</p>
        <a href="/register" className="inline-block px-8 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition">
          Create Your Account
        </a>
      </section>
    </main>
  );
}
