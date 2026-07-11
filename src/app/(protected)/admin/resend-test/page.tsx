import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { requireSkill } from "@/lib/dal";
import { ResendTestForm } from "./form";

export default async function ResendTestPage() {
  const actor = await requireSkill("admin");
  const t = await getTranslations("admin.resendTest");
  const configured = Boolean(process.env.RESEND_API_KEY);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToAdmin")}
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("statusTitle")}</CardTitle>
          <CardDescription>
            {configured ? t("statusConfigured") : t("statusNotConfigured")}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResendTestForm defaultTo={actor.email} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">{t("setupTitle")}</CardTitle>
        </CardHeader>
        <CardContent className="text-sm space-y-3">
          <ol className="list-decimal pl-5 space-y-2">
            <li>{t("step1")}</li>
            <li>{t("step2")}</li>
            <li>{t("step3")}</li>
            <li>{t("step4")}</li>
          </ol>
          <pre className="mt-3 rounded-md bg-muted p-3 text-xs font-mono overflow-x-auto">{`RESEND_API_KEY=re_xxxxxxxxxxxx
RESEND_FROM_EMAIL=Backpackers <noreply@your-domain.com>`}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
