"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireSkill, SKILLS } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

export type AdminUserState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const ROLES = ["super_user", "admin_grupo", "admin_pilar", "member"] as const;
const SKILL_VALUES = SKILLS;

const schema = z.object({
  id: z.uuid(),
  role: z.enum(ROLES),
  skills: z.array(z.enum(SKILL_VALUES as never)),
  pillarAccess: z.array(z.uuid()),
  defaultPillarId: z.uuid().nullable(),
});

export async function adminUpdateUser(
  _prev: AdminUserState | undefined,
  formData: FormData,
): Promise<AdminUserState> {
  // admin skill (super_user passes implicitly)
  const actor = await requireSkill("admin");

  const pillarAccess = formData.getAll("pillarAccess").map(String);
  const skills = formData
    .getAll("skills")
    .map(String)
    .filter((s) => (SKILL_VALUES as readonly string[]).includes(s));
  const defaultRaw = String(formData.get("defaultPillarId") ?? "");

  const raw = {
    id: String(formData.get("id") ?? ""),
    role: formData.get("role") as string,
    skills,
    pillarAccess,
    defaultPillarId: defaultRaw || null,
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Invalid data",
    };
  }

  const before = await db.query.profiles.findFirst({
    where: eq(profiles.id, parsed.data.id),
  });
  if (!before) {
    return { error: "Utilizador não encontrado." };
  }

  const isActorSuper = actor.role === "super_user";
  const isTargetSuper = before.role === "super_user";
  const isPromotingToSuper = parsed.data.role === "super_user";

  // Only super_user can promote OR demote a super_user
  if (isPromotingToSuper && !isActorSuper) {
    return {
      error: "Só um super-utilizador pode promover outros a super-utilizador.",
    };
  }
  if (isTargetSuper && !isActorSuper) {
    return {
      error:
        "Não podes editar um super-utilizador. Só outro super-utilizador o pode fazer.",
    };
  }

  // Lockout: cannot demote the LAST super_user
  if (isTargetSuper && !isPromotingToSuper) {
    const supers = await db.query.profiles.findMany({
      where: eq(profiles.role, "super_user"),
    });
    if (supers.length <= 1) {
      return {
        error:
          "Não podes despromover o último super-utilizador. Promove primeiro outro user a super-utilizador.",
      };
    }
  }

  const [updated] = await db
    .update(profiles)
    .set({
      role: parsed.data.role,
      skills: parsed.data.skills as string[],
      pillarAccess: parsed.data.pillarAccess,
      defaultPillarId: parsed.data.defaultPillarId,
    })
    .where(eq(profiles.id, parsed.data.id))
    .returning();

  await logAudit({
    userId: actor.id,
    pillarId: null,
    entityType: "profile",
    entityId: updated.id,
    action: "update",
    diff: {
      before: {
        role: before.role,
        skills: before.skills,
        pillarAccess: before.pillarAccess,
        defaultPillarId: before.defaultPillarId,
      },
      after: {
        role: updated.role,
        skills: updated.skills,
        pillarAccess: updated.pillarAccess,
        defaultPillarId: updated.defaultPillarId,
      },
    },
  });

  redirect(`/admin/users/${updated.id}`);
}
