-- ============================================================================
-- Outpost — Customer signup support
-- ============================================================================
-- Updates the handle_new_user trigger so external Backpackers apps (e.g.
-- Cairn Pro) can signup customers that land as kind='customer' instead of
-- accidentally inheriting backoffice skills.
--
-- Optional second metadata field `app_key` auto-creates a 'trial' app_access
-- row for the new user — saves one round-trip from the app's signup flow.
--
-- Usage in the external app (browser):
--
--   await supabase.auth.signUp({
--     email, password,
--     options: { data: { full_name, kind: 'customer', app_key: 'cairn' } }
--   });
--
-- Idempotent. Run after 15_apps_multi.sql (needs the user_kind enum +
-- profiles.kind column) and after 14_app_access.sql (needs app_access).
-- ============================================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user boolean;
  meta_kind     text := lower(coalesce(NEW.raw_user_meta_data ->> 'kind', 'internal'));
  meta_app_key  text := nullif(NEW.raw_user_meta_data ->> 'app_key', '');
  resolved_kind public.user_kind;
BEGIN
  -- Normalise kind. Only 'customer' is treated as such — anything else is internal.
  IF meta_kind = 'customer' THEN
    resolved_kind := 'customer';
  ELSE
    resolved_kind := 'internal';
  END IF;

  -- "First user" rule applies only to internal signups so the bootstrap
  -- super_user still works on a fresh DB. A customer should never be made
  -- super_user even if the profiles table is empty.
  IF resolved_kind = 'internal' THEN
    SELECT NOT EXISTS (SELECT 1 FROM public.profiles WHERE kind = 'internal')
      INTO is_first_user;
  ELSE
    is_first_user := false;
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role, kind, skills)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data ->> 'full_name',
      NEW.raw_user_meta_data ->> 'name',
      NULL
    ),
    CASE
      WHEN resolved_kind = 'customer' THEN 'member'::public.user_role
      WHEN is_first_user             THEN 'super_user'::public.user_role
      ELSE                                'member'::public.user_role
    END,
    resolved_kind,
    CASE
      -- Customers get no backoffice skills, ever.
      WHEN resolved_kind = 'customer' THEN '{}'::text[]
      WHEN is_first_user              THEN ARRAY['crm', 'ops', 'docs', 'finance', 'admin']
      ELSE                                 ARRAY['crm', 'ops', 'docs']::text[]
    END
  );

  -- Optional: if the signup carried an app_key, seed a trial entitlement
  -- so the user can use the app on first login without an admin granting it.
  -- Only honour app keys that exist in the catalog to avoid typos creating
  -- orphan entitlements.
  IF meta_app_key IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM public.apps WHERE key = meta_app_key) THEN
      INSERT INTO public.app_access (user_id, app, status, plan, notes)
      VALUES (
        NEW.id,
        meta_app_key,
        'trial',
        'self-signup',
        'auto-granted at signup'
      )
      ON CONFLICT (user_id, app) DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- ============================================================================
-- Done. Verify with a test signup that passes the new metadata, then:
--   SELECT id, email, kind, role, skills FROM public.profiles ORDER BY created_at DESC LIMIT 5;
--   SELECT user_id, app, status FROM public.app_access ORDER BY created_at DESC LIMIT 5;
-- ============================================================================
