"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { Clock, Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logHours, type LogHoursState } from "./time-actions";

const initialState: LogHoursState = {};

export function LogHoursForm({ projectId }: { projectId: string }) {
  const t = useTranslations("ops.timeTracking");
  const router = useRouter();
  const [state, formAction, pending] = useActionState(logHours, initialState);

  const fieldError = (name: string) =>
    state?.fieldErrors?.[name] ? (
      <p className="text-sm text-destructive mt-1">
        {state.fieldErrors[name]}
      </p>
    ) : null;

  const today = new Date().toISOString().slice(0, 10);

  return (
    <form
      action={async (fd) => {
        formAction(fd);
        setTimeout(() => router.refresh(), 100);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="projectId" value={projectId} />
      <div className="grid sm:grid-cols-4 gap-3">
        <div className="space-y-2">
          <Label htmlFor="hours">
            <Clock className="inline h-3.5 w-3.5 mr-1" />
            {t("hours")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="hours"
            name="hours"
            type="number"
            step="0.25"
            min="0.25"
            max="24"
            required
            placeholder="1.5"
          />
          {fieldError("hours")}
        </div>
        <div className="space-y-2">
          <Label htmlFor="date">
            {t("date")} <span className="text-destructive">*</span>
          </Label>
          <Input
            id="date"
            name="date"
            type="date"
            required
            defaultValue={today}
          />
          {fieldError("date")}
        </div>
        <div className="space-y-2 sm:col-span-2">
          <Label htmlFor="description">{t("description")}</Label>
          <Input
            id="description"
            name="description"
            placeholder={t("descriptionPlaceholder")}
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} size="sm">
        <Plus className="mr-2 h-3.5 w-3.5" />
        {pending ? t("logging") : t("log")}
      </Button>
    </form>
  );
}
