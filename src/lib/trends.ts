import "server-only";
import { gte, sql } from "drizzle-orm";
import type { PgTable } from "drizzle-orm/pg-core";
import { db } from "@/lib/db";
import { contacts, events, tasks, documents } from "@/lib/db/schema";

export type TrendPoint = { day: string; count: number };

type TableWithCreatedAt = PgTable & {
  createdAt: { _: { name: "created_at" } };
};

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/**
 * Return one count per day for the last `days` days, ZERO-FILLED.
 * Uses Drizzle query builder (typed) plus JS zero-fill so we don't have
 * to write raw SQL with table identifier interpolation (fragile).
 */
async function dailyCounts(
  table: typeof contacts | typeof events | typeof tasks | typeof documents,
  days: number,
): Promise<TrendPoint[]> {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);

  const createdAtCol = (table as unknown as { createdAt: never }).createdAt;

  const rows = (await db
    .select({
      day: sql<string>`to_char(${createdAtCol}::date, 'YYYY-MM-DD')`,
      count: sql<number>`count(*)::int`,
    })
    .from(table as never)
    .where(gte(createdAtCol, since))
    .groupBy(sql`${createdAtCol}::date`)) as Array<{
    day: string;
    count: number;
  }>;

  const byDay = new Map<string, number>(
    rows.map((r) => [r.day, Number(r.count) || 0]),
  );

  const result: TrendPoint[] = [];
  const cursor = new Date(since);
  for (let i = 0; i < days; i++) {
    const key = isoDay(cursor);
    result.push({ day: key, count: byDay.get(key) ?? 0 });
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

export const contactsTrend = (days = 30) => dailyCounts(contacts, days);
export const eventsTrend = (days = 30) => dailyCounts(events, days);
export const tasksTrend = (days = 30) => dailyCounts(tasks, days);
export const documentsTrend = (days = 30) => dailyCounts(documents, days);
