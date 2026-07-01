import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { asc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { appAccess, apps, profiles } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { setAppAccess } from "../actions";
import { AppMetadataForm } from "./metadata-form";

type Params = { params: Promise<{ appKey: string }> };
type SearchParams = Promise<{ kind?: string; status?: string }>;

const STATUS_OPTIONS = ["none", "trial", "active", "expired", "revoked"] as const;
const KIND_OPTIONS = ["all", "internal", "customer"] as const;

const fieldCls =
  "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";

export default async function AppDetailPage({
  params,
  searchParams,
}: {
  params: Params["params"];
  searchParams: SearchParams;
}) {
  await requireSkill("admin");
  const { appKey } = await params;
  const sp = await searchParams;
  const t = await getTranslations("admin.apps");

  const app = await db.query.apps.findFirst({
    where: eq(apps.key, appKey),
  });
  if (!app) notFound();

  const kindFilter =
    sp.kind && (KIND_OPTIONS as readonly string[]).includes(sp.kind)
      ? (sp.kind as (typeof KIND_OPTIONS)[number])
      : "all";
  const statusFilter =
    sp.status && (STATUS_OPTIONS as readonly string[]).includes(sp.status)
      ? (sp.status as (typeof STATUS_OPTIONS)[number])
      : "all" as unknown as (typeof STATUS_OPTIONS)[number];

  // Pull all profiles + their entitlement for this app.
  // Plain selects to dodge Drizzle relational LATERAL JOIN issues.
  const [allProfiles, accessRows] = await Promise.all([
    db
      .select({
        id: profiles.id,
        email: profiles.email,
        fullName: profiles.fullName,
        role: profiles.role,
        kind: profiles.kind,
      })
      .from(profiles)
      .orderBy(asc(profiles.fullName), asc(profiles.email)),
    db
      .select({
        userId: appAccess.userId,
        status: appAccess.status,
        plan: appAccess.plan,
        expiresAt: appAccess.expiresAt,
      })
      .from(appAccess)
      .where(eq(appAccess.app, appKey)),
  ]);

  const byUser = new Map(accessRows.map((r) => [r.userId, r]));

  // Apply filters
  const filtered = allProfiles.filter((p) => {
    if (kindFilter !== "all" && p.kind !== kindFilter) return false;
    const access = byUser.get(p.id);
    const currentStatus = access?.status ?? "none";
    if (
      sp.status &&
      sp.status !== "all" &&
      currentStatus !== sp.status
    ) {
      return false;
    }
    return true;
  });

  const counts = {
    internal: allProfiles.filter((p) => p.kind === "internal").length,
    customer: allProfiles.filter((p) => p.kind === "customer").length,
    activeAccess: accessRows.filter(
      (r) => r.status === "active" || r.status === "trial",
    ).length,
  };

  // Build query strings for filter pills
  const buildKindHref = (kind: (typeof KIND_OPTIONS)[number]) => {
    const params = new URLSearchParams();
    if (kind !== "all") params.set("kind", kind);
    if (sp.status) params.set("status", sp.status);
    const qs = params.toString();
    return `/admin/apps/${appKey}${qs ? `?${qs}` : ""}`;
  };
  const buildStatusHref = (status: string) => {
    const params = new URLSearchParams();
    if (kindFilter !== "all") params.set("kind", kindFilter);
    if (status !== "all") params.set("status", status);
    const qs = params.toString();
    return `/admin/apps/${appKey}${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/apps">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToApps")}
          </Link>
        </Button>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {app.name}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {app.description ??
            t("appSubtitleFallback", {
              active: counts.activeAccess,
              total: allProfiles.length,
            })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("metadata.title")}</CardTitle>
          <CardDescription>{t("metadata.hint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <AppMetadataForm
            appKey={appKey}
            defaults={{
              name: app.name,
              description: app.description,
              icon: app.icon,
              url: app.url,
            }}
          />
        </CardContent>
      </Card>

      {/* Filter row */}
      <div className="flex flex-wrap items-center gap-4 border-y border-border py-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("filterKind")}
          </span>
          {KIND_OPTIONS.map((k) => {
            const active = kindFilter === k;
            const count =
              k === "all"
                ? allProfiles.length
                : k === "internal"
                  ? counts.internal
                  : counts.customer;
            return (
              <Link
                key={k}
                href={buildKindHref(k)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`kinds.${k}` as never)} · {count}
              </Link>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">
            {t("filterStatus")}
          </span>
          {(["all", ...STATUS_OPTIONS] as const).map((s) => {
            const active =
              (s === "all" && !sp.status) ||
              (s !== "all" && sp.status === s);
            return (
              <Link
                key={s}
                href={buildStatusHref(s)}
                className={`inline-flex items-center rounded-full px-3 py-1 text-xs transition-colors ${
                  active
                    ? "bg-accent text-accent-foreground"
                    : "bg-muted text-muted-foreground hover:text-foreground"
                }`}
              >
                {t(`statuses.${s}` as never)}
              </Link>
            );
          })}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        {t("countFiltered", { shown: filtered.length, total: allProfiles.length })}
      </p>

      {filtered.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground italic">
            {t("noMatchingUsers")}
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {filtered.map((p) => {
                const a = byUser.get(p.id);
                const expires = a?.expiresAt
                  ? new Date(a.expiresAt).toISOString().slice(0, 10)
                  : "";
                const currentStatus = a?.status ?? "none";
                const isSuperUser = p.role === "super_user";
                const isOn =
                  isSuperUser ||
                  currentStatus === "active" ||
                  currentStatus === "trial";
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 px-6 py-3"
                  >
                    <div className="min-w-[220px] flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-foreground">
                          {p.fullName || p.email}
                        </span>
                        <span
                          className={
                            "text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 " +
                            (p.kind === "customer"
                              ? "bg-blue-500/15 text-blue-700 dark:text-blue-300"
                              : "bg-muted text-muted-foreground")
                          }
                        >
                          {t(`kinds.${p.kind}` as never)}
                        </span>
                        {isSuperUser ? (
                          <span
                            className="text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 bg-accent text-accent-foreground"
                            title={t("autoAccessHint")}
                          >
                            {t("autoAccess")}
                          </span>
                        ) : (
                          <span
                            className={
                              "text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 " +
                              (isOn
                                ? "bg-accent text-accent-foreground"
                                : "bg-muted text-muted-foreground")
                            }
                          >
                            {t(`statuses.${currentStatus}` as never)}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.email} · {p.role}
                      </div>
                    </div>
                    {isSuperUser ? (
                      <p className="text-xs text-muted-foreground italic max-w-xs">
                        {t("autoAccessHint")}
                      </p>
                    ) : (
                      <form
                        action={setAppAccess}
                        className="flex flex-wrap items-center gap-2"
                      >
                        <input type="hidden" name="userId" value={p.id} />
                        <input type="hidden" name="appKey" value={appKey} />
                        <select
                          name="status"
                          defaultValue={currentStatus}
                          className={fieldCls}
                          aria-label={t("statusLabel")}
                        >
                          {STATUS_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {t(`statuses.${s}` as never)}
                            </option>
                          ))}
                        </select>
                        <input
                          name="plan"
                          defaultValue={a?.plan ?? ""}
                          placeholder={t("planPlaceholder")}
                          className={fieldCls + " w-28"}
                        />
                        <input
                          type="date"
                          name="expiresAt"
                          defaultValue={expires}
                          className={fieldCls}
                          aria-label={t("expiresLabel")}
                        />
                        <Button type="submit" size="sm" variant="secondary">
                          {t("save")}
                        </Button>
                      </form>
                    )}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <p className="text-xs text-muted-foreground">{t("enforcementNote")}</p>
    </div>
  );
}
