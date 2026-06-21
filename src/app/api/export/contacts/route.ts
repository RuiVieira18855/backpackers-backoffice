import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { csvResponse, rowsToCsv } from "@/lib/csv";

export async function GET() {
  await requireProfile();

  const rows = await db.query.contacts.findMany({
    with: { pillar: true, owner: true },
    orderBy: [desc(contacts.createdAt)],
    limit: 5000,
  });

  const csv = rowsToCsv(
    [
      "id",
      "name",
      "type",
      "stage",
      "pillar",
      "company",
      "job_title",
      "email",
      "phone",
      "source",
      "tags",
      "owner",
      "notes",
      "created_at",
      "updated_at",
    ],
    rows.map((c) => [
      c.id,
      c.fullName,
      c.type,
      c.stage,
      c.pillar?.name ?? "",
      c.company,
      c.jobTitle,
      c.email,
      c.phone,
      c.source,
      (c.tags ?? []).join("|"),
      c.owner?.fullName ?? c.owner?.email ?? "",
      c.notes,
      c.createdAt,
      c.updatedAt,
    ]),
  );

  return csvResponse(`contacts-${new Date(2026, 5, 21).toISOString().slice(0, 10)}.csv`, csv);
}
