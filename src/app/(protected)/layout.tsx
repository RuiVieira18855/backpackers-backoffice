import { getTranslations } from "next-intl/server";
import { requireProfile } from "@/lib/dal";
import { AppHeader } from "@/components/app-header";
import { AppSidebar } from "@/components/app-sidebar";
import { AppFooter } from "@/components/app-footer";

export default async function ProtectedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await requireProfile();
  const t = await getTranslations("a11y");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded-md focus:bg-background focus:px-3 focus:py-2 focus:text-sm focus:shadow-md focus:ring-2 focus:ring-ring"
      >
        {t("skipToMain")}
      </a>
      <AppHeader
        fullName={profile.fullName}
        email={profile.email}
        avatarUrl={profile.avatarUrl}
        role={profile.role}
      />
      <div className="flex-1 flex min-h-0">
        <AppSidebar />
        <main
          id="main"
          className="flex-1 min-w-0 overflow-x-hidden flex flex-col"
        >
          <div className="flex-1">{children}</div>
          <AppFooter />
        </main>
      </div>
    </div>
  );
}
