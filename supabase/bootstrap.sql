-- ============================================================================
-- Backpackers Backoffice — Bootstrap SQL  (run ONCE in Supabase SQL Editor)
-- ============================================================================
-- This script:
--   1. Creates foundation tables (pillars, profiles, audit_log) via Drizzle
--      generated SQL.
--   2. Adds FK profiles.id -> auth.users(id) with CASCADE delete.
--   3. Creates trigger to auto-insert a profile row when a new auth.users
--      is created. First user is auto-promoted to admin_grupo.
--   4. Enables RLS on all foundation tables and adds policies.
--   5. Seeds the 4 pillars (grupo, adventures, synergy, labs).
--
-- Idempotent: safe to re-run. CREATE statements use IF NOT EXISTS where
-- possible; policies are DROPped + CREATEd; seeds use ON CONFLICT.
-- ============================================================================


-- ---------------------------------------------------------------------------
-- 1. TABLES + ENUMS + FKs + INDEXES
--    (mirrors drizzle/0000_blue_surge.sql, wrapped to be idempotent)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.audit_action AS ENUM ('create', 'update', 'delete');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.user_role AS ENUM ('admin_grupo', 'admin_pilar', 'member');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.pillars (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  slug        text NOT NULL,
  name        text NOT NULL,
  description text,
  created_at  timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT pillars_slug_unique UNIQUE (slug)
);

CREATE TABLE IF NOT EXISTS public.profiles (
  id                 uuid PRIMARY KEY NOT NULL,
  email              text NOT NULL,
  full_name          text,
  avatar_url         text,
  role               public.user_role DEFAULT 'member' NOT NULL,
  pillar_access      uuid[] DEFAULT '{}'::uuid[] NOT NULL,
  default_pillar_id  uuid,
  created_at         timestamp with time zone DEFAULT now() NOT NULL,
  updated_at         timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS public.audit_log (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  user_id     uuid,
  pillar_id   uuid,
  entity_type text NOT NULL,
  entity_id   uuid,
  action      public.audit_action NOT NULL,
  diff        jsonb,
  created_at  timestamp with time zone DEFAULT now() NOT NULL
);

-- Foreign keys (idempotent via DO block)
DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_default_pillar_id_pillars_id_fk
    FOREIGN KEY (default_pillar_id) REFERENCES public.pillars(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.audit_log
    ADD CONSTRAINT audit_log_user_id_profiles_id_fk
    FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.audit_log
    ADD CONSTRAINT audit_log_pillar_id_pillars_id_fk
    FOREIGN KEY (pillar_id) REFERENCES public.pillars(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS audit_log_pillar_idx     ON public.audit_log USING btree (pillar_id);
CREATE INDEX IF NOT EXISTS audit_log_entity_idx     ON public.audit_log USING btree (entity_type, entity_id);
CREATE INDEX IF NOT EXISTS audit_log_user_idx       ON public.audit_log USING btree (user_id);
CREATE INDEX IF NOT EXISTS audit_log_created_at_idx ON public.audit_log USING btree (created_at DESC NULLS LAST);


-- ---------------------------------------------------------------------------
-- 2. FK profiles.id -> auth.users(id) with CASCADE
--    (auth.users is managed by Supabase Auth; deleting a user removes profile)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  ALTER TABLE public.profiles
    ADD CONSTRAINT profiles_id_fkey
    FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------------
-- 3. Trigger: handle_new_user
--    On every auth.users INSERT, create a matching profile row.
--    First user (empty profiles table) is auto-promoted to admin_grupo.
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
    CASE WHEN is_first_user THEN 'admin_grupo'::public.user_role
         ELSE 'member'::public.user_role END
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ---------------------------------------------------------------------------
-- 4. Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.pillars   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- ----- pillars -----

DROP POLICY IF EXISTS pillars_select_authenticated ON public.pillars;
CREATE POLICY pillars_select_authenticated ON public.pillars
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS pillars_all_admin_grupo ON public.pillars;
CREATE POLICY pillars_all_admin_grupo ON public.pillars
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_grupo'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_grupo'));

-- ----- profiles -----

DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_authenticated ON public.profiles
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS profiles_update_own ON public.profiles;
CREATE POLICY profiles_update_own ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS profiles_all_admin_grupo ON public.profiles;
CREATE POLICY profiles_all_admin_grupo ON public.profiles
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin_grupo'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin_grupo'));

-- ----- audit_log -----
-- Read: admin_grupo sees all, admin_pilar sees only own pilares.
-- Write: app uses service_role for inserts; users never INSERT/UPDATE/DELETE.

DROP POLICY IF EXISTS audit_log_select_admin_grupo ON public.audit_log;
CREATE POLICY audit_log_select_admin_grupo ON public.audit_log
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_grupo'));

DROP POLICY IF EXISTS audit_log_select_admin_pilar ON public.audit_log;
CREATE POLICY audit_log_select_admin_pilar ON public.audit_log
  FOR SELECT TO authenticated
  USING (
    audit_log.pillar_id IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin_pilar'
        AND audit_log.pillar_id = ANY (p.pillar_access)
    )
  );


-- ---------------------------------------------------------------------------
-- 5. Seed pillars (the 4 fixed pilares of the Backpackers group)
-- ---------------------------------------------------------------------------

INSERT INTO public.pillars (slug, name, description) VALUES
  ('grupo',      'Backpackers World Adventures', 'Grupo umbrella, transversal aos pilares'),
  ('adventures', 'Backpackers Adventures',       'Viagens, hiking, tours, experiencias outdoor'),
  ('synergy',    'Backpackers Synergy',          'Corporate, team building, leadership, offsites'),
  ('labs',       'Backpackers Labs',             'Estudio digital, IA generativa, produtos e agentes')
ON CONFLICT (slug) DO UPDATE
  SET name        = EXCLUDED.name,
      description = EXCLUDED.description;


-- ============================================================================
-- Done. Verify in Supabase Dashboard:
--   - Database -> Tables: should list pillars, profiles, audit_log
--   - Database -> Schema Visualizer: should show FKs
--   - Authentication -> Policies: should show RLS enabled with policies
-- ============================================================================
