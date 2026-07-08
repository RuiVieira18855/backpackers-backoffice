-- ============================================================================
-- Outpost — Outbound webhooks
-- ============================================================================
-- Send HTTP POST notifications to external systems when internal events fire.
-- Signed with HMAC-SHA256 using the webhook's shared secret so receivers can
-- verify authenticity.
--
-- - Fired by workflow actions of type "trigger_webhook" or by explicit
--   dispatchWebhook() calls in server actions.
-- - Delivery is synchronous inline (fire-and-forget). No retry queue yet —
--   failures are logged in webhook_deliveries with the response body/status.
--
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.webhooks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  url           text NOT NULL,
  secret        text NOT NULL,
  events        text[] NOT NULL DEFAULT '{}'::text[],
  is_active     boolean NOT NULL DEFAULT true,
  created_by    uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhooks_active_idx ON public.webhooks (is_active);

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id    uuid NOT NULL REFERENCES public.webhooks(id) ON DELETE CASCADE,
  event         text NOT NULL,
  request_body  jsonb NOT NULL,
  status_code   integer,
  response_body text,
  error         text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS webhook_deliveries_webhook_idx
  ON public.webhook_deliveries (webhook_id, created_at DESC);

ALTER TABLE public.webhooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhooks_select ON public.webhooks;
DROP POLICY IF EXISTS webhooks_write_admin ON public.webhooks;
DROP POLICY IF EXISTS webhook_deliveries_select ON public.webhook_deliveries;

-- Any authenticated user can read the webhook catalog (server actions
-- fetch it to dispatch), but only admins manage entries.
CREATE POLICY webhooks_select ON public.webhooks
  FOR SELECT TO authenticated USING (true);

CREATE POLICY webhooks_write_admin ON public.webhooks
  FOR ALL TO authenticated
  USING (public.has_skill(auth.uid(), 'admin'))
  WITH CHECK (public.has_skill(auth.uid(), 'admin'));

-- Deliveries visible only to admins (contain payloads that may echo
-- private data). No writes from clients — server actions use service role.
CREATE POLICY webhook_deliveries_select ON public.webhook_deliveries
  FOR SELECT TO authenticated
  USING (public.has_skill(auth.uid(), 'admin'));

-- ============================================================================
-- Done. Verify:
--   SELECT name, url, is_active FROM public.webhooks;
--   SELECT webhook_id, event, status_code FROM public.webhook_deliveries
--     ORDER BY created_at DESC LIMIT 20;
-- ============================================================================
