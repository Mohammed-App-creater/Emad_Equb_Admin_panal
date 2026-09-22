import { create } from "zustand";
import { persist } from "zustand/middleware";


interface UIState {
  // Mobile drawer visibility (off-canvas below `lg`).
  sidebarOpen: boolean;
  // Desktop icon-only rail. Persisted so the preference survives reloads.
  desktopCollapsed: boolean;
  toggle: () => void;
  close: () => void;
  toggleDesktopCollapsed: () => void;
}


export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarOpen: false,
      desktopCollapsed: false,
      toggle: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      close: () => set({ sidebarOpen: false }),
      toggleDesktopCollapsed: () =>
        set((s) => ({ desktopCollapsed: !s.desktopCollapsed })),
    }),
    {
      name: "ui-store",
      // Only the desktop preference persists; the mobile drawer always
      // starts closed on load.
      partialize: (s) => ({ desktopCollapsed: s.desktopCollapsed }),
    }
  )
);
