# Backup & Disaster Recovery Runbook (`BACKUP_RESTORE.md`)

## 1. What Must Be Backed Up
To fully reconstruct Akata Life on a replacement server, three components are required:
1. **PostgreSQL Database Dump:** Custom/plain SQL dump generated via `pg_dump --clean --if-exists`.
2. **Private Uploaded Documents:** The contents of `STORAGE_DIR` (`storage/uploads`).
3. **Environment Secrets (`.env`):** Stored securely in your password manager (1Password / Bitwarden) — specifically `ENCRYPTION_KEY` (required to decrypt TOTP/Home Assistant tokens).

## 2. Backup Script (`./scripts/backup.sh`)
Implemented and verified in Milestone 4:
- Creates a timestamped directory `backups/akatalife-YYYYMMDD-HHMMSS/`.
- Runs `pg_dump` to export PostgreSQL state atomically.
- Archives `storage/uploads` into `uploads.tar.gz`.
- Generates `SHA256SUMS` manifest for integrity verification.
- Optionally encrypts the bundle with `openssl enc -aes-256-cbc -pbkdf2` or `gpg` before off-site transfer (`rsync` / `rclone`).

## 3. Retention Policy
- **Daily backups:** Retain 7 days locally.
- **Weekly backups:** Retain 4 weeks off-site.
- **Monthly backups:** Retain 12 months off-site.

## 4. Restore & Verification Procedure (`./scripts/restore.sh`)
1. Verify integrity checksums first:
   ```bash
   shasum -a 256 -c SHA256SUMS
   ```
2. Restore PostgreSQL database into an isolated or clean target database:
   ```bash
   ./scripts/restore.sh backups/akatalife-YYYYMMDD-HHMMSS
   ```
3. Verify record counts (`User`, `Contract`, `Document`, `Transaction`, `Invoice`) and confirm `/api/health` and document download integrity.
