#!/bin/sh
set -e

if [ "$DATABASE_PROVIDER" = "postgresql" ]; then
  echo "Applying database schema (migrate deploy, fallback db push)..."
  npx prisma migrate deploy 2>/dev/null || npx prisma db push --skip-generate
fi

exec "$@"
