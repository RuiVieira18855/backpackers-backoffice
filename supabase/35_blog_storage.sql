-- ============================================================================
-- Outpost — Blog images bucket
-- ============================================================================
-- Run ONCE in Supabase SQL Editor. Public bucket for blog cover images and
-- in-post images, uploaded from Outpost via the service-role client
-- (supabaseAdmin), served publicly to the marketing site. 5 MB limit, images
-- only. Idempotent.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'blog',
  'blog',
  true,
  5242880,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'image/avif']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
