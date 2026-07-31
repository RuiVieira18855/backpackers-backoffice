-- ============================================================================
-- Outpost — Blog posts (marketing blog authored in Outpost, rendered by web)
-- ============================================================================
-- The public marketing site (web) currently reads MDX files from disk. This
-- table moves blog content into the database so it can be authored in Outpost
-- without a deploy. Content is plain Markdown. Brand-global content: no pillar
-- FK, no tenant scoping.
--
-- Access model:
--   - anon (public site, anon key): reads ONLY published posts.
--   - authenticated (backoffice): reads all (drafts included).
--   - super_user + admin_grupo: create / update / delete.
-- The Outpost server writes via the Drizzle service connection (bypasses RLS),
-- so these policies are defense-in-depth for direct REST/anon access.
--
-- Run ONCE in Supabase SQL Editor. Idempotent.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.blog_pillar AS ENUM ('bwa', 'adventures', 'synergy', 'labs');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.blog_status AS ENUM ('draft', 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.blog_posts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug          text NOT NULL,
  title         text NOT NULL,
  excerpt       text NOT NULL DEFAULT '',
  content       text NOT NULL DEFAULT '',
  pillar        public.blog_pillar NOT NULL DEFAULT 'bwa',
  category      text NOT NULL DEFAULT '',
  author        text NOT NULL DEFAULT 'Backpackers World Adventures',
  cover_image   text,
  status        public.blog_status NOT NULL DEFAULT 'draft',
  published_at  timestamptz,
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS blog_posts_slug_idx
  ON public.blog_posts (slug);
CREATE INDEX IF NOT EXISTS blog_posts_status_published_idx
  ON public.blog_posts (status, published_at);
CREATE INDEX IF NOT EXISTS blog_posts_pillar_idx
  ON public.blog_posts (pillar);

ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;

-- Table privileges (RLS still gates rows).
GRANT SELECT ON public.blog_posts TO anon, authenticated;
-- service_role bypasses RLS but still needs table privileges (used by the
-- one-off seed script and any Supabase API writes).
GRANT SELECT, INSERT, UPDATE, DELETE ON public.blog_posts TO service_role;

DROP POLICY IF EXISTS blog_posts_read_published_anon ON public.blog_posts;
DROP POLICY IF EXISTS blog_posts_read_all_auth ON public.blog_posts;
DROP POLICY IF EXISTS blog_posts_write_super_or_admin_grupo ON public.blog_posts;

-- Public site reads only published posts.
CREATE POLICY blog_posts_read_published_anon ON public.blog_posts
  FOR SELECT TO anon
  USING (status = 'published');

-- Backoffice users read everything (drafts included).
CREATE POLICY blog_posts_read_all_auth ON public.blog_posts
  FOR SELECT TO authenticated
  USING (true);

-- Only super_user + admin_grupo create / update / delete.
CREATE POLICY blog_posts_write_super_or_admin_grupo ON public.blog_posts
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
--   SELECT slug, title, pillar, status, published_at FROM public.blog_posts
--     ORDER BY published_at DESC NULLS LAST;
-- ============================================================================
