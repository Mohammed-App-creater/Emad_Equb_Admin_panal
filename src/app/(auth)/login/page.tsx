import { LoginForm } from "@/components/login/ekub-login-form";
import { Logo } from "@/components/ui/logo";
import { getTranslations } from "next-intl/server";

export default async function LoginPage() {
  const t = await getTranslations("brand");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden flex-col justify-between p-12 text-primary-foreground lg:flex"
        style={{ background: "var(--hero-gradient)" }}
      >
        <Logo className="h-40 w-40" />
        <div className="space-y-4">
          <h2 className="text-3xl font-bold leading-tight">{t("name")}</h2>
          <p className="max-w-sm text-primary-foreground/80">
            {t("tagline")}
          </p>
        </div>
        <p className="text-sm text-primary-foreground/60">
          Qard al-Hasan · Ujrah · Amanah
        </p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-background p-6">
        <LoginForm />
      </div>
    </div>
  );
}
