#!/bin/bash
# Restart the dev server on port 3333. Safe to call repeatedly.
cd "$(dirname "$0")" || exit 1

# Kill any existing dev server on port 3333
lsof -ti:3333 | xargs kill -9 2>/dev/null || true

# Start new one fully detached
nohup npx next dev -p 3333 > /tmp/marchmadness-dev.log 2>&1 &
disown

echo "Dev server starting on http://localhost:3333 (log: /tmp/marchmadness-dev.log)"
