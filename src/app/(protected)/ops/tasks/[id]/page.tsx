import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { eq, asc, desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { events, projects, tasks } from "@/lib/db/schema";
import {
  getAllPillars,
  getAllProfiles,
  requireProfile,
} from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { TaskForm } from "@/components/tasks/task-form";
import { updateTask } from "./actions";
import { DeleteTaskButton } from "./delete-button";

type Props = { params: Promise<{ id: string }> };

export default async function TaskDetailPage({ params }: Props) {
  await requireProfile();
  const { id } = await params;
  const t = await getTranslations("ops.tasks.detail");

  const task = await db.query.tasks.findFirst({
    where: eq(tasks.id, id),
    with: { pillar: true, assignee: true, project: true, event: true },
  });

  if (!task) notFound();

  const [pillars, profiles, allProjects, allEvents] = await Promise.all([
    getAllPillars(),
    getAllProfiles(),
    db.query.projects.findMany({
      orderBy: [desc(projects.createdAt)],
      limit: 200,
    }),
    db.query.events.findMany({
      orderBy: [asc(events.name)],
      limit: 200,
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/ops/tasks">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl text-foreground leading-none">
              {task.title}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {task.pillar?.name ?? ""}
              {task.project ? ` · ${task.project.name}` : ""}
              {task.event ? ` · ${task.event.name}` : ""}
            </p>
          </div>
          <DeleteTaskButton taskId={task.id} taskTitle={task.title} />
        </div>
      </div>

      <TaskForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        profiles={profiles.map((p) => ({
          id: p.id,
          fullName: p.fullName,
          email: p.email,
        }))}
        projects={allProjects.map((p) => ({
          id: p.id,
          name: p.name,
          pillarId: p.pillarId,
        }))}
        events={allEvents.map((e) => ({
          id: e.id,
          name: e.name,
          pillarId: e.pillarId,
        }))}
        task={{
          id: task.id,
          title: task.title,
          pillarId: task.pillarId,
          status: task.status,
          priority: task.priority,
          description: task.description,
          assigneeId: task.assigneeId,
          projectId: task.projectId,
          eventId: task.eventId,
          dueDate: task.dueDate,
        }}
        action={updateTask}
      />
    </div>
  );
}
