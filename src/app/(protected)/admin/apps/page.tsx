import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { appAccess } from "@/lib/db/schema";
import { requireSkill, getAllProfiles } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { setCairnAccess } from "./actions";

const STATUS_OPTIONS = ["none", "trial", "active", "expired", "revoked"] as const;
const ACTIVE = new Set(["trial", "active"]);

const fieldCls =
  "h-9 rounded-md border border-input bg-background px-2 text-sm text-foreground";

export default async function AppsAdminPage() {
  await requireSkill("admin");
  const t = await getTranslations("admin.apps");
  const profiles = await getAllProfiles();

  let rows: Array<{
    userId: string;
    status: string;
    plan: string | null;
    expiresAt: Date | null;
  }> = [];
  try {
    rows = await db
      .select({
        userId: appAccess.userId,
        status: appAccess.status,
        plan: appAccess.plan,
        expiresAt: appAccess.expiresAt,
      })
      .from(appAccess)
      .where(eq(appAccess.app, "cairn"));
  } catch (err) {
    console.error("[admin/apps] list failed:", err);
  }
  const byUser = new Map(rows.map((r) => [r.userId, r]));
  const activeCount = rows.filter((r) => ACTIVE.has(r.status)).length;

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
          {t("subtitle", { active: activeCount, total: profiles.length })}
        </p>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground italic">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {profiles.map((p) => {
                const a = byUser.get(p.id);
                const expires = a?.expiresAt
                  ? new Date(a.expiresAt).toISOString().slice(0, 10)
                  : "";
                const on = a && ACTIVE.has(a.status);
                const statusLabel = a
                  ? t(`statuses.${a.status}` as never)
                  : t("statuses.none");
                return (
                  <li
                    key={p.id}
                    className="flex flex-wrap items-center gap-3 px-6 py-3"
                  >
                    <div className="min-w-[220px] flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">
                          {p.fullName || p.email}
                        </span>
                        <span
                          className={
                            "text-[10px] uppercase tracking-wide rounded px-1.5 py-0.5 " +
                            (on
                              ? "bg-accent text-accent-foreground"
                              : "bg-muted text-muted-foreground")
                          }
                        >
                          {statusLabel}
                        </span>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {p.email} · {p.role}
                      </div>
                    </div>
                    <form
                      action={setCairnAccess}
                      className="flex flex-wrap items-center gap-2"
                    >
                      <input type="hidden" name="userId" value={p.id} />
                      <select
                        name="status"
                        defaultValue={a?.status ?? "none"}
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
