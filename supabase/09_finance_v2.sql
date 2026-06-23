-- ============================================================================
-- Outpost — Finance v2
-- ============================================================================
-- Adds event_id + project_id to transactions so income/expense can be tracked
-- against a specific event or project (e.g. cost of a retreat, fee from a tour).
--
-- Idempotent.
-- ============================================================================

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS event_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

ALTER TABLE public.transactions
  ADD COLUMN IF NOT EXISTS project_id uuid REFERENCES public.projects(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS transactions_event_idx   ON public.transactions(event_id);
CREATE INDEX IF NOT EXISTS transactions_project_idx ON public.transactions(project_id);

-- ============================================================================
-- Done. Verify:
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'transactions' ORDER BY ordinal_position;
-- ============================================================================
