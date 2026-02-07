-- Remove invalid index definitions that depend on auth.uid()
-- and replace with executable indexes.

DROP INDEX IF EXISTS public.idx_knowledge_chunks_file_user;

CREATE INDEX IF NOT EXISTS idx_knowledge_files_user_id_created_at
  ON public.knowledge_files(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_file_id_chunk_index
  ON public.knowledge_chunks(file_id, chunk_index);
