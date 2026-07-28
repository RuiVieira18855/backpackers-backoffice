-- ============================================================================
-- Outpost — cairn_feedback (in-app feedback widget)
-- ============================================================================
-- Written by Cairn Pro (the floating feedback widget) with the user's JWT.
-- Read here by admins in the Outpost feedback view.
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cairn_feedback (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  email      text,
  app        text DEFAULT 'cairn',
  kind       text,            -- bug | idea | other
  message    text NOT NULL,
  rating     integer,         -- 1..5, optional
  url        text,
  ua         text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cairn_feedback_created_idx
  ON public.cairn_feedback (created_at DESC);
CREATE INDEX IF NOT EXISTS cairn_feedback_kind_idx
  ON public.cairn_feedback (kind);

ALTER TABLE public.cairn_feedback ENABLE ROW LEVEL SECURITY;

-- An authenticated user inserts their own feedback.
DROP POLICY IF EXISTS cairn_feedback_insert ON public.cairn_feedback;
CREATE POLICY cairn_feedback_insert ON public.cairn_feedback
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() OR user_id IS NULL);

-- Admins/super_users read everything.
DROP POLICY IF EXISTS cairn_feedback_admin_read ON public.cairn_feedback;
CREATE POLICY cairn_feedback_admin_read ON public.cairn_feedback
  FOR SELECT TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

-- ============================================================================
-- Verify:
--   SELECT kind, count(*) FROM public.cairn_feedback GROUP BY kind;
-- ============================================================================
