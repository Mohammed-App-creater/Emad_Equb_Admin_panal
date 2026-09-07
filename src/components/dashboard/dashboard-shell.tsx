"use client";

import { useUIStore } from "@/store/ui.store";
import TopBar from "./topbar";
import { cn } from "@/lib/utils";

/**
 * Wraps the dashboard main content and keeps its left margin in sync with the
 * sidebar rail width on desktop. Below `lg` the sidebar is an off-canvas drawer,
 * so no margin is applied there.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const desktopCollapsed = useUIStore((s) => s.desktopCollapsed);

  return (
    <div
      className={cn(
        "flex-1 transition-[margin] duration-300 ease-out",
        desktopCollapsed ? "lg:ml-20" : "lg:ml-72"
      )}
    >
      <TopBar />
      <main>{children}</main>
    </div>
  );
}
