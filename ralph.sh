#!/bin/bash
# Ralph-style autonomous development loop
# Usage: ./ralph.sh [max_iterations]

set -e
cd "$(dirname "$0")" || exit 1

source ~/.config/marchmadness.env 2>/dev/null || true

MAX=${1:-0}
COUNT=0
LOG_DIR="/tmp/ralph-test-logs"
mkdir -p "$LOG_DIR"

echo "🏀 Ralph is starting (max iterations: ${MAX:-unlimited})"
echo ""

while true; do
  COUNT=$((COUNT + 1))
  TIMESTAMP=$(date '+%Y%m%d-%H%M%S')
  LOG_FILE="$LOG_DIR/ralph-${COUNT}-${TIMESTAMP}.log"

  BUGS=$(grep -c '^\- \*\*' tests/bugs.md 2>/dev/null || echo "0")
  TASKS=$(grep -c '^\- \[ \]' PLAN.md 2>/dev/null || echo "0")

  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "🔄 Iteration $COUNT — $(date '+%H:%M:%S')"
  echo "   🐛 $BUGS bugs | 📋 $TASKS tasks"

  if [ "$BUGS" -gt 0 ]; then
    NEXT=$(grep -m1 '^\- \*\*' tests/bugs.md | head -c 80)
    echo "   Fixing: $NEXT..."
  elif [ "$TASKS" -gt 0 ]; then
    NEXT=$(grep -m1 '^\- \[ \]' PLAN.md | sed 's/^- \[ \] //' | head -c 80)
    echo "   Task: $NEXT..."
  else
    echo "   No bugs or tasks — agent will study competitors and propose improvements"
  fi
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

  kiro-cli chat \
    --agent marchmadness \
    --no-interactive \
    --trust-all-tools \
    "$(cat PROMPT.md)" \
    2>&1 | tee "$LOG_FILE"

  echo "   ✓ Iteration $COUNT done (log: $LOG_FILE)"

  if [ "$MAX" -gt 0 ] && [ "$COUNT" -ge "$MAX" ]; then
    echo "🛑 Max iterations ($MAX) reached"
    break
  fi

  sleep 5
done

echo "🏀 Ralph finished after $COUNT iterations"
