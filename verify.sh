#!/bin/bash
# Verify key pages load without runtime errors
# Usage: bash verify.sh

BASE="http://localhost:3333"
ERRORS=0

check() {
  local url="$1"
  local label="$2"
  local body=$(curl -s "$url" 2>&1)
  local status=$(curl -s -o /dev/null -w "%{http_code}" "$url")

  if echo "$body" | grep -qi "TypeError\|ReferenceError\|Cannot read\|is not a function\|is not defined\|Unhandled Runtime Error\|Internal Server Error"; then
    echo "  ❌ $label ($url) — runtime error detected"
    echo "$body" | grep -i "error\|TypeError\|Cannot" | head -3
    ERRORS=$((ERRORS + 1))
  elif [ "$status" = "500" ]; then
    echo "  ❌ $label ($url) — 500 error"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✅ $label ($status)"
  fi
}

echo "🔍 Verifying pages..."

# Login to get session cookie
curl -s -c /tmp/verify-cookie.txt -X POST "$BASE/api/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"username":"testbot","password":"testpass"}' > /dev/null 2>&1

check "$BASE" "Homepage"
check "$BASE/login" "Login"
check "$BASE/register" "Register"
check "$BASE/dashboard" "Dashboard"
check "$BASE/bracket/1" "Bracket"
check "$BASE/leaderboard" "Leaderboard"
check "$BASE/groups" "Groups"
check "$BASE/api/auth/me" "Auth API (no cookie)"

# Authenticated checks
check_auth() {
  local url="$1"
  local label="$2"
  local body=$(curl -s -b /tmp/verify-cookie.txt "$url" 2>&1)
  local status=$(curl -s -b /tmp/verify-cookie.txt -o /dev/null -w "%{http_code}" "$url")

  if echo "$body" | grep -qi "TypeError\|ReferenceError\|Cannot read\|is not a function\|is not defined\|Unhandled Runtime Error\|Internal Server Error"; then
    echo "  ❌ $label ($url) — runtime error detected"
    echo "$body" | grep -i "error\|TypeError\|Cannot" | head -3
    ERRORS=$((ERRORS + 1))
  elif [ "$status" = "500" ]; then
    echo "  ❌ $label ($url) — 500 error"
    ERRORS=$((ERRORS + 1))
  else
    echo "  ✅ $label ($status)"
  fi
}

check_auth "$BASE/api/auth/me" "Auth API (logged in)"
check_auth "$BASE/api/tournaments" "Tournaments API (logged in)"

echo ""
if [ "$ERRORS" -gt 0 ]; then
  echo "💥 $ERRORS page(s) have errors!"
  exit 1
else
  echo "✅ All pages OK"
  exit 0
fi
