"use client";

import { useAuthStore } from "@/lib/auth/auth-store";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { GlobalLoader } from "../ui/loader-full";

export function AuthGuard({ children }: { children: ReactNode }) {
  const { user, token, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !user && !token) {
      router.push("/login");
    }
  }, [user, token, isLoading, router]);

  if (isLoading) {
    return <GlobalLoader />;
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-lg font-medium text-gray-500">Redirecting to login...</p>
      </div>
    );
  }

  return <>{children}</>;
}
