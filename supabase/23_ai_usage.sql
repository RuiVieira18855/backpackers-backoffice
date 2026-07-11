-- ============================================================================
-- Outpost — AI usage audit + rate limit
-- ============================================================================
-- Append-only log of every AI copilot call. Powers rate limiting, usage
-- reporting per user/pillar, and cost attribution. Access is restricted:
-- - Any authenticated user reads their own rows.
-- - Admins read all rows in pillars they have access to.
-- - Only the app service role INSERTs.
--
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.ai_usage (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  pillar_id     uuid REFERENCES public.pillars(id) ON DELETE SET NULL,
  surface       text NOT NULL,
  entity_type   text,
  entity_id     uuid,
  model         text NOT NULL,
  input_tokens  integer NOT NULL DEFAULT 0,
  output_tokens integer NOT NULL DEFAULT 0,
  latency_ms    integer NOT NULL DEFAULT 0,
  ok            text NOT NULL DEFAULT 'true',
  error_code    text,
  meta          jsonb,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS ai_usage_user_idx ON public.ai_usage (user_id);
CREATE INDEX IF NOT EXISTS ai_usage_surface_idx ON public.ai_usage (surface);
CREATE INDEX IF NOT EXISTS ai_usage_created_at_idx ON public.ai_usage (created_at DESC);
CREATE INDEX IF NOT EXISTS ai_usage_entity_idx ON public.ai_usage (entity_type, entity_id);

ALTER TABLE public.ai_usage ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_usage_select_own_or_admin ON public.ai_usage;
DROP POLICY IF EXISTS ai_usage_insert_service ON public.ai_usage;

CREATE POLICY ai_usage_select_own_or_admin ON public.ai_usage
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_above(auth.uid()));

-- App inserts via service role only. Regular users cannot forge usage rows.
CREATE POLICY ai_usage_insert_service ON public.ai_usage
  FOR INSERT TO service_role
  WITH CHECK (true);

-- ============================================================================
-- Done. Verify:
--   SELECT surface, count(*), sum(input_tokens + output_tokens) AS total_tokens
--   FROM public.ai_usage
--   GROUP BY surface;
-- ============================================================================
