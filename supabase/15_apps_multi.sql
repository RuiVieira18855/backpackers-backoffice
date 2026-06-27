-- ============================================================================
-- Outpost — Apps catalog + user kind
-- ============================================================================
-- Moves "Apps & Access" from a single hardcoded Cairn entitlement to a proper
-- catalog (multiple apps) and separates internal team from external customers.
--
-- - public.apps: catalog of Backpackers apps that can be sold/granted access to.
-- - public.profiles.kind: 'internal' (Backpackers team) | 'customer' (external).
-- - app_access already supports any app key via its text column — no change here.
--
-- Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Apps catalog
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.apps (
  key          text PRIMARY KEY,
  name         text NOT NULL,
  description  text,
  icon         text,             -- lucide-react icon name (e.g. "Map", "Boxes")
  url          text,             -- public URL of the app, optional
  color        text,             -- hex like "#0E2A44", optional
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS apps_select ON public.apps;
DROP POLICY IF EXISTS apps_write_admin ON public.apps;

-- Any authenticated user can read the catalog (the bell/sidebar may show apps).
CREATE POLICY apps_select ON public.apps
  FOR SELECT TO authenticated
  USING (true);

-- Only admins manage the catalog.
CREATE POLICY apps_write_admin ON public.apps
  FOR ALL TO authenticated
  USING (public.is_admin_or_above(auth.uid()))
  WITH CHECK (public.is_admin_or_above(auth.uid()));

-- Seed the existing app if it isn't there yet (matches the key used by
-- 14_app_access.sql).
INSERT INTO public.apps (key, name, description, icon)
VALUES ('cairn', 'Cairn Pro', 'Diagramas + assistente AI da Backpackers Labs.', 'Map')
ON CONFLICT (key) DO NOTHING;


-- ---------------------------------------------------------------------------
-- 2. User kind (internal vs external customer)
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.user_kind AS ENUM ('internal', 'customer');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS kind public.user_kind NOT NULL DEFAULT 'internal';

CREATE INDEX IF NOT EXISTS profiles_kind_idx ON public.profiles(kind);

-- Existing rows are kept as 'internal' (the default). External apps that
-- create new users should set kind='customer' at signup time, e.g.:
--
--   UPDATE public.profiles SET kind = 'customer' WHERE id = new_user_id;
--
-- or pass it through the auth metadata and let handle_new_user pick it up.


-- ============================================================================
-- Done. Verify:
--   SELECT key, name, is_active FROM public.apps;
--   SELECT kind, count(*) FROM public.profiles GROUP BY kind;
-- ============================================================================
