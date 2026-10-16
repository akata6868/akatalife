# Changelog (`CHANGELOG.md`)

All notable changes to **Akata Life** are documented in this file.

## [0.1.0] — 2026-10-17

### Milestone 1, 2, 3 & 4 — Foundation, Core Modules, Hermes Agent API & Backup Readiness
- **Database & Schema (Supabase PostgreSQL):** Added complete normalized Prisma schema (`prisma/schema.prisma`) and initial SQL migration (`prisma/migrations/20261016234800_init/migration.sql`) supporting `DATABASE_URL` and `DIRECT_URL`.
- **Authentication & Security:** Implemented scrypt password hashing, AES-256-GCM secret encryption, TOTP 2FA verification (`otpauth`), sliding-window login rate limiting, HTTP-only session cookies, and one-time Owner Setup (`/api/auth/setup`, `/login`).
- **Hermes Agent Full Access API (`/api/v1/agent/*`):**
  - `GET /api/v1/agent/openapi.json` — OpenAPI 3.1 tool discovery spec
  - `GET /api/v1/agent/summary` — Real-time household financial, contract, invoice, document, and reminder snapshot
  - `GET | POST /api/v1/agent/contracts` — Contracts CRUD with automatic cancellation deadline and reminder calculation
  - `GET | POST /api/v1/agent/documents` & `GET /api/documents/[id]/file` — Multipart & base64 upload with magic-byte validation (`PDF`, `JPEG`, `PNG`, `WEBP`) and authorized streaming download
  - `GET | POST /api/v1/agent/transactions` — Exact integer EUR cent income & expense accounting with German/Turkish default categories
  - `GET | POST /api/v1/agent/invoices` — Invoices & recurring bills with automatic `OVERDUE` status resolution
  - `GET | POST /api/v1/agent/reminders` — Deduplicated reminders (`dedupeKey`)
  - `GET | POST /api/v1/agent/home` — Property, room, appliance, maintenance, and utility meter reading endpoints
- **UI & Localization:** Built responsive desktop sidebar and iPhone PWA navigation shell (`AppShell.tsx`), German (`de`) and Turkish (`tr`) dictionaries, and pages for all 13 navigation items.
- **DevOps & Quality:** Added Coolify multi-stage standalone `Dockerfile`, `docker-compose.yml`, `/api/health`, `scripts/backup.sh`, `scripts/restore.sh`, and passing Vitest unit test suite (`11/11` tests passing) + Next.js production build verification.
