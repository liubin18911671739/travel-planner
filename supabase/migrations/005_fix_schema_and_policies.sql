-- Fix artifacts schema/policies for mixed itinerary/merch exports

-- artifacts should support merch-only records
ALTER TABLE public.artifacts
  ALTER COLUMN itinerary_id DROP NOT NULL;

-- keep updated_at trigger valid
ALTER TABLE public.artifacts
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

DROP TRIGGER IF EXISTS update_artifacts_updated_at ON public.artifacts;
CREATE TRIGGER update_artifacts_updated_at
  BEFORE UPDATE ON public.artifacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at();

-- normalize artifact policies
ALTER TABLE public.artifacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role can manage all artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "Service role can manage merch artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "Service role can manage artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "Users can view own itinerary artifacts" ON public.artifacts;
DROP POLICY IF EXISTS "Users can view own merch artifacts" ON public.artifacts;

CREATE POLICY "Users can view own itinerary artifacts"
  ON public.artifacts FOR SELECT
  USING (
    itinerary_id IN (
      SELECT id FROM public.itineraries WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own merch artifacts"
  ON public.artifacts FOR SELECT
  USING (
    merch_design_id IN (
      SELECT id FROM public.merch_designs WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Service role can manage artifacts"
  ON public.artifacts FOR ALL
  USING (auth.jwt() ->> 'role' = 'service_role')
  WITH CHECK (auth.jwt() ->> 'role' = 'service_role');

-- index strategy for artifacts
DROP INDEX IF EXISTS public.idx_artifacts_itinerary_kind_unique;
DROP INDEX IF EXISTS public.idx_artifacts_itinerary_kind_unique_v2;
DROP INDEX IF EXISTS public.idx_artifacts_merch_design_kind_unique;

CREATE UNIQUE INDEX IF NOT EXISTS idx_artifacts_itinerary_kind_unique_v3
  ON public.artifacts(itinerary_id, kind)
  WHERE itinerary_id IS NOT NULL AND merch_design_id IS NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_artifacts_merch_design_kind_path_unique
  ON public.artifacts(merch_design_id, kind, storage_path)
  WHERE merch_design_id IS NOT NULL;
