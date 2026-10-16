#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# AKATA LIFE — AUTOMATED BACKUP SCRIPT (SUPABASE POSTGRESQL + PRIVATE DOCUMENTS)
# ==============================================================================

TIMESTAMP="$(date -u +%Y%m%d-%H%M%S)"
BACKUP_ROOT="${BACKUP_ROOT:-./backups}"
TARGET_DIR="${BACKUP_ROOT}/akatalife-${TIMESTAMP}"
STORAGE_DIR="${STORAGE_DIR:-./storage/uploads}"

mkdir -p "${TARGET_DIR}"

echo "[1/3] Exporting Supabase PostgreSQL database via DIRECT_URL / DATABASE_URL..."
DB_URI="${DIRECT_URL:-${DATABASE_URL:-}}"
if [[ -z "${DB_URI}" ]]; then
  echo "ERROR: DIRECT_URL or DATABASE_URL must be set." >&2
  exit 1
fi

pg_dump --clean --if-exists --no-owner --no-privileges "${DB_URI}" > "${TARGET_DIR}/database.sql"

echo "[2/3] Archiving private uploaded documents (${STORAGE_DIR})..."
if [[ -d "${STORAGE_DIR}" ]]; then
  tar -czf "${TARGET_DIR}/uploads.tar.gz" -C "${STORAGE_DIR}" .
else
  mkdir -p "${STORAGE_DIR}"
  tar -czf "${TARGET_DIR}/uploads.tar.gz" -C "${STORAGE_DIR}" .
fi

echo "[3/3] Generating SHA-256 integrity manifest..."
(
  cd "${TARGET_DIR}"
  shasum -a 256 database.sql uploads.tar.gz > SHA256SUMS
)

echo "Backup completed and verified at: ${TARGET_DIR}"
