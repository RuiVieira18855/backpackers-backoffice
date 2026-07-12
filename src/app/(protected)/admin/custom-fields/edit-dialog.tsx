"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Pencil } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/toast";
import {
  updateCustomFieldDef,
  type CustomFieldFormState,
} from "./actions";

type Row = {
  id: string;
  entityType: "contact" | "event" | "project" | "deal";
  key: string;
  label: string;
  type: "text" | "textarea" | "number" | "date" | "select";
  options: string[];
  required: boolean;
  sortOrder: number;
};

export function EditFieldDialog({ row }: { row: Row }) {
  const t = useTranslations("admin.customFields");
  const tCommon = useTranslations("common");
  const toast = useToast();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  const [state, formAction] = useActionState<
    CustomFieldFormState | undefined,
    FormData
  >((prev, fd) => updateCustomFieldDef(row.id, prev, fd), undefined);

  function onSubmit(fd: FormData) {
    startTransition(async () => {
      formAction(fd);
    });
  }

  if (state && !state.error && !state.fieldErrors && open) {
    setOpen(false);
    toast.success(t("updatedToast"));
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setOpen(true)}
        aria-label={t("editAriaLabel", { name: row.label })}
      >
        <Pencil className="h-3.5 w-3.5" />
      </Button>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t("editTitle", { name: row.label })}</DialogTitle>
          <DialogDescription>{t("editHint")}</DialogDescription>
        </DialogHeader>
        <form action={onSubmit} className="flex flex-col gap-4">
          <div className="grid gap-2">
            <Label htmlFor={`label-${row.id}`}>{t("form.label")}</Label>
            <Input
              id={`label-${row.id}`}
              name="label"
              defaultValue={row.label}
              required
              aria-invalid={Boolean(state?.fieldErrors?.label)}
            />
            {state?.fieldErrors?.label && (
              <p className="text-xs text-destructive">
                {state.fieldErrors.label}
              </p>
            )}
          </div>

          {row.type === "select" && (
            <div className="grid gap-2">
              <Label htmlFor={`options-${row.id}`}>{t("form.options")}</Label>
              <Input
                id={`options-${row.id}`}
                name="options"
                defaultValue={row.options.join(", ")}
                placeholder="A, B, C"
              />
              <p className="text-xs text-muted-foreground">
                {t("form.optionsHint")}
              </p>
            </div>
          )}

          <div className="grid gap-2">
            <Label htmlFor={`sortOrder-${row.id}`}>{t("form.sortOrder")}</Label>
            <Input
              id={`sortOrder-${row.id}`}
              name="sortOrder"
              type="number"
              defaultValue={String(row.sortOrder)}
            />
          </div>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              name="required"
              defaultChecked={row.required}
              className="h-4 w-4 rounded border-input"
            />
            {t("form.required")}
          </label>

          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              {tCommon("cancel")}
            </Button>
            <Button type="submit" disabled={pending}>
              {pending ? tCommon("saving") : tCommon("save")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
