"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { requireRole } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";
import type { TaskFormState } from "@/components/tasks/task-form";

const STATUSES = ["todo", "doing", "blocked", "done"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

const schema = z.object({
  title: z.string().min(1),
  pillarId: z.uuid(),
  status: z.enum(STATUSES),
  priority: z.enum(PRIORITIES),
  description: z.string().optional(),
  assigneeId: z.uuid().nullable(),
  projectId: z.uuid().nullable(),
  eventId: z.uuid().nullable(),
  dueDate: z.string().nullable(),
});

export async function createTask(
  _prev: TaskFormState | undefined,
  formData: FormData,
): Promise<TaskFormState> {
  const profile = await requireRole("admin_grupo", "admin_pilar");
  const tErrors = await getTranslations("ops.tasks.form.errors");

  const raw = {
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
    const flat = z.flattenError(parsed.error);
    const first = Object.entries(flat.fieldErrors)[0];
    return {
      error: first ? `${first[0]}: ${first[1]?.[0] ?? ""}` : "Invalid data",
    };
  }

  const completedAt =
    parsed.data.status === "done" ? new Date() : null;

  const [created] = await db
    .insert(tasks)
    .values({
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
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: created.pillarId,
    entityType: "task",
    entityId: created.id,
    action: "create",
    diff: { snapshot: created },
  });

  // Notify the assignee (no-op if they're the actor or no one assigned).
  if (created.assigneeId) {
    try {
      await createNotification({
        userId: created.assigneeId,
        actorId: profile.id,
        pillarId: created.pillarId,
        kind: "task_assigned",
        title: `Tarefa atribuída: ${created.title}`,
        body: created.description ?? null,
        link: `/ops/tasks/${created.id}`,
      });
    } catch (err) {
      console.error("[notifications] task_assigned create failed:", err);
    }
  }

  redirect(`/ops/tasks/${created.id}`);
}
