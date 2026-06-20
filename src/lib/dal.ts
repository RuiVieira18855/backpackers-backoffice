import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { createSupabaseServerClient } from "./supabase/server";
import { db } from "./db";
import { profiles } from "./db/schema";

/**
 * Data Access Layer
 *
 * Centralised auth + data fetching. All functions are wrapped in React's
 * cache() so repeated calls within a single request hit the cache rather
 * than the DB / network.
 *
 * Pattern follows Next.js 16 guidance:
 * - proxy.ts does the OPTIMISTIC redirect for unauthenticated users
 * - These DAL functions are the REAL authorization boundary, called from
 *   Server Components / Server Actions / Route Handlers
 */

export const getAuthUser = cache(async () => {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const requireAuthUser = cache(async () => {
  const user = await getAuthUser();
  if (!user) redirect("/login");
  return user;
});

export const getCurrentProfile = cache(async () => {
  const user = await getAuthUser();
  if (!user) return null;

  const result = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
    with: { defaultPillar: true },
  });
  return result ?? null;
});

export const requireProfile = cache(async () => {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
});

export type Role = "admin_grupo" | "admin_pilar" | "member";

/**
 * Redirects to /dashboard if the user does not have any of the required
 * roles. Use in pages/actions that must be restricted.
 */
export async function requireRole(...roles: Role[]) {
  const profile = await requireProfile();
  if (!roles.includes(profile.role)) {
    redirect("/dashboard");
  }
  return profile;
}

export const getAllPillars = cache(async () => {
  return await db.query.pillars.findMany({
    orderBy: (pillars, { asc }) => [asc(pillars.name)],
  });
});

export const getAllProfiles = cache(async () => {
  return await db.query.profiles.findMany({
    orderBy: (p, { asc }) => [asc(p.fullName), asc(p.email)],
    columns: {
      id: true,
      email: true,
      fullName: true,
      role: true,
    },
  });
});
