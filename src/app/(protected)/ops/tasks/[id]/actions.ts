"use server";

import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { requireProfile, requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import type { TaskFormState } from "@/components/tasks/task-form";

const STATUSES = ["todo", "doing", "blocked", "done"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const schema = z.object({
  id: z.string().uuid(),
  title: z.string().min(1),
  pillarId: z.string().uuid(),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  description: z.string().optional(),
  assigneeId: z.string().uuid().nullable(),
  projectId: z.string().uuid().nullable(),
  eventId: z.string().uuid().nullable(),
  dueDate: z.string().nullable(),
});

export async function updateTask(
  _prev: TaskFormState | undefined,
  formData: FormData,
): Promise<TaskFormState> {
  // Tasks are special: members can also update tasks where they are the
  // assignee (RLS enforces this in the DB). App-side gate is just "authenticated".
  const profile = await requireProfile();
  const tErrors = await getTranslations("ops.tasks.form.errors");

  const raw = {
    id: String(formData.get("id") ?? ""),
    title: String(formData.get("title") ?? "").trim(),
    pillarId: String(formData.get("pillarId") ?? ""),
    status: formData.get("status") as string,
    priority: formData.get("priority") as string,
    description: String(formData.get("description") ?? "").trim(),
    assigneeId: String(formData.get("assigneeId") ?? "") || null,
    projectId: String(formData.get("projectId") ?? "") || null,
    eventId: String(formData.get("eventId") ?? "") || null,
    dueDate: String(formData.get("dueDate") ?? "") || null,
  };

  if (!raw.title) {
    return { fieldErrors: { title: tErrors("titleRequired") } };
  }
  if (!raw.pillarId) {
    return { fieldErrors: { pillarId: tErrors("pillarRequired") } };
  }

  const parsed = schema.safeParse(raw);
  if (!parsed.success) {
    const flat = parsed.error.flatten();
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Invalid data",
    };
  }

  const before = await db.query.tasks.findFirst({
    where: eq(tasks.id, parsed.data.id),
  });
  if (!before) {
    return { error: "Tarefa não encontrada." };
  }

  // Auto-stamp completed_at when transitioning to/from 'done'
  let completedAt = before.completedAt;
  if (parsed.data.status === "done" && before.status !== "done") {
    completedAt = new Date();
  } else if (parsed.data.status !== "done" && before.status === "done") {
    completedAt = null;
  }

  const [updated] = await db
    .update(tasks)
    .set({
      title: parsed.data.title,
      pillarId: parsed.data.pillarId,
      status: parsed.data.status,
      priority: parsed.data.priority,
      description: parsed.data.description || null,
      assigneeId: parsed.data.assigneeId,
      projectId: parsed.data.projectId,
      eventId: parsed.data.eventId,
      dueDate: parsed.data.dueDate,
      completedAt,
    })
    .where(eq(tasks.id, parsed.data.id))
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: updated.pillarId,
    entityType: "task",
    entityId: updated.id,
    action: "update",
    diff: { before, after: updated },
  });

  // Notify on assignee CHANGE — only when the new assignee differs from the
  // previous one (and isn't the actor performing the update).
  if (updated.assigneeId && updated.assigneeId !== before.assigneeId) {
    try {
      await createNotification({
        userId: updated.assigneeId,
        actorId: profile.id,
        pillarId: updated.pillarId,
        kind: "task_assigned",
        title: `Tarefa atribuída: ${updated.title}`,
        body: updated.description ?? null,
        link: `/ops/tasks/${updated.id}`,
      });
    } catch (err) {
      console.error("[notifications] task_assigned (update) failed:", err);
    }
  }

  redirect(`/ops/tasks/${updated.id}`);
}

export async function deleteTask(id: string): Promise<void> {
  const profile = await requireRole("admin_grupo", "admin_pilar");

  const before = await db.query.tasks.findFirst({
    where: eq(tasks.id, id),
  });
  if (!before) {
    redirect("/ops/tasks");
  }

  await db.delete(tasks).where(eq(tasks.id, id));

  await logAudit({
    userId: profile.id,
    pillarId: before.pillarId,
    entityType: "task",
    entityId: id,
    action: "delete",
    diff: { snapshot: before },
  });

  redirect("/ops/tasks");
}
