-- Validate objects that should be fixed specifically by 005/006/007
-- on top of an already-initialized database (001-004 applied first).
-- Run with:
-- psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/scripts/validate_incremental_migrations.sql

DO $$
BEGIN
  -- 005: artifacts.itinerary_id should become nullable
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'artifacts'
      AND column_name = 'itinerary_id'
      AND is_nullable = 'YES'
  ) THEN
    RAISE EXCEPTION 'Expected public.artifacts.itinerary_id to be nullable';
  END IF;

  -- 005: old policies/indexes should be cleaned up
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND policyname = 'Service role can manage all artifacts'
  ) THEN
    RAISE EXCEPTION 'Legacy policy still exists: Service role can manage all artifacts';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'artifacts'
      AND policyname = 'Service role can manage merch artifacts'
  ) THEN
    RAISE EXCEPTION 'Legacy policy still exists: Service role can manage merch artifacts';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_artifacts_merch_design_kind_unique'
  ) THEN
    RAISE EXCEPTION 'Legacy index still exists: idx_artifacts_merch_design_kind_unique';
  END IF;

  -- 006: users.settings default should exist
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'users'
      AND column_name = 'settings'
      AND column_default IS NOT NULL
  ) THEN
    RAISE EXCEPTION 'Missing default for public.users.settings';
  END IF;

  -- 007: invalid index should be removed
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_knowledge_chunks_file_user'
  ) THEN
    RAISE EXCEPTION 'Legacy invalid index still exists: idx_knowledge_chunks_file_user';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_knowledge_files_user_id_created_at'
  ) THEN
    RAISE EXCEPTION 'Missing index: idx_knowledge_files_user_id_created_at';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'idx_knowledge_chunks_file_id_chunk_index'
  ) THEN
    RAISE EXCEPTION 'Missing index: idx_knowledge_chunks_file_id_chunk_index';
  END IF;
END;
$$;
