import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { projects } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { csvResponse, rowsToCsv } from "@/lib/csv";

export async function GET() {
  await requireProfile();

  const rows = await db.query.projects.findMany({
    with: { pillar: true, owner: true, clientContact: true },
    orderBy: [desc(projects.createdAt)],
    limit: 5000,
  });

  const csv = rowsToCsv(
    [
      "id",
      "name",
      "status",
      "pillar",
      "client_contact",
      "owner",
      "start_date",
      "target_date",
      "tags",
      "notes",
      "created_at",
    ],
    rows.map((p) => [
      p.id,
      p.name,
      p.status,
      p.pillar?.name ?? "",
      p.clientContact?.fullName ?? "",
      p.owner?.fullName ?? p.owner?.email ?? "",
      p.startDate,
      p.targetDate,
      (p.tags ?? []).join("|"),
      p.notes,
      p.createdAt,
    ]),
  );

  return csvResponse("projects.csv", csv);
}
