# Migration Validation Report

> Fill this file after executing migration validation on real databases.
> Validation date format: `YYYY-MM-DD`.

## Environment

- Validator: `supabase/scripts/validate_migrations.sh`
- Base checks: `supabase/scripts/validate_migrations.sql`
- Incremental checks: `supabase/scripts/validate_incremental_migrations.sql`

## DB_A (Empty DB -> apply 001..007)

- Date:
- Connection label:
- Command sequence:
  1. `psql "$DB_A_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/001_initial_schema.sql`
  2. `psql "$DB_A_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/002_knowledge_rls.sql`
  3. `psql "$DB_A_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/003_artifacts_table.sql`
  4. `psql "$DB_A_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/004_artifacts_merch.sql`
  5. `psql "$DB_A_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/005_fix_schema_and_policies.sql`
  6. `psql "$DB_A_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/006_user_bootstrap_and_settings.sql`
  7. `psql "$DB_A_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/007_cleanup_invalid_indexes.sql`
  8. `DATABASE_URL="$DB_A_URL" bash supabase/scripts/validate_migrations.sh`
- Result:
- Notes:

## DB_B (Incremental DB -> apply 001..004 first, then 005..007)

- Date:
- Connection label:
- Command sequence:
  1. `psql "$DB_B_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/001_initial_schema.sql`
  2. `psql "$DB_B_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/002_knowledge_rls.sql`
  3. `psql "$DB_B_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/003_artifacts_table.sql`
  4. `psql "$DB_B_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/004_artifacts_merch.sql`
  5. `psql "$DB_B_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/005_fix_schema_and_policies.sql`
  6. `psql "$DB_B_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/006_user_bootstrap_and_settings.sql`
  7. `psql "$DB_B_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/007_cleanup_invalid_indexes.sql`
  8. `DATABASE_URL="$DB_B_URL" bash supabase/scripts/validate_migrations.sh`
  9. `psql "$DB_B_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/validate_incremental_migrations.sql`
- Result:
- Notes:

## Conclusion

- Empty DB validation: `PENDING`
- Incremental DB validation: `PENDING`
- Ready for release: `NO`
