import "server-only";
import { gte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, events, tasks, documents } from "@/lib/db/schema";

export type TrendPoint = { day: string; count: number };

function isoDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getSince(days: number): Date {
  const since = new Date();
  since.setDate(since.getDate() - (days - 1));
  since.setHours(0, 0, 0, 0);
  return since;
}

function zeroFill(
  rows: Array<{ day: string; count: number }>,
  since: Date,
  days: number,
): TrendPoint[] {
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

// Explicit per-table functions — no generics, no `as never` casts, no surprises.

export async function contactsTrend(days = 30): Promise<TrendPoint[]> {
  try {
    const since = getSince(days);
    const rows = await db
      .select({
        day: sql<string>`to_char(${contacts.createdAt}::date, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(contacts)
      .where(gte(contacts.createdAt, since))
      .groupBy(sql`${contacts.createdAt}::date`);
    return zeroFill(rows, since, days);
  } catch {
    return zeroFill([], getSince(days), days);
  }
}

export async function eventsTrend(days = 30): Promise<TrendPoint[]> {
  try {
    const since = getSince(days);
    const rows = await db
      .select({
        day: sql<string>`to_char(${events.createdAt}::date, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(events)
      .where(gte(events.createdAt, since))
      .groupBy(sql`${events.createdAt}::date`);
    return zeroFill(rows, since, days);
  } catch {
    return zeroFill([], getSince(days), days);
  }
}

export async function tasksTrend(days = 30): Promise<TrendPoint[]> {
  try {
    const since = getSince(days);
    const rows = await db
      .select({
        day: sql<string>`to_char(${tasks.createdAt}::date, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(tasks)
      .where(gte(tasks.createdAt, since))
      .groupBy(sql`${tasks.createdAt}::date`);
    return zeroFill(rows, since, days);
  } catch {
    return zeroFill([], getSince(days), days);
  }
}

export async function documentsTrend(days = 30): Promise<TrendPoint[]> {
  try {
    const since = getSince(days);
    const rows = await db
      .select({
        day: sql<string>`to_char(${documents.createdAt}::date, 'YYYY-MM-DD')`,
        count: sql<number>`count(*)::int`,
      })
      .from(documents)
      .where(gte(documents.createdAt, since))
      .groupBy(sql`${documents.createdAt}::date`);
    return zeroFill(rows, since, days);
  } catch {
    return zeroFill([], getSince(days), days);
  }
}
