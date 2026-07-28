-- ============================================================================
-- Outpost — app_access Stripe columns (Cairn Pro billing sync)
-- ============================================================================
-- The Cairn Stripe webhook stores the link between a subscription and the user
-- so renewals (invoice.paid) and cancellations (customer.subscription.*) can
-- find the row by stripe_sub_id and keep status/expires_at in sync.
-- Idempotent.
-- ============================================================================

ALTER TABLE public.app_access
  ADD COLUMN IF NOT EXISTS stripe_customer_id text,
  ADD COLUMN IF NOT EXISTS stripe_sub_id      text;

CREATE INDEX IF NOT EXISTS app_access_stripe_sub_idx
  ON public.app_access (stripe_sub_id);

-- RLS: writes come from the service role (bypasses RLS); the new columns are
-- covered by the existing per-row read policies. No new policy needed.

-- ============================================================================
-- Verify:
--   SELECT user_id, app, status, plan, stripe_sub_id
--   FROM public.app_access WHERE app = 'cairn';
-- ============================================================================
