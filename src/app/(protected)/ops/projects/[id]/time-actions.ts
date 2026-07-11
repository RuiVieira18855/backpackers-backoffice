"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { projects, timeEntries } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { logAudit } from "@/lib/audit";

export type LogHoursState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

const schema = z.object({
  projectId: z.uuid(),
  hours: z.string().regex(/^\d+(\.\d{1,2})?$/),
  date: z.string(),
  description: z.string().optional(),
});

export async function logHours(
  _prev: LogHoursState | undefined,
  formData: FormData,
): Promise<LogHoursState> {
  const profile = await requireProfile();

  const raw = {
    projectId: String(formData.get("projectId") ?? ""),
    hours: String(formData.get("hours") ?? "").trim(),
    date: String(formData.get("date") ?? ""),
    description: String(formData.get("description") ?? "").trim(),
  };

  if (!raw.hours) return { fieldErrors: { hours: "Horas obrigatórias." } };
  if (!raw.date) return { fieldErrors: { date: "Data obrigatória." } };

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = z.flattenError(parsed.error);
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Dados inválidos.",
    };
  }

  const hoursNum = Number(parsed.data.hours);
  if (!(hoursNum > 0 && hoursNum <= 24)) {
    return { fieldErrors: { hours: "Entre 0.01 e 24 horas." } };
  }

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, parsed.data.projectId),
    columns: { id: true, pillarId: true },
  });
  if (!project) return { error: "Projecto não encontrado." };

  const [created] = await db
    .insert(timeEntries)
    .values({
      projectId: parsed.data.projectId,
      pillarId: project.pillarId,
      userId: profile.id,
      hours: parsed.data.hours,
      description: parsed.data.description || null,
      date: parsed.data.date,
    })
    .returning();

  try {
    await logAudit({
      userId: profile.id,
      pillarId: project.pillarId,
      entityType: "time_entry",
      entityId: created.id,
      action: "create",
      diff: { snapshot: created },
    });
  } catch {
    /* audit best-effort */
  }

  revalidatePath(`/ops/projects/${parsed.data.projectId}`);
  return {};
}

export async function deleteTimeEntry(id: string): Promise<void> {
  const profile = await requireProfile();
  const before = await db.query.timeEntries.findFirst({
    where: eq(timeEntries.id, id),
  });
  if (!before) return;
  // Owner-only delete on the DB is enforced by RLS; app-side keep it
  // defensive too so admin_grupo can also delete.
  // RLS enforces owner-only (or admin_grupo+) at the DB level.
  await db.delete(timeEntries).where(eq(timeEntries.id, id));
  try {
    await logAudit({
      userId: profile.id,
      pillarId: before.pillarId,
      entityType: "time_entry",
      entityId: id,
      action: "delete",
      diff: { snapshot: before },
    });
  } catch {
    /* audit best-effort */
  }
  if (before.projectId) revalidatePath(`/ops/projects/${before.projectId}`);
}
