# Tech Stack Decisions

## Framework: Next.js 14 (App Router)
- Built-in API routes eliminate need for separate Express server
- SSR/SSG for fast page loads
- File-based routing reduces boilerplate
- Huge ecosystem, well-documented
- Rejected Remix: smaller ecosystem, less community support for SQLite patterns
- Rejected plain React+Express: more wiring, no SSR out of the box

## Database: SQLite via better-sqlite3
- Zero config, single-file database — perfect for self-hosted single-server constraint
- Synchronous API (better-sqlite3) is simpler than async alternatives
- No external database process to manage
- Rejected PostgreSQL: overkill for single-server, requires separate process
- Rejected JSON files: no query capability, no transactions, doesn't scale

## Styling: Tailwind CSS v4
- Utility-first, small production bundle (purged CSS)
- Fast to build responsive layouts (mobile-first requirement)
- No component library lock-in
- Rejected MUI: large bundle, opinionated design system
- Rejected shadcn: adds complexity; can adopt later if needed

## Auth: bcrypt + JWT httpOnly cookies
- As specified in requirements
- bcrypt for password hashing (industry standard)
- JWT in httpOnly cookies for stateless sessions
- No OAuth providers needed (constraint: no external services)

## Dev Server Port: 3333
- Configured in package.json scripts
