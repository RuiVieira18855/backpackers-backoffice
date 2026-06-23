"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireRole, SKILLS, type Skill } from "@/lib/dal";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { logAudit } from "@/lib/audit";

const ROLES = ["super_user", "admin_grupo", "admin_pilar", "member"] as const;
type RoleValue = (typeof ROLES)[number];

export type InviteUserState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

export async function inviteUser(
  _prev: InviteUserState | undefined,
  formData: FormData,
): Promise<InviteUserState> {
  // Only super_user OR admin_grupo can create users
  const actor = await requireRole("admin_grupo");
  const t = await getTranslations("admin.invite.errors");

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("fullName") ?? "").trim();
  const role = String(formData.get("role") ?? "member") as RoleValue;
  const skillsRaw = formData.getAll("skills") as string[];
  const pillarAccessRaw = formData.getAll("pillarAccess") as string[];
  const defaultPillarId = String(formData.get("defaultPillarId") ?? "") || null;
  const sendInvite = formData.get("sendInvite") === "on";

  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return { fieldErrors: { email: t("emailInvalid") } };
  }

  // Only super_user can grant super_user role
  if (role === "super_user" && actor.role !== "super_user") {
    return { error: t("cannotGrantSuperUser") };
  }

  if (!(ROLES as readonly string[]).includes(role)) {
    return { fieldErrors: { role: t("roleInvalid") } };
  }

  const skills: Skill[] = skillsRaw.filter((s): s is Skill =>
    (SKILLS as string[]).includes(s),
  );

  // Either invite via magic link (recommended — Supabase sends email)
  // or create with email_confirm and let the trigger handle profile creation.
  const adminAuth = supabaseAdmin.auth.admin;

  let userId: string | null = null;
  let inviteError: string | null = null;

  if (sendInvite) {
    const { data, error } = await adminAuth.inviteUserByEmail(email, {
      data: { full_name: fullName || undefined },
    });
    if (error) inviteError = error.message;
    userId = data?.user?.id ?? null;
  } else {
    // Create without invite — useful for seeding accounts where you'll set the password via password-reset flow yourself.
    const { data, error } = await adminAuth.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName || undefined },
    });
    if (error) inviteError = error.message;
    userId = data?.user?.id ?? null;
  }

  if (inviteError || !userId) {
    return { error: inviteError ?? t("inviteFailed") };
  }

  // The handle_new_user trigger created the profile row. Now update with the chosen role/skills/pillars.
  const [updated] = await db
    .update(profiles)
    .set({
      fullName: fullName || null,
      role,
      skills,
      pillarAccess: pillarAccessRaw,
      defaultPillarId,
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, userId))
    .returning();

  if (updated) {
    await logAudit({
      userId: actor.id,
      pillarId: defaultPillarId,
      entityType: "profile",
      entityId: updated.id,
      action: "create",
      diff: {
        invited: true,
        email,
        role,
        skills,
        pillarAccess: pillarAccessRaw,
      },
    });
  }

  redirect(`/admin/users/${userId}`);
}
