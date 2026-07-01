/**
 * Backpackers Access SDK — v1
 * =============================================================================
 * Drop this file into any Backpackers app (Cairn Pro, next SaaS, etc.) and use
 * the three helpers below to integrate with the shared entitlement system.
 *
 * Requires a Supabase browser client from the same Supabase project as the
 * backoffice — the apps table, app_access table, and has_app_access() RPC
 * live there.
 *
 * Nothing here talks to the backoffice HTTP API — everything is through
 * Supabase auth/DB with RLS enforcing the boundaries.
 *
 * Copy this file into your app's src/lib/ and import from it. No runtime
 * dependencies beyond @supabase/supabase-js.
 * =============================================================================
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// -----------------------------------------------------------------------------
// Types
// -----------------------------------------------------------------------------

export type AccessStatus = "trial" | "active" | "expired" | "revoked";

export type Entitlement = {
  status: AccessStatus;
  plan: string | null;
  expiresAt: Date | null;
  /** True when has_app_access() would return true (short-circuits super_users). */
  active: boolean;
};

export type SignupParams = {
  email: string;
  password: string;
  fullName?: string;
  /** Key of the app in the Backpackers catalog (e.g. "cairn"). */
  appKey: string;
  /** Optional metadata forwarded to Supabase raw_user_meta_data. */
  extra?: Record<string, unknown>;
};

// -----------------------------------------------------------------------------
// 1. Sign up a customer
// -----------------------------------------------------------------------------
//
// Signs up an external user (customer) with the right metadata so the backoffice
// trigger creates their profile as kind='customer' and seeds a trial app_access
// row for the given appKey. See supabase/16_signup_kind.sql on the backoffice.
//
// Returns whatever supabase.auth.signUp returns — you can inspect
// data.user / data.session / error yourself.

export async function signupCustomer(
  supabase: SupabaseClient,
  params: SignupParams,
) {
  return supabase.auth.signUp({
    email: params.email,
    password: params.password,
    options: {
      data: {
        full_name: params.fullName ?? undefined,
        kind: "customer",
        app_key: params.appKey,
        ...(params.extra ?? {}),
      },
    },
  });
}

// -----------------------------------------------------------------------------
// 2. Check whether the current session has access
// -----------------------------------------------------------------------------
//
// Cheap boolean check via the has_app_access(uid, app_key) RPC. Super_users
// pass automatically. Call this after login / on route guards.
//
// Returns false on any error (network, unauth, DB) so the app fails closed.

export async function hasAccess(
  supabase: SupabaseClient,
  appKey: string,
): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return false;
  const { data, error } = await supabase.rpc("has_app_access", {
    uid: user.id,
    app_key: appKey,
  });
  if (error) {
    console.error("[backpackers-access] has_app_access failed:", error);
    return false;
  }
  return Boolean(data);
}

// -----------------------------------------------------------------------------
// 3. Read the full entitlement (status, plan, expiry)
// -----------------------------------------------------------------------------
//
// Useful for showing plan info in a settings screen, or gating specific
// features by plan. RLS lets the user read their own row.
//
// Returns null when no row exists (no access at all). Super users have no
// row and return null here — combine with hasAccess() if you also need to
// treat them as active.

export async function getEntitlement(
  supabase: SupabaseClient,
  appKey: string,
): Promise<Entitlement | null> {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from("app_access")
    .select("status, plan, expires_at")
    .eq("user_id", user.id)
    .eq("app", appKey)
    .maybeSingle();

  if (error) {
    console.error("[backpackers-access] getEntitlement failed:", error);
    return null;
  }
  if (!data) return null;

  const expiresAt = data.expires_at ? new Date(data.expires_at) : null;
  const notExpired = !expiresAt || expiresAt > new Date();
  const activeStatus = data.status === "trial" || data.status === "active";

  return {
    status: data.status as AccessStatus,
    plan: data.plan,
    expiresAt,
    active: activeStatus && notExpired,
  };
}

// -----------------------------------------------------------------------------
// Optional: guardLogin
// -----------------------------------------------------------------------------
//
// Call after a successful signIn. If the user doesn't have access, sign them
// out and return false so the caller can show a "no access" screen. Prevents
// half-authenticated sessions from lingering.

export async function guardLogin(
  supabase: SupabaseClient,
  appKey: string,
): Promise<boolean> {
  const ok = await hasAccess(supabase, appKey);
  if (!ok) {
    await supabase.auth.signOut();
  }
  return ok;
}
