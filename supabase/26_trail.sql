-- ============================================================================
-- Outpost — TRAIL (Backpackers team-values assessment)
-- ============================================================================
-- 6-axis Likert self-report based on TRILHA values. Each authenticated user
-- can create + answer their own assessments; admins can read all in their
-- pillar scope. Question bank is edited only by super_user + admin_grupo.
--
-- Idempotent.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.trail_value AS ENUM ('T', 'R', 'I', 'L', 'H', 'A');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.trail_status AS ENUM ('in_progress', 'completed', 'abandoned');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- Question bank
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trail_questions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code           text NOT NULL,
  value          public.trail_value NOT NULL,
  statement      text NOT NULL,
  reverse_scored boolean NOT NULL DEFAULT false,
  sort_order     integer NOT NULL DEFAULT 0,
  is_active      boolean NOT NULL DEFAULT true,
  created_at     timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trail_questions_code_idx ON public.trail_questions (code);
CREATE INDEX IF NOT EXISTS trail_questions_value_idx ON public.trail_questions (value, sort_order);

ALTER TABLE public.trail_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trail_questions_read_all ON public.trail_questions;
DROP POLICY IF EXISTS trail_questions_write_super_or_admin_grupo ON public.trail_questions;

CREATE POLICY trail_questions_read_all ON public.trail_questions
  FOR SELECT TO authenticated USING (true);

CREATE POLICY trail_questions_write_super_or_admin_grupo ON public.trail_questions
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_user','admin_grupo'))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('super_user','admin_grupo'))
  );

-- ---------------------------------------------------------------------------
-- Assessments (one per run)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trail_assessments (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  status       public.trail_status NOT NULL DEFAULT 'in_progress',
  started_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  score_t      integer,
  score_r      integer,
  score_i      integer,
  score_l      integer,
  score_h      integer,
  score_a      integer,
  dominant     text,
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS trail_assessments_user_idx ON public.trail_assessments (user_id);
CREATE INDEX IF NOT EXISTS trail_assessments_status_idx ON public.trail_assessments (status);
CREATE INDEX IF NOT EXISTS trail_assessments_completed_at_idx
  ON public.trail_assessments (completed_at DESC);

ALTER TABLE public.trail_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trail_assessments_read_own_or_admin ON public.trail_assessments;
DROP POLICY IF EXISTS trail_assessments_write_own ON public.trail_assessments;

CREATE POLICY trail_assessments_read_own_or_admin ON public.trail_assessments
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_above(auth.uid()));

CREATE POLICY trail_assessments_write_own ON public.trail_assessments
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Answers
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.trail_answers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES public.trail_assessments(id) ON DELETE CASCADE,
  question_id   uuid NOT NULL REFERENCES public.trail_questions(id) ON DELETE RESTRICT,
  likert        integer NOT NULL CHECK (likert BETWEEN 1 AND 5),
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (assessment_id, question_id)
);

CREATE INDEX IF NOT EXISTS trail_answers_assessment_idx ON public.trail_answers (assessment_id);
CREATE INDEX IF NOT EXISTS trail_answers_question_idx ON public.trail_answers (question_id);

ALTER TABLE public.trail_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS trail_answers_read_own_or_admin ON public.trail_answers;
DROP POLICY IF EXISTS trail_answers_write_own ON public.trail_answers;

CREATE POLICY trail_answers_read_own_or_admin ON public.trail_answers
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trail_assessments a
      WHERE a.id = trail_answers.assessment_id
        AND (a.user_id = auth.uid() OR public.is_admin_or_above(auth.uid()))
    )
  );

CREATE POLICY trail_answers_write_own ON public.trail_answers
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.trail_assessments a
      WHERE a.id = trail_answers.assessment_id AND a.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.trail_assessments a
      WHERE a.id = trail_answers.assessment_id AND a.user_id = auth.uid()
    )
  );

-- ============================================================================
-- Done. Verify:
--   SELECT value, count(*) FROM public.trail_questions GROUP BY value;
--   SELECT status, count(*) FROM public.trail_assessments GROUP BY status;
-- ============================================================================
