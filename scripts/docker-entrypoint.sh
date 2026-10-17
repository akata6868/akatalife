#!/bin/sh
set -e

echo "[Akata Life] Starting Next.js standalone server on port ${PORT:-3000}..."
exec node server.js
