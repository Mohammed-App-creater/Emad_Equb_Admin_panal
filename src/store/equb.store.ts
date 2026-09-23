import { create } from "zustand";
import { persist } from "zustand/middleware";

// The Dashboard (overview) page shows one Equb at a time; the topbar selector
// writes the choice here. Every other Equb-scoped surface lives under
// /dashboard/equbs/[id] and takes its id from the route instead.
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
