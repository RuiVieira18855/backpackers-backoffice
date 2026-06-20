import { getTranslations } from "next-intl/server";
import { LoginForm } from "./login-form";

export default async function LoginPage() {
  const t = await getTranslations("auth");
  return (
    <div className="w-full max-w-sm space-y-8">
      <div>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {t("loginTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("loginSubtitle")}
        </p>
      </div>
      <LoginForm />
    </div>
  );
}
