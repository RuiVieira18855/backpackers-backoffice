-- ============================================================================
-- Backpackers Backoffice — Avatars bucket
-- ============================================================================
-- Run ONCE in Supabase SQL Editor. Creates public bucket for user avatars
-- with 1 MB file size limit and image mime restriction.
-- ============================================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'avatars',
  'avatars',
  true,
  1048576,
  ARRAY['image/png', 'image/jpeg', 'image/webp', 'image/gif']
)
ON CONFLICT (id) DO UPDATE
  SET public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
