import { getTranslations } from "next-intl/server";
import { asc, desc } from "drizzle-orm";
import { db } from "@/lib/db";
import { events, projects } from "@/lib/db/schema";
import {
  getAllPillars,
  getAllProfiles,
  requireRole,
} from "@/lib/dal";
import { TaskForm } from "@/components/tasks/task-form";
import { createTask } from "./actions";

type SearchParams = Promise<{ project?: string; event?: string }>;

export default async function NewTaskPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireRole("admin_grupo", "admin_pilar");
  const t = await getTranslations("ops.tasks.form");
  const sp = await searchParams;

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

  // If pre-filling from query param, try to infer pillar from the selected
  // project/event.
  let defaultPillarId: string | undefined;
  if (sp.project) {
    defaultPillarId = allProjects.find((p) => p.id === sp.project)?.pillarId;
  } else if (sp.event) {
    defaultPillarId = allEvents.find((e) => e.id === sp.event)?.pillarId;
  }

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
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
        defaultPillarId={defaultPillarId}
        defaultProjectId={sp.project}
        defaultEventId={sp.event}
        defaultAssigneeId={profile.id}
        action={createTask}
      />
    </div>
  );
}
