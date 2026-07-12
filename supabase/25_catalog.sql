-- ============================================================================
-- Outpost — Catalog (Backpackers activities knowledge base)
-- ============================================================================
-- The reusable operational catalog of activities. Super users (and
-- admin_grupo) create/edit/delete; every authenticated backoffice user can
-- read. External customers stay blocked from the backoffice via requireProfile.
--
-- Later phases will add catalog_pages (freeform markdown) and catalog_assets
-- (files in Supabase Storage).
--
-- Idempotent.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.catalog_family AS ENUM ('wild', 'hive', 'multi');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.catalog_activities (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code               text NOT NULL,
  name               text NOT NULL,
  tagline            text,
  family             public.catalog_family NOT NULL,
  pillar_id          uuid REFERENCES public.pillars(id) ON DELETE SET NULL,
  duration_label     text,
  pax_min            integer,
  pax_max            integer,
  price_target_min   integer,
  price_target_max   integer,
  price_per_pax_min  integer,
  price_per_pax_max  integer,
  target_audience    text,
  body               text NOT NULL DEFAULT '',
  is_active          boolean NOT NULL DEFAULT true,
  sort_order         integer NOT NULL DEFAULT 0,
  created_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by         uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS catalog_activities_code_idx
  ON public.catalog_activities (code);
CREATE INDEX IF NOT EXISTS catalog_activities_family_idx
  ON public.catalog_activities (family, sort_order);
CREATE INDEX IF NOT EXISTS catalog_activities_active_idx
  ON public.catalog_activities (is_active);

ALTER TABLE public.catalog_activities ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS catalog_activities_read_all ON public.catalog_activities;
DROP POLICY IF EXISTS catalog_activities_write_super_or_admin_grupo
  ON public.catalog_activities;

-- Everyone authenticated in the backoffice reads the catalog.
CREATE POLICY catalog_activities_read_all ON public.catalog_activities
  FOR SELECT TO authenticated
  USING (true);

-- Only super_user + admin_grupo can create / update / delete catalog entries.
-- (is_admin_or_above already covers admin_pilar; here we tighten to grupo+.)
CREATE POLICY catalog_activities_write_super_or_admin_grupo
  ON public.catalog_activities
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_user', 'admin_grupo')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.role IN ('super_user', 'admin_grupo')
    )
  );

-- ============================================================================
-- Done. Verify:
--   SELECT code, name, family, is_active FROM public.catalog_activities
--     ORDER BY family, sort_order;
-- ============================================================================
