-- ============================================================================
-- Backpackers — App access (entitlements)
-- ============================================================================
-- Who may use which Backpackers app (e.g. Cairn Pro / the diagram SaaS).
-- Managed from the backoffice "Apps" tab; enforced by the app (login gate)
-- and by the AI proxy (server-side).
--
-- - One row per (user, app). status drives access; optional expiry.
-- - RLS: a user reads their own row(s); only admins (admin_grupo / super_user)
--   create, update, or revoke. Helper has_app_access() is used by the proxy.
--
-- Idempotent. Run after 06b (is_admin_or_above) exists.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.app_access_status AS ENUM ('trial', 'active', 'expired', 'revoked');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.app_access (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  app         text NOT NULL DEFAULT 'cairn',
  status      public.app_access_status NOT NULL DEFAULT 'trial',
  plan        text,
  expires_at  timestamptz,
  notes       text,
  granted_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS app_access_user_app_idx ON public.app_access (user_id, app);
CREATE INDEX IF NOT EXISTS app_access_app_idx ON public.app_access (app, status);

ALTER TABLE public.app_access ENABLE ROW LEVEL SECURITY;

-- A user can read their own entitlement; admins can read everyone's.
DROP POLICY IF EXISTS app_access_select ON public.app_access;
CREATE POLICY app_access_select ON public.app_access
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_above(auth.uid()));

-- Only admins create / update / revoke entitlements.
DROP POLICY IF EXISTS app_access_write_admin ON public.app_access;
CREATE POLICY app_access_write_admin ON public.app_access
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- Does a user currently have usable access to an app?
CREATE OR REPLACE FUNCTION public.has_app_access(uid uuid, app_key text DEFAULT 'cairn')
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.app_access
    WHERE user_id = uid
      AND app = app_key
      AND status IN ('trial', 'active')
      AND (expires_at IS NULL OR expires_at > now())
  );
$$;

-- Grant the founder(s) active access so Cairn works out of the box.
INSERT INTO public.app_access (user_id, app, status, plan, notes)
SELECT id, 'cairn', 'active', 'founder', 'auto-granted to super_user'
FROM public.profiles WHERE role = 'super_user'
ON CONFLICT (user_id, app) DO NOTHING;

-- ============================================================================
-- Done. Verify:
--   SELECT p.email, a.app, a.status, a.expires_at
--   FROM public.app_access a JOIN public.profiles p ON p.id = a.user_id;
--   SELECT public.has_app_access((SELECT id FROM public.profiles WHERE role='super_user' LIMIT 1));
-- ============================================================================
