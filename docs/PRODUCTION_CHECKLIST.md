# PlacementIQ Production Checklist

Run after deploying to staging or production. Mark pass/fail.

**First-time pilot setup:** follow [PRODUCTION_DEPLOYMENT_TRIAL.md](./PRODUCTION_DEPLOYMENT_TRIAL.md) before this checklist.

## Infrastructure

- [ ] `DATABASE_URL` points to PostgreSQL (not SQLite)
- [ ] `prisma/schema.prisma` provider is `postgresql`
- [ ] `npx prisma migrate deploy` succeeded
- [ ] Database backup configured (automated snapshots or pg_dump)
- [ ] `SESSION_SECRET` is 32+ characters and not the demo default
- [ ] `NODE_ENV=production`
- [ ] `APP_URL` matches public HTTPS URL
- [ ] HTTPS enabled (TLS certificate valid)
- [ ] Demo seed **not** run on production (or credentials changed after seed)
- [ ] `GET /api/health` returns `status: ok`, `database: ok`, `storage: ok`
- [ ] `npm run smoke:production` passes against staging URL

## File storage

- [ ] `STORAGE_PROVIDER=s3` configured for multi-instance deploy
- [ ] S3 bucket exists with correct IAM/credentials
- [ ] Resume upload succeeds
- [ ] Resume download succeeds
- [ ] Files persist after app restart (not ephemeral disk)
- [ ] Health check reports `storage: ok`

## Authentication

- [ ] Login works for all roles (Admin, TPO, Faculty, HR)
- [ ] Logout clears session
- [ ] Invalid session cookie rejected (signed cookie tampering)
- [ ] Wrong-role routes redirect to role dashboard
- [ ] Unauthenticated users redirect to `/login`
- [ ] Demo passwords replaced with strong passwords
- [ ] Login rate limit returns 429 after excessive attempts (optional spot check)

## Access control regression

- [ ] HR cannot access `/admin/*`, `/tpo/*`, `/faculty/*` internal routes
- [ ] HR visiting protected admin URLs redirects to `/hr/dashboard`
- [ ] Faculty cannot access `/admin/audit-logs`
- [ ] TPO cannot access `/admin/audit-logs` (super-admin only)
- [ ] Faculty analytics page loads but **Export to Excel** is hidden
- [ ] Faculty calling `/api/analytics/export` receives 401
- [ ] HR resume download blocked without active share + permission
- [ ] HR passport blocked when `allowPlacementPassport` is false
- [ ] Revoked/expired share blocks HR Talent Room detail access
- [ ] Student import blocked for Faculty and HR
- [ ] Student export blocked for Faculty and HR
- [ ] Unauthenticated `/api/students` returns 401

## Core features

- [ ] Student list paginates correctly
- [ ] Student import preview + confirm
- [ ] Student Excel export
- [ ] Resume upload (PDF/DOCX within size limit)
- [ ] Resume download (permission enforced)
- [ ] Tech stack add / verify
- [ ] Readiness recalculate
- [ ] Company requirement matching
- [ ] Share students with HR
- [ ] HR Talent Room + decisions
- [ ] Placement Passport (internal + HR when enabled)
- [ ] Analytics dashboard loads
- [ ] Analytics export (Admin/TPO only)
- [ ] Audit logs visible (Admin)

## Route protection

- [ ] HR blocked from `/admin/*` and `/tpo/*`
- [ ] Faculty blocked from audit logs and admin-only routes
- [ ] TPO blocked from super-admin-only routes (audit logs)
- [ ] HR resume download requires active share + permission
- [ ] HR passport requires `allowPlacementPassport`

## Performance smoke

- [ ] Student list with 100+ records loads in reasonable time
- [ ] No unbounded full-table load in browser network tab
- [ ] Analytics page renders without timeout

## Monitoring (recommended)

- [ ] Application error logging configured (JSON stdout)
- [ ] Database connection pool healthy
- [ ] Disk / S3 storage usage monitored
- [ ] `npm run smoke` passes against staging URL

## Sign-off

| Date | Environment | Deployer | Result |
|------|-------------|----------|--------|
|      |             |          |        |

See also:
- [SMOKE_TEST_CHECKLIST.md](./SMOKE_TEST_CHECKLIST.md)
- [OPERATIONS.md](./OPERATIONS.md)
- [BACKUP_RESTORE.md](./BACKUP_RESTORE.md)
