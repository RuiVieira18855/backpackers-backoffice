import { NextResponse, type NextRequest } from "next/server";
import { and, eq, gte, isNotNull, lt, ne, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  events,
  oauthConnections,
  tasks,
  transactions,
} from "@/lib/db/schema";
import { pullExternalEvents } from "@/lib/oauth/sync";
import { runWorkflows } from "@/lib/workflows";

/**
 * Hourly maintenance cron.
 *
 * Runs two jobs, best-effort in sequence:
 *   1. Pull external calendar events for every user with a default_pillar set.
 *   2. Fire scheduled workflow triggers:
 *      - task.due_soon:      tasks with due_date == today or tomorrow, status != done
 *      - transaction.overdue: transactions with due_date < today, status == pending
 *
 * Called by Vercel Cron (configured in vercel.json). Also invokable manually
 * with the CRON_SECRET header for debugging.
 *
 * Auth: Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Any other
 * request without that header is rejected with 401.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isAuthorized(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false; // fail closed when not configured
  const header = req.headers.get("authorization");
  return header === `Bearer ${secret}`;
}

export async function GET(req: NextRequest) {
  if (!isAuthorized(req)) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const report = {
    startedAt: new Date().toISOString(),
    calendar: {
      connections: 0,
      pulled: [] as Array<{ userId: string; provider: string; inserted: number; updated: number; skipped: number; error?: string }>,
    },
    dueSoon: 0,
    overdue: 0,
    errors: [] as string[],
  };

  // ---------------------------- Calendar pull ----------------------------

  try {
    const conns = await db
      .select({
        userId: oauthConnections.userId,
        provider: oauthConnections.provider,
        defaultPillarId: oauthConnections.defaultPillarId,
      })
      .from(oauthConnections)
      .where(isNotNull(oauthConnections.defaultPillarId));
    report.calendar.connections = conns.length;
    for (const c of conns) {
      const res = await pullExternalEvents(c.userId, c.provider);
      report.calendar.pulled.push({
        userId: c.userId,
        provider: c.provider,
        inserted: res.inserted,
        updated: res.updated,
        skipped: res.skipped,
        error: res.error,
      });
    }
  } catch (err) {
    report.errors.push(
      "calendar_pull: " + (err instanceof Error ? err.message : String(err)),
    );
  }

  // ---------------------------- task.due_soon ----------------------------

  try {
    const today = new Date().toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86_400_000)
      .toISOString()
      .slice(0, 10);

    const dueRows = await db
      .select()
      .from(tasks)
      .where(
        and(
          ne(tasks.status, "done"),
          // due_date in {today, tomorrow}
          sql`${tasks.dueDate} IN (${today}, ${tomorrow})`,
        ),
      )
      .limit(500);

    for (const t of dueRows) {
      await runWorkflows("task.due_soon", t, {
        // System actor — no user id available; use the assignee if present,
        // otherwise a nil UUID so audit_log still accepts it.
        userId: t.assigneeId ?? "00000000-0000-0000-0000-000000000000",
        entityType: "task",
        entityId: t.id,
      });
    }
    report.dueSoon = dueRows.length;
  } catch (err) {
    report.errors.push(
      "task.due_soon: " + (err instanceof Error ? err.message : String(err)),
    );
  }

  // -------------------------- transaction.overdue -------------------------

  try {
    const today = new Date().toISOString().slice(0, 10);
    const overdueRows = await db
      .select()
      .from(transactions)
      .where(
        and(
          eq(transactions.status, "pending"),
          isNotNull(transactions.dueDate),
          lt(transactions.dueDate, today),
          gte(transactions.date, "1970-01-01"),
        ),
      )
      .limit(500);

    for (const tx of overdueRows) {
      await runWorkflows("transaction.overdue", tx, {
        userId: tx.createdBy ?? "00000000-0000-0000-0000-000000000000",
        entityType: "transaction",
        entityId: tx.id,
      });
    }
    report.overdue = overdueRows.length;
  } catch (err) {
    report.errors.push(
      "transaction.overdue: " +
        (err instanceof Error ? err.message : String(err)),
    );
  }

  // silence unused import warnings on the linter
  void events;

  return NextResponse.json({
    ok: true,
    finishedAt: new Date().toISOString(),
    report,
  });
}
