-- ============================================================================
-- Outpost — Super user universal app access
-- ============================================================================
-- Rule: any super_user has premium access to every Backpackers app, always,
-- without needing per-app grants in app_access. Applies retroactively to
-- new apps added in the future.
--
-- Implementation: has_app_access() short-circuits to true when the user is
-- a super_user. No app_access rows are created for super_users — the
-- entitlement is virtual.
--
-- Idempotent. Run after 15_apps_multi.sql (needs profiles.kind) and 14.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.has_app_access(uid uuid, app_key text DEFAULT 'cairn')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Super users get every app, everywhere, for free.
    EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = uid AND role = 'super_user'
    )
    OR
    -- Otherwise the standard entitlement check.
    EXISTS (
      SELECT 1 FROM public.app_access
      WHERE user_id = uid
        AND app = app_key
        AND status IN ('trial', 'active')
        AND (expires_at IS NULL OR expires_at > now())
    );
$$;

-- ============================================================================
-- Done. Verify (as a super_user):
--   SELECT public.has_app_access(auth.uid(), 'cairn');       -- true
--   SELECT public.has_app_access(auth.uid(), 'any-new-app'); -- true
-- ============================================================================
