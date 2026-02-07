-- Artifacts table for itinerary exports and shareable links
-- This table stores all generated artifacts (PDF, PPTX, share links) for itineraries

CREATE TABLE IF NOT EXISTS public.artifacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    itinerary_id UUID NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
    kind TEXT NOT NULL, -- 'pdf', 'pptx', 'share'
    storage_path TEXT NOT NULL,
    storage_bucket TEXT DEFAULT 'EXPORTS',
    file_size INTEGER,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for efficient queries
CREATE INDEX IF NOT EXISTS idx_artifacts_itinerary_id ON public.artifacts(itinerary_id);
CREATE INDEX IF NOT EXISTS idx_artifacts_kind ON public.artifacts(kind);
CREATE INDEX IF NOT EXISTS idx_artifacts_itinerary_kind ON public.artifacts(itinerary_id, kind);

-- Unique constraint: one artifact per kind per itinerary
CREATE UNIQUE INDEX IF NOT EXISTS idx_artifacts_itinerary_kind_unique
    ON public.artifacts(itinerary_id, kind);

-- RLS Policies
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

-- Users can read artifacts for their own itineraries
DROP POLICY IF EXISTS "Users can view own itinerary artifacts" ON public.artifacts;
CREATE POLICY "Users can view own itinerary artifacts"
    ON public.artifacts FOR SELECT
    USING (
        itinerary_id IN (
            SELECT id FROM public.itineraries WHERE user_id = auth.uid()
        )
    );

-- Service role can manage all artifacts
DROP POLICY IF EXISTS "Service role can manage all artifacts" ON public.artifacts;
CREATE POLICY "Service role can manage all artifacts"
    ON public.artifacts FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- Updated at trigger for artifacts
DROP TRIGGER IF EXISTS update_artifacts_updated_at ON public.artifacts;
CREATE TRIGGER update_artifacts_updated_at
    BEFORE UPDATE ON public.artifacts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();
