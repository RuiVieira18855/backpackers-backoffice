-- ============================================================================
-- Outpost — OAuth calendar sync
-- ============================================================================
-- Per-user OAuth connections to external calendar providers (Google, Microsoft)
-- plus columns on events to track the external counterpart id and last sync
-- timestamp.
--
-- - oauth_connections stores access + refresh tokens, encrypted at REST via
--   Postgres pgcrypto is a follow-up — for now tokens are stored in plaintext
--   and access is RLS-limited to the owner and admins.
-- - Sync is one-way pull (external → Backpackers) for MVP. Push (mirror
--   local changes back to Google/Outlook) is a follow-up sprint.
--
-- Idempotent.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.oauth_provider AS ENUM ('google', 'microsoft');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.oauth_connections (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  provider           public.oauth_provider NOT NULL,
  access_token       text NOT NULL,
  refresh_token      text,
  expires_at         timestamptz,
  scope              text,
  external_email     text,
  default_pillar_id  uuid REFERENCES public.pillars(id) ON DELETE SET NULL,
  last_synced_at     timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS oauth_connections_user_provider_idx
  ON public.oauth_connections (user_id, provider);

ALTER TABLE public.oauth_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS oauth_connections_select_own ON public.oauth_connections;
DROP POLICY IF EXISTS oauth_connections_write_own ON public.oauth_connections;

CREATE POLICY oauth_connections_select_own ON public.oauth_connections
  FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin_or_above(auth.uid()));

CREATE POLICY oauth_connections_write_own ON public.oauth_connections
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Events: track external counterparts so pull sync can upsert idempotently
-- ---------------------------------------------------------------------------

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS google_event_id text;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS microsoft_event_id text;

ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS last_synced_at timestamptz;

CREATE INDEX IF NOT EXISTS events_google_event_id_idx
  ON public.events (google_event_id)
  WHERE google_event_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS events_microsoft_event_id_idx
  ON public.events (microsoft_event_id)
  WHERE microsoft_event_id IS NOT NULL;

-- ============================================================================
-- Done. Verify:
--   SELECT user_id, provider, external_email, last_synced_at
--   FROM public.oauth_connections;
--   SELECT column_name FROM information_schema.columns
--     WHERE table_name = 'events' AND column_name LIKE '%event_id';
-- ============================================================================
