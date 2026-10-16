# Deployment Guide — GitHub + Coolify + Supabase (`DEPLOYMENT.md`)

> [!IMPORTANT]
> **No Automatic Production Changes:** Per project rules, production deployment is never executed automatically without approval.

## 1. Deployment Architecture (Coolify + Supabase)

- **Source Control:** GitHub repository (`main` branch).
- **Platform:** **Coolify** running on your VPS (builds the repository's `Dockerfile`).
- **Database:** **Supabase PostgreSQL** (`DATABASE_URL` and `DIRECT_URL` configured in Coolify Environment Variables).
- **Document Storage:** Persistent Coolify Volume mounted at `/app/storage/uploads` (and optional Supabase Storage bucket support).
- **Agent Access:** **Hermes Agent** connects over HTTPS to `https://<YOUR_DOMAIN>/api/v1/agent/*` using `Authorization: Bearer <HERMES_AGENT_API_KEY>`.

## 2. Coolify Configuration Steps

1. **Create Resource in Coolify:**
   - Select **Application** -> **GitHub Repository** (or Public/Private Git Repository).
   - Build Pack: **Dockerfile** (`/Dockerfile`).
   - Exposed Port: `3000`.
   - Health Check Path: `/api/health` (HTTP 200).
2. **Persistent Storage (Coolify Storages Tab):**
   - Add a persistent volume:
     - **Source Path (Host):** `/data/akatalife/uploads` (or Coolify managed volume `akatalife-uploads`)
     - **Destination Path (Container):** `/app/storage/uploads`
3. **Environment Variables (Coolify Environment Tab):**
   - `DATABASE_URL` (Supabase Transaction Pooler or Direct URI)
   - `DIRECT_URL` (Supabase Direct URI for `prisma migrate deploy`)
   - `SESSION_SECRET` (`openssl rand -hex 32`)
   - `ENCRYPTION_KEY` (`openssl rand -hex 32`)
   - `HERMES_AGENT_ENABLED="true"`
   - `HERMES_AGENT_API_KEY` (`openssl rand -hex 32`)
   - `STORAGE_DIR="/app/storage/uploads"`
   - `APP_URL="https://<YOUR_DOMAIN>"`
   - `TZ="Europe/Berlin"`

## 3. Connecting Hermes Agent to Akata Life

Once deployed on Coolify (or running locally):
- **OpenAPI / Tool Specification Endpoint:**
  `GET https://<YOUR_DOMAIN>/api/v1/agent/openapi.json`
- **Authentication Header:**
  `Authorization: Bearer <HERMES_AGENT_API_KEY>` (or `X-Hermes-Api-Key: <HERMES_AGENT_API_KEY>`)
- **Primary Endpoints for Hermes Agent:**
  - `GET /api/v1/agent/summary` — Complete financial, contract, invoice, and reminder overview
  - `GET / POST / PATCH / DELETE /api/v1/agent/contracts` — Manage contracts
  - `GET / POST / PATCH / DELETE /api/v1/agent/documents` — Manage & upload/download documents
  - `GET / POST / PATCH / DELETE /api/v1/agent/transactions` — Manage income & expenses
  - `GET / POST / PATCH / DELETE /api/v1/agent/invoices` — Manage bills & payment statuses
  - `GET / POST / PATCH / DELETE /api/v1/agent/reminders` — Manage reminders & deadlines
  - `GET / POST / PATCH / DELETE /api/v1/agent/home` — Manage property, rooms, appliances, maintenance, and meter readings
