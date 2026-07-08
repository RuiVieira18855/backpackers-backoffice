import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { and, desc, eq, inArray, sql, type SQL } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { auditLog, pillars, profiles } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Pagination } from "@/components/pagination";
import { parsePagination } from "@/lib/pagination";

const ENTITY_TYPES = [
  "contact",
  "event",
  "project",
  "task",
  "document",
  "transaction",
  "deal",
  "profile",
  "workflow",
  "webhook",
  "app",
  "template",
  "custom_field_def",
] as const;

const ACTIONS = ["create", "update", "delete"] as const;

type SearchParams = Promise<{
  entity?: string;
  action?: string;
  user?: string;
  page?: string;
  perPage?: string;
}>;

export default async function AuditLogPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireSkill("admin");
  const t = await getTranslations("admin.audit");
  const tCommon = await getTranslations("common");

  const sp = await searchParams;
  const pagination = parsePagination(sp, 50);

  const filters: (SQL | undefined)[] = [
    sp.entity && (ENTITY_TYPES as readonly string[]).includes(sp.entity)
      ? eq(auditLog.entityType, sp.entity)
      : undefined,
    sp.action && (ACTIONS as readonly string[]).includes(sp.action)
      ? eq(auditLog.action, sp.action as (typeof ACTIONS)[number])
      : undefined,
    sp.user ? eq(auditLog.userId, sp.user) : undefined,
  ];
  const where = filters.some(Boolean) ? and(...filters) : undefined;
  const hasFilters = Boolean(sp.entity || sp.action || sp.user);

  const [rows, totalRows] = await Promise.all([
    db
      .select({
        id: auditLog.id,
        userId: auditLog.userId,
        pillarId: auditLog.pillarId,
        entityType: auditLog.entityType,
        entityId: auditLog.entityId,
        action: auditLog.action,
        createdAt: auditLog.createdAt,
      })
      .from(auditLog)
      .where(where ?? sql`true`)
      .orderBy(desc(auditLog.createdAt))
      .limit(pagination.limit)
      .offset(pagination.offset)
      .catch(() => [] as never[]),
    db
      .select({ count: sql<number>`count(*)::int` })
      .from(auditLog)
      .where(where ?? sql`true`)
      .then((r) => r[0]?.count ?? 0)
      .catch(() => 0),
  ]);

  // Resolve user + pillar labels via JS join.
  const userIds = new Set<string>();
  const pillarIds = new Set<string>();
  for (const r of rows) {
    if (r.userId) userIds.add(r.userId);
    if (r.pillarId) pillarIds.add(r.pillarId);
  }

  const [userRows, pillarRows] = await Promise.all([
    userIds.size > 0
      ? db
          .select({
            id: profiles.id,
            fullName: profiles.fullName,
            email: profiles.email,
          })
          .from(profiles)
          .where(inArray(profiles.id, Array.from(userIds)))
          .catch(
            () =>
              [] as Array<{
                id: string;
                fullName: string | null;
                email: string;
              }>,
          )
      : Promise.resolve(
          [] as Array<{
            id: string;
            fullName: string | null;
            email: string;
          }>,
        ),
    pillarIds.size > 0
      ? db
          .select({ id: pillars.id, name: pillars.name })
          .from(pillars)
          .where(inArray(pillars.id, Array.from(pillarIds)))
          .catch(() => [] as Array<{ id: string; name: string }>)
      : Promise.resolve([] as Array<{ id: string; name: string }>),
  ]);

  const userLabelById = new Map(
    userRows.map((u) => [u.id, u.fullName ?? u.email] as const),
  );
  const pillarLabelById = new Map(pillarRows.map((p) => [p.id, p.name]));

  const allUsers = userRows;

  return (
    <div className="max-w-6xl mx-auto px-6 md:px-10 py-10 space-y-6">
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
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <form
        action="/admin/audit"
        method="get"
        className="flex flex-wrap items-end gap-3 border-y border-border py-4"
      >
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("filters.entity")}
          </label>
          <select
            name="entity"
            defaultValue={sp.entity ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[160px]"
          >
            <option value="">{tCommon("all")}</option>
            {ENTITY_TYPES.map((e) => (
              <option key={e} value={e}>
                {e}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("filters.action")}
          </label>
          <select
            name="action"
            defaultValue={sp.action ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[140px]"
          >
            <option value="">{tCommon("all")}</option>
            {ACTIONS.map((a) => (
              <option key={a} value={a}>
                {a}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground uppercase tracking-wider">
            {t("filters.user")}
          </label>
          <select
            name="user"
            defaultValue={sp.user ?? ""}
            className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-xs min-w-[180px]"
          >
            <option value="">{tCommon("all")}</option>
            {allUsers.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName ?? u.email}
              </option>
            ))}
          </select>
        </div>
        <Button type="submit" size="sm">
          {tCommon("filter")}
        </Button>
        {hasFilters && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/audit">{tCommon("cancel")}</Link>
          </Button>
        )}
      </form>

      <p className="text-sm text-muted-foreground">
        {t("count", { count: totalRows })}
      </p>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground italic">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {rows.map((r) => (
                <li key={r.id} className="px-6 py-3 text-sm">
                  <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                    <span
                      className={
                        "text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 " +
                        (r.action === "delete"
                          ? "bg-destructive/15 text-destructive"
                          : r.action === "create"
                            ? "bg-accent/40 text-foreground"
                            : "bg-muted text-muted-foreground")
                      }
                    >
                      {r.action}
                    </span>
                    <span className="font-mono text-xs">{r.entityType}</span>
                    <span className="text-xs text-muted-foreground">
                      {r.entityId ? r.entityId.slice(0, 8) : "—"}
                    </span>
                    {r.userId && (
                      <span className="text-xs text-foreground">
                        {t("byUser")}{" "}
                        {userLabelById.get(r.userId) ?? r.userId.slice(0, 8)}
                      </span>
                    )}
                    {r.pillarId && (
                      <span className="text-xs text-muted-foreground">
                        · {pillarLabelById.get(r.pillarId) ?? "—"}
                      </span>
                    )}
                    <span className="ml-auto text-xs text-muted-foreground">
                      {new Intl.DateTimeFormat("pt-PT", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(r.createdAt)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      <Pagination
        basePath="/admin/audit"
        searchParams={sp}
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={totalRows}
      />
    </div>
  );
}
