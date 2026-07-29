import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { eq, inArray, sql, type SQL } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
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

  // Note: do NOT use Drizzle's relational query (`with: { defaultPillar }`)
  // here — there's a bug in 0.45 where the LATERAL JOIN it generates fails
  // on Supabase pooler. Fetch defaultPillar separately if/when needed.
  //
  // Select columns explicitly. If the migration hasn't run yet, `skills`
  // may not exist on the DB — fall back to a profile with empty skills so
  // the app still renders instead of crashing.
  try {
    const result = await db.query.profiles.findFirst({
      where: eq(profiles.id, user.id),
    });
    return result ?? null;
  } catch {
    const rows = await db
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        avatarUrl: profiles.avatarUrl,
        role: profiles.role,
        pillarAccess: profiles.pillarAccess,
        defaultPillarId: profiles.defaultPillarId,
        createdAt: profiles.createdAt,
        updatedAt: profiles.updatedAt,
      })
      .from(profiles)
      .where(eq(profiles.id, user.id))
      .limit(1);
    if (rows.length === 0) return null;
    return { ...rows[0], skills: [] as string[] };
  }
});

export const requireProfile = cache(async () => {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  // Hard rule: external customers (Cairn Pro clients, etc.) never enter the
  // backoffice — they get bounced to /no-access which explains what to use
  // instead. Backoffice access is for the Backpackers team only.
  if ("kind" in profile && profile.kind === "customer") {
    redirect("/no-access");
  }
  // Disabled profiles: keep the row for audit + ownership, but block access.
  if ("disabledAt" in profile && profile.disabledAt) {
    redirect("/no-access");
  }
  return profile;
});

export type Role = "super_user" | "admin_grupo" | "admin_pilar" | "member";
export type Skill = "crm" | "ops" | "docs" | "finance" | "admin";
export const SKILLS: Skill[] = ["crm", "ops", "docs", "finance", "admin"];

/**
 * Redirects to /dashboard if the user does not have any of the required
 * roles. super_user implicitly satisfies any role check.
 */
export async function requireRole(...roles: Role[]) {
  const profile = await requireProfile();
  if (profile.role === "super_user") return profile;
  if (!roles.includes(profile.role)) {
    redirect("/dashboard");
  }
  return profile;
}

/**
 * Redirects to /dashboard if the user does not have the required skill.
 * super_user implicitly has every skill.
 */
export async function requireSkill(skill: Skill) {
  const profile = await requireProfile();
  if (profile.role === "super_user") return profile;
  const skills = (profile.skills ?? []) as string[];
  if (!skills.includes(skill)) {
    redirect("/dashboard");
  }
  return profile;
}

/**
 * Row-level pillar restriction for the app layer. The Outpost reads through a
 * superuser Drizzle connection that BYPASSES RLS, so pillar isolation has to be
 * enforced here. Returns `undefined` (no restriction) for super_user /
 * admin_grupo — they see every pillar; otherwise a condition limiting rows to
 * the profile's pillar_access (empty access → no rows). Pass the table's
 * pillar_id column, e.g. `pillarScope(profile, contacts.pillarId)`.
 */
export function pillarScope(
  profile: { role: string; pillarAccess?: string[] | null },
  pillarCol: AnyPgColumn,
): SQL | undefined {
  if (profile.role === "super_user" || profile.role === "admin_grupo") {
    return undefined;
  }
  const ids = profile.pillarAccess ?? [];
  if (ids.length === 0) return sql`false`;
  return inArray(pillarCol, ids);
}

/**
 * True if the profile may access a specific record's pillar. super_user /
 * admin_grupo see every pillar; others only their pillar_access. A record with
 * no pillar is treated as accessible. Use on detail ([id]) pages after loading
 * a record: `if (!canAccessPillar(profile, record.pillarId)) notFound();`.
 */
export function canAccessPillar(
  profile: { role: string; pillarAccess?: string[] | null },
  pillarId: string | null | undefined,
): boolean {
  if (profile.role === "super_user" || profile.role === "admin_grupo") {
    return true;
  }
  if (!pillarId) return true;
  return (profile.pillarAccess ?? []).includes(pillarId);
}

/** Returns true if current user has the skill (or is super_user). */
export async function hasSkill(skill: Skill): Promise<boolean> {
  const profile = await getCurrentProfile();
  if (!profile) return false;
  if (profile.role === "super_user") return true;
  const skills = (profile.skills ?? []) as string[];
  return skills.includes(skill);
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
      skills: true,
      pillarAccess: true,
      defaultPillarId: true,
      disabledAt: true,
    },
  });
});
