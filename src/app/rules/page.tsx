import { DEFAULT_SCORING, ROUND_NAMES, ROUND_GAME_COUNTS, TOTAL_GAMES, TOTAL_TEAMS, FIRST_FOUR_GAMES, REGIONS } from "@/lib/bracket-constants";

export default function RulesPage() {
  const { pointsPerRound, upsetBonusPerRound } = DEFAULT_SCORING;

  return (
    <main className="min-h-screen p-8 max-w-3xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">📖 How It Works</h1>

      {/* Bracket Structure */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">🏀 The Bracket</h2>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li><strong>{TOTAL_TEAMS} teams</strong> compete in the NCAA Tournament.</li>
          <li>The <strong>First Four</strong> ({FIRST_FOUR_GAMES} play-in games) narrow the field to 64 teams.</li>
          <li>64 teams are divided into <strong>4 regions</strong>: {REGIONS.join(", ")}.</li>
          <li>Each region has 16 teams seeded 1–16. Higher seeds (1) are favored over lower seeds (16).</li>
          <li>Teams are eliminated in a single-elimination format over <strong>6 rounds</strong> and <strong>{TOTAL_GAMES} games</strong>.</li>
          <li>The 4 regional champions meet in the <strong>Final Four</strong>, then the <strong>Championship</strong>.</li>
        </ul>
      </section>

      {/* Scoring */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">📊 Scoring (Default)</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
          Groups can customize scoring. These are the default values:
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left px-3 py-2 font-medium">Round</th>
                <th className="text-right px-3 py-2 font-medium">Games</th>
                <th className="text-right px-3 py-2 font-medium">Points/Correct</th>
                <th className="text-right px-3 py-2 font-medium">Upset Bonus</th>
              </tr>
            </thead>
            <tbody>
              {ROUND_NAMES.map((name, i) => (
                <tr key={name} className="border-t dark:border-gray-700">
                  <td className="px-3 py-2">{name}</td>
                  <td className="px-3 py-2 text-right">{ROUND_GAME_COUNTS[i]}</td>
                  <td className="px-3 py-2 text-right font-semibold">{pointsPerRound[i]}</td>
                  <td className="px-3 py-2 text-right">{upsetBonusPerRound[i] > 0 ? `×${upsetBonusPerRound[i]} per seed diff` : "—"}</td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-gray-50 dark:bg-gray-700 font-semibold">
              <tr>
                <td className="px-3 py-2">Max Possible</td>
                <td className="px-3 py-2 text-right">{TOTAL_GAMES}</td>
                <td className="px-3 py-2 text-right">{ROUND_GAME_COUNTS.reduce((s, c, i) => s + c * pointsPerRound[i], 0)}</td>
                <td className="px-3 py-2 text-right">varies</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      {/* Upset Bonus */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">🔥 Upset Bonus</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          When enabled by a group, upset bonuses reward correctly picking a lower-seeded team to win.
          The bonus = <strong>upset multiplier × seed difference</strong>. For example, if a 12-seed beats a 5-seed
          and the round&apos;s upset multiplier is 2, the bonus is 2 × (12 − 5) = <strong>14 extra points</strong>.
        </p>
      </section>

      {/* Tiebreaker */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">🎯 Tiebreaker</h2>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          When submitting your bracket, you predict the <strong>total combined score of the championship game</strong> (e.g., 145).
          If two brackets are tied on points, the one closest to the actual total wins. This is the standard March Madness tiebreaker.
        </p>
      </section>

      {/* Groups */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">👥 Groups &amp; Pools</h2>
        <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
          <li>Create a group and share the <strong>invite link</strong> (or QR code) with friends.</li>
          <li>Each group has its own <strong>leaderboard</strong> and can customize scoring settings.</li>
          <li>Groups can set a <strong>max brackets per member</strong> limit.</li>
          <li>Add a <strong>description</strong> to your group for pool rules, entry fees, payouts, etc.</li>
          <li>Groups include <strong>chat</strong>, <strong>activity feed</strong>, <strong>standings history</strong>, and <strong>round recaps</strong>.</li>
        </ul>
      </section>

      {/* Features */}
      <section className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 mb-6">
        <h2 className="text-lg font-semibold mb-3">✨ Features</h2>
        <ul className="space-y-1 text-sm text-gray-700 dark:text-gray-300">
          <li>📋 <strong>Duplicate</strong> brackets to create variations quickly</li>
          <li>🤖 <strong>Autofill</strong> — Smart, Chalk, or Random fill for empty slots</li>
          <li>📸 <strong>Export</strong> bracket as PNG image</li>
          <li>📤 <strong>Share</strong> bracket summary as text</li>
          <li>🔍 <strong>Compare</strong> brackets side-by-side in your group</li>
          <li>🎮 <strong>What-If Simulator</strong> — set hypothetical results and see leaderboard impact</li>
          <li>📊 <strong>Pick Distribution</strong> — see what % of brackets picked each team (after lock)</li>
          <li>🏆 <strong>Achievements</strong> — earn badges for bracket performance</li>
          <li>📈 <strong>Standings History</strong> — watch the leaderboard race unfold round by round</li>
          <li>🌙 <strong>Dark Mode</strong> — toggle from the navbar</li>
        </ul>
      </section>
    </main>
  );
}
