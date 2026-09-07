"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEkubAccess } from "@/lib/auth/ekub-permissions";
import { GlobalLoader } from "@/components/ui/loader-full";

/**
 * Client-side page gate. Waits until the auth store is rehydrated, then either
 * renders children (user holds any of `anyOf`) or redirects to /unauthorized.
 * This is how segregation of duties (NFR-4) is enforced per page.
 */
export function RequirePermission({
  anyOf,
  children,
}: {
  anyOf: string[];
  children: ReactNode;
}) {
  const { hasAny, isReady } = useEkubAccess();
  const router = useRouter();
  const allowed = hasAny(anyOf);

  useEffect(() => {
    if (isReady && !allowed) router.replace("/unauthorized");
  }, [isReady, allowed, router]);

  if (!isReady) return <GlobalLoader />;
  if (!allowed) return null;
  return <>{children}</>;
}
