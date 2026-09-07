"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuthStore } from "@/lib/auth/auth-store";
import { MOCK_USERS, type MockRoleKey } from "@/lib/mock/mock-auth";
import { cn } from "@/lib/utils";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const schema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [showPassword, setShowPassword] = useState(false);
  const [mockRole, setMockRole] = useState<MockRoleKey>("admin");
  const [submitting, setSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { identifier: "admin@emadekub.com", password: "demo" },
  });

  const onSubmit = async (_values: FormValues) => {
    setSubmitting(true);
    if (USE_MOCK) {
      const { user, permissions } = MOCK_USERS[mockRole];
      setAuth(user, permissions, `mock-token-${mockRole}`);
      router.push("/dashboard");
      return;
    }
    // Real backend wiring goes here once the Equb API is available.
    setSubmitting(false);
  };

  return (
    <div className="w-full max-w-sm space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-bold text-foreground">{t("loginTitle")}</h1>
        <p className="text-sm text-muted-foreground">{t("loginSubtitle")}</p>
      </div>

      {USE_MOCK && (
        <div className="rounded-2xl border border-border bg-muted/40 p-3">
          <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
            <ShieldCheck size={14} /> Demo mode — sign in as
          </p>
          <div className="flex gap-2">
            {(["admin", "agent"] as MockRoleKey[]).map((r) => (
              <button
                key={r}
                type="button"
                onClick={() => setMockRole(r)}
                className={cn(
                  "flex-1 rounded-xl border px-3 py-2 text-sm font-medium capitalize transition",
                  mockRole === r
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-foreground hover:bg-accent"
                )}
              >
                {r}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="identifier">{t("identifier")}</Label>
          <Input id="identifier" {...register("identifier")} />
          {errors.identifier && (
            <p className="text-xs text-destructive">{t("identifier")}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">{t("password")}</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              {...register("password")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? t("signingIn") : t("signIn")}
        </Button>
      </form>
    </div>
  );
}
