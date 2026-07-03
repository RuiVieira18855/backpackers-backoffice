"use client";

import { useState, useTransition } from "react";
import { Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { deleteEvent, deleteEventSeries } from "./actions";

type Props = {
  eventId: string;
  eventName: string;
  /** True if this event is a series head or belongs to a series. */
  isSeries: boolean;
};

export function DeleteEventButton({ eventId, eventName, isSeries }: Props) {
  const t = useTranslations("ops.detail");
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);

  if (!isSeries) {
    return (
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => {
          if (!window.confirm(t("deleteConfirm", { name: eventName }))) return;
          startTransition(() => deleteEvent(eventId));
        }}
        disabled={pending}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {pending ? t("deleting") : t("delete")}
      </Button>
    );
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        className="text-destructive hover:text-destructive hover:bg-destructive/10"
        onClick={() => setOpen((o) => !o)}
        disabled={pending}
      >
        <Trash2 className="mr-2 h-4 w-4" />
        {pending ? t("deleting") : t("delete")}
      </Button>
      {open && (
        <>
          <div
            className="fixed inset-0 z-10"
            onClick={() => setOpen(false)}
            aria-hidden
          />
          <div className="absolute right-0 top-full mt-1 z-20 min-w-64 rounded-md border border-border bg-card shadow-md">
            <button
              type="button"
              className="block w-full text-left px-3 py-2 text-sm hover:bg-muted"
              onClick={() => {
                if (
                  !window.confirm(t("deleteConfirmOne", { name: eventName }))
                )
                  return;
                setOpen(false);
                startTransition(() => deleteEvent(eventId));
              }}
            >
              <div className="font-medium">{t("deleteJustThis")}</div>
              <div className="text-xs text-muted-foreground">
                {t("deleteJustThisHint")}
              </div>
            </button>
            <div className="border-t border-border" />
            <button
              type="button"
              className="block w-full text-left px-3 py-2 text-sm text-destructive hover:bg-destructive/5"
              onClick={() => {
                if (
                  !window.confirm(t("deleteConfirmSeries", { name: eventName }))
                )
                  return;
                setOpen(false);
                startTransition(() => deleteEventSeries(eventId));
              }}
            >
              <div className="font-medium">{t("deleteSeries")}</div>
              <div className="text-xs text-muted-foreground">
                {t("deleteSeriesHint")}
              </div>
            </button>
          </div>
        </>
      )}
    </div>
  );
}
