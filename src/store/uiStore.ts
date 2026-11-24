import { create } from "zustand";
import { persist } from "zustand/middleware";

interface UIState {
  /** Desktop sidebar collapsed to icons only. */
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  /** Mobile navigation drawer. */
  mobileNavOpen: boolean;
  setMobileNavOpen: (open: boolean) => void;
}

export const useUIStore = create<UIState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      mobileNavOpen: false,
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
    }),
    {
      name: "ui-storage",
      partialize: (s) => ({ sidebarCollapsed: s.sidebarCollapsed }),
    }
  )
);
