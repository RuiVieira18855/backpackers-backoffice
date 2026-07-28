-- ============================================================================
-- Outpost — SECURITY: tighten profiles read RLS (fixes M1)
-- ============================================================================
-- profiles_select_authenticated was USING (true): ANY authenticated JWT —
-- including an external Cairn customer hitting Supabase REST with the public
-- anon key — could SELECT every staff profile (emails, roles, skills,
-- pillar_access). That is information disclosure and aids targeting.
--
-- New rule: you can read your OWN profile; super_user/admin_grupo read all.
-- Uses the SECURITY DEFINER helper is_admin_or_above() to avoid RLS recursion
-- on profiles.
--
-- NOTE: the Outpost server reads profiles via the service/superuser Drizzle
-- connection (bypasses RLS), so server-rendered pages are unaffected. This
-- only restricts direct REST/anon-key reads. Smoke-test any client-side
-- profile reads after deploy.
--
-- Idempotent.
-- ============================================================================

DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
DROP POLICY IF EXISTS profiles_select_own_or_admin ON public.profiles;
CREATE POLICY profiles_select_own_or_admin ON public.profiles
  FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin_or_above(auth.uid()));

-- ============================================================================
-- Verify (as a non-admin authenticated user, via REST): should return only
-- your own row.
--   SELECT id, email, role FROM public.profiles;
-- ============================================================================
