import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { desc, eq, inArray } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { events, pillars, profiles, projects, tasks } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { KanbanBoard, type KanbanTask } from "./kanban-board";

type SearchParams = Promise<{ mine?: string }>;

export default async function TasksKanbanPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireProfile();
  const sp = await searchParams;
  const mine = sp.mine === "1";
  const t = await getTranslations("ops.kanban");

  // Fetch raw rows — plain selects to dodge Drizzle LATERAL JOIN issues.
  const rows = mine
    ? await db
        .select()
        .from(tasks)
        .where(eq(tasks.assigneeId, profile.id))
        .orderBy(desc(tasks.createdAt))
        .limit(300)
    : await db
        .select()
        .from(tasks)
        .orderBy(desc(tasks.createdAt))
        .limit(300);

  // Collect referenced ids for JS-side joins.
  const projectIds = new Set<string>();
  const eventIds = new Set<string>();
  const assigneeIds = new Set<string>();
  const pillarIds = new Set<string>();
  for (const r of rows) {
    if (r.projectId) projectIds.add(r.projectId);
    if (r.eventId) eventIds.add(r.eventId);
    if (r.assigneeId) assigneeIds.add(r.assigneeId);
    if (r.pillarId) pillarIds.add(r.pillarId);
  }

  const [projRows, evRows, asgRows, pilRows] = await Promise.all([
    projectIds.size > 0
      ? db
          .select({ id: projects.id, name: projects.name })
          .from(projects)
          .where(inArray(projects.id, Array.from(projectIds)))
      : Promise.resolve([] as Array<{ id: string; name: string }>),
    eventIds.size > 0
      ? db
          .select({ id: events.id, name: events.name })
          .from(events)
          .where(inArray(events.id, Array.from(eventIds)))
      : Promise.resolve([] as Array<{ id: string; name: string }>),
    assigneeIds.size > 0
      ? db
          .select({
            id: profiles.id,
            fullName: profiles.fullName,
            email: profiles.email,
          })
          .from(profiles)
          .where(inArray(profiles.id, Array.from(assigneeIds)))
      : Promise.resolve(
          [] as Array<{
            id: string;
            fullName: string | null;
            email: string;
          }>,
        ),
    pillarIds.size > 0
      ? db
          .select({ id: pillars.id, name: pillars.name })
          .from(pillars)
          .where(inArray(pillars.id, Array.from(pillarIds)))
      : Promise.resolve([] as Array<{ id: string; name: string }>),
  ]);

  const projectById = new Map(projRows.map((p) => [p.id, p.name]));
  const eventById = new Map(evRows.map((e) => [e.id, e.name]));
  const assigneeById = new Map(
    asgRows.map((p) => [p.id, p.fullName ?? p.email] as const),
  );
  const pillarById = new Map(pilRows.map((p) => [p.id, p.name]));

  const kanbanTasks: KanbanTask[] = rows.map((task) => ({
    id: task.id,
    title: task.title,
    status: task.status,
    priority: task.priority,
    pillarName: task.pillarId ? pillarById.get(task.pillarId) ?? null : null,
    assigneeName: task.assigneeId
      ? assigneeById.get(task.assigneeId) ?? null
      : null,
    projectName: task.projectId ? projectById.get(task.projectId) ?? null : null,
    eventName: task.eventId ? eventById.get(task.eventId) ?? null : null,
    dueDate: task.dueDate ?? null,
  }));

  return (
    <div className="max-w-7xl mx-auto px-6 md:px-10 py-10 space-y-6">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/ops/tasks">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-5xl sm:text-6xl text-foreground leading-none">
              {t("title")}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Link
              href="/ops/tasks/kanban"
              className={
                mine
                  ? "text-muted-foreground hover:text-foreground"
                  : "text-foreground font-medium"
              }
            >
              {t("filterAll")}
            </Link>
            <span className="text-muted-foreground">/</span>
            <Link
              href="/ops/tasks/kanban?mine=1"
              className={
                mine
                  ? "text-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground"
              }
            >
              {t("filterMine")}
            </Link>
          </div>
        </div>
      </div>

      <KanbanBoard tasks={kanbanTasks} />
    </div>
  );
}
