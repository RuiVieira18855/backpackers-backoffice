import { getTranslations } from "next-intl/server";
import { Logo } from "@/components/logo";
import { AppFooter } from "@/components/app-footer";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1 grid lg:grid-cols-2">
        <aside className="hidden lg:flex bg-primary text-primary-foreground p-12 flex-col justify-between">
          <Logo size="md" className="!rounded-none" />
          <div className="max-w-md">
            <p className="font-display text-7xl leading-none">
              Outpost
            </p>
            <p className="mt-3 text-base text-primary-foreground/70">
              {t("brandTagline")}
            </p>
            <p className="mt-8 text-xs uppercase tracking-wider text-primary-foreground/50">
              a Backpackers Labs product
            </p>
          </div>
        </aside>
        <main className="flex items-center justify-center p-6 sm:p-12 bg-background">
          <div className="w-full max-w-sm space-y-8">
            <div className="flex lg:hidden items-center gap-3 mb-4">
              <Logo size="md" />
              <div>
                <p className="font-display text-2xl text-foreground leading-none">
                  Outpost
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  a Backpackers Labs product
                </p>
              </div>
            </div>
            {children}
          </div>
        </main>
      </div>
      <AppFooter />
    </div>
  );
}
