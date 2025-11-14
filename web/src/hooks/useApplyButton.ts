import { useState, useEffect, useCallback } from 'react';

/**
 * Hook for managing the sidepanel Apply button
 * ADA CRITICAL: This button saves all settings changes
 * Must be fully functional for accessibility compliance
 */
export function useApplyButton() {
  const [isDirty, setIsDirty] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

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

  const handleApply = useCallback(async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const w = window as any;

      // Check if Config module is available
      if (!w.Config || !w.Config.gatherConfigForm || !w.Config.saveConfig) {
        throw new Error('Config module not loaded');
      }

      // Gather form data using the legacy Config module
      const formData = w.Config.gatherConfigForm();

      // Get API helper
      const api = w.CoreUtils?.api;
      if (!api) {
        throw new Error('CoreUtils.api not available');
      }

      // Save configuration
      const response = await fetch(api('/api/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ detail: 'Unknown error' }));
        throw new Error(errorData.detail || `HTTP ${response.status}`);
      }

      const result = await response.json();

      // Update state
      if (w.CoreUtils && w.CoreUtils.state) {
        w.CoreUtils.state.config = result;
      }

      // Emit success event
      window.dispatchEvent(new CustomEvent('agro-config-saved', { detail: result }));

      setIsDirty(false);
      console.log('[useApplyButton] Configuration saved successfully');

      // Show success status if available
      if (w.showStatus) {
        w.showStatus('Settings saved successfully', 'success');
      }

      return result;
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
    isSaving,
    saveError,
    markDirty,
    markClean
  };
}
