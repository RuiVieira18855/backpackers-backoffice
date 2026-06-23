-- ============================================================================
-- Outpost — Skills system
-- ============================================================================
-- Replaces "finance = super_user only" with a flexible skill-based model:
--
-- - Every profile has a `skills text[]` column
-- - Skills are arbitrary strings (recommended: 'crm', 'ops', 'docs',
--   'finance', 'admin'). They map to module access in the UI.
-- - super_user implicitly has ALL skills (helper short-circuits)
-- - super_user can grant/revoke any skill (and the super_user role itself)
-- - Other modules (CRM/Ops/Docs) still use pillar-based RLS — skills control
--   UI visibility there; finance is the only RLS-gated by skill for now
--
-- Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Add skills column to profiles
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS skills text[] NOT NULL DEFAULT '{}'::text[];


-- ---------------------------------------------------------------------------
-- 2. Backfill skills based on existing role
--    Only runs on rows where skills is empty (idempotent).
-- ---------------------------------------------------------------------------

UPDATE public.profiles
SET skills = CASE
  WHEN role = 'super_user'  THEN ARRAY['crm', 'ops', 'docs', 'finance', 'admin']
  WHEN role = 'admin_grupo' THEN ARRAY['crm', 'ops', 'docs', 'admin']
  WHEN role = 'admin_pilar' THEN ARRAY['crm', 'ops', 'docs']
  WHEN role = 'member'      THEN ARRAY['crm', 'ops', 'docs']
  ELSE skills
END
WHERE skills = '{}'::text[];


-- ---------------------------------------------------------------------------
-- 3. has_skill() helper — super_user passes any skill check
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.has_skill(uid uuid, skill text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = uid
      AND (role = 'super_user' OR skill = ANY (skills))
  );
$$;


-- ---------------------------------------------------------------------------
-- 4. Migrate finance RLS from "super_user only" → "has finance skill"
-- ---------------------------------------------------------------------------

DROP POLICY IF EXISTS transactions_all_super_user ON public.transactions;
DROP POLICY IF EXISTS transactions_all_finance   ON public.transactions;

CREATE POLICY transactions_all_finance ON public.transactions
  FOR ALL TO authenticated
  USING (public.has_skill(auth.uid(), 'finance'))
  WITH CHECK (public.has_skill(auth.uid(), 'finance'));


-- ---------------------------------------------------------------------------
-- 5. Update handle_new_user trigger to give first signup ALL skills
--    (other new signups get empty skills — admin assigns)
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

  INSERT INTO public.profiles (id, email, full_name, role, skills)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'full_name', NEW.raw_user_meta_data ->> 'name', NULL),
    CASE WHEN is_first_user THEN 'super_user'::public.user_role
         ELSE 'member'::public.user_role END,
    CASE WHEN is_first_user
         THEN ARRAY['crm', 'ops', 'docs', 'finance', 'admin']
         ELSE ARRAY['crm', 'ops', 'docs']::text[]
    END
  );

  RETURN NEW;
END;
$$;


-- ============================================================================
-- Done. Verify:
--   SELECT id, email, role, skills FROM public.profiles;
--   You should see your row with all 5 skills.
-- ============================================================================
