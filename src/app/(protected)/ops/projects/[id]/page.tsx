import { notFound } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, Plus } from "lucide-react";
import { eq, asc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { contacts, projects } from "@/lib/db/schema";
import { getAllPillars, requireProfile } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ProjectForm } from "@/components/projects/project-form";
import { LinkedFinanceCard } from "@/components/finance/linked-finance-card";
import { updateProject } from "./actions";
import { DeleteProjectButton } from "./delete-button";

type Props = { params: Promise<{ id: string }> };

export default async function ProjectDetailPage({ params }: Props) {
  await requireProfile();
  const { id } = await params;
  const t = await getTranslations("ops.projects.detail");
  const tStatuses = await getTranslations("ops.taskStatuses");
  const tPriorities = await getTranslations("ops.taskPriorities");

  const project = await db.query.projects.findFirst({
    where: eq(projects.id, id),
    with: {
      pillar: true,
      owner: true,
      clientContact: true,
      tasks: {
        with: { assignee: true },
        orderBy: (t, { asc }) => [asc(t.dueDate), asc(t.createdAt)],
        limit: 100,
      },
    },
  });

  if (!project) notFound();

  const [pillars, allContacts] = await Promise.all([
    getAllPillars(),
    db.query.contacts.findMany({
      orderBy: [asc(contacts.fullName)],
      limit: 500,
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/ops/projects">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-display text-5xl text-foreground leading-none">
              {project.name}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {project.pillar?.name ?? ""}
              {project.clientContact ? ` · ${project.clientContact.fullName}` : ""}
            </p>
          </div>
          <DeleteProjectButton projectId={project.id} projectName={project.name} />
        </div>
      </div>

      <ProjectForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        contacts={allContacts.map((c) => ({
          id: c.id,
          fullName: c.fullName,
          company: c.company,
        }))}
        project={{
          id: project.id,
          name: project.name,
          pillarId: project.pillarId,
          status: project.status,
          description: project.description,
          clientContactId: project.clientContactId,
          startDate: project.startDate,
          targetDate: project.targetDate,
          notes: project.notes,
        }}
        action={updateProject}
      />

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("tasksSectionTitle")}</CardTitle>
              <CardDescription>
                {t("tasksCount", { count: project.tasks.length })}
              </CardDescription>
            </div>
            <Button asChild size="sm" variant="outline">
              <Link href={`/ops/tasks/new?project=${project.id}`}>
                <Plus className="mr-2 h-4 w-4" />
                {t("addTask")}
              </Link>
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {project.tasks.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground">
              {t("noTasks")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {project.tasks.map((task) => (
                <li key={task.id}>
                  <Link
                    href={`/ops/tasks/${task.id}`}
                    className="flex items-center justify-between px-6 py-3 hover:bg-muted/30 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="inline-flex items-center rounded-full bg-accent/40 px-2 py-0.5 text-xs text-foreground">
                        {tStatuses(task.status)}
                      </span>
                      <span className="text-sm text-foreground">
                        {task.title}
                      </span>
                      {task.priority !== "normal" && (
                        <span className="text-xs text-muted-foreground">
                          [{tPriorities(task.priority)}]
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {task.assignee?.fullName ?? task.assignee?.email ?? "—"}
                      {task.dueDate ? ` · ${task.dueDate}` : ""}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <LinkedFinanceCard projectId={project.id} />
    </div>
  );
}
