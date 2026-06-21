import { desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { tasks } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { csvResponse, rowsToCsv } from "@/lib/csv";

export async function GET() {
  await requireProfile();

  const rows = await db.query.tasks.findMany({
    with: { pillar: true, assignee: true, project: true, event: true },
    orderBy: [desc(tasks.createdAt)],
    limit: 5000,
  });

  const csv = rowsToCsv(
    [
      "id",
      "title",
      "status",
      "priority",
      "pillar",
      "assignee",
      "project",
      "event",
      "due_date",
      "completed_at",
      "created_at",
    ],
    rows.map((t) => [
      t.id,
      t.title,
      t.status,
      t.priority,
      t.pillar?.name ?? "",
      t.assignee?.fullName ?? t.assignee?.email ?? "",
      t.project?.name ?? "",
      t.event?.name ?? "",
      t.dueDate,
      t.completedAt,
      t.createdAt,
    ]),
  );

  return csvResponse("tasks.csv", csv);
}
