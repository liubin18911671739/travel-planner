-- Validate migration integrity for artifacts/knowledge/auth bootstrap changes.
-- Run with: psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/validate_migrations.sql

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'settings'
  ) THEN
    RAISE EXCEPTION 'Missing column: public.users.settings';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'handle_new_user'
  ) THEN
    RAISE EXCEPTION 'Missing function: public.handle_new_user()';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'auth'
      AND c.relname = 'users'
      AND t.tgname = 'on_auth_user_created'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Missing trigger: auth.users.on_auth_user_created';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_trigger t
    JOIN pg_class c ON c.oid = t.tgrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public'
      AND c.relname = 'artifacts'
      AND t.tgname = 'update_artifacts_updated_at'
      AND NOT t.tgisinternal
  ) THEN
    RAISE EXCEPTION 'Missing trigger: public.artifacts.update_artifacts_updated_at';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND policyname = 'Users can view own itinerary artifacts'
  ) THEN
    RAISE EXCEPTION 'Missing policy: Users can view own itinerary artifacts';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND policyname = 'Users can view own merch artifacts'
  ) THEN
    RAISE EXCEPTION 'Missing policy: Users can view own merch artifacts';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND policyname = 'Service role can manage artifacts'
  ) THEN
    RAISE EXCEPTION 'Missing policy: Service role can manage artifacts';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_artifacts_itinerary_kind_unique_v3'
  ) THEN
    RAISE EXCEPTION 'Missing index: idx_artifacts_itinerary_kind_unique_v3';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_artifacts_merch_design_kind_path_unique'
  ) THEN
    RAISE EXCEPTION 'Missing index: idx_artifacts_merch_design_kind_path_unique';
  END IF;
END;
$$;
