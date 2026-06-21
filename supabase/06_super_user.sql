-- ============================================================================
-- Backpackers Backoffice — Super User role
-- ============================================================================
-- Adds a "super_user" role above admin_grupo. Super users:
--   - Have ALL admin_grupo privileges (RLS policies updated via helpers)
--   - Cannot be demoted by admin_grupo (only by another super_user)
--   - Cannot be demoted at all if they are the LAST super_user
--   - Are the only role that can promote others to super_user
-- The first user signup is now promoted to super_user (was admin_grupo).
-- Existing admin_grupo accounts are auto-promoted to super_user.
-- Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Extend enum (Postgres allows ADD VALUE on existing enum)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE 'super_user' BEFORE 'admin_grupo';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN invalid_parameter_value THEN NULL;  -- value already exists
END $$;


-- ---------------------------------------------------------------------------
-- 2. Promote existing admin_grupo users to super_user
--    Only runs if there's no super_user yet (idempotent safety).
-- ---------------------------------------------------------------------------

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE role = 'super_user') THEN
    UPDATE public.profiles SET role = 'super_user' WHERE role = 'admin_grupo';
  END IF;
END $$;


-- ---------------------------------------------------------------------------
-- 3. Helper functions for RLS
--    is_admin_or_above() returns true for super_user OR admin_grupo
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin_or_above(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role IN ('super_user', 'admin_grupo')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_super_user(uid uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid AND role = 'super_user'
  );
$$;


-- ---------------------------------------------------------------------------
-- 4. Refactor existing "admin_grupo only" policies to use is_admin_or_above().
--    Drop + recreate each.
-- ---------------------------------------------------------------------------

-- pillars
DROP POLICY IF EXISTS pillars_all_admin_grupo ON public.pillars;
CREATE POLICY pillars_all_admin_grupo ON public.pillars
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- profiles
DROP POLICY IF EXISTS profiles_all_admin_grupo ON public.profiles;
CREATE POLICY profiles_all_admin_grupo ON public.profiles
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- audit_log
DROP POLICY IF EXISTS audit_log_select_admin_grupo ON public.audit_log;
CREATE POLICY audit_log_select_admin_grupo ON public.audit_log
  FOR SELECT TO authenticated
  USING (public.is_admin_or_above(auth.uid()));

-- contacts
DROP POLICY IF EXISTS contacts_all_admin_grupo ON public.contacts;
CREATE POLICY contacts_all_admin_grupo ON public.contacts
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- events
DROP POLICY IF EXISTS events_all_admin_grupo ON public.events;
CREATE POLICY events_all_admin_grupo ON public.events
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- projects
DROP POLICY IF EXISTS projects_all_admin_grupo ON public.projects;
CREATE POLICY projects_all_admin_grupo ON public.projects
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- tasks
DROP POLICY IF EXISTS tasks_all_admin_grupo ON public.tasks;
CREATE POLICY tasks_all_admin_grupo ON public.tasks
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- documents
DROP POLICY IF EXISTS documents_all_admin_grupo ON public.documents;
CREATE POLICY documents_all_admin_grupo ON public.documents
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));


-- ---------------------------------------------------------------------------
-- 5. Update handle_new_user: first user is now super_user (was admin_grupo)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  is_first_user boolean;
BEGIN
  SELECT NOT EXISTS (SELECT 1 FROM public.profiles) INTO is_first_user;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', NULL),
    CASE WHEN is_first_user THEN 'super_user'::public.user_role
         ELSE 'member'::public.user_role END
  );

  RETURN NEW;
END;
$$;


-- ============================================================================
-- Done. Verify:
--   SELECT id, email, role FROM public.profiles ORDER BY created_at;
--   You should see ruivieira18855@hotmail.com with role = 'super_user'.
-- ============================================================================
