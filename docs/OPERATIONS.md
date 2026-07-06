# PlacementIQ Operations Guide

Operational reference for admins and DevOps. No built-in monitoring dashboard yet — use logs, health endpoint, and host tools.

## Health check

**Endpoint:** `GET /api/health`

**Example (healthy):**

```json
{
  "status": "ok",
  "database": "ok",
  "storage": "ok",
  "environment": "production",
  "timestamp": "2026-07-06T12:00:00.000Z",
  "version": "0.1.0",
  "storageProvider": "s3"
}
```

| Field | Meaning |
|-------|---------|
| `status` | Overall: `ok`, `degraded`, or `error` |
| `database` | Prisma can run `SELECT 1` |
| `storage` | Probe write/read/delete on configured provider |
| `storageProvider` | `local` or `s3` |

**HTTP 503** when `status` is `error` — use for load balancer health checks.

**Does not expose:** secrets, connection strings, or internal paths.

---

## Logs

Structured JSON logs via `src/lib/logger.ts`:

```json
{"level":"error","message":"...","timestamp":"...","service":"placementiq","route":"/api/..."}
```

| Level | Use |
|-------|-----|
| `info` | Normal operations, audit-friendly events |
| `warn` | Failed login, recoverable issues |
| `error` | API failures, health check failures |

**Where logs appear:**

- **Local dev:** terminal running `npm run dev`
- **Docker:** `docker compose logs -f app`
- **Production:** stdout → configure host log aggregation (CloudWatch, Datadog, etc.)

**Never logged:** passwords, session cookies, resume bytes, env secrets.

---

## Rate limiting

In-memory limiter (`src/lib/rate-limit.ts`) — **single instance only**.

Protected routes: login, import, resume upload, analytics export, matching, bulk readiness.

**429 response:**

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMITED",
    "message": "Too many requests. Please wait a moment and try again."
  }
}
```

For multiple app instances, implement `RateLimitStore` with Redis.

---

## Background jobs

PlacementIQ tracks long-running work via the **Job** model and `/admin|tpo|faculty/jobs` pages.

### Current mode: request-driven execution

1. API creates a job (`QUEUED`) and returns `jobId` immediately
2. Processing starts in the same Node process after the HTTP response
3. Progress is persisted to the database (`progressCurrent`, `progressPercent`)
4. UI polls `GET /api/jobs/[id]` every ~2 seconds

**Integrated operations:**

| Operation | Job type | Notes |
|-----------|----------|-------|
| Bulk readiness recalc | `BULK_READINESS_RECALC` | Always job-tracked |
| Company matching run | `COMPANY_MATCHING` | Always job-tracked |
| Student import confirm | `STUDENT_IMPORT` | Job when ≥50 rows; smaller imports stay synchronous |

**Permissions:**

- **Super Admin / TPO:** view all jobs, run heavy operations
- **Faculty:** view own jobs only; can run bulk readiness if permitted
- **HR:** no job access

**Audit events:** `JOB_CREATED`, `JOB_STARTED`, `JOB_COMPLETED`, `JOB_FAILED` (not per progress tick)

### Future mode: queue worker (recommended at scale)

For multi-instance or 10k+ students, add Redis + BullMQ worker process. Swap `scheduleJobExecution()` in `job-runners.ts` to enqueue instead of in-process execution.

### If a job fails

1. Open **Background Jobs** → job detail for the error message
2. Fix the underlying issue (filters, data, DB connectivity)
3. **Retry** by re-running the operation from the source page
4. Failed jobs remain in history for audit

### Limitations (current)

- Jobs do not survive app restart mid-run (status may stay `RUNNING`)
- No cancel button yet
- Excel exports are still synchronous (not job-tracked)
- Serverless deployments may terminate background work

---

## Security headers

Applied via `src/middleware.ts`:

- `X-Frame-Options: DENY`
- `X-Content-Type-Options: nosniff`
- `Referrer-Policy: strict-origin-when-cross-origin`
- `Permissions-Policy` (camera/mic/geo disabled)
- `Strict-Transport-Security` in production

**CSP:** Not enforced globally — Next.js dev HMR and Tailwind would break. For strict CSP, add at reverse proxy after testing.

---

## Docker restart

```bash
docker compose restart app
docker compose logs -f app
curl http://localhost:3000/api/health
```

Full rebuild:

```bash
docker compose down
docker compose up --build -d
```

Database persists in `pgdata` volume; uploads in `uploads` volume (local storage mode).

---

## Common failures

| Symptom | Likely cause | Action |
|---------|--------------|--------|
| `database: error` | Postgres down, wrong `DATABASE_URL` | Check DB service, credentials |
| `storage: error` | Disk full, S3 creds, bucket policy | Check `STORAGE_PROVIDER` env, IAM |
| 429 on login | Rate limit triggered | Wait 15 min or restart single instance |
| Blank page (dev) | Corrupted `.next` | `npm run dev:clean` |
| EPERM prisma | Dev server locking DLL (Windows) | Stop dev, run `npx prisma generate` |

---

## Smoke test

With dev server running:

```bash
npm run smoke
```

See [SMOKE_TEST_CHECKLIST.md](./SMOKE_TEST_CHECKLIST.md) for full manual QA.

---

## Related

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
