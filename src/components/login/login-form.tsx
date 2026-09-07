"use client";

import React from "react";
import Image from "next/image";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Eye, EyeOff, AtSign, Lock, ArrowLeft, KeyRound } from "lucide-react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Form } from "@/components/form/form";
import { loginSchema, LoginFormValues } from "@/schema/login.schema";
import { useAuth } from "@/hooks/auth/use-auth";
import { isTotpRequired } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import { useRouter } from "next/dist/client/components/navigation";
import { getErrorMessage } from "@/lib/utils";

type PendingCreds = { identifier: string; password: string };

export function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [pendingCreds, setPendingCreds] = useState<PendingCreds | null>(null);
  const [totpCode, setTotpCode] = useState("");

  const {
    login,
    isLoginLoading: isLoading,
    loginWithTOTP,
    isLoginTOTPLoading,
  } = useAuth();

  const { toast } = useToast();

  const router = useRouter();

  // Initialize react-hook-form
  const form = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      identifier: "",
      password: "",
      remember: false,
    },
  });

  async function handleSubmit(data: LoginFormValues) {
    try {
      const response = await login(data);

      if (isTotpRequired(response)) {
        setPendingCreds({
          identifier: data.identifier,
          password: data.password,
        });
        setTotpCode("");
        setStep(2);
        return;
      }

      form.reset();
      toast({
        title: "Login successful",
        description: "You have successfully logged in.",
      });
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("Login failed:", error);

      toast({
        title: "Login failed",
        description:
          getErrorMessage(error, "Invalid credentials. Please try again."),
        variant: "destructive",
      });
    }
  }

  async function handleTotpSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pendingCreds || totpCode.length !== 6) return;

    try {
      await loginWithTOTP({
        identifier: pendingCreds.identifier,
        password: pendingCreds.password,
        code: totpCode,
      });

      form.reset();
      setPendingCreds(null);
      setTotpCode("");
      setStep(1);

      toast({
        title: "Login successful",
        description: "You have successfully logged in.",
      });
      router.push("/dashboard");
    } catch (error: unknown) {
      console.error("TOTP verification failed:", error);

      toast({
        title: "Verification failed",
        description:
          getErrorMessage(error, "Invalid authenticator code. Please try again."),
        variant: "destructive",
      });
    }
  }

  function handleBackToStep1() {
    setStep(1);
    setPendingCreds(null);
    setTotpCode("");
  }

  return (
    <div className="flex h-full w-full flex-col items-center justify-center px-6 sm:px-12">
      <div className="w-full max-w-md">
        {/* Mobile logo */}
        <div className="mb-8 flex items-center justify-center lg:hidden">
          <Image
            src="/images/emad-logo-light.png"
            alt="Emad Saving and Credit Cooperative logo"
            className="h-20 w-auto object-contain dark:hidden"
            width={80}
            height={80}
            priority
          />
          <Image
            src="/images/emad-logo-dark.png"
            alt="Emad Saving and Credit Cooperative logo"
            className="h-20 w-auto object-contain hidden dark:block"
            width={80}
            height={80}
            priority
          />
        </div>

        {step === 1 ? (
          <>
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Welcome Back
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter your credentials to access your account
              </p>
            </div>

            {/* Form */}
            <Form form={form} onSubmit={handleSubmit}>
              {/* Identifier (email or phone) */}
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="identifier"
                  className="text-sm font-medium text-foreground"
                >
                  Email or Phone Number
                </label>
                <div className="relative">
                  <Input
                    {...form.register("identifier")}
                    id="identifier"
                    type="text"
                    placeholder="Enter your email or phone number"
                    autoComplete="username"
                    icon={
                      <AtSign className="pointer-events-none absolute h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    }
                    className="h-11 pl-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  {form.formState.errors.identifier && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.identifier.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Password */}
              <div className="flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="password"
                    className="text-sm font-medium text-foreground"
                  >
                    Password
                  </label>
                  <button
                    type="button"
                    className="text-xs font-medium text-primary hover:underline"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Input
                    {...form.register("password")}
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    icon={
                      <Lock className="pointer-events-none absolute h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    }
                    className="h-11 pl-10 pr-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                  {form.formState.errors.password && (
                    <p className="text-sm text-destructive mt-1">
                      {form.formState.errors.password.message}
                    </p>
                  )}
                </div>
              </div>

              {/* Remember Me */}
              <div className="flex items-center gap-2">
                <input
                  {...form.register("remember")}
                  id="remember"
                  type="checkbox"
                  className="h-4 w-4 rounded border-input accent-primary"
                />
                <label
                  htmlFor="remember"
                  className="text-sm text-muted-foreground select-none"
                >
                  Remember me
                </label>
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="default"
                disabled={isLoading}
                className="h-11 w-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90 focus:ring-primary"
              >
                {isLoading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Signing in...
                  </span>
                ) : (
                  "Sign In"
                )}
              </Button>
            </Form>
          </>
        ) : (
          <>
            {/* Header */}
            <div className="mb-8">
              <h2 className="text-3xl font-bold tracking-tight text-foreground">
                Two-Factor Authentication
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                Enter the 6-digit code from your authenticator app
              </p>
            </div>

            <form
              onSubmit={handleTotpSubmit}
              className="flex flex-col gap-4"
              noValidate
            >
              <div className="flex flex-col gap-2">
                <label
                  htmlFor="totp"
                  className="text-sm font-medium text-foreground"
                >
                  Authenticator code
                </label>
                <div className="relative">
                  <Input
                    id="totp"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    autoFocus
                    placeholder="000000"
                    value={totpCode}
                    onChange={(e) =>
                      setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                    }
                    icon={
                      <KeyRound className="pointer-events-none absolute h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    }
                    className="h-11 pl-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm tracking-[0.4em] ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  />
                </div>
              </div>

              <Button
                type="submit"
                variant="default"
                disabled={isLoginTOTPLoading || totpCode.length !== 6}
                className="h-11 w-full bg-primary text-base font-semibold text-primary-foreground hover:bg-primary/90 focus:ring-primary"
              >
                {isLoginTOTPLoading ? (
                  <span className="flex items-center gap-2">
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                      aria-hidden="true"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                      />
                    </svg>
                    Verifying...
                  </span>
                ) : (
                  "Verify"
                )}
              </Button>

              <Button
                type="button"
                variant="ghost"
                onClick={handleBackToStep1}
                disabled={isLoginTOTPLoading}
                className="h-11 w-full text-sm font-medium text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to sign in
              </Button>
            </form>
          </>
        )}

        {/* Footer */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          {"By signing in, you agree to our "}
          <button type="button" className="underline hover:text-foreground">
            Terms of Service
          </button>
          {" and "}
          <button type="button" className="underline hover:text-foreground">
            Privacy Policy
          </button>
        </p>
      </div>
    </div>
  );
}
