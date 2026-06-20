-- ============================================================================
-- Backpackers Backoffice — CRM module bootstrap
-- ============================================================================
-- Run AFTER supabase/bootstrap.sql, ONCE in Supabase SQL Editor.
-- Adds contacts table + enums + indexes + RLS + updated_at trigger.
-- Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.contact_type AS ENUM ('lead', 'customer', 'partner', 'vendor');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contact_stage AS ENUM ('new', 'qualified', 'active', 'on_hold', 'closed_won', 'closed_lost');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.contact_source AS ENUM ('website', 'referral', 'event', 'inbound', 'cold', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------------
-- 2. Tables
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.contacts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  pillar_id       uuid NOT NULL,
  type            public.contact_type NOT NULL DEFAULT 'lead',
  stage           public.contact_stage NOT NULL DEFAULT 'new',
  full_name       text NOT NULL,
  email           text,
  phone           text,
  company         text,
  job_title       text,
  notes           text,
  source          public.contact_source,
  tags            text[] NOT NULL DEFAULT '{}'::text[],
  owner_id        uuid,
  next_action     text,
  next_action_at  timestamp with time zone,
  last_contact_at timestamp with time zone,
  created_at      timestamp with time zone DEFAULT now() NOT NULL,
  updated_at      timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE public.contacts
    ADD CONSTRAINT contacts_pillar_id_pillars_id_fk
    FOREIGN KEY (pillar_id) REFERENCES public.pillars(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.contacts
    ADD CONSTRAINT contacts_owner_id_profiles_id_fk
    FOREIGN KEY (owner_id) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS contacts_pillar_idx     ON public.contacts USING btree (pillar_id);
CREATE INDEX IF NOT EXISTS contacts_stage_idx      ON public.contacts USING btree (stage);
CREATE INDEX IF NOT EXISTS contacts_type_idx       ON public.contacts USING btree (type);
CREATE INDEX IF NOT EXISTS contacts_owner_idx      ON public.contacts USING btree (owner_id);
CREATE INDEX IF NOT EXISTS contacts_full_name_idx  ON public.contacts USING btree (full_name);
CREATE INDEX IF NOT EXISTS contacts_created_at_idx ON public.contacts USING btree (created_at DESC NULLS LAST);


-- ---------------------------------------------------------------------------
-- 4. Updated_at trigger (generic, reusable by future tables)
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS contacts_set_updated_at ON public.contacts;
CREATE TRIGGER contacts_set_updated_at
  BEFORE UPDATE ON public.contacts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 5. Row Level Security
-- ---------------------------------------------------------------------------

ALTER TABLE public.contacts ENABLE ROW LEVEL SECURITY;

-- admin_grupo: full access to all contacts
DROP POLICY IF EXISTS contacts_all_admin_grupo ON public.contacts;
CREATE POLICY contacts_all_admin_grupo ON public.contacts
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_grupo'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_grupo'));

-- admin_pilar: full access within their assigned pilares
DROP POLICY IF EXISTS contacts_all_admin_pilar ON public.contacts;
CREATE POLICY contacts_all_admin_pilar ON public.contacts
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin_pilar'
        AND contacts.pillar_id = ANY (p.pillar_access)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'admin_pilar'
        AND contacts.pillar_id = ANY (p.pillar_access)
    )
  );

-- member: read-only within their assigned pilares
DROP POLICY IF EXISTS contacts_select_member ON public.contacts;
CREATE POLICY contacts_select_member ON public.contacts
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role = 'member'
        AND contacts.pillar_id = ANY (p.pillar_access)
    )
  );


-- ============================================================================
-- Done. Verify:
--   - Database -> Tables: should now include `contacts`
--   - Authentication -> Policies: contacts has 3 policies
-- ============================================================================
