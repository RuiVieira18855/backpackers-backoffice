"use client";

import { useActionState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TemplatePicker } from "@/components/templates/template-picker";
import type { TemplateOption } from "@/lib/templates";

const STATUSES = ["todo", "doing", "blocked", "done"] as const;
const PRIORITIES = ["low", "normal", "high", "urgent"] as const;

export type TaskFormState = {
  error?: string;
  fieldErrors?: Record<string, string>;
};

type Pillar = { id: string; name: string };
type Profile = { id: string; fullName: string | null; email: string };
type Project = { id: string; name: string; pillarId: string };
type EventOption = { id: string; name: string; pillarId: string };

type TaskPrefill = {
  id: string;
  title: string;
  pillarId: string;
  status: (typeof STATUSES)[number];
  priority: (typeof PRIORITIES)[number];
  description: string | null;
  assigneeId: string | null;
  projectId: string | null;
  eventId: string | null;
  dueDate: string | null;
};

type Props = {
  pillars: Pillar[];
  profiles: Profile[];
  projects: Project[];
  events: EventOption[];
  task?: TaskPrefill;
  defaultPillarId?: string;
  defaultProjectId?: string;
  defaultEventId?: string;
  defaultAssigneeId?: string;
  descriptionTemplates?: TemplateOption[];
  action: (
    state: TaskFormState | undefined,
    formData: FormData,
  ) => Promise<TaskFormState>;
};

const initialState: TaskFormState = {};

export function TaskForm({
  pillars,
  profiles,
  projects,
  events,
  task,
  defaultPillarId,
  defaultProjectId,
  defaultEventId,
  defaultAssigneeId,
  descriptionTemplates = [],
  action,
}: Props) {
  const t = useTranslations("ops.tasks.form");
  const tStatuses = useTranslations("ops.taskStatuses");
  const tPriorities = useTranslations("ops.taskPriorities");
  const tCommon = useTranslations("common");
  const tDetail = useTranslations("ops.tasks.detail");

  const mode = task ? "edit" : "create";
  const [state, formAction, pending] = useActionState(action, initialState);

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form action={formAction} className="space-y-6 max-w-2xl">
      {task && <input type="hidden" name="id" value={task.id} />}

      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="title">
            {t("title_field")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="title"
            name="title"
            required
            defaultValue={task?.title ?? ""}
          />
          {fieldError("title")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="pillarId">
            {t("pillar")} <span className="text-destructive">*</span>
          </Label>
          <select
            id="pillarId"
            name="pillarId"
            required
            defaultValue={task?.pillarId ?? defaultPillarId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="" disabled>
              {t("selectPlaceholder")}
            </option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          {fieldError("pillarId")}
        </div>

        <div className="space-y-2">
          <Label htmlFor="assigneeId">{t("assignee")}</Label>
          <select
            id="assigneeId"
            name="assigneeId"
            defaultValue={task?.assigneeId ?? defaultAssigneeId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="">{t("assigneeNone")}</option>
            {profiles.map((p) => (
              <option key={p.id} value={p.id}>
                {p.fullName ?? p.email}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="status">{t("status")}</Label>
          <select
            id="status"
            name="status"
            defaultValue={task?.status ?? "todo"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {tStatuses(s)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="priority">{t("priority")}</Label>
          <select
            id="priority"
            name="priority"
            defaultValue={task?.priority ?? "normal"}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {tPriorities(p)}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="dueDate">{t("dueDate")}</Label>
          <Input
            id="dueDate"
            name="dueDate"
            type="date"
            defaultValue={task?.dueDate ?? ""}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="projectId">{t("project")}</Label>
          <select
            id="projectId"
            name="projectId"
            defaultValue={task?.projectId ?? defaultProjectId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="">{t("projectNone")}</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="eventId">{t("event")}</Label>
          <select
            id="eventId"
            name="eventId"
            defaultValue={task?.eventId ?? defaultEventId ?? ""}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="">{t("eventNone")}</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor="description">{t("description")}</Label>
            <TemplatePicker
              templates={descriptionTemplates}
              targetId="description"
            />
          </div>
          <textarea
            id="description"
            name="description"
            rows={3}
            defaultValue={task?.description ?? ""}
            className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {mode === "edit"
            ? pending
              ? tDetail("saving")
              : tDetail("save")
            : pending
            ? t("creating")
            : t("create")}
        </Button>
        <Button asChild variant="ghost">
          <Link
            href={mode === "edit" && task ? `/ops/tasks/${task.id}` : "/ops/tasks"}
          >
            {tCommon("cancel")}
          </Link>
        </Button>
      </div>
    </form>
  );
}
