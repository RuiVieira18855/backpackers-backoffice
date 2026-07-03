/**
 * Materialise a recurrence rule into a list of concrete start/end datetimes
 * for a series head. The parent's start/end are included as the first entry.
 *
 * Capped at MAX_OCCURRENCES to avoid runaway INSERTs on bad input.
 */

export type RecurrenceFrequency = "none" | "daily" | "weekly" | "monthly";

export type RecurrenceInput = {
  startAt: Date;
  endAt: Date | null;
  frequency: RecurrenceFrequency;
  /** Every N frequency units. Clamped >= 1. */
  interval: number;
  /** Inclusive end date (YYYY-MM-DD). If null, we cap by MAX_OCCURRENCES. */
  until: string | null;
};

export type Occurrence = {
  startAt: Date;
  endAt: Date | null;
};

/** Never materialise more than this — protects against typos + huge series. */
export const MAX_OCCURRENCES = 26;

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

export function expandRecurrence(input: RecurrenceInput): Occurrence[] {
  const interval = Math.max(1, Math.floor(input.interval || 1));
  const first: Occurrence = { startAt: input.startAt, endAt: input.endAt };

  if (input.frequency === "none") return [first];

  const untilTs = input.until
    ? new Date(`${input.until}T23:59:59.999Z`).getTime()
    : Number.POSITIVE_INFINITY;

  const duration =
    input.endAt && !Number.isNaN(input.endAt.getTime())
      ? input.endAt.getTime() - input.startAt.getTime()
      : null;

  const occurrences: Occurrence[] = [first];

  let step = 1;
  while (occurrences.length < MAX_OCCURRENCES) {
    let nextStart: Date;
    if (input.frequency === "daily") {
      nextStart = addDays(input.startAt, step * interval);
    } else if (input.frequency === "weekly") {
      nextStart = addDays(input.startAt, step * interval * 7);
    } else {
      // monthly
      nextStart = addMonths(input.startAt, step * interval);
    }

    if (nextStart.getTime() > untilTs) break;

    const nextEnd =
      duration != null ? new Date(nextStart.getTime() + duration) : null;
    occurrences.push({ startAt: nextStart, endAt: nextEnd });
    step++;
  }

  return occurrences;
}
