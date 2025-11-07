import { useState, useEffect, useCallback } from 'react';

interface GlobalState {
  config: any;
  prices: any;
  profiles: string[];
  defaultProfile: string | null;
  hwScan: any;
  keywords: any;
  commitMeta: any;
}

/**
 * Hook for accessing and updating global application state
 * Bridges between React state and legacy window.CoreUtils.state
 */
export function useGlobalState() {
  const [state, setState] = useState<Partial<GlobalState>>({});

  // Sync with window.CoreUtils.state
  useEffect(() => {
    const syncState = () => {
      const w = window as any;
      if (w.CoreUtils && w.CoreUtils.state) {
        setState({
          config: w.CoreUtils.state.config,
          prices: w.CoreUtils.state.prices,
          profiles: w.CoreUtils.state.profiles,
          defaultProfile: w.CoreUtils.state.defaultProfile,
          hwScan: w.CoreUtils.state.hwScan,
          keywords: w.CoreUtils.state.keywords,
          commitMeta: w.CoreUtils.state.commitMeta
        });
      }
    };

    // Initial sync
    syncState();

    // Poll for changes (legacy modules update window.CoreUtils.state)
    const interval = setInterval(syncState, 500);

    // Listen for custom state update events
    const handleStateUpdate = () => syncState();
    window.addEventListener('agro-state-update', handleStateUpdate);

    return () => {
      clearInterval(interval);
      window.removeEventListener('agro-state-update', handleStateUpdate);
    };
  }, []);

  const updateState = useCallback((updates: Partial<GlobalState>) => {
    const w = window as any;
    if (w.CoreUtils && w.CoreUtils.state) {
      Object.assign(w.CoreUtils.state, updates);
      setState(prev => ({ ...prev, ...updates }));

      // Emit event for other listeners
      window.dispatchEvent(new CustomEvent('agro-state-update', { detail: updates }));
    }
  }, []);

  const getState = useCallback((key: keyof GlobalState) => {
    return state[key];
  }, [state]);

  return { state, updateState, getState };
}
