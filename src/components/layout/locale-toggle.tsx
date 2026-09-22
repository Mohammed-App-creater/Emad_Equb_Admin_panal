"use client";

import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Languages } from "lucide-react";
import { locales, localeLabels, LOCALE_COOKIE, type Locale } from "@/i18n/config";
import { cn } from "@/lib/utils";

// Plain module function (not a component/hook) so the cookie write lives
// outside React's render/immutability analysis.
function writeLocaleCookie(locale: Locale) {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000`;
}

/**
 * Language switch. Writes the chosen locale to the EKUB_LOCALE cookie and
 * refreshes so the server re-resolves messages (src/i18n/request.ts). No
 * locale segment in the URL — the admin routes stay clean.
 */
export function LocaleToggle() {
  const active = useLocale() as Locale;
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const setLocale = (locale: Locale) => {
    if (locale === active) return;
    writeLocaleCookie(locale);
    startTransition(() => router.refresh());
  };

  return (
    <div
      className={cn(
        "flex items-center rounded-full border border-border bg-muted p-0.5",
        isPending && "opacity-60"
      )}
      role="group"
      aria-label="Language"
    >
      <Languages size={15} className="mx-1.5 text-muted-foreground" />
      {locales.map((l) => (
        <button
          key={l}
          onClick={() => setLocale(l)}
          className={cn(
            "rounded-full px-2.5 py-1 text-xs font-medium transition",
            active === l
              ? "bg-primary text-primary-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          )}
        >
          {localeLabels[l]}
        </button>
      ))}
    </div>
  );
}
