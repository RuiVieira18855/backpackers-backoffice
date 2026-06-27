import "server-only";
import { db } from "./db";
import { auditLog } from "./db/schema";

type AuditAction = "create" | "update" | "delete";

type AuditParams = {
  userId: string;
  pillarId?: string | null;
  entityType: string;
  /** Null when the audited entity has no UUID (e.g. catalog rows keyed by text). */
  entityId?: string | null;
  action: AuditAction;
  /** Any serialisable snapshot. For updates use { before, after }. */
  diff?: unknown;
};

/**
 * Append an entry to the immutable audit_log table. Fire-and-forget from
 * server actions after a successful mutation. Failure to log should never
 * block the user — wrap in a try/catch at the caller if needed.
 */
export async function logAudit(params: AuditParams) {
  await db.insert(auditLog).values({
    userId: params.userId,
    pillarId: params.pillarId ?? null,
    entityType: params.entityType,
    entityId: params.entityId ?? null,
    action: params.action,
    // JSON.parse(JSON.stringify(...)) coerces Dates -> ISO strings so the
    // jsonb column stores plain JSON.
    diff: params.diff
      ? (JSON.parse(JSON.stringify(params.diff)) as Record<string, unknown>)
      : null,
  });
}
