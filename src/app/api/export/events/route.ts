import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { events } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { csvResponse, rowsToCsv } from "@/lib/csv";

export async function GET() {
  await requireProfile();

  const rows = await db.query.events.findMany({
    with: { pillar: true, owner: true, clientContact: true },
    orderBy: [desc(events.startAt), desc(events.createdAt)],
    limit: 5000,
  });

  const csv = rowsToCsv(
    [
      "id",
      "name",
      "type",
      "status",
      "pillar",
      "start_at",
      "end_at",
      "location",
      "capacity",
      "attendees_count",
      "client_contact",
      "owner",
      "tags",
      "notes",
      "created_at",
    ],
    rows.map((e) => [
      e.id,
      e.name,
      e.type,
      e.status,
      e.pillar?.name ?? "",
      e.startAt,
      e.endAt,
      e.location,
      e.capacity,
      e.attendeesCount,
      e.clientContact?.fullName ?? "",
      e.owner?.fullName ?? e.owner?.email ?? "",
      (e.tags ?? []).join("|"),
      e.notes,
      e.createdAt,
    ]),
  );

  return csvResponse("events.csv", csv);
}
