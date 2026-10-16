# Contributing & Development Standards (`CONTRIBUTING.md`)

## 1. Engineering Principles
- **No Fake Data in Production Code:** Charts, tables, and summaries must always query actual PostgreSQL records via Prisma.
- **No Floating-Point Money Math:** Always use integer cents (`amountCents`) or Prisma `Decimal` helpers (`src/lib/finance/money.ts`).
- **Localization First:** Never hardcode German or Turkish UI strings inside components; add keys to both `src/lib/i18n/de.ts` and `src/lib/i18n/tr.ts`.
- **Server-Side Authorization:** Every Server Action and API route must call `requireUser()` before reading or mutating data.

## 2. Milestone Quality Gates
Before completing any milestone:
1. `npm run lint` — ESLint checks pass with zero errors.
2. `npm run typecheck` — `tsc --noEmit` passes with strict mode enabled.
3. `npm run test` — Vitest unit and integration tests pass.
4. `npm run test:e2e` — Playwright end-to-end tests pass.
5. `git status` — Confirm no secrets, `.env`, or uploaded files are staged.
