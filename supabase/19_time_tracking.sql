-- ============================================================================
-- Outpost — Time tracking
-- ============================================================================
-- Hours logged per project (optionally per task). MVP: manual entry only,
-- no in-app timer. Fields kept small; anything richer (billable rate, task
-- category) can be added later without breaking existing rows.
--
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.time_entries (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id   uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  task_id      uuid REFERENCES public.tasks(id)    ON DELETE SET NULL,
  user_id      uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pillar_id    uuid REFERENCES public.pillars(id)  ON DELETE SET NULL,
  hours        numeric(6,2) NOT NULL CHECK (hours > 0 AND hours <= 24),
  description  text,
  date         date NOT NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS time_entries_project_idx ON public.time_entries(project_id);
CREATE INDEX IF NOT EXISTS time_entries_task_idx    ON public.time_entries(task_id);
CREATE INDEX IF NOT EXISTS time_entries_user_idx    ON public.time_entries(user_id);
CREATE INDEX IF NOT EXISTS time_entries_date_idx    ON public.time_entries(date DESC);

ALTER TABLE public.time_entries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS time_entries_select ON public.time_entries;
DROP POLICY IF EXISTS time_entries_insert ON public.time_entries;
DROP POLICY IF EXISTS time_entries_update ON public.time_entries;
DROP POLICY IF EXISTS time_entries_delete ON public.time_entries;

-- Any authenticated user can read (project members need to see totals).
CREATE POLICY time_entries_select ON public.time_entries
  FOR SELECT TO authenticated
  USING (true);

-- Ops skill lets you log entries; the trigger below stamps user_id.
CREATE POLICY time_entries_insert ON public.time_entries
  FOR INSERT TO authenticated
  WITH CHECK (public.has_skill(auth.uid(), 'ops'));

-- Only the owner can update/delete their own entries (or admin_grupo+).
CREATE POLICY time_entries_update ON public.time_entries
  FOR UPDATE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin_or_above(auth.uid())
  )
  WITH CHECK (
    user_id = auth.uid()
    OR public.is_admin_or_above(auth.uid())
  );

CREATE POLICY time_entries_delete ON public.time_entries
  FOR DELETE TO authenticated
  USING (
    user_id = auth.uid()
    OR public.is_admin_or_above(auth.uid())
  );

-- ============================================================================
-- Done. Verify:
--   SELECT project_id, count(*), sum(hours)
--   FROM public.time_entries GROUP BY project_id;
-- ============================================================================
