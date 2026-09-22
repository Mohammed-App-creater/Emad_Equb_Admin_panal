import { create } from "zustand";
import { persist } from "zustand/middleware";

// The group-scoped admin surfaces (Overview, Draws, Payouts, Penalties,
// Takaful) operate on one active cycle at a time. The Cycles page and the
// topbar selector write here; scoped services read `getState().activeGroupId`.
interface EqubState {
  activeGroupId: string | null;
  activeGroupName: string | null;
  setActiveGroup: (id: string | null, name?: string | null) => void;
}

export const useEqubStore = create<EqubState>()(
  persist(
    (set) => ({
      activeGroupId: null,
      activeGroupName: null,
      setActiveGroup: (id, name = null) => set({ activeGroupId: id, activeGroupName: name }),
    }),
    { name: "equb-active-group" }
  )
);
