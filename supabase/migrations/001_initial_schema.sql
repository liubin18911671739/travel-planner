-- Enable extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "vector";

-- Users (linked to Supabase auth)
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    plan_tier TEXT DEFAULT 'free', -- 'free', 'pro', 'enterprise'
    quota_used INTEGER DEFAULT 0,
    quota_limit INTEGER DEFAULT 100,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Jobs table (unified job tracking for all async operations)
CREATE TABLE IF NOT EXISTS public.jobs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    type TEXT NOT NULL, -- 'index_knowledge', 'generate_itinerary', 'generate_merch', 'export_gamma'
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'done', 'failed'
    idempotency_key TEXT UNIQUE,
    input JSONB NOT NULL, -- Store full job input
    output JSONB, -- Store job result when done
    error_message TEXT,
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Job logs for real-time progress
CREATE TABLE IF NOT EXISTS public.job_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    level TEXT NOT NULL, -- 'info', 'warning', 'error'
    message TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- Knowledge files
CREATE TABLE IF NOT EXISTS public.knowledge_files (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    file_type TEXT NOT NULL, -- 'pdf', 'docx', 'txt', 'image'
    file_size INTEGER NOT NULL,
    storage_path TEXT NOT NULL, -- Supabase Storage path
    status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'indexing', 'ready', 'failed'
    chunk_count INTEGER DEFAULT 0,
    last_indexed_at TIMESTAMPTZ,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge chunks (for RAG retrieval)
CREATE TABLE IF NOT EXISTS public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    file_id UUID NOT NULL REFERENCES public.knowledge_files(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    content TEXT NOT NULL,
    embedding vector(1536), -- OpenAI embedding dimension (configurable)
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Knowledge packs (groups of files)
CREATE TABLE IF NOT EXISTS public.knowledge_packs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    description TEXT,
    file_ids UUID[] NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itineraries
CREATE TABLE IF NOT EXISTS public.itineraries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    destination TEXT NOT NULL,
    duration_days INTEGER NOT NULL,
    knowledge_pack_ids UUID[] DEFAULT '{}',
    settings JSONB DEFAULT '{}', -- preferences, themes, etc.
    content JSONB, -- Generated itinerary content (days, activities)
    gamma_deck_url TEXT,
    gamma_deck_id TEXT,
    export_url TEXT, -- Supabase Storage URL for persisted export
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'generating', 'ready', 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Merch designs
CREATE TABLE IF NOT EXISTS public.merch_designs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    product_type TEXT NOT NULL, -- 'mug', 'phone_case', 'tshirt'
    theme_keywords TEXT[],
    color_mood TEXT,
    density TEXT,
    style_lock TEXT,
    pattern_storage_path TEXT, -- Supabase Storage
    mockup_storage_paths TEXT[], -- Array of mockup image URLs
    status TEXT NOT NULL DEFAULT 'draft', -- 'draft', 'generating', 'ready', 'failed'
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_jobs_user_id ON public.jobs(user_id);
CREATE INDEX IF NOT EXISTS idx_jobs_status ON public.jobs(status);
CREATE INDEX IF NOT EXISTS idx_jobs_type ON public.jobs(type);
CREATE INDEX IF NOT EXISTS idx_jobs_idempotency ON public.jobs(idempotency_key) WHERE idempotency_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_job_logs_job_id ON public.job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_files_user_id ON public.knowledge_files(user_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_files_status ON public.knowledge_files(status);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_file_id ON public.knowledge_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_chunks_embedding ON public.knowledge_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS idx_itineraries_user_id ON public.itineraries(user_id);
CREATE INDEX IF NOT EXISTS idx_merch_designs_user_id ON public.merch_designs(user_id);

-- Updated at trigger function
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
DROP TRIGGER IF EXISTS update_users_updated_at ON public.users;
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON public.users FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_jobs_updated_at ON public.jobs;
CREATE TRIGGER update_jobs_updated_at BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_knowledge_files_updated_at ON public.knowledge_files;
CREATE TRIGGER update_knowledge_files_updated_at BEFORE UPDATE ON public.knowledge_files FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_knowledge_packs_updated_at ON public.knowledge_packs;
CREATE TRIGGER update_knowledge_packs_updated_at BEFORE UPDATE ON public.knowledge_packs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_itineraries_updated_at ON public.itineraries;
CREATE TRIGGER update_itineraries_updated_at BEFORE UPDATE ON public.itineraries FOR EACH ROW EXECUTE FUNCTION update_updated_at();

DROP TRIGGER IF EXISTS update_merch_designs_updated_at ON public.merch_designs;
CREATE TRIGGER update_merch_designs_updated_at BEFORE UPDATE ON public.merch_designs FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- RAG retrieval functions
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
  WHERE
    (file_ids IS NULL OR kc.file_id = ANY(file_ids))
    AND (kc.embedding <=> query_embedding) < (1 - match_threshold)
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

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
  WHERE kc.file_id = match_file_chunks.file_id
  ORDER BY kc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Quota increment function (supports custom amount)
CREATE OR REPLACE FUNCTION increment_user_quota(user_id uuid, amount int DEFAULT 1)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET quota_used = quota_used + amount
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;

-- Quota decrement function (for refunds/corrections)
CREATE OR REPLACE FUNCTION decrement_user_quota(user_id uuid, amount int DEFAULT 1)
RETURNS void AS $$
BEGIN
  UPDATE users
  SET quota_used = GREATEST(0, quota_used - amount)
  WHERE id = user_id;
END;
$$ LANGUAGE plpgsql;
