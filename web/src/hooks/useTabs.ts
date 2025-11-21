// AGRO - useTabs Hook
// Manages tab and subtab state for components

import { useState, useCallback } from 'react';

export interface UseTabsOptions {
  defaultSubtab?: string;
}

export function useTabs(options: UseTabsOptions = {}) {
  const [activeSubtab, setActiveSubtab] = useState<string>(options.defaultSubtab || '');

  const switchSubtab = useCallback((subtabId: string) => {
    setActiveSubtab(subtabId);

    // Store in localStorage for persistence
    try {
      localStorage.setItem('nav_current_subtab', subtabId);
    } catch (e) {
      console.warn('[useTabs] Failed to save subtab to localStorage:', e);
    }
  }, []);

  return {
    activeSubtab,
    switchSubtab
  };
}
