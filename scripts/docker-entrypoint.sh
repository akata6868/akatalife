#!/bin/sh
set -e

# Automatically fallback from hostname 'supabase-db' to internal IP '10.0.3.6' if DNS doesn't resolve across compose networks
if echo "$DATABASE_URL" | grep -q "@supabase-db:"; then
  if ! getent hosts supabase-db >/dev/null 2>&1; then
    echo "[Akata Life] 'supabase-db' hostname not in local DNS, using internal bridge IP 10.0.3.6..."
    export DATABASE_URL=$(echo "$DATABASE_URL" | sed 's/@supabase-db:/@10.0.3.6:/g')
  fi
fi

if [ -n "$DATABASE_URL" ] && [ -z "$DIRECT_URL" ]; then
  export DIRECT_URL="$DATABASE_URL"
elif echo "$DIRECT_URL" | grep -q "@supabase-db:"; then
  if ! getent hosts supabase-db >/dev/null 2>&1; then
    export DIRECT_URL=$(echo "$DIRECT_URL" | sed 's/@supabase-db:/@10.0.3.6:/g')
  fi
fi

echo "[Akata Life] Starting Next.js standalone server on port ${PORT:-3000}..."
exec node server.js
