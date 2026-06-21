"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { profiles } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

export type AdminUserState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const ROLES = ["super_user", "admin_grupo", "admin_pilar", "member"] as const;

const schema = z.object({
  id: z.string().uuid(),
  role: z.enum(ROLES),
  pillarAccess: z.array(z.string().uuid()),
  defaultPillarId: z.string().uuid().nullable(),
});

export async function adminUpdateUser(
  _prev: AdminUserState | undefined,
  formData: FormData,
): Promise<AdminUserState> {
  // admin_grupo OR super_user can edit users (requireRole accepts super_user implicitly)
  const actor = await requireRole("admin_grupo");

  const pillarAccess = formData.getAll("pillarAccess").map(String);
  const defaultRaw = String(formData.get("defaultPillarId") ?? "");

  const raw = {
    id: String(formData.get("id") ?? ""),
    role: formData.get("role") as string,
    pillarAccess,
    defaultPillarId: defaultRaw || null,
  };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
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

  // ----- Privilege rules -----
  const isActorSuper = actor.role === "super_user";
  const isTargetSuper = before.role === "super_user";
  const isPromotingToSuper = parsed.data.role === "super_user";

  // Only super_user can promote OR demote a super_user.
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

  // Lockout: cannot demote the LAST super_user.
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

  // Lockout: cannot demote the LAST admin_grupo (kept for backward safety).
  if (before.role === "admin_grupo" && parsed.data.role !== "admin_grupo") {
    const admins = await db.query.profiles.findMany({
      where: eq(profiles.role, "admin_grupo"),
    });
    const supers = await db.query.profiles.findMany({
      where: eq(profiles.role, "super_user"),
    });
    if (admins.length <= 1 && supers.length === 0) {
      return {
        error:
          "Não podes remover o papel de admin_grupo ao último admin sem nenhum super-utilizador no sistema.",
      };
    }
  }

  const [updated] = await db
    .update(profiles)
    .set({
      role: parsed.data.role,
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
        pillarAccess: before.pillarAccess,
        defaultPillarId: before.defaultPillarId,
      },
      after: {
        role: updated.role,
        pillarAccess: updated.pillarAccess,
        defaultPillarId: updated.defaultPillarId,
      },
    },
  });

  redirect(`/admin/users/${updated.id}`);
}
