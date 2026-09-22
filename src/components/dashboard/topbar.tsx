"use client";

import { usePathname } from "next/navigation";
import { Menu, Moon, Sun } from "lucide-react";
import { useUIStore } from "@/store/ui.store";
import { useTheme } from "next-themes";
import { useTranslations } from "next-intl";
import { LocaleToggle } from "@/components/layout/locale-toggle";
import { GroupSelector } from "@/components/dashboard/group-selector";

// Maps a pathname to the nav translation key used as the page title.
const routeTitleKey: { test: (p: string) => boolean; key: string }[] = [
  { test: (p) => p === "/dashboard", key: "dashboard" },
  { test: (p) => p.startsWith("/dashboard/approvals"), key: "approvals" },
  { test: (p) => p.startsWith("/dashboard/tiers"), key: "tiers" },
  { test: (p) => p.startsWith("/dashboard/payments"), key: "payments" },
  { test: (p) => p.startsWith("/dashboard/draws"), key: "draws" },
  { test: (p) => p.startsWith("/dashboard/payouts"), key: "payouts" },
  { test: (p) => p.startsWith("/dashboard/penalties"), key: "penalties" },
  { test: (p) => p.startsWith("/dashboard/disputes"), key: "disputes" },
  { test: (p) => p.startsWith("/dashboard/staff"), key: "staff" },
  { test: (p) => p.startsWith("/dashboard/role-permissions"), key: "roles" },
  { test: (p) => p.startsWith("/dashboard/settings"), key: "settings" },
];

export default function TopBar() {
  const pathname = usePathname();
  const { toggle } = useUIStore();
  const { resolvedTheme, setTheme } = useTheme();
  const t = useTranslations("nav");

  const matched = routeTitleKey.find((r) => r.test(pathname));
  const title = matched ? t(matched.key) : t("dashboard");

  return (
    <header className="sticky top-0 z-20 flex h-20 w-full items-center justify-between border-b border-border bg-background px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="rounded-lg p-2 text-foreground transition hover:bg-accent lg:hidden"
          aria-label="Toggle sidebar"
        >
          <Menu size={22} />
        </button>
        <h1 className="text-xl font-bold text-foreground">{title}</h1>
      </div>

      <div className="flex items-center gap-2">
        <div className="hidden sm:block">
          <GroupSelector />
        </div>
        <LocaleToggle />
        <button
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          className="rounded-lg p-2 text-foreground transition hover:bg-accent"
          aria-label="Toggle theme"
        >
          {/* Icon driven by the .dark class so there's no hydration flash and
              no mount-gating effect needed. */}
          <Moon size={20} className="dark:hidden" />
          <Sun size={20} className="hidden dark:block" />
        </button>
      </div>
    </header>
  );
}
