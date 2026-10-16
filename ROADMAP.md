# Akata Life — Project Roadmap

> **Status:** Milestones 0, 1, 2, 3 & 4 Core Foundation & Modules Implemented & Tested — Ready for Supabase Connection & GitHub/Coolify Push (Milestone 5)
> **Default Locale:** `de-DE` (German) | **Secondary Locale:** `tr-TR` (Turkish)
> **Time Zone:** `Europe/Berlin` | **Currency:** `EUR` (stored as integer cents)
> **Infrastructure:** GitHub + Coolify + Supabase PostgreSQL + Hermes Agent API (`/api/v1/agent/*`)

---

## Milestone 0 — Inspection & Technical Planning ✅
- [x] Save Master Project Prompt (`MASTER_PROMPT.md`) including Coolify, Supabase, and Hermes Agent addendum
- [x] Inspect workspace directories (`/Users/suleymanakata/Downloads/akatalife`) and local environment
- [x] Author `ROADMAP.md` with testable milestone gates
- [x] Author `ARCHITECTURE.md` covering Next.js, Supabase PostgreSQL, Coolify deployment, and Hermes Agent API
- [x] Initialize Git repository and `.gitignore`

---

## Milestone 1 — Foundation ✅
- [x] Initialize Next.js (App Router, TypeScript strict mode, Tailwind CSS)
- [x] Configure ESLint, Prettier, Vitest (unit/integration), and Playwright config
- [x] Configure Prisma ORM for **Supabase PostgreSQL** (`DATABASE_URL` + `DIRECT_URL`) and initial SQL migration (`prisma/migrations/20261016234800_init/migration.sql`)
- [x] Implement authentication & authorization:
  - Human Owner Auth: Scrypt password hashing, HTTP-only session cookies, TOTP 2FA support (`otpauth`), sliding-window rate limiting
  - **Hermes Agent Auth:** Constant-time Bearer API key authentication (`HERMES_AGENT_API_KEY` + database `AgentApiKey`) & automatic `AuditEvent` logging
- [x] Build responsive application shell (Desktop persistent sidebar, iPhone PWA bottom navigation with safe-area padding, Light/Dark mode, German `de` & Turkish `tr` localization system)
- [x] Add locale-aware formatters (`DD.MM.YYYY`, `1.234,56 €`, integer-cent arithmetic helpers) and unit tests (`11/11` passing)
- [x] Add `/api/health` and `/api/v1/agent/openapi.json` + `/api/v1/agent/summary` endpoints
- [x] Add Coolify-ready multi-stage `Dockerfile` and `docker-compose.yml`

---

## Milestone 2 — First Usable Release (UI + Hermes Agent Full CRUD) ✅
- [x] **Contracts (`Verträge` + `/api/v1/agent/contracts`):** Create/list/filter contracts, automatic cancellation deadline calculation, deduplicated reminder generation
- [x] **Private Document Library (`Dokumente` + `/api/v1/agent/documents` + `/api/documents/[id]/file`):** Secure upload outside source tree, magic-byte + MIME + size validation, randomized UUID storage filenames, authorized streaming download
- [x] **Household Finances (`Finanzen`, `Einnahmen`, `Ausgaben` + `/api/v1/agent/transactions`):** Default DE/TR categories, exact minor-unit (`EUR` cents) calculations, monthly summaries
- [x] **Invoices & Recurring Bills (`Rechnungen` + `/api/v1/agent/invoices`):** Planned/unpaid/paid/overdue/cancelled tracking, automatic overdue calculation
- [x] **Reminders (`Termine & Erinnerungen` + `/api/v1/agent/reminders`):** Priority, due date, entity linking, deduplicated reminders
- [x] **Real Database Dashboard (`Dashboard` + `/api/v1/agent/summary`):** Zero-fake-data dashboard and onboarding

---

## Milestone 3 — Household Management (`Mein Zuhause` + `/api/v1/agent/home`) ✅
- [x] Property / rental unit details and room management
- [x] Household assets & appliances inventory (purchase dates, warranty expiration, maintenance records)
- [x] Utility meter readings (`Zählerstände`) for electricity, gas, and water

---

## Milestone 4 — Quality, Security & Backup Readiness ✅
- [x] Unit test suite (`tests/unit/foundation.test.ts` — 11/11 passing), TypeScript strict check (`tsc --noEmit`), and Next.js standalone production build (`npm run build`) verified
- [x] Automated Supabase PostgreSQL + document storage backup and restore scripts (`scripts/backup.sh`, `scripts/restore.sh`) with SHA-256 integrity manifests

---

## Milestone 5 — GitHub Push & Coolify + Supabase Deployment (Next Step) ⏳
- [ ] Add GitHub remote repository URL and push `main` branch
- [ ] Configure Coolify resource, environment variables (`DATABASE_URL`, `DIRECT_URL`, `HERMES_AGENT_API_KEY`, `SESSION_SECRET`, `ENCRYPTION_KEY`), and persistent volume (`/app/storage/uploads`)
- [ ] Run Prisma migrations against Supabase (`npx prisma migrate deploy`)
- [ ] Complete one-time Owner Setup at `/login` and connect Hermes Agent
