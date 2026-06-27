-- ============================================================================
-- Outpost — Deals + Templates
-- ============================================================================
-- New entities for sprints 4 (deals) and 6 (templates).
--
-- Deals: opportunities pipeline (lead → qualified → proposal → negotiation →
-- won/lost). Scoped per pillar with RLS like the other domain tables.
--
-- Templates: reusable text snippets for notes/descriptions, optionally scoped
-- by pillar. Anyone authenticated can read; only admins create/update/delete.
--
-- Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Deals
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.deal_stage AS ENUM (
    'lead', 'qualified', 'proposal', 'negotiation', 'won', 'lost'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.deals (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id           uuid NOT NULL REFERENCES public.pillars(id) ON DELETE RESTRICT,
  contact_id          uuid REFERENCES public.contacts(id) ON DELETE SET NULL,
  owner_id            uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  name                text NOT NULL,
  description         text,
  stage               public.deal_stage NOT NULL DEFAULT 'lead',
  value               numeric(12,2),
  currency            text NOT NULL DEFAULT 'EUR',
  expected_close_date date,
  closed_at           timestamptz,
  tags                text[] NOT NULL DEFAULT '{}'::text[],
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS deals_pillar_idx     ON public.deals(pillar_id);
CREATE INDEX IF NOT EXISTS deals_stage_idx      ON public.deals(stage);
CREATE INDEX IF NOT EXISTS deals_contact_idx    ON public.deals(contact_id);
CREATE INDEX IF NOT EXISTS deals_owner_idx      ON public.deals(owner_id);
CREATE INDEX IF NOT EXISTS deals_close_idx      ON public.deals(expected_close_date);
CREATE INDEX IF NOT EXISTS deals_created_at_idx ON public.deals(created_at DESC);

ALTER TABLE public.deals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS deals_select   ON public.deals;
DROP POLICY IF EXISTS deals_insert   ON public.deals;
DROP POLICY IF EXISTS deals_update   ON public.deals;
DROP POLICY IF EXISTS deals_delete   ON public.deals;

-- Mirror contacts policy: any authenticated user can read; CRM skill writes.
CREATE POLICY deals_select ON public.deals
  FOR SELECT TO authenticated
  USING (true);

CREATE POLICY deals_insert ON public.deals
  FOR INSERT TO authenticated
  WITH CHECK (public.has_skill(auth.uid(), 'crm'));

CREATE POLICY deals_update ON public.deals
  FOR UPDATE TO authenticated
  USING (public.has_skill(auth.uid(), 'crm'))
  WITH CHECK (public.has_skill(auth.uid(), 'crm'));

CREATE POLICY deals_delete ON public.deals
  FOR DELETE TO authenticated
  USING (public.has_skill(auth.uid(), 'crm'));


-- ---------------------------------------------------------------------------
-- 2. Templates
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.template_scope AS ENUM (
    'contact_note', 'event_description', 'project_description',
    'deal_description', 'task_description', 'doc_description', 'generic'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

CREATE TABLE IF NOT EXISTS public.templates (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id   uuid REFERENCES public.pillars(id) ON DELETE SET NULL,
  scope       public.template_scope NOT NULL DEFAULT 'generic',
  name        text NOT NULL,
  body        text NOT NULL,
  created_by  uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  tags        text[] NOT NULL DEFAULT '{}'::text[],
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS templates_scope_idx  ON public.templates(scope);
CREATE INDEX IF NOT EXISTS templates_pillar_idx ON public.templates(pillar_id);
CREATE INDEX IF NOT EXISTS templates_name_idx   ON public.templates(name);

ALTER TABLE public.templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS templates_select ON public.templates;
DROP POLICY IF EXISTS templates_write  ON public.templates;

CREATE POLICY templates_select ON public.templates
  FOR SELECT TO authenticated
  USING (true);

-- Admin skill manages the library (kept simple — no per-pillar restriction yet).
CREATE POLICY templates_write ON public.templates
  FOR ALL TO authenticated
  USING (public.has_skill(auth.uid(), 'admin'))
  WITH CHECK (public.has_skill(auth.uid(), 'admin'));


-- ============================================================================
-- Done. Verify:
--   SELECT * FROM public.deals LIMIT 1;
--   SELECT * FROM public.templates LIMIT 1;
-- ============================================================================
