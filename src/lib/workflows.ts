import "server-only";
import { and, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks, workflows } from "@/lib/db/schema";
import { logAudit } from "@/lib/audit";
import { createNotification } from "@/lib/notifications";

// -----------------------------------------------------------------------------
// Vocabulary
// -----------------------------------------------------------------------------

export const TRIGGERS = [
  "contact.created",
  "contact.stage_changed",
  "deal.won",
  "task.completed",
] as const;
export type WorkflowTrigger = (typeof TRIGGERS)[number];

export const CONDITION_OPS = ["=", "!=", "contains", "in"] as const;
export type ConditionOp = (typeof CONDITION_OPS)[number];

export type Condition = {
  field: string;
  op: ConditionOp;
  value: string;
};

export type Action =
  | {
      type: "create_task";
      title: string;
      /** UUID of the assignee. If omitted, unassigned. */
      assigneeId?: string;
      /** Days from now for due_date. Empty = no due date. */
      dueOffsetDays?: number;
      description?: string;
      /** UUID of the pillar. Falls back to entity's pillar if unset. */
      pillarId?: string;
    }
  | {
      type: "send_notification";
      /** UUID of the recipient. */
      targetUserId: string;
      title: string;
      body?: string;
      /** In-app link, must start with "/". */
      link?: string;
    }
  | {
      type: "append_note";
      text: string;
    };

// -----------------------------------------------------------------------------
// Condition evaluator
// -----------------------------------------------------------------------------

type EntityLike = Record<string, unknown>;

function getFieldValue(entity: EntityLike, field: string): unknown {
  // Only allow shallow field access for now — no dots.
  return entity[field];
}

function evaluateCondition(cond: Condition, entity: EntityLike): boolean {
  const actual = getFieldValue(entity, cond.field);
  switch (cond.op) {
    case "=":
      return String(actual ?? "") === cond.value;
    case "!=":
      return String(actual ?? "") !== cond.value;
    case "contains":
      if (Array.isArray(actual)) {
        return actual.map(String).includes(cond.value);
      }
      return String(actual ?? "")
        .toLowerCase()
        .includes(cond.value.toLowerCase());
    case "in": {
      const options = cond.value.split(",").map((s) => s.trim());
      return options.includes(String(actual ?? ""));
    }
    default:
      return false;
  }
}

function evaluateConditions(
  conditions: Condition[],
  entity: EntityLike,
): boolean {
  if (!Array.isArray(conditions) || conditions.length === 0) return true;
  return conditions.every((c) => evaluateCondition(c, entity));
}

// -----------------------------------------------------------------------------
// Action executors
// -----------------------------------------------------------------------------

type ActorContext = {
  userId: string;
  entityType: string;
  entityId: string;
};

async function executeAction(
  action: Action,
  entity: EntityLike,
  actor: ActorContext,
  workflowId: string,
): Promise<{ ok: boolean; error?: string }> {
  try {
    switch (action.type) {
      case "create_task": {
        const pillarId =
          action.pillarId ??
          (typeof entity.pillarId === "string" ? entity.pillarId : null);
        if (!pillarId) {
          return { ok: false, error: "no pillar available for create_task" };
        }
        const dueDate =
          action.dueOffsetDays != null && action.dueOffsetDays >= 0
            ? new Date(
                Date.now() + action.dueOffsetDays * 24 * 60 * 60 * 1000,
              )
                .toISOString()
                .slice(0, 10)
            : null;
        const [created] = await db
          .insert(tasks)
          .values({
            pillarId,
            title: action.title,
            description: action.description ?? null,
            assigneeId: action.assigneeId ?? null,
            dueDate,
            status: "todo",
            priority: "normal",
          })
          .returning();
        await logAudit({
          userId: actor.userId,
          pillarId,
          entityType: "task",
          entityId: created.id,
          action: "create",
          diff: {
            fromWorkflow: workflowId,
            sourceEntityType: actor.entityType,
            sourceEntityId: actor.entityId,
          },
        });
        return { ok: true };
      }
      case "send_notification": {
        const link =
          action.link && action.link.startsWith("/") ? action.link : null;
        await createNotification({
          userId: action.targetUserId,
          kind: "system",
          title: action.title,
          body: action.body ?? null,
          link,
          actorId: actor.userId,
          pillarId:
            typeof entity.pillarId === "string" ? entity.pillarId : null,
        });
        return { ok: true };
      }
      case "append_note": {
        // No-op for MVP — append_note requires knowing which column and
        // reading the current value. Left as a placeholder for a
        // follow-up turn when we add write-back helpers per entity type.
        return {
          ok: false,
          error: "append_note not implemented in MVP; ignoring",
        };
      }
      default: {
        return { ok: false, error: `unknown action type` };
      }
    }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

// -----------------------------------------------------------------------------
// Public: runWorkflows(trigger, entity, actor)
// -----------------------------------------------------------------------------

/**
 * Fire all active workflows for a given trigger against the passed entity.
 * Called inline from server actions after a successful mutation; wrap in
 * try/catch so a workflow failure never blocks the primary action.
 *
 * `entity` should be a plain object containing the fields conditions can
 * reference (id, pillarId, stage, ...). Extra fields are harmless.
 *
 * `actor.userId` is the profile.id doing the mutation; used both to
 * short-circuit self-notifications and to write audit rows.
 */
export async function runWorkflows(
  trigger: WorkflowTrigger,
  entity: EntityLike,
  actor: ActorContext,
): Promise<void> {
  try {
    const rows = await db
      .select()
      .from(workflows)
      .where(
        and(eq(workflows.triggerType, trigger), eq(workflows.isActive, true)),
      );

    for (const wf of rows) {
      const conditions = (wf.conditions as Condition[] | null) ?? [];
      if (!evaluateConditions(conditions, entity)) continue;

      const actions = (wf.actions as Action[] | null) ?? [];
      for (const action of actions) {
        const result = await executeAction(action, entity, actor, wf.id);
        if (!result.ok) {
          console.warn(
            `[workflows] action failed (${wf.name}):`,
            result.error,
          );
        }
      }
    }
  } catch (err) {
    console.error(`[workflows] runWorkflows(${trigger}) failed:`, err);
  }
}
