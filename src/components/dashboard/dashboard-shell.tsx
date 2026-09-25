"use client";

import { useUIStore } from "@/store/ui.store";
import TopBar from "./topbar";
import { cn } from "@/lib/utils";
import { useRealtimeConnection } from "@/lib/realtime";

/**
 * Wraps the dashboard main content and keeps its left margin in sync with the
 * sidebar rail width on desktop. Below `lg` the sidebar is an off-canvas drawer,
 * so no margin is applied there.
 */
export function DashboardShell({ children }: { children: React.ReactNode }) {
  const desktopCollapsed = useUIStore((s) => s.desktopCollapsed);
  // One live socket for the signed-in session; also shows in-app notifications.
  useRealtimeConnection();

  return (
    <div
      className={cn(
        // min-w-0: a flex child otherwise grows to fit a wide table and makes
        // the whole page scroll sideways; with it, tables scroll inside their card.
        "min-w-0 flex-1 transition-[margin] duration-300 ease-out",
        desktopCollapsed ? "lg:ml-20" : "lg:ml-72"
      )}
    >
      <TopBar />
      <main className="min-w-0">{children}</main>
    </div>
  );
}
