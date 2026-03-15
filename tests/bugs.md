# Bugs — Fix these BEFORE working on any PLAN.md tasks

No bugs yet.

- **Bracket page crashes: "regions.find is not a function"** at src/lib/bracket-utils.ts line 58. The `regions` variable is not an array — it's likely the raw `bracket_data` string from the DB that hasn't been parsed, or the bracket_data structure wraps regions in an object like `{ regions: [...] }` but the code expects a plain array. Fix: ensure bracket_data is parsed from JSON and extract the `.regions` array before passing to bracket-utils functions. Check everywhere bracket_data is loaded from the API — it may need `JSON.parse()` and then access `.regions`.
