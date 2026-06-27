import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function toIcsDate(d: Date): string {
  // YYYYMMDDTHHMMSSZ — UTC.
  return (
    `${d.getUTCFullYear()}${pad2(d.getUTCMonth() + 1)}${pad2(d.getUTCDate())}` +
    `T${pad2(d.getUTCHours())}${pad2(d.getUTCMinutes())}${pad2(d.getUTCSeconds())}Z`
  );
}

/** RFC 5545: lines longer than 75 octets must be folded. Conservative wrap. */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const out: string[] = [];
  let i = 0;
  while (i < line.length) {
    const chunk = line.slice(i, i + 73);
    out.push(i === 0 ? chunk : ` ${chunk}`);
    i += 73;
  }
  return out.join("\r\n");
}

function escapeIcs(s: string | null | undefined): string {
  if (!s) return "";
  return s
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n")
    .replace(/\r/g, "");
}

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Params) {
  await requireProfile();
  const { id } = await params;

  const event = await db.query.events.findFirst({
    where: eq(events.id, id),
  });

  if (!event) {
    return new NextResponse("Not found", { status: 404 });
  }
  if (!event.startAt) {
    return new NextResponse("Event has no start date", { status: 400 });
  }

  const dtstart = toIcsDate(event.startAt);
  // Default to a 1h duration if no end date.
  const endAt =
    event.endAt ?? new Date(event.startAt.getTime() + 60 * 60 * 1000);
  const dtend = toIcsDate(endAt);
  const dtstamp = toIcsDate(new Date(event.updatedAt));

  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Backpackers Outpost//EN",
    "CALSCALE:GREGORIAN",
    "BEGIN:VEVENT",
    fold(`UID:${event.id}@outpost.backpackers`),
    `DTSTAMP:${dtstamp}`,
    `DTSTART:${dtstart}`,
    `DTEND:${dtend}`,
    fold(`SUMMARY:${escapeIcs(event.name)}`),
    event.description ? fold(`DESCRIPTION:${escapeIcs(event.description)}`) : null,
    event.location ? fold(`LOCATION:${escapeIcs(event.location)}`) : null,
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l): l is string => Boolean(l));

  const body = lines.join("\r\n") + "\r\n";
  const safeName = event.name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 100);

  return new NextResponse(body, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${safeName}.ics"`,
    },
  });
}
