-- Add merch_design_id column to artifacts table for merchandise artifacts
-- This allows artifacts to be linked to both itineraries and merch designs

-- Add merch_design_id column
ALTER TABLE public.artifacts
ADD COLUMN IF NOT EXISTS merch_design_id UUID REFERENCES public.merch_designs(id) ON DELETE CASCADE;

-- Drop old unique constraint and add new ones that handle both itinerary and merch contexts
DROP INDEX IF EXISTS public.idx_artifacts_itinerary_kind_unique;

-- Unique constraint for merch artifacts (one of each kind per design)
CREATE UNIQUE INDEX IF NOT EXISTS idx_artifacts_merch_design_kind_unique
    ON public.artifacts(merch_design_id, kind)
    WHERE merch_design_id IS NOT NULL;

-- Unique constraint for itinerary artifacts (one of each kind per itinerary)
CREATE UNIQUE INDEX IF NOT EXISTS idx_artifacts_itinerary_kind_unique_v2
    ON public.artifacts(itinerary_id, kind)
    WHERE merch_design_id IS NULL AND itinerary_id IS NOT NULL;

-- Index for merch_design_id queries
CREATE INDEX IF NOT EXISTS idx_artifacts_merch_design_id ON public.artifacts(merch_design_id)
    WHERE merch_design_id IS NOT NULL;

-- Add kind values for merch artifacts
-- ALTER TYPE doesn't exist for ENUM-like text columns, so we document valid kinds:
-- For itinerary: 'pdf', 'pptx', 'share'
-- For merch: 'pattern', 'mockup'

-- RLS Policy: Users can view their own merch artifacts
DROP POLICY IF EXISTS "Users can view own merch artifacts" ON public.artifacts;
CREATE POLICY "Users can view own merch artifacts"
    ON public.artifacts FOR SELECT
    USING (
      merch_design_id IN (
        SELECT id FROM public.merch_designs WHERE user_id = auth.uid()
      )
    );

-- RLS Policy: Service role can manage all merch artifacts
DROP POLICY IF EXISTS "Service role can manage merch artifacts" ON public.artifacts;
CREATE POLICY "Service role can manage merch artifacts"
    ON public.artifacts FOR ALL
    USING (auth.jwt() ->> 'role' = 'service_role')
    WITH CHECK (auth.jwt() ->> 'role' = 'service_role');
