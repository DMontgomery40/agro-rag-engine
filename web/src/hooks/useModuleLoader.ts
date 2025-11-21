import { useState, useEffect } from 'react';

/**
 * Hook to track legacy module loading status
 * Note: The actual module loading is done in App.tsx for now
 * This hook just provides visibility into the loading state
 */
export function useModuleLoader() {
  const [modulesLoaded, setModulesLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadProgress, setLoadProgress] = useState<string>('Initializing...');

  useEffect(() => {
    let attempts = 0;
    const maxAttempts = 100; // 10 seconds max wait

    const checkModules = setInterval(() => {
      attempts++;

      // Check if core modules are available
      const w = window as any;
      const coreLoaded = !!w.CoreUtils;
      // Note: w.Tabs removed - using React Router instead of legacy tabs.js
      const uiLoaded = !!w.Theme && !!w.Search;
      const configLoaded = !!w.Config && !!w.Health;

      if (coreLoaded && !modulesLoaded) {
        setLoadProgress('Core modules loaded...');
      }

      if (uiLoaded && !modulesLoaded) {
        setLoadProgress('UI modules loaded...');
      }

      if (configLoaded && !modulesLoaded) {
        setLoadProgress('Configuration modules loaded...');
      }

      // Check if all critical modules are loaded
      if (coreLoaded && uiLoaded && configLoaded) {
        setLoadProgress('All modules loaded');
        setModulesLoaded(true);
        clearInterval(checkModules);
      } else if (attempts >= maxAttempts) {
        setLoadError('Timeout waiting for modules to load');
        setModulesLoaded(true); // Set to true anyway to unblock UI
        clearInterval(checkModules);
      }
    }, 100);

    return () => clearInterval(checkModules);
  }, [modulesLoaded]);

  return { modulesLoaded, loadError, loadProgress };
}
