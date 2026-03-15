#!/bin/bash
# Verify all pages and API routes load without runtime errors
# Usage: bash verify.sh

BASE="http://localhost:3333"
ERRORS=0
CHECKED=0

source ~/.config/testapp-creds.env 2>/dev/null || true

check() {
  local url="$1"
  local label="$2"
  CHECKED=$((CHECKED + 1))
  local body=$(curl -s "$url" 2>&1)
  local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")

  if echo "$body" | grep -qi "TypeError\|ReferenceError\|Cannot read\|is not a function\|is not defined\|Unhandled Runtime Error\|Internal Server Error"; then
    echo "  ❌ $label — runtime error"
    ERRORS=$((ERRORS + 1))
  elif [ "$status" = "500" ]; then
    echo "  ❌ $label — 500"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✅ $label ($status)"
  fi
}

check_auth() {
  local url="$1"
  local label="$2"
  CHECKED=$((CHECKED + 1))
  local body=$(curl -s -b /tmp/verify-cookie.txt "$url" 2>&1)
  local status=$(curl -s -b /tmp/verify-cookie.txt -o /dev/null -w "%{http_code}" "$url")

  if echo "$body" | grep -qi "TypeError\|ReferenceError\|Cannot read\|is not a function\|is not defined\|Unhandled Runtime Error\|Internal Server Error"; then
    echo "  ❌ $label — runtime error"
    ERRORS=$((ERRORS + 1))
  elif [ "$status" = "500" ]; then
    echo "  ❌ $label — 500"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✅ $label ($status)"
  fi
}

echo "🔍 Verifying all pages and API routes..."
echo ""

# Login
curl -s -c /tmp/verify-cookie.txt -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${TESTBOT_USER:-testbot}\",\"password\":\"${TESTBOT_PASS:-testpass}\"}" > /dev/null 2>&1

echo "--- Public Pages ---"
check "$BASE" "Homepage"
check "$BASE/login" "Login"
check "$BASE/register" "Register"
check "$BASE/rules" "Rules"

echo ""
echo "--- Auth Pages ---"
check_auth "$BASE/dashboard" "Dashboard"
check_auth "$BASE/bracket/1" "Bracket"
check_auth "$BASE/leaderboard" "Leaderboard"
check_auth "$BASE/groups" "Groups"
check_auth "$BASE/stats" "Stats"
check_auth "$BASE/results" "Results"
check_auth "$BASE/whos-left" "Who's Left"
check_auth "$BASE/upsets" "Upsets"
check_auth "$BASE/profile/testbot" "Profile"

echo ""
echo "--- Auth API ---"
check "$BASE/api/auth/me" "Auth (no cookie)"
check_auth "$BASE/api/auth/me" "Auth (logged in)"

echo ""
echo "--- Tournament API ---"
check_auth "$BASE/api/tournaments" "Tournaments"
check_auth "$BASE/api/tournaments/updates" "Tournament Updates"
check_auth "$BASE/api/tournaments/upsets" "Tournament Upsets"

echo ""
echo "--- Bracket API ---"
check_auth "$BASE/api/brackets" "Brackets"
check_auth "$BASE/api/brackets/distribution?tournament_id=1" "Distribution"
check_auth "$BASE/api/brackets/achievements?tournament_id=1" "Achievements"
check_auth "$BASE/api/brackets/grades?tournament_id=1" "Grades"
check_auth "$BASE/api/brackets/recent-results?tournament_id=1" "Recent Results"
check_auth "$BASE/api/brackets/games-that-matter" "Games That Matter"

echo ""
echo "--- Group API ---"
check_auth "$BASE/api/groups" "Groups List"
check_auth "$BASE/api/groups/my-summary" "My Groups Summary"

echo ""
echo "--- ESPN API ---"
check_auth "$BASE/api/espn/scores" "ESPN Scores"

echo ""
echo "--- Stats API ---"
check_auth "$BASE/api/stats?tournament_id=1" "Stats"

echo ""
echo "--- Notifications API ---"
check_auth "$BASE/api/notifications" "Notifications"

echo ""
echo "=========================================="
if [ "$ERRORS" -gt 0 ]; then
  echo "💥 $ERRORS/$CHECKED checks failed!"
  exit 1
else
  echo "✅ All $CHECKED checks passed"
  exit 0
fi
