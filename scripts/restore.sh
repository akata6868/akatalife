#!/usr/bin/env bash
set -euo pipefail

# ==============================================================================
# AKATA LIFE — VERIFIED RESTORE SCRIPT
# Usage: ./scripts/restore.sh ./backups/akatalife-YYYYMMDD-HHMMSS
# ==============================================================================

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <path-to-backup-directory>" >&2
  exit 1
fi

SOURCE_DIR="$1"
STORAGE_DIR="${STORAGE_DIR:-./storage/uploads}"
DB_URI="${DIRECT_URL:-${DATABASE_URL:-}}"

if [[ ! -f "${SOURCE_DIR}/SHA256SUMS" ]]; then
  echo "ERROR: Missing SHA256SUMS manifest in ${SOURCE_DIR}" >&2
  exit 1
fi

echo "[1/3] Verifying SHA-256 backup integrity checksums..."
(
  cd "${SOURCE_DIR}"
  shasum -a 256 -c SHA256SUMS
)

if [[ -z "${DB_URI}" ]]; then
  echo "ERROR: DIRECT_URL or DATABASE_URL must be set to restore database." >&2
  exit 1
fi

echo "[2/3] Restoring PostgreSQL database..."
psql "${DB_URI}" < "${SOURCE_DIR}/database.sql"

echo "[3/3] Restoring private uploaded documents into ${STORAGE_DIR}..."
mkdir -p "${STORAGE_DIR}"
tar -xzf "${SOURCE_DIR}/uploads.tar.gz" -C "${STORAGE_DIR}"

echo "Restore completed and verified successfully."
