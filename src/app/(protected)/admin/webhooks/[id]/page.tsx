import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronLeft } from "lucide-react";
import { desc, eq } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { webhookDeliveries, webhooks } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { WebhookForm } from "../webhook-form";
import { updateWebhook } from "../actions";
import { WebhookSideActions } from "./side-actions";

type Props = { params: Promise<{ id: string }> };

export default async function EditWebhookPage({ params }: Props) {
  await requireSkill("admin");
  const { id } = await params;
  const t = await getTranslations("admin.webhooks");

  const wh = await db.query.webhooks.findFirst({
    where: eq(webhooks.id, id),
  });
  if (!wh) notFound();

  const deliveries = await db
    .select()
    .from(webhookDeliveries)
    .where(eq(webhookDeliveries.webhookId, id))
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(20);

  const boundUpdate = updateWebhook.bind(null, id);

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/webhooks">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-5xl text-foreground leading-none">
              {wh.name}
            </h1>
            <p className="mt-2 text-sm text-muted-foreground truncate">
              {wh.url}
            </p>
          </div>
          <WebhookSideActions
            webhookId={id}
            isActive={wh.isActive}
            name={wh.name}
          />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("secretTitle")}</CardTitle>
          <CardDescription>{t("secretHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <code className="block bg-muted rounded-md p-3 text-xs font-mono break-all">
            {wh.secret}
          </code>
        </CardContent>
      </Card>

      <WebhookForm
        mode="edit"
        defaults={{
          name: wh.name,
          url: wh.url,
          events: wh.events,
          isActive: wh.isActive,
        }}
        action={boundUpdate}
        onSaved="/admin/webhooks"
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("deliveries")}</CardTitle>
          <CardDescription>
            {t("deliveriesHint", { count: deliveries.length })}
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {deliveries.length === 0 ? (
            <p className="px-6 pb-6 text-sm text-muted-foreground italic">
              {t("noDeliveries")}
            </p>
          ) : (
            <ul className="divide-y divide-border">
              {deliveries.map((d) => {
                const ok =
                  d.statusCode != null &&
                  d.statusCode >= 200 &&
                  d.statusCode < 300;
                return (
                  <li
                    key={d.id}
                    className="flex items-center justify-between gap-3 px-6 py-3 text-sm"
                  >
                    <div className="min-w-0 flex items-center gap-3">
                      <span
                        className={
                          "text-[10px] uppercase tracking-wider rounded px-1.5 py-0.5 " +
                          (ok
                            ? "bg-accent/40 text-foreground"
                            : "bg-destructive/15 text-destructive")
                        }
                      >
                        {d.statusCode ?? "error"}
                      </span>
                      <span className="font-mono text-xs text-muted-foreground">
                        {d.event}
                      </span>
                      {d.error && (
                        <span className="text-xs text-destructive truncate">
                          {d.error}
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground shrink-0">
                      {new Intl.DateTimeFormat("pt-PT", {
                        dateStyle: "short",
                        timeStyle: "short",
                      }).format(d.createdAt)}
                    </span>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
