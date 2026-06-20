import { getTranslations } from "next-intl/server";
import { SignupForm } from "./signup-form";

export default async function SignupPage() {
  const t = await getTranslations("auth");
  return (
    <div className="w-full max-w-sm space-y-8">
      <div>
        <h1 className="font-display text-5xl text-foreground leading-none">
          {t("signupTitle")}
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {t("signupSubtitle")}
        </p>
      </div>
      <SignupForm />
    </div>
  );
}
