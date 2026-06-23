import { getTranslations } from "next-intl/server";

export async function AppFooter() {
  const t = await getTranslations("footer");
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/30">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-2 px-6 md:px-10 py-4 text-xs text-muted-foreground">
        <p className="flex flex-wrap items-center gap-1.5">
          <span className="font-display text-sm tracking-wide text-foreground">
            Outpost
          </span>
          <span>·</span>
          <span>{t("byLabs")}</span>
        </p>
        <p className="text-center sm:text-right">
          © {year} {t("copyright")}
        </p>
      </div>
    </footer>
  );
}
