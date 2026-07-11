import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { requireSkill } from "@/lib/dal";
import { WebhookForm } from "../webhook-form";
import { createWebhook } from "../actions";

export default async function NewWebhookPage() {
  await requireSkill("admin");
  const t = await getTranslations("admin.webhooks");
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/webhooks">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
          {t("newWebhook")}
        </h1>
      </div>
      <WebhookForm mode="create" action={createWebhook} onSaved="/admin/webhooks" />
    </div>
  );
}
