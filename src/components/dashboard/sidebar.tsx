"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useUIStore } from "@/store/ui.store";
import { useState } from "react";
import { useTranslations } from "next-intl";
import {
  LayoutDashboard,
  CircleDot,
  ClipboardCheck,
  Layers,
  Wallet,
  Ticket,
  HandCoins,
  ShieldAlert,
  Scale,
  UsersRound,
  UserRoundCog,
  Settings,
  PiggyBank,
  Landmark,
  PieChart,
  LogOut,
  ChevronDown,
  X,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";
import { Logo } from "../ui/logo";
import { useAuthStore } from "@/lib/auth/auth-store";
import { useAuth } from "@/hooks/auth/use-auth";
import { useEkubAccess } from "@/lib/auth/ekub-permissions";
import { getInitials } from "@/components/ui/data-table";
import { cn } from "@/lib/utils";

// `labelKey` resolves against the `nav` message namespace. `permission` is the
// slug required to see the link (any-of); items without one are always visible.
// `soon` renders a disabled "coming soon" stub for deferred modules.
type NavItem = {
  labelKey: string;
  href: string;
  icon: typeof LayoutDashboard;
  permission?: string | string[];
  soon?: boolean;
};
type NavGroup = { titleKey: string; items: NavItem[] };

const navGroups: NavGroup[] = [
  {
    titleKey: "groupOverview",
    items: [
      { labelKey: "dashboard", href: "/dashboard", icon: LayoutDashboard },
      { labelKey: "cycles", href: "/dashboard/cycles", icon: CircleDot, permission: ["tier:read", "application:read"] },
    ],
  },
  {
    titleKey: "groupOperations",
    items: [
      { labelKey: "approvals", href: "/dashboard/approvals", icon: ClipboardCheck, permission: "application:read" },
      { labelKey: "tiers", href: "/dashboard/tiers", icon: Layers, permission: "tier:read" },
      { labelKey: "payments", href: "/dashboard/payments", icon: Wallet, permission: "payment:read" },
      { labelKey: "draws", href: "/dashboard/draws", icon: Ticket, permission: "draw:read" },
      { labelKey: "payouts", href: "/dashboard/payouts", icon: HandCoins, permission: "payout:read" },
    ],
  },
  {
    titleKey: "groupCompliance",
    items: [
      { labelKey: "penalties", href: "/dashboard/penalties", icon: ShieldAlert, permission: "penalty:read" },
      { labelKey: "disputes", href: "/dashboard/disputes", icon: Scale, permission: "dispute:read" },
      { labelKey: "takaful", href: "/dashboard/takaful", icon: PiggyBank, soon: true },
    ],
  },
  {
    titleKey: "groupAdministration",
    items: [
      { labelKey: "staff", href: "/dashboard/staff", icon: UsersRound, permission: "staff:read" },
      { labelKey: "roles", href: "/dashboard/role-permissions", icon: UserRoundCog, permission: "role:read" },
      { labelKey: "shares", href: "/dashboard/shares", icon: Landmark, soon: true },
      { labelKey: "reports", href: "/dashboard/reports", icon: PieChart, soon: true },
      { labelKey: "settings", href: "/dashboard/settings", icon: Settings },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { sidebarOpen, close, desktopCollapsed, toggleDesktopCollapsed } =
    useUIStore();
  const { user } = useAuthStore();
  const { logout } = useAuth();
  const { hasAny } = useEkubAccess();
  const t = useTranslations("nav");

  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const toggleGroup = (title: string) =>
    setCollapsed((prev) => ({ ...prev, [title]: !prev[title] }));

  const canSeeItem = (item: NavItem) => {
    if (!item.permission) return true;
    const required = Array.isArray(item.permission) ? item.permission : [item.permission];
    return hasAny(required);
  };

  const visibleGroups = navGroups
    .map((group) => ({ ...group, items: group.items.filter(canSeeItem) }))
    .filter((group) => group.items.length > 0);

  return (
    <>
      {/* Mobile overlay */}
      <div
        onClick={close}
        className={cn(
          "fixed inset-0 z-30 bg-background/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden",
          sidebarOpen ? "opacity-100" : "pointer-events-none opacity-0"
        )}
      />

      <aside
        className={cn(
          `fixed left-0 top-0 z-40 h-screen w-72 transform border-r border-sidebar-border
          bg-sidebar-background text-sidebar-foreground shadow-2xl transition-[transform,width]
          duration-300 ease-out lg:translate-x-0 lg:shadow-none`,
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
          desktopCollapsed ? "lg:w-20" : "lg:w-72"
        )}
      >
        <div className="flex h-full flex-col">
          {/* Header */}
          <div
            className={cn(
              "flex h-20 items-center border-b border-sidebar-border px-5",
              desktopCollapsed ? "justify-between lg:justify-center" : "justify-between"
            )}
          >
            <Logo className={cn("h-40 w-40", desktopCollapsed && "lg:hidden")} />
            <button
              onClick={toggleDesktopCollapsed}
              title={desktopCollapsed ? "Expand" : "Collapse"}
              className="hidden rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground lg:flex"
            >
              {desktopCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
            </button>
            <button
              onClick={close}
              className="-mr-2 rounded-lg p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground lg:hidden"
            >
              <X size={20} />
            </button>
          </div>

          {/* Menu */}
          <div
            className={cn(
              "no-scrollbar flex-1 space-y-7 overflow-y-auto overflow-x-hidden py-7",
              desktopCollapsed ? "px-5 lg:px-3" : "px-5"
            )}
          >
            {visibleGroups.map((group) => {
              const isCollapsed = collapsed[group.titleKey];
              return (
                <div key={group.titleKey}>
                  <button
                    onClick={() => toggleGroup(group.titleKey)}
                    className={cn(
                      "mb-3 flex w-full items-center justify-between px-3 text-xs font-bold uppercase tracking-widest text-muted-foreground transition-colors hover:text-sidebar-primary",
                      desktopCollapsed && "lg:hidden"
                    )}
                  >
                    {t(group.titleKey)}
                    <ChevronDown
                      size={16}
                      className={cn("transition-transform duration-200", isCollapsed && "-rotate-90")}
                    />
                  </button>

                  <nav
                    className={cn(
                      "space-y-1.5",
                      isCollapsed && (desktopCollapsed ? "hidden lg:block" : "hidden")
                    )}
                  >
                    {group.items.map((item) => {
                      const active = pathname === item.href;
                      const Icon = item.icon;

                      if (item.soon) {
                        return (
                          <div
                            key={item.href}
                            title={`${t(item.labelKey)} — ${t("comingSoon")}`}
                            className={cn(
                              "relative flex w-full cursor-not-allowed items-center gap-3.5 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground/60",
                              desktopCollapsed && "lg:justify-center lg:gap-0 lg:px-0"
                            )}
                          >
                            <Icon size={22} strokeWidth={2} className="shrink-0" />
                            <span className={cn("flex-1", desktopCollapsed && "lg:hidden")}>
                              {t(item.labelKey)}
                            </span>
                            <span
                              className={cn(
                                "rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                                desktopCollapsed && "lg:hidden"
                              )}
                            >
                              {t("comingSoon")}
                            </span>
                          </div>
                        );
                      }

                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          title={t(item.labelKey)}
                          className={cn(
                            "relative flex w-full items-center gap-3.5 overflow-hidden rounded-xl px-4 py-3.5 text-sm font-medium transition-all duration-200",
                            active
                              ? "bg-sidebar-accent text-sidebar-primary shadow-lg shadow-green-glow"
                              : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-primary",
                            desktopCollapsed && "lg:justify-center lg:gap-0 lg:px-0"
                          )}
                        >
                          {active && (
                            <span
                              className={cn(
                                "absolute bottom-0 left-0 top-0 w-1 bg-sidebar-primary",
                                desktopCollapsed && "lg:hidden"
                              )}
                            />
                          )}
                          <Icon
                            size={22}
                            strokeWidth={active ? 2.5 : 2}
                            className={cn("shrink-0 transition-colors", active ? "text-sidebar-primary" : "text-muted-foreground")}
                          />
                          <span className={cn(desktopCollapsed && "lg:hidden")}>{t(item.labelKey)}</span>
                        </Link>
                      );
                    })}
                  </nav>
                </div>
              );
            })}
          </div>

          {/* Footer */}
          <div className="border-t border-sidebar-border p-5">
            <button
              onClick={() => logout()}
              className={cn(
                "group flex w-full items-center gap-3 rounded-xl p-2 transition hover:bg-sidebar-accent",
                desktopCollapsed && "lg:justify-center lg:gap-0"
              )}
            >
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-sidebar-primary text-sm font-bold text-sidebar-primary-foreground ring-2 ring-sidebar-primary/30">
                {getInitials(user?.full_name || "Guest")}
              </span>
              <div className={cn("flex-1 overflow-hidden text-left", desktopCollapsed && "lg:hidden")}>
                <p className="truncate text-sm font-bold text-sidebar-primary">
                  {user?.full_name || "Guest User"}
                </p>
                <p className="truncate text-xs text-muted-foreground">
                  {user?.email || "—"}
                </p>
              </div>
              <LogOut size={18} className={cn("text-sidebar-primary", desktopCollapsed && "lg:hidden")} />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
