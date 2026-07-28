-- ============================================================================
-- Outpost — cairn_documents (Cairn Pro cloud save + share by link)
-- ============================================================================
-- Cairn Pro stores diagrams in the user's account (jsonb) and can expose one
-- read-only via a random share_id. Customer-owned data: the Outpost does not
-- manage it, but it lives in the shared database.
-- Idempotent.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cairn_documents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text,
  doc        jsonb NOT NULL,
  share_id   text UNIQUE,
  is_public  boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS cairn_documents_user_idx
  ON public.cairn_documents (user_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS cairn_documents_share_idx
  ON public.cairn_documents (share_id) WHERE share_id IS NOT NULL;

ALTER TABLE public.cairn_documents ENABLE ROW LEVEL SECURITY;

-- Each user only sees / edits / deletes their own diagrams.
DROP POLICY IF EXISTS cairn_documents_own ON public.cairn_documents;
CREATE POLICY cairn_documents_own ON public.cairn_documents
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- Anonymous read ONLY of shared diagrams (is_public = true).
DROP POLICY IF EXISTS cairn_documents_public_read ON public.cairn_documents;
CREATE POLICY cairn_documents_public_read ON public.cairn_documents
  FOR SELECT TO anon
  USING (is_public = true);

-- ============================================================================
-- Verify:
--   SELECT count(*) FILTER (WHERE is_public) AS shared, count(*) AS total
--   FROM public.cairn_documents;
-- ============================================================================
