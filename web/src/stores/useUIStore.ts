import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UIStore {
  // Tab/subtab state
  activeSubtab: Record<string, string>; // key: tab name, value: subtab id
  
  // Actions
  setActiveSubtab: (tab: string, subtab: string) => void;
}

export const useUIStore = create<UIStore>()(
  persist(
    (set) => ({
      activeSubtab: {},
      
      setActiveSubtab: (tab: string, subtab: string) => {
        set((state) => ({
          activeSubtab: {
            ...state.activeSubtab,
            [tab]: subtab,
          },
        }));
      },
    }),
    {
      name: 'agro-ui-storage',
    }
  )
);
