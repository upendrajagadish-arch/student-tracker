# Backup & Restore — PlacementIQ

Guidance for protecting PostgreSQL data and resume object storage before migrations or deployments.

## Before any production migration

1. **Back up PostgreSQL** (see below).
2. **Note S3 bucket state** — enable versioning if available.
3. Run migration on a **staging copy** first.
4. Keep backup until post-deploy smoke tests pass.

Database and file storage are **independent**. Restoring DB without matching resume files leaves broken download links.

---

## PostgreSQL backup

### Full logical backup (recommended)

```bash
pg_dump "$DATABASE_URL" -Fc -f placementiq-backup-$(date +%Y%m%d).dump
```

Plain SQL:

```bash
pg_dump "$DATABASE_URL" > placementiq-backup-$(date +%Y%m%d).sql
```

### Managed providers

- **AWS RDS:** automated snapshots + manual snapshot before migration
- **Neon / Supabase / Railway:** use dashboard backup or `pg_dump` with connection string

---

## PostgreSQL restore

### From custom format (`.dump`)

```bash
pg_restore -d "$DATABASE_URL" --clean --if-exists placementiq-backup-YYYYMMDD.dump
```

### From SQL file

```bash
psql "$DATABASE_URL" < placementiq-backup-YYYYMMDD.sql
```

**Warning:** `--clean` drops existing objects. Test on staging first.

---

## Resume / object storage

When `STORAGE_PROVIDER=s3`:

- Enable **S3 versioning** or periodic bucket replication
- Backup policy should include the `S3_BUCKET` used for resumes
- IAM credentials should allow list/get for disaster recovery

When `STORAGE_PROVIDER=local` (dev only):

```bash
tar -czf uploads-backup-$(date +%Y%m%d).tar.gz uploads/
```

Production should use S3 — local disk is not durable across deploys.

---

## Consistency notes

| Component | Contains | Restore dependency |
|-----------|----------|-------------------|
| PostgreSQL | Students, resumes metadata (`filePath`), shares, audit | Required |
| S3 / uploads | Actual PDF/DOCX files | Must match `filePath` in DB |

After DB restore, verify a sample resume download. Missing files indicate storage restore is also needed.

---

## Recommended schedule

| Environment | Frequency |
|-------------|-----------|
| Production | Daily automated + manual before migrations |
| Staging | Before each release test |
| Local demo | Optional (`dev.db` can be re-seeded) |

---

## Related docs

- [DEPLOYMENT.md](./DEPLOYMENT.md)
- [../prisma/MIGRATIONS.md](../prisma/MIGRATIONS.md)
- [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md)
