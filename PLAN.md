# March Madness Picker — Development Plan

Agent picks the top incomplete task. When all tasks are done, study competitor sites and propose small free improvements.

## Tasks
- [x] Research and decide on tech stack: study pros/cons of Next.js vs Remix vs plain React+Express, SQLite vs PostgreSQL vs JSON files, MUI vs Tailwind vs shadcn. Write findings to specs/tech-decisions.md. Consider: free hosting, simplicity, bundle size, developer experience. Then scaffold the chosen stack.
- [x] Implement user auth: register/login with username+password, bcrypt hashing, JWT cookies. First user becomes admin.
- [x] Implement tournament and bracket data model: DB schema for users, tournaments, picks, groups. See specs/bracket.md and specs/groups.md.
- [x] Build the interactive bracket UI: 68-team bracket with First Four, click-to-pick, cascade clearing. See specs/bracket.md.
- [x] Build groups system: create/join via invite link, custom scoring settings, group leaderboards. See specs/groups.md.
- [x] Build scoring and leaderboard: per-round points, upset bonuses, tiebreaker, round-by-round breakdown. See specs/scoring.md.
- [x] Add live scores from ESPN public API and auto-resolve results.
- [x] Add autofill options (Smart/Chalk/Random) as dropdown with descriptions. Only fill empty slots.
- [x] Add bracket export (PNG with readable colors).
- [x] Add admin panel: create tournaments, import bracket data, sync ESPN results.
- [x] Add "What-If" simulator: bracket view where clicks set hypothetical results, live leaderboard sidebar.
- [x] Add bracket comparison overlay: one bracket showing multiple users' picks with colored indicators.
- [x] Add pick agreement stats to comparison view: show fraction of selected brackets that agree on each game (e.g., "3/4") and highlight unanimous picks vs split picks with color coding.
- [x] Add bracket completion progress: show a progress bar on dashboard and group pages indicating how many of 63 picks are filled per bracket, with a "Complete" badge when all picks are in. Helps friends see who still needs to finish before lock time.
- [x] Add lock countdown timer: show a live countdown to tournament lock_time on the dashboard and bracket edit page. Display "Locked" badge after lock time passes. Disable pick changes after lock. Helps friends know exactly how much time remains to finalize brackets.
- [x] Add bracket stats page: show most popular champion picks with bar chart, biggest upset pick, most chalk vs most contrarian bracket. Available after lock time. Linked from dashboard nav.
- [x] Add "Who Picked Whom" page: for a selected group, show every matchup with which members picked which team, counts, and percentages. Helps friends see consensus and contrarian picks at a glance. Linked from group page and dashboard nav.
- [x] Add user profile page: show a user's brackets with per-round score breakdown, groups they belong to, and join date. Clickable from leaderboards and group pages. Helps friends see each other's performance at a glance.
- [x] Add group chat: simple real-time messaging within each group so friends can trash-talk and discuss picks. Chat panel on the group detail page with polling. DB-backed messages table.
- [x] Add scoring breakdown dialog: clicking a user's score on the leaderboard opens a dialog showing every resolved pick — round, team picked, correct/wrong, base points, upset bonus. Helps friends see exactly which picks earned or lost points. Reuse existing scorePicks logic, extend it to return per-game detail.
