#!/bin/bash
# Pre-authenticate testbot and save cookie for Nova Act / curl testing
# Usage: source test-login.sh
# After sourcing, COOKIE_FILE is set and can be used with curl -b $COOKIE_FILE

source ~/.config/testapp-creds.env 2>/dev/null || true

export COOKIE_FILE="/tmp/testapp-cookie.txt"

curl -s -c "$COOKIE_FILE" -X POST "http://localhost:3333/api/auth/login" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"${TESTBOT_USER:-testbot}\",\"password\":\"${TESTBOT_PASS:-testpass}\"}" > /dev/null 2>&1

if [ -f "$COOKIE_FILE" ]; then
  echo "✅ Logged in as ${TESTBOT_USER:-testbot} (cookie: $COOKIE_FILE)"
else
  echo "❌ Login failed"
fi
