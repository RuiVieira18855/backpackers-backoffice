-- ============================================================================
-- Outpost — SECURITY: signup least-privilege (fixes C1/C2)
-- ============================================================================
-- Previously handle_new_user() derived `kind` from raw_user_meta_data, which is
-- ATTACKER-CONTROLLED (supabase.auth.signUp({ options: { data: { kind } } })),
-- and defaulted a missing kind to 'internal' with skills crm/ops/docs. Since
-- the Outpost and customer apps (Cairn) share ONE Supabase project, that let:
--   - anyone self-register as an internal backoffice user (C1), and
--   - a Cairn customer self-promote to internal (C2).
--
-- Fix: every new auth user is created as a least-privilege 'customer' with NO
-- role/skills, regardless of metadata. Internal team members are provisioned
-- ONLY by an admin via the invite flow (admin/users/new), which updates the
-- profile to kind='internal' + role + skills server-side.
--
-- NOTE: we intentionally do NOT disable Supabase Auth signups — Cairn needs
-- them. Protection lives here, so every signup path is safe by default.
--
-- Idempotent.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_app_key text := nullif(NEW.raw_user_meta_data ->> 'app_key', '');
BEGIN
  -- Least privilege ALWAYS. Never trust client metadata for kind/role/skills.
  INSERT INTO public.profiles (id, email, full_name, role, kind, skills)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NULL
    ),
    'member'::public.user_role,
    'customer'::public.user_kind,
    '{}'::text[]
  );

  -- Optional trial entitlement for a known app (external-app onboarding, e.g.
  -- Cairn). Bounded to catalog apps; 'trial' only; safe for a customer.
  IF meta_app_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.apps WHERE key = meta_app_key) THEN
      INSERT INTO public.app_access (user_id, app, status, plan, notes)
      VALUES (NEW.id, meta_app_key, 'trial', 'self-signup', 'auto-granted at signup')
      ON CONFLICT (user_id, app) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Defense in depth: make the column default least-privilege too, so even a raw
-- INSERT that omits `kind` cannot create an internal account.
ALTER TABLE public.profiles ALTER COLUMN kind SET DEFAULT 'customer';

-- ============================================================================
-- Bootstrap note: on a FRESH database with no super_user, create the first
-- internal admin manually after signing up, e.g.:
--   UPDATE public.profiles
--     SET kind='internal', role='super_user',
--         skills=ARRAY['crm','ops','docs','finance','admin']
--   WHERE email = 'you@example.com';
-- (Production already has super_users; existing profiles are unaffected.)
--
-- Verify no NEW signup can be internal:
--   SELECT email, kind, role, skills FROM public.profiles ORDER BY created_at DESC LIMIT 5;
-- ============================================================================
