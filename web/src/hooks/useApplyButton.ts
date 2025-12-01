import { useState, useEffect, useCallback, useRef } from 'react';
import { useConfigStore } from '@/stores';

/**
 * Hook for managing the sidepanel Apply button
 * ADA CRITICAL: This button saves all settings changes
 * Must be fully functional for accessibility compliance
 */
export function useApplyButton() {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const baselineRef = useRef<string | null>(null);

  // Local snapshots of Zustand store state (avoids adding an extra hook to App)
  const [configSnapshot, setConfigSnapshot] = useState(useConfigStore.getState().config);
  const [storeSaving, setStoreSaving] = useState(useConfigStore.getState().saving);
  const [storeError, setStoreError] = useState<string | null>(
    useConfigStore.getState().error ? String(useConfigStore.getState().error) : null
  );

  // Track form changes to enable/disable Apply button
  useEffect(() => {
    const handleFormChange = () => {
      setIsDirty(true);
      setSaveError(null);
    };

    // Listen for input and change events on the document
    document.addEventListener('input', handleFormChange);
    document.addEventListener('change', handleFormChange);

    // Listen for custom dirty events from modules
    window.addEventListener('agro-form-dirty', handleFormChange);

    return () => {
      document.removeEventListener('input', handleFormChange);
      document.removeEventListener('change', handleFormChange);
      window.removeEventListener('agro-form-dirty', handleFormChange);
    };
  }, []);

  // Subscribe to Zustand store for config/saving/error without adding extra hooks
  useEffect(() => {
    const unsubConfig = useConfigStore.subscribe(
      state => state.config,
      cfg => {
        setConfigSnapshot(cfg);
        // set baseline if first time
        if (cfg && !baselineRef.current) {
          baselineRef.current = JSON.stringify(cfg);
        }
      }
    );
    const unsubSaving = useConfigStore.subscribe(
      state => state.saving,
      saving => setStoreSaving(saving)
    );
    const unsubError = useConfigStore.subscribe(
      state => state.error,
      err => setStoreError(err ? String(err) : null)
    );
    return () => {
      unsubConfig();
      unsubSaving();
      unsubError();
    };
  }, []);

  // Keep baseline snapshot for dirty comparison
  useEffect(() => {
    if (configSnapshot && !baselineRef.current) {
      baselineRef.current = JSON.stringify(configSnapshot);
    }
  }, [configSnapshot]);

  // Mark dirty when config diverges from baseline
  useEffect(() => {
    if (!configSnapshot || !baselineRef.current) return;
    const snapshot = JSON.stringify(configSnapshot);
    setIsDirty(snapshot !== baselineRef.current);
  }, [configSnapshot]);

  // Ensure config is loaded on mount
  useEffect(() => {
    if (!configSnapshot && !storeSaving) {
      useConfigStore.getState().loadConfig().catch(() => {});
    }
  }, [configSnapshot, storeSaving]);

  const handleApply = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const w = window as any;

      // Ensure we have the latest Pydantic-backed config
      if (!useConfigStore.getState().config) {
        await useConfigStore.getState().loadConfig();
      }
      const currentConfig = useConfigStore.getState().config;
      if (!currentConfig) {
        throw new Error('Configuration not loaded');
      }

      // Start with Zustand/Pydantic config as source of truth
      const mergedEnv = { ...(currentConfig.env || {}) };
      let mergedRepos = currentConfig.repos || [];

      // Merge any legacy DOM form data (if present)
      if (w.Config?.gatherConfigForm) {
        const legacy = w.Config.gatherConfigForm();
        if (legacy === null) {
          throw new Error('Invalid legacy form data');
        }
        if (legacy?.env) {
          Object.assign(mergedEnv, legacy.env);
        }
        if (Array.isArray(legacy?.repos) && legacy.repos.length) {
          mergedRepos = legacy.repos;
        }
      }

      // Save via Pydantic/Zustand pipeline
      await useConfigStore.getState().saveConfig({
        env: mergedEnv,
        repos: mergedRepos
      });

      // Refresh snapshot after save
      const savedConfig = useConfigStore.getState().config || {
        env: mergedEnv,
        repos: mergedRepos
      };
      baselineRef.current = JSON.stringify(savedConfig);

      setIsDirty(false);
      console.log('[useApplyButton] Configuration saved successfully');

      // Show success status if available
      if (w.showStatus) {
        w.showStatus('Settings saved successfully', 'success');
      }

      // Emit success event for any listeners
      window.dispatchEvent(new CustomEvent('agro-config-saved', { detail: savedConfig }));

      return savedConfig;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      console.error('[useApplyButton] Failed to save configuration:', err);
      setSaveError(message);

      // Show error status if available
      const w = window as any;
      if (w.showStatus) {
        w.showStatus(`Failed to save: ${message}`, 'error');
      } else {
        alert(`Failed to save settings: ${message}`);
      }

      throw err;
    } finally {
      setIsSaving(false);
    }
  }, []);

  // Provide a way to manually mark as dirty (for programmatic changes)
  const markDirty = useCallback(() => {
    setIsDirty(true);
  }, []);

  // Provide a way to manually mark as clean (after save)
  const markClean = useCallback(() => {
    setIsDirty(false);
    setSaveError(null);
  }, []);

  return {
    handleApply,
    isDirty,
    isSaving: isSaving || storeSaving,
    saveError: saveError || (storeError ? String(storeError) : null),
    markDirty,
    markClean
  };
}
