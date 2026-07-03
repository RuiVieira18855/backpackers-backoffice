-- ============================================================================
-- Outpost — Recurring events
-- ============================================================================
-- Simple recurrence model: each occurrence is materialised as its own row so
-- the calendar / lists just work, and each child can be edited/cancelled
-- independently. The parent event stays as the "series head" pointed to by
-- children via recurrence_parent_id.
--
-- Deliberately NOT a full RFC 5545 RRULE engine — we cover the 90% case
-- (daily / weekly / monthly, with an interval and an optional end date).
--
-- Materialisation happens in the app layer at creation time (capped at
-- 26 occurrences ≈ 6 months weekly / 2 years monthly).
--
-- Idempotent.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.event_recurrence_frequency AS ENUM (
    'none', 'daily', 'weekly', 'monthly'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence_frequency public.event_recurrence_frequency NOT NULL DEFAULT 'none';

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence_interval integer NOT NULL DEFAULT 1;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence_until date;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS recurrence_parent_id uuid REFERENCES public.events(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS events_recurrence_parent_idx
  ON public.events(recurrence_parent_id);

-- ============================================================================
-- Done. Verify:
--   SELECT id, name, recurrence_frequency, recurrence_interval, recurrence_until
--   FROM public.events WHERE recurrence_frequency <> 'none' LIMIT 5;
-- ============================================================================
