-- ============================================================================
-- Outpost — Site events images bucket
-- ============================================================================
-- Correr UMA VEZ no Supabase SQL Editor. Bucket público para capas e galerias
-- das caminhadas, carregadas a partir de Outpost pelo cliente service-role
-- (supabaseAdmin) e servidas publicamente ao site. Limite 5 MB, só imagens.
-- Idempotente.
--
-- Bucket separado do 'blog' de propósito: um evento tem galeria (várias
-- imagens por linha) e convém poder limpá-lo sem tocar nas capas do blog.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'events',
  'events',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
