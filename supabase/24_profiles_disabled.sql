-- ============================================================================
-- Outpost — Soft-delete for profiles (disabled_at)
-- ============================================================================
-- Adds a nullable timestamp column to mark a profile as disabled without
-- destroying the row. Disabled profiles preserve their audit trail and
-- ownership of past records, but are blocked from logging into the backoffice
-- via the app-level guard in `requireProfile()`.
--
-- Idempotent.
-- ============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS disabled_at timestamptz;

CREATE INDEX IF NOT EXISTS profiles_disabled_at_idx
  ON public.profiles (disabled_at)
  WHERE disabled_at IS NOT NULL;

-- ============================================================================
-- Done. Verify:
--   SELECT email, disabled_at FROM public.profiles WHERE disabled_at IS NOT NULL;
-- ============================================================================
