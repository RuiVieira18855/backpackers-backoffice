import { getTranslations } from "next-intl/server";
import { requireProfile } from "@/lib/dal";
import { ProfileForm } from "./profile-form";

export default async function SettingsPage() {
  const profile = await requireProfile();
  const t = await getTranslations("settings");
  const tRoles = await getTranslations("roles");

  return (
    <div className="max-w-4xl mx-auto px-6 md:px-10 py-10 space-y-8">
      <div>
        <h1 className="font-display text-6xl text-foreground leading-none">
          {t("title")}
        </h1>
        <p className="mt-2 text-base text-muted-foreground">{t("subtitle")}</p>
      </div>

      <ProfileForm
        email={profile.email}
        fullName={profile.fullName}
        roleLabel={tRoles(profile.role as never)}
      />
    </div>
  );
}
