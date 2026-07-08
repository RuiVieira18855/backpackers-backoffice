import Link from "next/link";
import { ChevronLeft, Plus, Webhook } from "lucide-react";
import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { webhooks } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function WebhooksAdminPage() {
  await requireSkill("admin");
  const t = await getTranslations("admin.webhooks");

  let rows: Array<{
    id: string;
    name: string;
    url: string;
    events: string[];
    isActive: boolean;
    createdAt: Date;
  }> = [];
  try {
    rows = await db
      .select({
        id: webhooks.id,
        name: webhooks.name,
        url: webhooks.url,
        events: webhooks.events,
        isActive: webhooks.isActive,
        createdAt: webhooks.createdAt,
      })
      .from(webhooks)
      .orderBy(desc(webhooks.createdAt));
  } catch (err) {
    console.error("[admin/webhooks] list failed:", err);
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
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-5xl text-foreground leading-none">
              {t("title")}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/webhooks/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("newWebhook")}
            </Link>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <Webhook className="h-8 w-8 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">{t("empty")}</p>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-3">
          {rows.map((wh) => (
            <Link key={wh.id} href={`/admin/webhooks/${wh.id}`} className="group">
              <Card className="transition-colors group-hover:border-accent">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Webhook
                          className={
                            "h-3.5 w-3.5 " +
                            (wh.isActive
                              ? "text-accent-foreground"
                              : "text-muted-foreground opacity-50")
                          }
                        />
                        {wh.name}
                        {!wh.isActive && (
                          <span className="text-[10px] uppercase tracking-wider rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                            {t("inactive")}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription className="truncate">
                        {wh.url}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {wh.events.map((e) => (
                      <span
                        key={e}
                        className="text-[10px] uppercase tracking-wider rounded bg-muted px-1.5 py-0.5 text-muted-foreground"
                      >
                        {e}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </section>
      )}

      <p className="text-xs text-muted-foreground">{t("securityNote")}</p>
    </div>
  );
}
