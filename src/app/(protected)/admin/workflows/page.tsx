import Link from "next/link";
import { ChevronLeft, Plus, Power } from "lucide-react";
import { desc } from "drizzle-orm";
import { getTranslations } from "next-intl/server";
import { db } from "@/lib/db";
import { workflows } from "@/lib/db/schema";
import { requireSkill } from "@/lib/dal";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export default async function WorkflowsAdminPage() {
  await requireSkill("admin");
  const t = await getTranslations("admin.workflows");

  let rows: Array<{
    id: string;
    name: string;
    description: string | null;
    triggerType: string;
    isActive: boolean;
    createdAt: Date;
  }> = [];
  try {
    rows = await db
      .select({
        id: workflows.id,
        name: workflows.name,
        description: workflows.description,
        triggerType: workflows.triggerType,
        isActive: workflows.isActive,
        createdAt: workflows.createdAt,
      })
      .from(workflows)
      .orderBy(desc(workflows.createdAt));
  } catch (err) {
    console.error("[admin/workflows] list failed:", err);
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToAdmin")}
          </Link>
        </Button>
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
              {t("title")}
            </h1>
            <p className="mt-2 text-base text-muted-foreground">
              {t("subtitle")}
            </p>
          </div>
          <Button asChild>
            <Link href="/admin/workflows/new">
              <Plus className="mr-2 h-4 w-4" />
              {t("newWorkflow")}
            </Link>
          </Button>
        </div>
      </div>

      {rows.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <p className="text-muted-foreground">{t("empty")}</p>
            <Button asChild className="mt-6">
              <Link href="/admin/workflows/new">
                <Plus className="mr-2 h-4 w-4" />
                {t("newWorkflow")}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <section className="grid gap-3">
          {rows.map((wf) => (
            <Link key={wf.id} href={`/admin/workflows/${wf.id}`} className="group">
              <Card className="transition-colors group-hover:border-accent">
                <CardHeader>
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Power
                          className={
                            "h-3.5 w-3.5 " +
                            (wf.isActive
                              ? "text-accent-foreground"
                              : "text-muted-foreground opacity-50")
                          }
                        />
                        {wf.name}
                        {!wf.isActive && (
                          <span className="text-[10px] uppercase tracking-wider rounded bg-muted px-1.5 py-0.5 text-muted-foreground">
                            {t("inactive")}
                          </span>
                        )}
                      </CardTitle>
                      <CardDescription>
                        {t(`triggers.${wf.triggerType}` as never)}
                        {wf.description ? ` · ${wf.description}` : ""}
                      </CardDescription>
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          ))}
        </section>
      )}

      <p className="text-xs text-muted-foreground">{t("engineNote")}</p>
    </div>
  );
}
