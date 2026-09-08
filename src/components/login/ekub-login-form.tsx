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
import { useAuthStore, type User } from "@/lib/auth/auth-store";
import { MOCK_USERS, type MockRoleKey } from "@/lib/mock/mock-auth";
import { equbApi } from "@/services/equb-api";
import { useToast } from "@/hooks/use-toast";
import { getErrorMessage, cn } from "@/lib/utils";
import type { UserResponse } from "@/types/equb-api";

const USE_MOCK = process.env.NEXT_PUBLIC_USE_MOCK === "true";

const schema = z.object({
  identifier: z.string().min(1),
  password: z.string().min(1),
});
type FormValues = z.infer<typeof schema>;

// Map the backend UserResponse onto the auth-store User shape.
function toStoreUser(u: UserResponse): User {
  return {
    id: u.id,
    full_name: u.full_name,
    first_name: u.first_name,
    last_name: u.last_name,
    email: u.email,
    branch_id: u.branch_id,
    branch: null,
    roles: (u.roles ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.name.toLowerCase(),
      created_at: "",
      updated_at: "",
      permissions: null,
    })),
    phone_number: u.phone,
    gender: u.gender,
    status: u.status,
    totp_enabled: u.totp_enabled,
    permissions: u.permissions,
    job_title: u.job_title,
    department: u.department,
    profile_picture: u.profile_picture,
  };
}

export function LoginForm() {
  const t = useTranslations("auth");
  const router = useRouter();
  const setAuth = useAuthStore((s) => s.setAuth);
  const { toast } = useToast();
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

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    if (USE_MOCK) {
      const { user, permissions } = MOCK_USERS[mockRole];
      setAuth(user, permissions, `mock-token-${mockRole}`);
      router.push("/dashboard");
      return;
    }
    try {
      const res = await equbApi.login({ identifier: values.identifier, password: values.password });
      if (res.requires_totp) {
        toast({ title: "Two-factor required", description: "TOTP login isn't enabled in this console yet." });
        setSubmitting(false);
        return;
      }
      setAuth(toStoreUser(res.user), res.user.permissions ?? [], res.token, res.refresh_token);
      router.push("/dashboard");
    } catch (e) {
      toast({ title: "Sign in failed", description: getErrorMessage(e, "Invalid credentials"), variant: "destructive" });
      setSubmitting(false);
    }
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
