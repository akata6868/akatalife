# Akata Life — Project Roadmap

> **Status:** Milestone 0 Completed — Entering Milestone 1 (Foundation)
> **Default Locale:** `de-DE` (German) | **Secondary Locale:** `tr-TR` (Turkish)
> **Time Zone:** `Europe/Berlin` | **Currency:** `EUR` (stored as integer cents / `Decimal(12, 2)`)

---

## Milestone 0 — Inspection & Technical Planning ✅
- [x] Save Master Project Prompt (`MASTER_PROMPT.md`)
- [x] Inspect workspace directories (`/Users/suleymanakata/Downloads/akatalife` and `/Users/suleymanakata/Desktop/proje`)
- [x] Identify local environment and sandbox constraints
- [x] Author `ROADMAP.md` with testable milestone gates
- [x] Author `ARCHITECTURE.md` covering stack, data model, security, localization, and Docker topology
- [x] Initialize Git repository and `.gitignore`

**Deliverable:** Approved technical plan, architecture blueprint, and clean Git repository structure.

---

## Milestone 1 — Foundation (Next Step) ⏳
- [ ] Initialize Next.js (App Router, TypeScript strict mode, Tailwind CSS)
- [ ] Configure ESLint, Prettier, Vitest (unit/integration), and Playwright (E2E)
- [ ] Set up Docker Compose for local PostgreSQL (`postgres:16-alpine`) and persistent storage volume
- [ ] Configure Prisma ORM and initial normalized schema + migration (`User`, `Session`, `Authenticator`, `AuditEvent`, `ApplicationSetting`, plus core domain tables)
- [ ] Implement authentication & session management (Argon2id password hashing, database/HTTP-only signed sessions, TOTP 2FA support, login rate limiting, CSRF protection, server-side authorization guards)
- [ ] Build responsive application shell (Desktop persistent sidebar, iPhone-friendly bottom/drawer navigation with safe-area padding, Light/Dark mode, German `de` & Turkish `tr` dictionary system)
- [ ] Add locale-aware formatters (`DD.MM.YYYY`, `1.234,56 €`, integer-cent / Decimal arithmetic helpers) and unit tests
- [ ] Add `/api/health` endpoint and initial automated test suite

**Deliverable:** Secure, localized application foundation running locally with PostgreSQL, authentication, and passing checks.

---

## Milestone 2 — First Usable Release ⬜
- [ ] **Contracts (`Verträge`):** Full CRUD, archiving, provider/category/status filters, automatic cancellation deadline calculation, reminder generation, CSV/JSON export
- [ ] **Private Document Library (`Dokumente`):** Secure upload outside source tree, magic-byte + MIME + size validation, randomized internal UUID storage filenames, authorized streaming preview/download, contract/invoice linking
- [ ] **Household Finances (`Finanzen`, `Einnahmen`, `Ausgaben`):** Customizable income/expense categories, exact minor-unit/Decimal calculations, monthly budgets, recurring transaction rules, CSV export
- [ ] **Invoices & Recurring Bills (`Rechnungen`):** Planned/unpaid/paid/overdue/cancelled tracking, automatic overdue calculation, monthly calendar & list views, recurring bill template instantiation
- [ ] **Reminders (`Termine & Erinnerungen`):** Priority, due date, entity linking, deduplicated recurring reminders, completion workflow
- [ ] **Real Database Dashboard (`Dashboard`):** Monthly income/expenses/remaining budget, recurring commitments, upcoming bills, expiring contracts, recent documents, reminders, and empty-state onboarding

**Deliverable:** Complete daily-use personal finance, contract, document, and reminder platform backed 100% by real PostgreSQL records.

---

## Milestone 3 — Household Management (`Mein Zuhause`) ⬜
- [ ] Property / rental unit details and room management
- [ ] Household assets & appliances inventory (purchase dates, warranty expiration alerts, linked manuals & receipts)
- [ ] Maintenance history & scheduled maintenance reminders
- [ ] Utility meter readings (`Zählerstände`) for electricity, gas, and water
- [ ] Global cross-entity search and enhanced monthly/annual reports (`Berichte`)

**Deliverable:** Complete household inventory, maintenance, and utility tracking system.

---

## Milestone 4 — Quality, Security & Backup Readiness ⬜
- [ ] Comprehensive unit, integration, and Playwright E2E test suite covering the full 9-step user journey
- [ ] Security audit: auth guards on all server actions/routes, upload traversal/MIME tests, security headers (`CSP`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`)
- [ ] Automated PostgreSQL + document storage backup scripts with SHA-256 integrity manifests, encryption option, and verified restore testing (`BACKUP_RESTORE.md`)
- [ ] PWA manifest, iPhone safe-area polish, and strict cache-control headers preventing sensitive caching

**Deliverable:** Hardened release candidate with verified backup & restore procedures.

---

## Milestone 5 — VPS Deployment ⬜
- [ ] Non-destructive inspection of target VPS (OS, ports, existing Docker networks, reverse proxy, disk space)
- [ ] Production `Dockerfile` (multi-stage standalone build) and `docker-compose.prod.yml`
- [ ] Reverse proxy HTTPS configuration and DNS setup plan (`DEPLOYMENT.md`)
- [ ] Production deployment (only after explicit user approval) & smoke testing

**Deliverable:** Production-deployed Akata Life instance on VPS over HTTPS.

---

## Milestone 6 — Optional Home Assistant Integration (`Geräte & Energie`) ⬜
- [ ] Disabled-by-default server-side Home Assistant client with strict timeouts
- [ ] Server-side token storage (never exposed to client bundle)
- [ ] Read-only sensor dashboard (indoor temperature, heating status, thermostat target, gas/electricity sensors, cost estimates)
- [ ] Last-sync timestamp and stale/offline state handling

**Deliverable:** Optional read-only smart-home and energy monitoring module.

---

## Milestone 7 — Advanced Capabilities (Future) ⬜
- [ ] Local OCR & assisted document metadata extraction
- [ ] Optional email / push notification channels
- [ ] Multi-user household member permissions
