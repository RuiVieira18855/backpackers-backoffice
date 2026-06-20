import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Admin client using the service_role key.
 *
 * - Bypasses RLS (use ONLY in server contexts after verifying role/permission)
 * - NEVER import this from a Client Component or expose to the browser
 * - Used for Storage uploads, signed URLs, admin user mutations
 */
export const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  },
);

export const DOCUMENTS_BUCKET = "documents";
