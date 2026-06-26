-- ============================================================================
-- Outpost — Notifications
-- ============================================================================
-- Per-user in-app notification feed.
--
-- - Each row belongs to a single recipient (user_id).
-- - RLS: a user sees + updates only their own rows. Service role (used by
--   server actions that fan-out notifications) bypasses RLS.
-- - Realtime is enabled on this table so the bell can react to inserts.
--
-- Idempotent.
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE public.notification_kind AS ENUM (
    'task_assigned',
    'task_due_soon',
    'event_finance',
    'event_doc',
    'project_finance',
    'project_doc',
    'mention',
    'system'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.notifications (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  pillar_id   uuid REFERENCES public.pillars(id) ON DELETE SET NULL,
  kind        public.notification_kind NOT NULL DEFAULT 'system',
  title       text NOT NULL,
  body        text,
  link        text,
  actor_id    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications (user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS notifications_user_unread_idx
  ON public.notifications (user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS notifications_select_own ON public.notifications;
CREATE POLICY notifications_select_own ON public.notifications
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS notifications_update_own ON public.notifications;
CREATE POLICY notifications_update_own ON public.notifications
  FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Insert + delete only via service_role (server actions). No client INSERT.
DROP POLICY IF EXISTS notifications_no_insert ON public.notifications;
DROP POLICY IF EXISTS notifications_no_delete ON public.notifications;

-- Realtime publication — add table if not already published
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM   pg_publication_tables
    WHERE  pubname = 'supabase_realtime'
      AND  schemaname = 'public'
      AND  tablename = 'notifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
  END IF;
END $$;

-- ============================================================================
-- Done. Verify:
--   SELECT * FROM public.notifications LIMIT 1;
-- ============================================================================
