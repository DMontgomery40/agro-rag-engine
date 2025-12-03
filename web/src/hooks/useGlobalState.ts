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
/**
 * ---agentspec
 * what: |
 *   Custom React hook that manages global application state synchronized with window.CoreUtils.state.
 *   Takes no parameters; returns an object containing [state, setState] tuple matching React useState pattern.
 *   Initializes local state from window.CoreUtils.state on mount via useEffect.
 *   Syncs state bidirectionally: local updates propagate to window.CoreUtils.state, and external changes to window.CoreUtils.state update local state.
 *   Handles edge case where window.CoreUtils or window.CoreUtils.state may be undefined by gracefully skipping sync.
 *
 * why: |
 *   Provides a bridge between React component state and global window-level state, enabling cross-component and cross-frame communication.
 *   Centralizes state management logic in a reusable hook rather than duplicating sync logic across components.
 *   The useEffect dependency pattern ensures state stays synchronized without manual intervention.
 *
 * guardrails:
 *   - DO NOT assume window.CoreUtils.state exists at component mount; always check for undefined before accessing to prevent runtime errors
 *   - ALWAYS include cleanup logic in useEffect to prevent memory leaks and stale closures when component unmounts
 *   - NOTE: Bidirectional sync can cause infinite loops if setState triggers a window.CoreUtils.state update that triggers setState again; document the sync direction clearly
 *   - ASK USER: Confirm the intended sync direction (one-way from window to React, one-way from React to window, or bidirectional) before completing implementation
 * ---/agentspec
 */
export function useGlobalState() {
  const [state, setState] = useState<Partial<GlobalState>>({});

  // Sync with window.CoreUtils.state
  useEffect(() => {
    /**
     * ---agentspec
     * what: |
     *   Synchronizes React component state with global window.CoreUtils state object.
     *   Reads five properties from window.CoreUtils.state (config, prices, profiles, defaultProfile, hwScan) and updates local React state via setState.
     *   Takes no parameters and returns void; executes synchronously with no return value.
     *   Assumes window.CoreUtils exists and has a state property; silently fails if CoreUtils is undefined (no error thrown).
     *   Edge case: If CoreUtils exists but state is falsy, setState is never called and component state remains unchanged.
     *
     * why: |
     *   Bridges global singleton state (CoreUtils) with React component lifecycle by creating a synchronization point.
     *   Avoids prop drilling by reading directly from window, but creates tight coupling to global object.
     *   This pattern is common in legacy codebases migrating from global state to React, though it violates React best practices.
     *
     * guardrails:
     *   - DO NOT rely on this pattern for new features; migrate to Context API or state management library instead because window globals are hard to test and debug
     *   - ALWAYS call syncState() after CoreUtils.state is mutated externally to keep React state in sync, or add a listener/observer pattern
     *   - NOTE: Type casting `window as any` bypasses TypeScript safety; CoreUtils may not exist at runtime, causing silent failures
     *   - ASK USER: Before expanding this function, confirm whether CoreUtils is the source of truth or if state should flow through React; this determines if syncState should be a one-time init or a continuous listener
     * ---/agentspec
     */
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
    const interval = setInterval(syncState, 2000); // poll every 2 seconds

    // Listen for custom state update events
    /**
     * ---agentspec
     * what: |
     *   Sets up event listeners and intervals for state synchronization in a React component.
     *   Registers a custom 'agro-state-update' event listener that triggers syncState() when fired.
     *   Also establishes a periodic interval (interval variable, duration unspecified in snippet) that calls syncState().
     *   Returns a cleanup function that clears the interval and removes the event listener to prevent memory leaks.
     *   Runs once on component mount due to empty dependency array [].
     *
     * why: |
     *   Dual synchronization approach ensures state stays current both on-demand (via custom events) and periodically (via interval).
     *   Cleanup function prevents memory leaks by removing listeners and clearing intervals when component unmounts.
     *   Empty dependency array ensures setup runs exactly once per component lifecycle, avoiding duplicate listeners.
     *
     * guardrails:
     *   - DO NOT remove the cleanup function return; it will cause memory leaks and duplicate event listeners on remounts
     *   - ALWAYS specify the interval duration explicitly (currently missing); undocumented timing makes behavior unpredictable
     *   - NOTE: Custom 'agro-state-update' event must be fired elsewhere in the codebase; if never triggered, only periodic sync occurs
     *   - ASK USER: Confirm the intended interval duration (ms) and whether dual sync (event + interval) is necessary or if one mechanism suffices
     * ---/agentspec
     */
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
