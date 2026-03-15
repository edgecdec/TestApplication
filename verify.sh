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

check_api() {
  local url="$1"
  local label="$2"
  local expect_code="${3:-200}"
  CHECKED=$((CHECKED + 1))
  local status=$(curl -s -b /tmp/verify-cookie.txt -o /dev/null -w "%{http_code}" "$url")

  if [ "$expect_code" = "any" ]; then
    if [ "$status" = "500" ]; then
      echo "  ❌ $label — 500"
      ERRORS=$((ERRORS + 1))
    else
      echo "  ✅ $label ($status)"
    fi
  elif [ "$status" = "$expect_code" ] || [ "$status" = "200" ] || [ "$status" = "401" ]; then
    echo "  ✅ $label ($status)"
  elif [ "$status" = "500" ]; then
    echo "  ❌ $label — 500"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✅ $label ($status)"
  fi
}

echo "🔍 Verifying all pages and API routes..."
echo ""

# Login as testbot via dev auto-login (no password needed in dev)
curl -s -L -c /tmp/verify-cookie.txt "$BASE/api/auth/dev-login?username=${TESTBOT_USER:-testbot}&redirect=/dashboard" > /dev/null 2>&1

echo "--- Public Pages ---"
check "$BASE" "Homepage /"
check "$BASE/login" "Login /login"
check "$BASE/register" "Register /register"
check "$BASE/rules" "Rules /rules"

echo ""
echo "--- Auth Pages ---"
check_auth "$BASE/dashboard" "Dashboard /dashboard"
check_auth "$BASE/bracket/1" "Bracket /bracket/1"
check_auth "$BASE/leaderboard" "Leaderboard /leaderboard"
check_auth "$BASE/groups" "Groups /groups"
check_auth "$BASE/stats" "Stats /stats"
check_auth "$BASE/results" "Results /results"
check_auth "$BASE/whos-left" "Who's Left /whos-left"
check_auth "$BASE/upsets" "Upsets /upsets"
check_auth "$BASE/party" "Party /party"
check_auth "$BASE/profile/testbot" "Profile /profile/testbot"
check_auth "$BASE/admin" "Admin /admin"

# Dynamic pages with IDs — use ID 1 as test
check_auth "$BASE/groups/1" "Group Detail /groups/1"
check_auth "$BASE/groups/1/compare" "Group Compare /groups/1/compare"
check_auth "$BASE/groups/1/whopicked" "Who Picked /groups/1/whopicked"
check_auth "$BASE/groups/1/recap" "Round Recap /groups/1/recap"
check_auth "$BASE/simulator/1" "Simulator /simulator/1"
check_auth "$BASE/join/invalid" "Join /join/invalid"

echo ""
echo "--- Auth API: Core ---"
check "$BASE/api/auth/me" "Auth /api/auth/me (no cookie)"
check_auth "$BASE/api/auth/me" "Auth /api/auth/me (logged in)"

echo ""
echo "--- Tournament API ---"
check_auth "$BASE/api/tournaments" "GET /api/tournaments"
check_auth "$BASE/api/tournaments/updates" "GET /api/tournaments/updates"
check_auth "$BASE/api/tournaments/upsets" "GET /api/tournaments/upsets"
check_api "$BASE/api/tournaments/1" "GET /api/tournaments/1" "any"
check_api "$BASE/api/tournaments/1/leaderboard" "GET /api/tournaments/1/leaderboard" "any"

echo ""
echo "--- Bracket API ---"
check_auth "$BASE/api/brackets" "GET /api/brackets"
check_api "$BASE/api/brackets/distribution?tournament_id=1" "GET /api/brackets/distribution" "any"
check_api "$BASE/api/brackets/achievements?tournament_id=1" "GET /api/brackets/achievements" "any"
check_api "$BASE/api/brackets/grades?tournament_id=1" "GET /api/brackets/grades" "any"
check_api "$BASE/api/brackets/recent-results?tournament_id=1" "GET /api/brackets/recent-results" "any"
check_api "$BASE/api/brackets/games-that-matter" "GET /api/brackets/games-that-matter" "any"
check_api "$BASE/api/brackets/head-to-head?bracket_a=1&bracket_b=2&tournament_id=1" "GET /api/brackets/head-to-head" "any"
check_api "$BASE/api/brackets/1" "GET /api/brackets/1" "any"

echo ""
echo "--- Group API ---"
check_auth "$BASE/api/groups" "GET /api/groups"
check_auth "$BASE/api/groups/my-summary" "GET /api/groups/my-summary"
check_api "$BASE/api/groups/1" "GET /api/groups/1" "any"
check_api "$BASE/api/groups/1/leaderboard" "GET /api/groups/1/leaderboard" "any"
check_api "$BASE/api/groups/1/messages" "GET /api/groups/1/messages" "any"
check_api "$BASE/api/groups/1/activity" "GET /api/groups/1/activity" "any"
check_api "$BASE/api/groups/1/whopicked" "GET /api/groups/1/whopicked" "any"
check_api "$BASE/api/groups/1/simulator" "GET /api/groups/1/simulator" "any"
check_api "$BASE/api/groups/1/standings-history" "GET /api/groups/1/standings-history" "any"
check_api "$BASE/api/groups/1/similarity" "GET /api/groups/1/similarity" "any"
check_api "$BASE/api/groups/1/recap" "GET /api/groups/1/recap" "any"
check_api "$BASE/api/groups/1/reactions" "GET /api/groups/1/reactions" "any"
check_api "$BASE/api/groups/1/member-status" "GET /api/groups/1/member-status" "any"
check_api "$BASE/api/groups/1/predictions" "GET /api/groups/1/predictions" "any"
check_api "$BASE/api/groups/1/brackets" "GET /api/groups/1/brackets" "any"

echo ""
echo "--- Profile API ---"
check_api "$BASE/api/profile/testbot" "GET /api/profile/testbot" "any"

echo ""
echo "--- ESPN API ---"
check_auth "$BASE/api/espn/scores" "GET /api/espn/scores"

echo ""
echo "--- Stats API ---"
check_api "$BASE/api/stats?tournament_id=1" "GET /api/stats" "any"

echo ""
echo "--- Notifications API ---"
check_auth "$BASE/api/notifications" "GET /api/notifications"

echo ""
echo "--- Admin API ---"
# Login as admin via dev auto-login
curl -s -L -c /tmp/verify-admin-cookie.txt "$BASE/api/auth/dev-login?username=${ADMIN_USER:-ralphbot}&redirect=/dashboard" > /dev/null 2>&1

CHECKED=$((CHECKED + 1))
ADMIN_STATUS=$(curl -s -b /tmp/verify-admin-cookie.txt -o /dev/null -w "%{http_code}" "$BASE/api/admin/users")
if [ "$ADMIN_STATUS" = "500" ]; then
  echo "  ❌ GET /api/admin/users — 500"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ GET /api/admin/users ($ADMIN_STATUS)"
fi

CHECKED=$((CHECKED + 1))
BACKUP_STATUS=$(curl -s -b /tmp/verify-admin-cookie.txt -o /dev/null -w "%{http_code}" "$BASE/api/admin/backup")
if [ "$BACKUP_STATUS" = "500" ]; then
  echo "  ❌ GET /api/admin/backup — 500"
  ERRORS=$((ERRORS + 1))
else
  echo "  ✅ GET /api/admin/backup ($BACKUP_STATUS)"
fi

echo ""
echo "=========================================="
if [ "$ERRORS" -gt 0 ]; then
  echo "💥 $ERRORS/$CHECKED checks failed!"
  exit 1
else
  echo "✅ All $CHECKED checks passed"
  exit 0
fi
