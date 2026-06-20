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

const ROLES = ["admin_grupo", "admin_pilar", "member"] as const;

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
  const actor = await requireRole("admin_grupo");

  // pillarAccess comes through as multiple form entries (checkbox name="pillarAccess")
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

  // Safety: prevent removing the last admin_grupo (lockout protection)
  if (parsed.data.role !== "admin_grupo") {
    const currentAdmins = await db.query.profiles.findMany({
      where: eq(profiles.role, "admin_grupo"),
    });
    if (
      currentAdmins.length === 1 &&
      currentAdmins[0].id === parsed.data.id
    ) {
      return {
        error:
          "Não podes remover o papel de admin_grupo ao último admin do grupo.",
      };
    }
  }

  const before = await db.query.profiles.findFirst({
    where: eq(profiles.id, parsed.data.id),
  });
  if (!before) {
    return { error: "Utilizador não encontrado." };
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
