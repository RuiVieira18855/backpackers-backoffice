"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { logAudit } from "@/lib/audit";
import { runWorkflows } from "@/lib/workflows";
import { dispatchWebhook } from "@/lib/webhooks";

const STATUSES = ["todo", "doing", "blocked", "done"] as const;
type Status = (typeof STATUSES)[number];

function isStatus(value: string): value is Status {
  return (STATUSES as readonly string[]).includes(value);
}

/**
 * Move a task between statuses via the kanban board.
 * RLS lets members update tasks assigned to them; broader access is
 * enforced by DB policies. App-side we only validate the value + audit.
 */
export async function moveTaskToStatus(
  taskId: string,
  newStatus: string,
): Promise<{ ok: boolean; error?: string }> {
  const profile = await requireProfile();
  if (!isStatus(newStatus)) return { ok: false, error: "Invalid status" };

  const before = await db.query.tasks.findFirst({
    where: eq(tasks.id, taskId),
  });
  if (!before) return { ok: false, error: "Task not found" };
  if (before.status === newStatus) return { ok: true };

  // Auto-stamp completed_at like the regular update path does.
  let completedAt = before.completedAt;
  if (newStatus === "done" && before.status !== "done") {
    completedAt = new Date();
  } else if (newStatus !== "done" && before.status === "done") {
    completedAt = null;
  }

  const [updated] = await db
    .update(tasks)
    .set({ status: newStatus, completedAt, updatedAt: new Date() })
    .where(eq(tasks.id, taskId))
    .returning();

  await logAudit({
    userId: profile.id,
    pillarId: updated.pillarId,
    entityType: "task",
    entityId: updated.id,
    action: "update",
    diff: {
      before: { status: before.status },
      after: { status: updated.status },
    },
  });

  if (newStatus === "done" && before.status !== "done") {
    await runWorkflows("task.completed", updated, {
      userId: profile.id,
      entityType: "task",
      entityId: updated.id,
    });
    await dispatchWebhook("task.completed", {
      id: updated.id,
      title: updated.title,
      assigneeId: updated.assigneeId,
      projectId: updated.projectId,
      pillarId: updated.pillarId,
    });
  }

  revalidatePath("/ops/tasks/kanban");
  revalidatePath("/ops/tasks");
  return { ok: true };
}
