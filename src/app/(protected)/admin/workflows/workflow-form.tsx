"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { WorkflowFormState } from "./actions";

const TRIGGERS = [
  "contact.created",
  "contact.stage_changed",
  "deal.won",
  "task.completed",
  "task.due_soon",
  "transaction.overdue",
] as const;

const CONDITION_OPS = ["=", "!=", "contains", "in"] as const;

const ACTION_TYPES = [
  "create_task",
  "send_notification",
  "append_note",
  "send_email",
  "trigger_webhook",
] as const;

const WEBHOOK_EVENTS = [
  "contact.created",
  "contact.stage_changed",
  "deal.won",
  "task.completed",
] as const;

type Trigger = (typeof TRIGGERS)[number];
type Op = (typeof CONDITION_OPS)[number];
type ActionType = (typeof ACTION_TYPES)[number];

type Condition = { field: string; op: Op; value: string };
type Action =
  | {
      type: "create_task";
      title: string;
      assigneeId?: string;
      dueOffsetDays?: number;
      description?: string;
    }
  | {
      type: "send_notification";
      targetUserId: string;
      title: string;
      body?: string;
      link?: string;
    }
  | { type: "append_note"; text: string; entityType?: string }
  | { type: "send_email"; to?: string; subject: string; body: string }
  | { type: "trigger_webhook"; event: string };

type Owner = { id: string; label: string };

type Props = {
  mode: "create" | "edit";
  defaults?: {
    name: string;
    description: string | null;
    triggerType: string;
    conditions: Condition[];
    actions: Action[];
    isActive: boolean;
  };
  owners: Owner[];
  action: (
    state: WorkflowFormState | undefined,
    formData: FormData,
  ) => Promise<WorkflowFormState>;
  onSaved?: string;
};

const initialState: WorkflowFormState = {};

export function WorkflowForm({
  mode,
  defaults,
  owners,
  action,
  onSaved,
}: Props) {
  const t = useTranslations("admin.workflows");
  const tActions = useTranslations("admin.workflows.actionTypes");
  const tOps = useTranslations("admin.workflows.ops");
  const router = useRouter();

  const [state, formAction, pending] = useActionState(action, initialState);

  const [name, setName] = useState(defaults?.name ?? "");
  const [description, setDescription] = useState(defaults?.description ?? "");
  const [triggerType, setTriggerType] = useState<Trigger>(
    (defaults?.triggerType as Trigger) ?? "contact.created",
  );
  const [isActive, setIsActive] = useState(defaults?.isActive ?? true);
  const [conditions, setConditions] = useState<Condition[]>(
    defaults?.conditions ?? [],
  );
  const [actions, setActions] = useState<Action[]>(
    defaults?.actions ?? [
      { type: "create_task", title: "" } as Action,
    ],
  );

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  return (
    <form
      action={async (fd) => {
        // Serialize conditions + actions into JSON hidden fields so the
        // server action parses them.
        fd.set("conditions", JSON.stringify(conditions));
        fd.set("actions", JSON.stringify(actions));
        formAction(fd);
        setTimeout(() => {
          if (onSaved) router.push(onSaved);
          else router.refresh();
        }, 100);
      }}
      className="space-y-6"
    >
      <div className="grid sm:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">
            {t("form.name")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="name"
            name="name"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          {fieldError("name")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="triggerType">{t("form.trigger")}</Label>
          <select
            id="triggerType"
            name="triggerType"
            value={triggerType}
            onChange={(e) => setTriggerType(e.target.value as Trigger)}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            {TRIGGERS.map((tr) => (
              <option key={tr} value={tr}>
                {t(`triggers.${tr}` as never)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">{t("form.description")}</Label>
          <Input
            id="description"
            name="description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            name="isActive"
            checked={isActive}
            onChange={(e) => setIsActive(e.target.checked)}
            className="h-4 w-4 rounded border-input"
          />
          {t("form.isActive")}
        </label>
      </div>

      {/* Conditions */}
      <fieldset className="border border-border rounded-md p-4 space-y-3">
        <legend className="text-sm font-medium px-2">
          {t("form.conditions")}
        </legend>
        <p className="text-xs text-muted-foreground">
          {t("form.conditionsHint")}
        </p>
        {conditions.map((c, i) => (
          <div
            key={i}
            className="grid grid-cols-[1fr_auto_1fr_auto] gap-2 items-end"
          >
            <Input
              placeholder={t("form.fieldPlaceholder")}
              value={c.field}
              onChange={(e) =>
                setConditions((cur) =>
                  cur.map((x, j) =>
                    j === i ? { ...x, field: e.target.value } : x,
                  ),
                )
              }
            />
            <select
              value={c.op}
              onChange={(e) =>
                setConditions((cur) =>
                  cur.map((x, j) =>
                    j === i ? { ...x, op: e.target.value as Op } : x,
                  ),
                )
              }
              className="flex h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
            >
              {CONDITION_OPS.map((op) => (
                <option key={op} value={op}>
                  {tOps(op)}
                </option>
              ))}
            </select>
            <Input
              placeholder={t("form.valuePlaceholder")}
              value={c.value}
              onChange={(e) =>
                setConditions((cur) =>
                  cur.map((x, j) =>
                    j === i ? { ...x, value: e.target.value } : x,
                  ),
                )
              }
            />
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() =>
                setConditions((cur) => cur.filter((_, j) => j !== i))
              }
              className="text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setConditions((cur) => [...cur, { field: "", op: "=", value: "" }])
          }
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          {t("form.addCondition")}
        </Button>
      </fieldset>

      {/* Actions */}
      <fieldset className="border border-border rounded-md p-4 space-y-3">
        <legend className="text-sm font-medium px-2">{t("form.actions")}</legend>
        <p className="text-xs text-muted-foreground">{t("form.actionsHint")}</p>
        {actions.map((a, i) => (
          <div
            key={i}
            className="rounded-md border border-border p-3 space-y-2 bg-muted/20"
          >
            <div className="flex items-center justify-between gap-2">
              <select
                value={a.type}
                onChange={(e) =>
                  setActions((cur) =>
                    cur.map((x, j) =>
                      j === i ? changeActionType(x, e.target.value as ActionType) : x,
                    ),
                  )
                }
                className="flex h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
              >
                {ACTION_TYPES.map((tp) => (
                  <option key={tp} value={tp}>
                    {tActions(tp)}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setActions((cur) => cur.filter((_, j) => j !== i))}
                className="text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {a.type === "create_task" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <Input
                  placeholder={t("form.taskTitle")}
                  value={a.title}
                  onChange={(e) =>
                    setActions((cur) =>
                      cur.map((x, j) =>
                        j === i && x.type === "create_task"
                          ? { ...x, title: e.target.value }
                          : x,
                      ),
                    )
                  }
                />
                <select
                  value={a.assigneeId ?? ""}
                  onChange={(e) =>
                    setActions((cur) =>
                      cur.map((x, j) =>
                        j === i && x.type === "create_task"
                          ? {
                              ...x,
                              assigneeId: e.target.value || undefined,
                            }
                          : x,
                      ),
                    )
                  }
                  className="flex h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
                >
                  <option value="">{t("form.taskUnassigned")}</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Input
                  type="number"
                  min={0}
                  max={365}
                  placeholder={t("form.dueOffsetPlaceholder")}
                  value={a.dueOffsetDays ?? ""}
                  onChange={(e) =>
                    setActions((cur) =>
                      cur.map((x, j) =>
                        j === i && x.type === "create_task"
                          ? {
                              ...x,
                              dueOffsetDays: e.target.value
                                ? Number(e.target.value)
                                : undefined,
                            }
                          : x,
                      ),
                    )
                  }
                />
                <Input
                  placeholder={t("form.taskDescription")}
                  value={a.description ?? ""}
                  onChange={(e) =>
                    setActions((cur) =>
                      cur.map((x, j) =>
                        j === i && x.type === "create_task"
                          ? { ...x, description: e.target.value }
                          : x,
                      ),
                    )
                  }
                />
              </div>
            )}

            {a.type === "send_notification" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <select
                  value={a.targetUserId}
                  onChange={(e) =>
                    setActions((cur) =>
                      cur.map((x, j) =>
                        j === i && x.type === "send_notification"
                          ? { ...x, targetUserId: e.target.value }
                          : x,
                      ),
                    )
                  }
                  className="flex h-9 rounded-md border border-input bg-background px-2 text-sm shadow-xs"
                >
                  <option value="">{t("form.notifTarget")}</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <Input
                  placeholder={t("form.notifTitle")}
                  value={a.title}
                  onChange={(e) =>
                    setActions((cur) =>
                      cur.map((x, j) =>
                        j === i && x.type === "send_notification"
                          ? { ...x, title: e.target.value }
                          : x,
                      ),
                    )
                  }
                />
                <Input
                  placeholder={t("form.notifBody")}
                  value={a.body ?? ""}
                  onChange={(e) =>
                    setActions((cur) =>
                      cur.map((x, j) =>
                        j === i && x.type === "send_notification"
                          ? { ...x, body: e.target.value }
                          : x,
                      ),
                    )
                  }
                />
                <Input
                  placeholder={t("form.notifLink")}
                  value={a.link ?? ""}
                  onChange={(e) =>
                    setActions((cur) =>
                      cur.map((x, j) =>
                        j === i && x.type === "send_notification"
                          ? { ...x, link: e.target.value }
                          : x,
                      ),
                    )
                  }
                />
              </div>
            )}

            {a.type === "append_note" && (
              <Input
                placeholder={t("form.notePlaceholder")}
                value={a.text}
                onChange={(e) =>
                  setActions((cur) =>
                    cur.map((x, j) =>
                      j === i && x.type === "append_note"
                        ? { ...x, text: e.target.value }
                        : x,
                    ),
                  )
                }
              />
            )}

            {a.type === "send_email" && (
              <div className="grid sm:grid-cols-2 gap-2">
                <Input
                  placeholder={t("form.emailTo")}
                  value={a.to ?? ""}
                  onChange={(e) =>
                    setActions((cur) =>
                      cur.map((x, j) =>
                        j === i && x.type === "send_email"
                          ? { ...x, to: e.target.value }
                          : x,
                      ),
                    )
                  }
                />
                <Input
                  placeholder={t("form.emailSubject")}
                  value={a.subject}
                  onChange={(e) =>
                    setActions((cur) =>
                      cur.map((x, j) =>
                        j === i && x.type === "send_email"
                          ? { ...x, subject: e.target.value }
                          : x,
                      ),
                    )
                  }
                />
                <div className="sm:col-span-2">
                  <textarea
                    rows={3}
                    placeholder={t("form.emailBody")}
                    value={a.body}
                    onChange={(e) =>
                      setActions((cur) =>
                        cur.map((x, j) =>
                          j === i && x.type === "send_email"
                            ? { ...x, body: e.target.value }
                            : x,
                        ),
                      )
                    }
                    className="flex w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-xs"
                  />
                </div>
              </div>
            )}

            {a.type === "trigger_webhook" && (
              <select
                value={a.event}
                onChange={(e) =>
                  setActions((cur) =>
                    cur.map((x, j) =>
                      j === i && x.type === "trigger_webhook"
                        ? { ...x, event: e.target.value }
                        : x,
                    ),
                  )
                }
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
              >
                <option value="">{t("form.webhookEventPlaceholder")}</option>
                {WEBHOOK_EVENTS.map((ev) => (
                  <option key={ev} value={ev}>
                    {ev}
                  </option>
                ))}
              </select>
            )}
          </div>
        ))}
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() =>
            setActions((cur) => [
              ...cur,
              { type: "create_task", title: "" } as Action,
            ])
          }
        >
          <Plus className="mr-2 h-3.5 w-3.5" />
          {t("form.addAction")}
        </Button>
      </fieldset>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending
            ? t("form.saving")
            : mode === "create"
              ? t("form.create")
              : t("form.save")}
        </Button>
        <Button asChild variant="ghost">
          <Link href="/admin/workflows">{t("form.cancel")}</Link>
        </Button>
      </div>
    </form>
  );
}

function changeActionType(prev: Action, next: ActionType): Action {
  if (next === prev.type) return prev;
  switch (next) {
    case "create_task":
      return { type: "create_task", title: "" };
    case "send_notification":
      return { type: "send_notification", targetUserId: "", title: "" };
    case "append_note":
      return { type: "append_note", text: "" };
    case "send_email":
      return { type: "send_email", subject: "", body: "" };
    case "trigger_webhook":
      return { type: "trigger_webhook", event: "contact.created" };
    default:
      return prev;
  }
}
