"use client";

import { ReactNode, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useEkubAccess } from "@/lib/auth/ekub-permissions";
import { GlobalLoader } from "@/components/ui/loader-full";

// Page-gate enforcement is opt-in via NEXT_PUBLIC_ENFORCE_PERMS=true. While it's
// off (the default), every built page is viewable regardless of the account's
// slugs — useful for reviewing the finished surface against the real backend,
// whose Equb permission slug names aren't yet mapped here. Real authorization is
// still enforced server-side by the API and by in-page action gates
// (useEkubAccess.has) on approve / run / release, etc. Flip the flag on once the
// backend's real slugs are wired into EKUB_PERMS to restore full SoD (NFR-4).
const ENFORCE = process.env.NEXT_PUBLIC_ENFORCE_PERMS === "true";

/**
 * Client-side page gate. Waits until the auth store is rehydrated, then either
 * renders children (user holds any of `anyOf`) or redirects to /unauthorized.
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
  const allowed = !ENFORCE || hasAny(anyOf);

  useEffect(() => {
    if (ENFORCE && isReady && !allowed) router.replace("/unauthorized");
  }, [isReady, allowed, router]);

  if (ENFORCE && !isReady) return <GlobalLoader />;
  if (!allowed) return null;
  return <>{children}</>;
}
