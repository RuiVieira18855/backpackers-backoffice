-- ============================================================================
-- Outpost — app_access.branding (per-customer white-label for Cairn)
-- ============================================================================
-- Cairn reads app_access.branding at login (getBranding()) and applies it to
-- the header (name / mark / tagline) + document.title. Empty = default "Cairn".
--
-- Idempotent. RLS: existing "user reads own row" policy already covers this
-- column — RLS is row-scoped, not column-scoped.
-- ============================================================================

ALTER TABLE public.app_access
  ADD COLUMN IF NOT EXISTS branding jsonb;

-- ============================================================================
-- Done. Verify:
--   SELECT user_id, app, branding FROM public.app_access
--     WHERE branding IS NOT NULL;
-- ============================================================================
