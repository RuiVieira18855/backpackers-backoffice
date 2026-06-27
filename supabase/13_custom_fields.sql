-- ============================================================================
-- Outpost — Custom fields foundation
-- ============================================================================
-- Admin-defined custom fields per entity type. Definitions live in
-- custom_field_defs; values live as JSONB on each entity row.
--
-- This migration adds the defs table + the JSONB columns. Form integration
-- (rendering / writing values) is wired in app code per entity.
--
-- Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.custom_field_entity AS ENUM (
    'contact', 'event', 'project', 'deal'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.custom_field_type AS ENUM (
    'text', 'textarea', 'number', 'date', 'select'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------------
-- 2. Defs table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.custom_field_defs (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  entity_type  public.custom_field_entity NOT NULL,
  key          text NOT NULL,
  label        text NOT NULL,
  type         public.custom_field_type NOT NULL DEFAULT 'text',
  options      text[] NOT NULL DEFAULT '{}'::text[],
  required     boolean NOT NULL DEFAULT false,
  sort_order   integer NOT NULL DEFAULT 0,
  created_by   uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS custom_field_defs_entity_key_idx
  ON public.custom_field_defs (entity_type, key);

CREATE INDEX IF NOT EXISTS custom_field_defs_entity_idx
  ON public.custom_field_defs (entity_type, sort_order);

ALTER TABLE public.custom_field_defs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS custom_field_defs_select ON public.custom_field_defs;
DROP POLICY IF EXISTS custom_field_defs_write  ON public.custom_field_defs;

-- Any authenticated user can read defs (forms need them).
CREATE POLICY custom_field_defs_select ON public.custom_field_defs
  FOR SELECT TO authenticated
  USING (true);

-- Only admins manage definitions.
CREATE POLICY custom_field_defs_write ON public.custom_field_defs
  FOR ALL TO authenticated
  USING (public.has_skill(auth.uid(), 'admin'))
  WITH CHECK (public.has_skill(auth.uid(), 'admin'));


-- ---------------------------------------------------------------------------
-- 3. JSONB columns on each supported entity
-- ---------------------------------------------------------------------------

ALTER TABLE public.contacts
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.deals
  ADD COLUMN IF NOT EXISTS custom_fields jsonb NOT NULL DEFAULT '{}'::jsonb;


-- ============================================================================
-- Done. Verify:
--   SELECT * FROM public.custom_field_defs LIMIT 1;
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'contacts' AND column_name = 'custom_fields';
-- ============================================================================
