#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is required"
  exit 1
fi

psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/validate_migrations.sql
echo "Base migration validation passed."

if [[ "${VALIDATE_INCREMENTAL:-false}" == "true" ]]; then
  psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/validate_incremental_migrations.sql
  echo "Incremental migration validation passed."
fi
