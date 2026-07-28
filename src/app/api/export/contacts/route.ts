import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { contacts } from "@/lib/db/schema";
import { requireSkill, pillarScope } from "@/lib/dal";
import { csvResponse, rowsToCsv } from "@/lib/csv";

export async function GET() {
  const profile = await requireSkill("crm");

  const rows = await db.query.contacts.findMany({
    where: pillarScope(profile, contacts.pillarId),
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

  return csvResponse("contacts.csv", csv);
}
