import { useState, useEffect } from 'react';

/**
 * Hook for app initialization
 * Handles loading prices, config, profiles, keywords, and commit metadata
 * Triggers initial health checks and dashboard refresh
 */
export function useAppInit() {
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    const init = async () => {
      try {
        console.log('[useAppInit] Starting app initialization...');

        // Wait for CoreUtils to be available (loaded by legacy modules)
        let attempts = 0;
        while (!(window as any).CoreUtils && attempts < 50) {
          await new Promise(resolve => setTimeout(resolve, 100));
          attempts++;
        }

        if (!(window as any).CoreUtils) {
          throw new Error('CoreUtils module did not load');
        }

        const { api } = (window as any).CoreUtils;

        // Load initial data in parallel
        await Promise.all([
          // Load prices.json for cost estimation
          fetch(api('/api/prices'))
            .then(r => r.json())
            .then(prices => {
              if ((window as any).CoreUtils.state) {
                (window as any).CoreUtils.state.prices = prices;
              }
            })
            .catch(err => console.warn('Failed to load prices:', err)),

          // Load config
          fetch(api('/api/config'))
            .then(r => r.json())
            .then(config => {
              if ((window as any).CoreUtils.state) {
                (window as any).CoreUtils.state.config = config;
              }
            })
            .catch(err => console.warn('Failed to load config:', err)),

          // Load profiles
          fetch(api('/api/profiles'))
            .then(r => r.json())
            .then(data => {
              if ((window as any).CoreUtils.state) {
                (window as any).CoreUtils.state.profiles = data.profiles || [];
                (window as any).CoreUtils.state.defaultProfile = data.default || null;
              }
            })
            .catch(err => console.warn('Failed to load profiles:', err)),

          // Load keywords if available
          (window as any).Keywords?.loadKeywords?.()
            .catch((err: Error) => console.warn('Failed to load keywords:', err)),

          // Load commit metadata if available
          (window as any).GitCommitMeta?.loadCommitMeta?.()
            .catch((err: Error) => console.warn('Failed to load commit meta:', err))
        ]);

        // Trigger initial checks
        if ((window as any).Health?.checkHealth) {
          await (window as any).Health.checkHealth().catch((err: Error) =>
            console.warn('Initial health check failed:', err)
          );
        }

        if ((window as any).Autotune?.refreshAutotune) {
          await (window as any).Autotune.refreshAutotune().catch((err: Error) =>
            console.warn('Failed to refresh autotune:', err)
          );
        }

        // Initialize UI helpers
        if ((window as any).UiHelpers?.wireDayConverters) {
          (window as any).UiHelpers.wireDayConverters();
        }

        // Initialize git hooks status
        if ((window as any).GitHooks?.refreshHooksStatus) {
          await (window as any).GitHooks.refreshHooksStatus().catch((err: Error) =>
            console.warn('Failed to refresh git hooks:', err)
          );
        }

        console.log('[useAppInit] Initialization complete');
        setIsInitialized(true);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        console.error('[useAppInit] Initialization failed:', err);
        setInitError(message);
        // Still set initialized to true to prevent blocking the UI
        setIsInitialized(true);
      }
    };

    // Wait for React to be ready and modules to load
    if (document.readyState === 'loading') {
      window.addEventListener('DOMContentLoaded', init);
      return () => window.removeEventListener('DOMContentLoaded', init);
    } else {
      // Give modules a moment to load
      setTimeout(init, 150);
    }
  }, []);

  return { isInitialized, initError };
}
