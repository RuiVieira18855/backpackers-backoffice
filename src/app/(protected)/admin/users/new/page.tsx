import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";
import { getAllPillars, requireSkill } from "@/lib/dal";
import { InviteUserForm } from "./invite-form";

export default async function NewUserPage() {
  const actor = await requireSkill("admin");
  const t = await getTranslations("admin.invite");

  const pillars = await getAllPillars();

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 md:px-10 py-6 sm:py-10 space-y-8">
      <div>
        <Button asChild variant="ghost" size="sm" className="mb-4 -ml-3">
          <Link href="/admin/users">
            <ChevronLeft className="mr-1 h-4 w-4" />
            {t("backToList")}
          </Link>
        </Button>
        <h1 className="font-display text-4xl sm:text-5xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <InviteUserForm
        pillars={pillars.map((p) => ({ id: p.id, name: p.name }))}
        actorIsSuperUser={actor.role === "super_user"}
      />
    </div>
  );
}
