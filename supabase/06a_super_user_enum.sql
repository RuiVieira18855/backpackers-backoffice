-- ============================================================================
-- Backpackers Backoffice — Super User (Step 1 of 2): add enum value
-- ============================================================================
-- Run this FIRST. Adds 'super_user' to the user_role enum.
-- Then run 06b_super_user_finalize.sql in a SEPARATE SQL Editor execution.
--
-- WHY SPLIT: Postgres safety rule (error 55P04) — a new enum value cannot
-- be referenced in the same transaction in which it was created. Supabase
-- SQL Editor wraps the whole script in a transaction, so the ADD VALUE
-- must commit before subsequent statements can use 'super_user'.
-- Idempotent.
-- ============================================================================

DO $$ BEGIN
  ALTER TYPE public.user_role ADD VALUE 'super_user' BEFORE 'admin_grupo';
EXCEPTION
  WHEN duplicate_object THEN NULL;
  WHEN invalid_parameter_value THEN NULL;
END $$;

-- ✅ Success: now run 06b_super_user_finalize.sql in a new query.
