import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { asc, eq, inArray, sql } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { appAccess, apps } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { NewAppForm } from "./new-app-form";

type AppRow = {
  key: string;
  name: string;
  description: string | null;
  icon: string | null;
  url: string | null;
  isActive: boolean;
};

type AppCounts = {
  active: number;
  trial: number;
  expired: number;
  revoked: number;
  total: number;
};

export default async function AppsAdminLanding() {
  await requireSkill("admin");
  const t = await getTranslations("admin.apps");

  let appsRows: AppRow[] = [];
  try {
    appsRows = await db
      .select({
        key: apps.key,
        name: apps.name,
        description: apps.description,
        icon: apps.icon,
        url: apps.url,
        isActive: apps.isActive,
      })
      .from(apps)
      .orderBy(asc(apps.name));
  } catch (err) {
    console.error("[admin/apps] list apps failed:", err);
  }

  // Aggregate counts of access rows per app.
  let countsByApp = new Map<string, AppCounts>();
  if (appsRows.length > 0) {
    try {
      const aggs = await db
        .select({
          app: appAccess.app,
          status: appAccess.status,
          count: sql<number>`count(*)::int`,
        })
        .from(appAccess)
        .where(inArray(appAccess.app, appsRows.map((a) => a.key)))
        .groupBy(appAccess.app, appAccess.status);

      countsByApp = aggs.reduce((acc, r) => {
        const cur =
          acc.get(r.app) ?? {
            active: 0,
            trial: 0,
            expired: 0,
            revoked: 0,
            total: 0,
          };
        cur[r.status as keyof AppCounts] =
          (cur[r.status as keyof AppCounts] as number) + r.count;
        cur.total += r.count;
        acc.set(r.app, cur);
        return acc;
      }, new Map<string, AppCounts>());
    } catch (err) {
      console.error("[admin/apps] count failed:", err);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToAdmin")}
          </Link>
        </Button>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">
          {t("landingSubtitle")}
        </p>
      </div>

      {appsRows.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground italic">
            {t("noAppsYet")}
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {appsRows.map((a) => {
            const c = countsByApp.get(a.key) ?? {
              active: 0,
              trial: 0,
              expired: 0,
              revoked: 0,
              total: 0,
            };
            return (
              <Link
                key={a.key}
                href={`/admin/apps/${a.key}`}
                className="group"
              >
                <Card className="h-full transition-colors group-hover:border-accent">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <CardTitle className="text-base flex items-center gap-2">
                          {a.name}
                          {!a.isActive && (
                            <span className="text-[10px] uppercase tracking-wider rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                              {t("inactive")}
                            </span>
                          )}
                        </CardTitle>
                        <CardDescription>
                          {a.description ?? a.key}
                        </CardDescription>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0 mt-1" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-2 text-center text-xs">
                      <div>
                        <p className="text-foreground font-medium tabular-nums">
                          {c.active}
                        </p>
                        <p className="text-muted-foreground">
                          {t("statuses.active")}
                        </p>
                      </div>
                      <div>
                        <p className="text-foreground font-medium tabular-nums">
                          {c.trial}
                        </p>
                        <p className="text-muted-foreground">
                          {t("statuses.trial")}
                        </p>
                      </div>
                      <div>
                        <p className="text-foreground font-medium tabular-nums">
                          {c.total}
                        </p>
                        <p className="text-muted-foreground">{t("total")}</p>
                      </div>
                    </div>
                    {a.url && (
                      <a
                        href={a.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="block mt-3 text-xs text-muted-foreground underline-offset-2 hover:underline truncate"
                      >
                        {a.url}
                      </a>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </section>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("newSectionTitle")}</CardTitle>
          <CardDescription>{t("newSectionHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <NewAppForm />
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">{t("enforcementNote")}</p>
    </div>
  );
}

// avoid the `eq` import being flagged as unused if linting is strict
void eq;
