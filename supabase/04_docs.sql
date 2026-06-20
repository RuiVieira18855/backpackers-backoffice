-- ============================================================================
-- Backpackers Backoffice — Documents module bootstrap
-- ============================================================================
-- Run AFTER supabase/03_ops.sql, ONCE in Supabase SQL Editor.
-- Adds documents table + RLS + private Storage bucket.
-- Idempotent.
-- ============================================================================

-- ---------------------------------------------------------------------------
-- 1. Enum
-- ---------------------------------------------------------------------------

DO $$ BEGIN
  CREATE TYPE public.document_type AS ENUM ('procedure', 'contract', 'report', 'portfolio', 'other');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------------
-- 2. Table
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.documents (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  pillar_id     uuid NOT NULL,
  type          public.document_type NOT NULL DEFAULT 'other',
  title         text NOT NULL,
  description   text,
  storage_path  text NOT NULL,
  file_name     text NOT NULL,
  file_size     bigint,
  mime_type     text,
  uploaded_by   uuid,
  tags          text[] NOT NULL DEFAULT '{}'::text[],
  created_at    timestamp with time zone DEFAULT now() NOT NULL,
  updated_at    timestamp with time zone DEFAULT now() NOT NULL
);

DO $$ BEGIN
  ALTER TABLE public.documents ADD CONSTRAINT documents_pillar_id_fk
    FOREIGN KEY (pillar_id) REFERENCES public.pillars(id) ON DELETE RESTRICT;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  ALTER TABLE public.documents ADD CONSTRAINT documents_uploaded_by_fk
    FOREIGN KEY (uploaded_by) REFERENCES public.profiles(id) ON DELETE SET NULL;
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ---------------------------------------------------------------------------
-- 3. Indexes
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS documents_pillar_idx       ON public.documents USING btree (pillar_id);
CREATE INDEX IF NOT EXISTS documents_type_idx         ON public.documents USING btree (type);
CREATE INDEX IF NOT EXISTS documents_uploaded_by_idx  ON public.documents USING btree (uploaded_by);
CREATE INDEX IF NOT EXISTS documents_created_at_idx   ON public.documents USING btree (created_at DESC NULLS LAST);


-- ---------------------------------------------------------------------------
-- 4. updated_at trigger
-- ---------------------------------------------------------------------------

DROP TRIGGER IF EXISTS documents_set_updated_at ON public.documents;
CREATE TRIGGER documents_set_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


-- ---------------------------------------------------------------------------
-- 5. RLS (same pattern: admin_grupo full, admin_pilar own pilares, member read-only)
-- ---------------------------------------------------------------------------

ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS documents_all_admin_grupo ON public.documents;
CREATE POLICY documents_all_admin_grupo ON public.documents
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_grupo'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin_grupo'));

DROP POLICY IF EXISTS documents_all_admin_pilar ON public.documents;
CREATE POLICY documents_all_admin_pilar ON public.documents
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_pilar'
        AND documents.pillar_id = ANY (p.pillar_access))
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin_pilar'
        AND documents.pillar_id = ANY (p.pillar_access))
  );

DROP POLICY IF EXISTS documents_select_member ON public.documents;
CREATE POLICY documents_select_member ON public.documents
  FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'member'
        AND documents.pillar_id = ANY (p.pillar_access))
  );


-- ---------------------------------------------------------------------------
-- 6. Private Storage bucket for documents
--    App uses service_role to upload/delete (bypasses RLS); end-user access
--    happens via short-lived signed URLs generated server-side.
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;


-- ============================================================================
-- Done. Verify:
--   - Database -> Tables: documents
--   - Storage -> Buckets: documents (private)
-- ============================================================================
