# Security Policy & Controls (`SECURITY.md`)

## 1. Threat Model & Core Principles
Akata Life stores sensitive personal household records (contracts, payslips, tax documents, recurring bills, and home inventory). It is designed as a **private, single-owner application** (extensible to explicit household members) with zero public registration.

## 2. Authentication & Session Controls
- **Password Storage:** Passwords are hashed using **Argon2id** (or scrypt with strong N/r/p parameters where native bindings are unavailable). Plaintext passwords are never logged or persisted.
- **Session Management:**
  - Random 256-bit session tokens are generated using `crypto.randomBytes(32)`.
  - Only the **SHA-256 hash** of the session token is stored in the `Session` table.
  - Session cookies use `HttpOnly`, `SameSite=Lax`, `Path=/`, and `Secure` (enabled automatically under HTTPS / `NODE_ENV=production`).
  - Users can revoke individual or all active sessions immediately.
- **Multi-Factor Authentication (TOTP):**
  - Standard RFC 6238 TOTP (`SHA-1`, 6 digits, 30-second window).
  - TOTP secrets and optional Home Assistant access tokens are encrypted at rest at the application layer using **AES-256-GCM** keyed by `ENCRYPTION_KEY`.
- **Rate Limiting & Audit Trail:**
  - Failed login attempts are rate-limited by IP and account identifier.
  - Security-relevant events (login success/failure, MFA changes, session revocation, document deletion, data export) are recorded in `AuditEvent`.

## 3. Private Document Security
- **Storage Isolation:** Uploaded files are written to `STORAGE_DIR` (outside `public/` and outside the Next.js static asset tree).
- **Content Verification:**
  - Allowed MIME types: `application/pdf`, `image/jpeg`, `image/png`, `image/webp`.
  - Magic-byte signature inspection verifies actual binary headers (`%PDF-`, `\xFF\xD8\xFF`, `\x89PNG`, `RIFF....WEBP`).
  - Internal filenames use random UUIDs; user-provided filenames are sanitized and used only for metadata display.
- **Authorized Streaming:**
  - Every preview/download request hits `/api/documents/[id]/file`, verifies the user session and ownership, checks that the resolved file path stays strictly inside `STORAGE_DIR` (preventing path traversal), and sets `X-Content-Type-Options: nosniff` and restrictive `Content-Security-Policy`.

## 4. Network & Infrastructure Isolation
- PostgreSQL runs inside a private Docker bridge network (`internal: true` or unbound host port in production) and is **never** exposed on `0.0.0.0:5432` in production.
- PWA Service Worker rules explicitly bypass caching for `/api/*` and authenticated HTML routes so sensitive financial or document data is never persisted in shared browser caches.
