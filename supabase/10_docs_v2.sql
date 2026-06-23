-- ============================================================================
-- Outpost — Docs v2
-- ============================================================================
-- Adds event_id + project_id to documents so files can be attached to a
-- specific event or project (e.g. contract for a retreat, deck for a project).
--
-- Idempotent.
-- ============================================================================

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS documents_event_idx   ON public.documents(event_id);
CREATE INDEX IF NOT EXISTS documents_project_idx ON public.documents(project_id);

-- ============================================================================
-- Done. Verify:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'documents' ORDER BY ordinal_position;
-- ============================================================================
