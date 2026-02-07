-- Migration: Add RLS policies and security for knowledge base
-- This ensures all document access is scoped to userId

-- ============================================================================
-- Row Level Security Policies
-- ============================================================================

-- Enable RLS on knowledge tables
ALTER TABLE public.knowledge_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_chunks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_packs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- Knowledge Files Policies
-- ============================================================================

-- Users can read their own knowledge files
CREATE POLICY "Users can view own knowledge files"
ON public.knowledge_files FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own knowledge files
CREATE POLICY "Users can insert own knowledge files"
ON public.knowledge_files FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own knowledge files
CREATE POLICY "Users can update own knowledge files"
ON public.knowledge_files FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own knowledge files
CREATE POLICY "Users can delete own knowledge files"
ON public.knowledge_files FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- Knowledge Chunks Policies
-- ============================================================================

-- Users can read chunks from their own files (via file relationship)
CREATE POLICY "Users can view own knowledge chunks"
ON public.knowledge_chunks FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.knowledge_files
    WHERE knowledge_files.id = knowledge_chunks.file_id
    AND knowledge_files.user_id = auth.uid()
  )
);

-- Service role can insert chunks (for Inngest functions)
CREATE POLICY "Service role can insert knowledge chunks"
ON public.knowledge_chunks FOR INSERT
WITH CHECK (true);

-- Service role can update chunks
CREATE POLICY "Service role can update knowledge chunks"
ON public.knowledge_chunks FOR UPDATE
USING (true);

-- Users can delete chunks from their own files
CREATE POLICY "Users can delete own knowledge chunks"
ON public.knowledge_chunks FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.knowledge_files
    WHERE knowledge_files.id = knowledge_chunks.file_id
    AND knowledge_files.user_id = auth.uid()
  )
);

-- ============================================================================
-- Knowledge Packs Policies
-- ============================================================================

-- Users can read their own knowledge packs
CREATE POLICY "Users can view own knowledge packs"
ON public.knowledge_packs FOR SELECT
USING (auth.uid() = user_id);

-- Users can insert their own knowledge packs
CREATE POLICY "Users can insert own knowledge packs"
ON public.knowledge_packs FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Users can update their own knowledge packs
CREATE POLICY "Users can update own knowledge packs"
ON public.knowledge_packs FOR UPDATE
USING (auth.uid() = user_id);

-- Users can delete their own knowledge packs
CREATE POLICY "Users can delete own knowledge packs"
ON public.knowledge_packs FOR DELETE
USING (auth.uid() = user_id);

-- ============================================================================
-- Enhanced RAG retrieval functions with user scoping
-- ============================================================================

-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS match_knowledge_chunks CASCADE;
DROP FUNCTION IF EXISTS match_file_chunks CASCADE;
DROP FUNCTION IF EXISTS match_user_chunks CASCADE;

-- Enhanced function to match chunks across specific files with user scoping
CREATE OR REPLACE FUNCTION match_knowledge_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  file_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  file_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.file_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity
  FROM knowledge_chunks kc
  INNER JOIN knowledge_files kf ON kf.id = kc.file_id
  WHERE
    kf.user_id = auth.uid()
    AND (file_ids IS NULL OR kc.file_id = ANY(file_ids))
    AND (kc.embedding <=> query_embedding) < (1 - match_threshold)
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ SECURITY DEFINER;

-- Function to match chunks from a specific file with user scoping
CREATE OR REPLACE FUNCTION match_file_chunks(
  query_embedding vector(1536),
  file_id uuid,
  match_count int DEFAULT 10
)
RETURNS TABLE (
  id uuid,
  file_id uuid,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.file_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity
  FROM knowledge_chunks kc
  INNER JOIN knowledge_files kf ON kf.id = kc.file_id
  WHERE
    kc.file_id = match_file_chunks.file_id
    AND kf.user_id = auth.uid()
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ SECURITY DEFINER;

-- New function to match chunks across all user's knowledge packs
CREATE OR REPLACE FUNCTION match_user_chunks(
  query_embedding vector(1536),
  match_threshold float DEFAULT 0.7,
  match_count int DEFAULT 10,
  pack_ids uuid[] DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  file_id uuid,
  content text,
  metadata jsonb,
  similarity float,
  file_name text,
  pack_id uuid
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    kc.id,
    kc.file_id,
    kc.content,
    kc.metadata,
    1 - (kc.embedding <=> query_embedding) as similarity,
    kf.name as file_name,
    kp.id as pack_id
  FROM knowledge_chunks kc
  INNER JOIN knowledge_files kf ON kf.id = kc.file_id
  LEFT JOIN LATERAL (
    SELECT kp.id, kp.file_ids
    FROM knowledge_packs kp
    WHERE kf.user_id = kp.user_id
    AND (pack_ids IS NULL OR kp.id = ANY(pack_ids))
    AND kc.file_id = ANY(kp.file_ids)
    LIMIT 1
  ) kp ON true
  WHERE
    kf.user_id = auth.uid()
    AND (pack_ids IS NULL OR EXISTS (
      SELECT 1 FROM knowledge_packs kp2
      WHERE kp2.id = ANY(pack_ids)
      AND kc.file_id = ANY(kp2.file_ids)
    ))
    AND (kc.embedding <=> query_embedding) < (1 - match_threshold)
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$ SECURITY DEFINER;

-- ============================================================================
-- Helper functions for knowledge management
-- ============================================================================

-- Function to get all file IDs from a list of pack IDs
CREATE OR REPLACE FUNCTION get_pack_file_ids(pack_ids uuid[])
RETURNS uuid[]
LANGUAGE plpgsql
AS $$
DECLARE
  result uuid[] := '{}';
BEGIN
  IF pack_ids IS NULL OR array_length(pack_ids, 1) IS NULL THEN
    RETURN result;
  END IF;

  SELECT ARRAY_agg(DISTINCT unnest(file_ids))
  INTO result
  FROM knowledge_packs
  WHERE id = ANY(pack_ids)
  AND user_id = auth.uid();

  RETURN COALESCE(result, '{}');
END;
$$ SECURITY DEFINER;

-- Function to cascade delete chunks when file is deleted
CREATE OR REPLACE FUNCTION delete_file_chunks()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM knowledge_chunks WHERE file_id = OLD.id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for cascade delete
DROP TRIGGER IF EXISTS trigger_delete_file_chunks ON public.knowledge_files;
CREATE TRIGGER trigger_delete_file_chunks
  BEFORE DELETE ON public.knowledge_files
  FOR EACH ROW
  EXECUTE FUNCTION delete_file_chunks();

-- ============================================================================
-- Grant execute permissions to authenticated users
-- ============================================================================

GRANT EXECUTE ON FUNCTION match_knowledge_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_file_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION match_user_chunks TO authenticated;
GRANT EXECUTE ON FUNCTION get_pack_file_ids TO authenticated;

-- ============================================================================
-- Indexes for performance
-- ============================================================================

-- Create index on knowledge_chunks for user-scoped queries
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_file_user
ON public.knowledge_chunks(file_id)
WHERE file_id IN (
  SELECT id FROM public.knowledge_files WHERE user_id = auth.uid()
);
