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
- [ ] Add autofill options (Smart/Chalk/Random) as dropdown with descriptions. Only fill empty slots.
- [ ] Add bracket export (PNG with readable colors).
- [ ] Add admin panel: create tournaments, import bracket data, sync ESPN results.
- [ ] Add "What-If" simulator: bracket view where clicks set hypothetical results, live leaderboard sidebar.
- [ ] Add bracket comparison overlay: one bracket showing multiple users' picks with colored indicators.
