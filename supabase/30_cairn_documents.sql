-- ============================================================================
-- Outpost — cairn_documents (Cairn Pro cloud save + share by link)
-- ============================================================================
-- Cairn Pro stores diagrams in the user's account (jsonb) and can expose one
-- read-only via a random share_id. Customer-owned data: the Outpost does not
-- manage it, but it lives in the shared database.
--
-- Fully idempotent AND safe on a table created by the original cloud-docs
-- migration that lacked the share columns: the columns are added via ALTER,
-- not relied on from the CREATE (which is a no-op when the table exists).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.cairn_documents (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title      text,
  doc        jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Share-by-link columns (added separately so this works whether the table was
-- created just now or already existed without them).
ALTER TABLE public.cairn_documents
  ADD COLUMN IF NOT EXISTS share_id  text,
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS cairn_documents_user_idx
  ON public.cairn_documents (user_id, updated_at DESC);
-- Unique index enforces uniqueness for non-null share_id (multiple NULLs allowed)
-- and serves the share lookup.
CREATE UNIQUE INDEX IF NOT EXISTS cairn_documents_share_uidx
  ON public.cairn_documents (share_id);

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
