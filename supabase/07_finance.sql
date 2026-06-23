-- ============================================================================
-- Outpost — Finance module bootstrap
-- ============================================================================
-- Run AFTER supabase/06b_super_user_finalize.sql (requires is_super_user()).
-- Creates transactions table for income/expense ledger.
-- ACCESS: super_user ONLY (other roles cannot read or write).
-- Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enums
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.transaction_type AS ENUM ('income', 'expense');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE public.transaction_status AS ENUM ('pending', 'paid', 'overdue', 'cancelled');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------------
-- 2. Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.transactions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  pillar_id       uuid,
  type            public.transaction_type NOT NULL,
  category        text,
  amount          numeric(12, 2) NOT NULL,
  currency        text NOT NULL DEFAULT 'EUR',
  description     text NOT NULL,
  date            date NOT NULL,
  invoice_number  text,
  vendor          text,
  status          public.transaction_status NOT NULL DEFAULT 'pending',
  due_date        date,
  paid_at         timestamp with time zone,
  notes           text,
  tags            text[] NOT NULL DEFAULT '{}'::text[],
  created_by      uuid,
  created_at      timestamp with time zone DEFAULT now() NOT NULL,
  updated_at      timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_pillar_id_fk
    FOREIGN KEY (pillar_id) REFERENCES public.pillars(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.transactions ADD CONSTRAINT transactions_created_by_fk
    FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS transactions_pillar_idx      ON public.transactions USING btree (pillar_id);
CREATE INDEX IF NOT EXISTS transactions_type_idx        ON public.transactions USING btree (type);
CREATE INDEX IF NOT EXISTS transactions_status_idx      ON public.transactions USING btree (status);
CREATE INDEX IF NOT EXISTS transactions_date_idx        ON public.transactions USING btree (date DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS transactions_due_date_idx    ON public.transactions USING btree (due_date);
CREATE INDEX IF NOT EXISTS transactions_created_by_idx  ON public.transactions USING btree (created_by);


-- ---------------------------------------------------------------------------
-- 4. updated_at trigger
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS transactions_set_updated_at ON public.transactions;
CREATE TRIGGER transactions_set_updated_at
  BEFORE UPDATE ON public.transactions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 5. RLS — super_user ONLY
-- ---------------------------------------------------------------------------

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS transactions_all_super_user ON public.transactions;
CREATE POLICY transactions_all_super_user ON public.transactions
  FOR ALL TO authenticated
  USING (public.is_super_user(auth.uid()))
  WITH CHECK (public.is_super_user(auth.uid()));


-- ============================================================================
-- Done. Verify:
--   - Database -> Tables: transactions
--   - Authentication -> Policies: transactions has 1 policy (super_user)
-- ============================================================================
