import { getTranslations } from "next-intl/server";

export default async function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = await getTranslations("auth");

  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <aside className="hidden lg:flex bg-primary text-primary-foreground p-12 items-end">
        <div className="max-w-md">
          <p className="font-display text-7xl leading-none">
            Backpackers{" "}
            <span className="text-accent">Backoffice</span>
          </p>
          <p className="mt-6 text-base text-primary-foreground/70">
            {t("brandTagline")}
          </p>
        </div>
      </aside>
      <main className="flex items-center justify-center p-6 sm:p-12 bg-background">
        {children}
      </main>
    </div>
  );
}
