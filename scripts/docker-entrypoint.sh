#!/bin/sh
set -e

if [ -n "$DATABASE_URL" ] && [ -z "$DIRECT_URL" ]; then
  export DIRECT_URL="$DATABASE_URL"
fi

if [ -n "$DATABASE_URL" ]; then
  echo "[Akata Life] Running Prisma database migrations against Supabase..."
  node ./node_modules/prisma/build/index.js migrate deploy || echo "[Akata Life] Warning: prisma migrate deploy returned non-zero, continuing startup..."
fi

echo "[Akata Life] Starting Next.js standalone server on port ${PORT:-3000}..."
exec node server.js
