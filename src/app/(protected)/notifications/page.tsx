import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { count, eq, sql } from "drizzle-orm";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { db } from "@/lib/db";
import { notifications } from "@/lib/db/schema";
import { requireProfile } from "@/lib/dal";
import { Pagination } from "@/components/pagination";
import { parsePagination } from "@/lib/pagination";
import { markAllAsRead, markAsRead } from "./actions";

type SearchParams = Promise<{
  page?: string;
  perPage?: string;
}>;

const KIND_ICON: Record<string, string> = {
  task_assigned: "📋",
  task_due_soon: "⏰",
  event_finance: "💶",
  event_doc: "📎",
  project_finance: "💶",
  project_doc: "📎",
  mention: "💬",
  system: "🔔",
};

function fmtRelative(d: Date, now: Date): string {
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return "agora";
  if (diff < 3600) return `${Math.floor(diff / 60)} min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} d`;
  return new Intl.DateTimeFormat("pt-PT", { dateStyle: "short" }).format(d);
}

export default async function NotificationsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireProfile();
  const t = await getTranslations("notifications");
  const sp = await searchParams;
  const pagination = parsePagination(sp, 25);
  const where = eq(notifications.userId, profile.id);

  const [rows, totalRows] = await Promise.all([
    db
      .select()
      .from(notifications)
      .where(where)
      .orderBy(sql`${notifications.createdAt} DESC`)
      .limit(pagination.limit)
      .offset(pagination.offset)
      .catch(() => [] as Array<typeof notifications.$inferSelect>),
    db
      .select({ value: count() })
      .from(notifications)
      .where(where)
      .then((r) => r[0]?.value ?? 0)
      .catch(() => 0),
  ]);
  const now = new Date();

  const hasUnread = rows.some((r) => r.readAt === null);

  async function markAllAction() {
    "use server";
    await markAllAsRead();
  }

  async function markOneAction(formData: FormData) {
    "use server";
    const id = String(formData.get("id") ?? "");
    if (id) await markAsRead(id);
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
            {t("title")}
          </h1>
          <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
        </div>
        {hasUnread && (
          <form action={markAllAction}>
            <Button type="submit" variant="outline" size="sm">
              <CheckCheck className="mr-2 h-3.5 w-3.5" />
              {t("markAllAsRead")}
            </Button>
          </form>
        )}
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Bell className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {rows.map((n) => {
                const unread = n.readAt === null;
                const icon = KIND_ICON[n.kind] ?? "🔔";
                return (
                  <li key={n.id}>
                    <div
                      className={`flex items-start gap-3 px-6 py-4 transition-colors ${
                        unread ? "bg-accent/10" : ""
                      }`}
                    >
                      <div className="text-xl shrink-0 leading-tight">
                        {icon}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            {n.link ? (
                              <Link
                                href={n.link}
                                className="font-medium text-foreground hover:underline"
                              >
                                {n.title}
                              </Link>
                            ) : (
                              <span className="font-medium text-foreground">
                                {n.title}
                              </span>
                            )}
                            {n.body && (
                              <p className="text-sm text-muted-foreground mt-1">
                                {n.body}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground shrink-0 mt-0.5">
                            {fmtRelative(n.createdAt, now)}
                          </div>
                        </div>
                        {unread && (
                          <form action={markOneAction} className="mt-2">
                            <input type="hidden" name="id" value={n.id} />
                            <Button
                              type="submit"
                              variant="ghost"
                              size="sm"
                              className="h-7 px-2 text-xs"
                            >
                              {t("markAsRead")}
                            </Button>
                          </form>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}

      <Pagination
        basePath="/notifications"
        searchParams={sp}
        page={pagination.page}
        pageSize={pagination.pageSize}
        total={totalRows}
      />
    </div>
  );
}
