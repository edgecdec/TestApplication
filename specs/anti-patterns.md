# Anti-Patterns — Read This First Every Loop

## Deployment
- NEVER push code that doesn't pass `npx next build` locally
- When changing imports or moving files, verify build passes — macOS is case-insensitive but Linux servers are case-sensitive
- When adding a new dependency, run `npx next build` to make sure it resolves

## Code Quality
- NEVER use dynamic `require()` inside route handlers — use top-level ES imports
- NEVER use `ON CONFLICT` SQL without verifying the constraint exists in the schema
- NEVER mark a bug as fixed without testing the exact scenario that caused it
- When removing a DB constraint, update ALL SQL statements that reference it

## Context Management
- Do NOT read every file in the project — only read files relevant to the current task
- Read the relevant spec file ONCE, then work from memory
- Keep commits small and focused — one logical change per commit

## Testing
- Always test the specific thing you changed, not just the homepage
- A 401 "Not authenticated" from an API is expected behavior, not a bug

## React State
- When using tabs/selectors, make sure displayed content actually changes with the selection
- Props that seed useState only run once — if the prop changes, state won't update automatically. Use useEffect to sync.

## Implementation
- FULL implementations only. No placeholders. No stubs. No TODOs.
- Search the codebase before implementing — don't assume something doesn't exist

## Code Organization
- NEVER put magic numbers or hardcoded strings inline — use named constants
- NEVER duplicate logic — search for existing utilities/hooks/components first
- NEVER create large monolithic files — split into small focused files
- NEVER use `any` type — define proper types in src/types/

## Data Parsing
- bracket_data from the DB is a JSON string — ALWAYS JSON.parse() it before use
- bracket_data structure is `{ regions: [...] }` — access `.regions` to get the array, don't pass the whole object where an array is expected
- ALWAYS validate data shape before using it — check if it's a string (needs parsing), check if the expected property exists

## Runtime Verification
- `npx next build` passing does NOT mean the app works — TypeScript can't catch runtime data shape issues
- After restarting dev server, ALWAYS curl the pages you changed and grep for errors: `curl -s http://localhost:3333/your-page | grep -i "error\|TypeError\|undefined\|is not a function"`
- If curl returns HTML with an error stack trace, you have a runtime bug — fix it before committing
- Common runtime bugs that build passes but runtime catches: unparsed JSON strings, missing .property access, wrong data shape passed to functions, undefined props

## Nova Act Testing
- Keep prompts SHORT — one sentence max per act() call. "Token limit exceeded" means your prompt is too long.
- Always use `ignore_https_errors=True` for localhost
- Login pattern:
  ```python
  with NovaAct(starting_page="http://localhost:3333/login", ignore_https_errors=True) as nova:
      nova.act('Type testbot in the username field')
      nova.act('Type testpass in the password field')
      nova.act('Click the login button')
  ```
- Test ONE thing per act() call: "Click the Duke team name" not "Click Duke and verify it advances and check the score updates"
- If act() returns no response, the action succeeded — check the next state with another act()
- NEVER write Nova Act auth errors to bugs.md
