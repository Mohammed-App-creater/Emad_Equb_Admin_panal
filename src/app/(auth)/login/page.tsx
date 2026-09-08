import { LoginForm } from "@/components/login/ekub-login-form";
import { Logo } from "@/components/ui/logo";
import { getTranslations } from "next-intl/server";

export default async function LoginPage() {
  const t = await getTranslations("brand");

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div
        className="relative hidden flex-col items-center justify-center gap-8 px-12 text-white lg:flex"
        style={{ background: "var(--hero-gradient)" }}
      >
        {/* Decorative circles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-white/5" />
          <div className="absolute -bottom-16 -right-16 h-96 w-96 rounded-full bg-white/5" />
          <div className="absolute left-1/2 top-1/3 h-48 w-48 -translate-x-1/2 rounded-full bg-white/3" />
        </div>

        <div className="relative z-10 flex flex-col items-center gap-6 text-center">
          {/* White card makes the full-colour logo legible on the green field */}
          <div className="flex h-44 w-72 items-center justify-center rounded-2xl bg-white/95 p-6 shadow-lg">
            <Logo className="h-full w-full" />
          </div>

          <div className="mt-2 flex flex-col gap-3">
            <h1 className="text-balance text-3xl font-bold leading-tight tracking-tight">
              {t("name")}
            </h1>
            <p className="text-lg font-medium text-white/80">{t("tagline")}</p>
          </div>

          <div className="mt-2 max-w-sm rounded-xl border border-white/15 bg-white/10 px-6 py-5 backdrop-blur-sm">
            <p className="text-sm leading-relaxed text-white/90">
              Qard al-Hasan · Ujrah · Amanah — a fully digitized, interest-free
              rotating savings platform, Sharia-governed and managed
              transparently in real time.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center bg-background p-6">
        <LoginForm />
      </div>
    </div>
  );
}
