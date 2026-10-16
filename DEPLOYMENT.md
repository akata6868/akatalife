# VPS Deployment Guide (`DEPLOYMENT.md`)

> [!IMPORTANT]
> **No Automatic Production Changes:** Per project rules, production deployment is never executed automatically. Before deploying in Milestone 5, we will perform a non-destructive inspection of the target VPS and obtain explicit approval.

## 1. Pre-Deployment VPS Inspection Checklist (Milestone 5)

Before touching any configuration on the VPS, run these read-only diagnostic commands:

```bash
# 1. OS, kernel, and available disk/memory
uname -a && lsb_release -a 2>/dev/null || cat /etc/os-release
df -h
free -m

# 2. Listening ports and active reverse proxy (Nginx / Caddy / Traefik)
ss -tulnp

# 3. Existing Docker containers, networks, and volumes
docker ps -a
docker network ls
docker volume ls
```

## 2. Production Container Topology

- `akatalife-db` (`postgres:16-alpine`):
  - Connected **only** to the internal `akatalife_internal` Docker network.
  - No public host port bindings (`ports:` omitted in production).
  - Persistent volume mapped to `/var/lib/postgresql/data`.
- `akatalife-web` (Next.js standalone production image):
  - Listens on `127.0.0.1:<INTERNAL_PORT>:3000` (bound to localhost only so only the host reverse proxy can reach it) or connected to the reverse-proxy Docker network.
  - Mounts persistent private upload volume at `/app/storage/uploads`.
  - Includes `/api/health` container healthcheck.

## 3. Reverse Proxy (HTTPS) Template

Example Caddy configuration (or equivalent Nginx configuration depending on VPS inspection):

```caddyfile
# Replace with your actual approved domain during Milestone 5
<YOUR_DOMAIN> {
    encode zstd gzip
    reverse_proxy 127.0.0.1:3000
    header {
        Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "SAMEORIGIN"
        Referrer-Policy "strict-origin-when-cross-origin"
    }
}
```

## 4. Upgrade & Rollback Procedure

1. Run `./scripts/backup.sh` and verify backup checksum before upgrading.
2. Pull the new commit and build: `docker compose -f docker-compose.prod.yml build`.
3. Apply database migrations: `docker compose -f docker-compose.prod.yml run --rm web npx prisma migrate deploy`.
4. Restart application container: `docker compose -f docker-compose.prod.yml up -d`.
5. Verify `/api/health` returns HTTP 200.
6. **Rollback:** If health check fails, checkout the previous Git tag and run `./scripts/restore.sh <backup_archive>` if schema changes need reversal.
