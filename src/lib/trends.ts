import "server-only";
import { sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts, events, tasks, documents } from "@/lib/db/schema";

export type TrendPoint = { day: string; count: number };

/**
 * Return one count per day for the last `days` days, ZERO-FILLED.
 * Useful for sparklines that need a continuous series.
 */
async function dailyCounts(
  table: typeof contacts | typeof events | typeof tasks | typeof documents,
  days: number,
): Promise<TrendPoint[]> {
  const rows = await db.execute<{ day: string; count: number }>(sql`
    WITH series AS (
      SELECT generate_series(
        CURRENT_DATE - INTERVAL '${sql.raw(String(days - 1))} days',
        CURRENT_DATE,
        '1 day'::interval
      )::date AS day
    )
    SELECT
      to_char(s.day, 'YYYY-MM-DD') AS day,
      COALESCE(COUNT(t.id), 0)::int AS count
    FROM series s
    LEFT JOIN ${table} t
      ON t.created_at::date = s.day
    GROUP BY s.day
    ORDER BY s.day ASC;
  `);

  // postgres-js returns rows as array or { rows } — Drizzle's execute returns just rows
  return (rows as unknown as { day: string; count: number }[]).map((r) => ({
    day: r.day,
    count: Number(r.count) || 0,
  }));
}

export const contactsTrend = (days = 30) => dailyCounts(contacts, days);
export const eventsTrend = (days = 30) => dailyCounts(events, days);
export const tasksTrend = (days = 30) => dailyCounts(tasks, days);
export const documentsTrend = (days = 30) => dailyCounts(documents, days);
