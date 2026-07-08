-- ============================================================================
-- Outpost — Automation workflows
-- ============================================================================
-- Trigger → Conditions → Actions engine.
--
-- - workflows: definitions. Fired inline by the server actions that mutate
--   the source entity, wrapped in try/catch so a workflow failure never
--   blocks the primary mutation.
-- - conditions / actions live as JSONB — schema evolves without migrations.
--   Shape is enforced in app code (lib/workflows.ts).
--
-- No separate workflow_runs table for MVP — every action taken emits an
-- audit_log entry via logAudit() with the workflow id in the diff.
--
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workflows (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  trigger_type  text NOT NULL,
  conditions    jsonb NOT NULL DEFAULT '[]'::jsonb,
  actions       jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS workflows_trigger_active_idx
  ON public.workflows (trigger_type)
  WHERE is_active = true;

ALTER TABLE public.workflows ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS workflows_select ON public.workflows;
DROP POLICY IF EXISTS workflows_write_admin ON public.workflows;

-- Any authenticated user can read (server actions fetch workflows to run).
CREATE POLICY workflows_select ON public.workflows
  FOR SELECT TO authenticated
  USING (true);

-- Only admins manage the workflow catalog.
CREATE POLICY workflows_write_admin ON public.workflows
  FOR ALL TO authenticated
  USING (public.has_skill(auth.uid(), 'admin'))
  WITH CHECK (public.has_skill(auth.uid(), 'admin'));

-- ============================================================================
-- Done. Verify:
--   SELECT name, trigger_type, is_active FROM public.workflows;
-- ============================================================================
