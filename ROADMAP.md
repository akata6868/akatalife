# Akata Life — Project Roadmap

> **Status:** Milestone 0 Completed — Entering Milestone 1 (Foundation)
> **Default Locale:** `de-DE` (German) | **Secondary Locale:** `tr-TR` (Turkish)
> **Time Zone:** `Europe/Berlin` | **Currency:** `EUR` (stored as integer cents / `Decimal(12, 2)`)
> **Infrastructure:** GitHub + Coolify + Supabase PostgreSQL + Hermes Agent API (`/api/v1/agent/*`)

---

## Milestone 0 — Inspection & Technical Planning ✅
- [x] Save Master Project Prompt (`MASTER_PROMPT.md`) including Coolify, Supabase, and Hermes Agent addendum
- [x] Inspect workspace directories (`/Users/suleymanakata/Downloads/akatalife`) and local environment
- [x] Author `ROADMAP.md` with testable milestone gates
- [x] Author `ARCHITECTURE.md` covering Next.js, Supabase PostgreSQL, Coolify deployment, and Hermes Agent API
- [x] Initialize Git repository and `.gitignore`

**Deliverable:** Approved technical plan, architecture blueprint, and clean Git repository structure.

---

## Milestone 1 — Foundation (Current Step) ⏳
- [ ] Set up local Node.js runtime & initialize Next.js (App Router, TypeScript strict mode, Tailwind CSS)
- [ ] Configure ESLint, Prettier, Vitest (unit/integration), and Playwright (E2E)
- [ ] Configure Prisma ORM for **Supabase PostgreSQL** (`DATABASE_URL` + `DIRECT_URL`) and complete normalized schema (`User`, `Session`, `AgentApiKey`, `AuditEvent`, `Contract`, `Document`, `Category`, `Transaction`, `Budget`, `Invoice`, `RecurringRule`, `Reminder`, `Property`, `Room`, `HouseholdAsset`, `MaintenanceRecord`, `MeterReading`, `HomeAssistantConfig`, `ApplicationSetting`)
- [ ] Implement authentication & authorization:
  - Human Owner Auth: Argon2id/scrypt password hashing, HTTP-only session cookies, TOTP 2FA support, rate limiting
  - **Hermes Agent Auth:** Constant-time Bearer API key authentication (`HERMES_AGENT_API_KEY` + database-managed `AgentApiKey` records) & automatic `AuditEvent` logging
- [ ] Build responsive application shell (Desktop persistent sidebar, iPhone PWA bottom/drawer navigation with safe-area padding, Light/Dark mode, German `de` & Turkish `tr` localization system)
- [ ] Add locale-aware formatters (`DD.MM.YYYY`, `1.234,56 €`, integer-cent arithmetic helpers) and unit tests
- [ ] Add `/api/health` and `/api/v1/agent/openapi.json` + `/api/v1/agent/summary` foundation endpoints
- [ ] Add Coolify-ready multi-stage `Dockerfile` and `docker-compose.yml`

**Deliverable:** Secure, localized application foundation with Supabase Prisma schema, Coolify Dockerfile, and Hermes Agent auth gateway.

---

## Milestone 2 — First Usable Release (UI + Hermes Agent Full CRUD) ⬜
- [ ] **Contracts (`Verträge` + `/api/v1/agent/contracts`):** Full CRUD, archiving, provider/category/status filters, automatic cancellation deadline calculation, reminder generation, CSV/JSON export
- [ ] **Private Document Library (`Dokumente` + `/api/v1/agent/documents`):** Secure upload outside source tree, magic-byte + MIME + size validation, randomized internal UUID storage filenames, authorized streaming preview/download, contract/invoice linking
- [ ] **Household Finances (`Finanzen`, `Einnahmen`, `Ausgaben` + `/api/v1/agent/transactions`):** Customizable income/expense categories, exact minor-unit (`EUR` cents) calculations, monthly budgets, recurring transaction rules, CSV export
- [ ] **Invoices & Recurring Bills (`Rechnungen` + `/api/v1/agent/invoices`):** Planned/unpaid/paid/overdue/cancelled tracking, automatic overdue calculation, monthly calendar & list views, recurring bill template instantiation
- [ ] **Reminders (`Termine & Erinnerungen` + `/api/v1/agent/reminders`):** Priority, due date, entity linking, deduplicated recurring reminders, completion workflow
- [ ] **Real Database Dashboard (`Dashboard` + `/api/v1/agent/summary`):** Monthly income/expenses/remaining budget, recurring commitments, upcoming bills, expiring contracts, recent documents, reminders, and empty-state onboarding

**Deliverable:** Complete daily-use personal finance, contract, document, and reminder platform accessible both via Web/PWA and Hermes Agent API.

---

## Milestone 3 — Household Management (`Mein Zuhause` + `/api/v1/agent/home`) ⬜
- [ ] Property / rental unit details and room management
- [ ] Household assets & appliances inventory (purchase dates, warranty expiration alerts, linked manuals & receipts)
- [ ] Maintenance history & scheduled maintenance reminders
- [ ] Utility meter readings (`Zählerstände`) for electricity, gas, and water
- [ ] Global cross-entity search and enhanced monthly/annual reports (`Berichte`)

**Deliverable:** Complete household inventory, maintenance, and utility tracking system.

---

## Milestone 4 — Quality, Security & Backup Readiness ⬜
- [ ] Comprehensive unit, integration, and Playwright E2E test suite (including Hermes Agent API integration tests)
- [ ] Security audit: auth guards on all server actions/routes, upload traversal/MIME tests, security headers
- [ ] Automated Supabase PostgreSQL + document storage backup scripts with SHA-256 integrity manifests and verified restore testing (`BACKUP_RESTORE.md`)
- [ ] Settings & API Key management UI (`Einstellungen` & `Backup & Systemstatus`) to inspect Hermes Agent audit logs and rotate API keys

**Deliverable:** Hardened release candidate with verified backup & restore procedures.

---

## Milestone 5 — GitHub Push & Coolify Deployment ⬜
- [ ] Push clean repository to GitHub
- [ ] Configure Coolify resource, environment variables (`DATABASE_URL`, `DIRECT_URL`, `HERMES_AGENT_API_KEY`, `SESSION_SECRET`, `ENCRYPTION_KEY`), and persistent volume (`/app/storage/uploads`)
- [ ] Run Prisma migrations against Supabase (`npx prisma migrate deploy`)
- [ ] Verify HTTPS deployment, `/api/health`, and Hermes Agent API connectivity

**Deliverable:** Production-deployed Akata Life instance on Coolify connected to Supabase and Hermes Agent.

---

## Milestone 6 — Optional Home Assistant Integration (`Geräte & Energie`) ⬜
- [ ] Disabled-by-default server-side Home Assistant client with strict timeouts
- [ ] Encrypted server-side token storage
- [ ] Read-only sensor dashboard & Hermes Agent energy endpoint (`/api/v1/agent/energy`)

**Deliverable:** Optional read-only smart-home and energy monitoring module.
