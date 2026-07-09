"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Check,
  Link as LinkIcon,
  RefreshCw,
  Unlink,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { useConfirm } from "@/components/ui/confirm-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  disconnectCalendar,
  syncCalendarNow,
  updateCalendarPillar,
} from "./calendar-actions";

type Connection = {
  provider: "google" | "microsoft";
  externalEmail: string | null;
  defaultPillarId: string | null;
  lastSyncedAt: Date | null;
};

type Pillar = { id: string; name: string };

type Props = {
  google: Connection | null;
  microsoft: Connection | null;
  pillars: Pillar[];
  googleConfigured: boolean;
  microsoftConfigured: boolean;
};

export function CalendarSyncCard({
  google,
  microsoft,
  pillars,
  googleConfigured,
  microsoftConfigured,
}: Props) {
  const t = useTranslations("settings.calendarSync");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          {t("title")}
        </CardTitle>
        <CardDescription>{t("subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ProviderRow
          providerLabel="Google Calendar"
          provider="google"
          conn={google}
          pillars={pillars}
          configured={googleConfigured}
        />
        <ProviderRow
          providerLabel="Outlook"
          provider="microsoft"
          conn={microsoft}
          pillars={pillars}
          configured={microsoftConfigured}
        />
        <p className="text-xs text-muted-foreground">{t("note")}</p>
      </CardContent>
    </Card>
  );
}

function ProviderRow({
  providerLabel,
  provider,
  conn,
  pillars,
  configured,
}: {
  providerLabel: string;
  provider: "google" | "microsoft";
  conn: Connection | null;
  pillars: Pillar[];
  configured: boolean;
}) {
  const t = useTranslations("settings.calendarSync");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [pending, startTransition] = useTransition();

  const connected = conn != null;

  const handleSync = () =>
    startTransition(async () => {
      const r = await syncCalendarNow(provider);
      if (r.ok) {
        toast.success(
          t("syncedAlert", {
            inserted: r.inserted,
            updated: r.updated,
            skipped: r.skipped,
          }),
        );
      } else {
        toast.error(t("syncFailedAlert", { error: r.error ?? "?" }));
      }
      router.refresh();
    });

  const handleDisconnect = async () => {
    const ok = await confirm({
      title: t("disconnectConfirm", { label: providerLabel }),
      confirmLabel: t("disconnect"),
      cancelLabel: tCommon("cancel"),
      destructive: true,
    });
    if (!ok) return;
    startTransition(async () => {
      await disconnectCalendar(provider);
      toast.info(t("disconnectedToast", { label: providerLabel }));
      router.refresh();
    });
  };

  const handlePillarChange = (v: string) =>
    startTransition(async () => {
      await updateCalendarPillar(provider, v || null);
      router.refresh();
    });

  return (
    <div className="rounded-md border border-border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="min-w-0">
          <p className="font-medium text-foreground">{providerLabel}</p>
          {connected ? (
            <p className="text-xs text-muted-foreground">
              {conn?.externalEmail ?? "—"}
              {conn?.lastSyncedAt && (
                <>
                  {" · "}
                  {t("lastSynced")}{" "}
                  {new Intl.DateTimeFormat("pt-PT", {
                    dateStyle: "short",
                    timeStyle: "short",
                  }).format(conn.lastSyncedAt)}
                </>
              )}
            </p>
          ) : (
            <p className="text-xs text-muted-foreground">
              {configured ? t("notConnected") : t("notConfigured")}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!connected && configured && (
            <Button asChild size="sm" variant="outline">
              <a href={`/api/oauth/${provider}/init`}>
                <LinkIcon className="mr-2 h-3.5 w-3.5" />
                {t("connect")}
              </a>
            </Button>
          )}
          {connected && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSync}
                disabled={pending}
              >
                <RefreshCw className="mr-2 h-3.5 w-3.5" />
                {pending ? t("syncing") : t("syncNow")}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={handleDisconnect}
                disabled={pending}
                className="text-destructive"
              >
                <Unlink className="mr-2 h-3.5 w-3.5" />
                {t("disconnect")}
              </Button>
            </>
          )}
        </div>
      </div>

      {connected && (
        <div className="space-y-2">
          <label className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("pillarLabel")}
          </label>
          <select
            defaultValue={conn?.defaultPillarId ?? ""}
            onChange={(e) => handlePillarChange(e.target.value)}
            disabled={pending}
            className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs"
          >
            <option value="">{t("pillarNone")}</option>
            {pillars.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <p className="text-xs text-muted-foreground">{t("pillarHint")}</p>
          {conn?.defaultPillarId && (
            <p className="text-xs text-accent-foreground flex items-center gap-1">
              <Check className="h-3 w-3" />
              {t("readyToSync")}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
