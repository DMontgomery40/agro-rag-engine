/**
 * useConfig - Simple config hook for AGRO components
 * 
 * Uses the centralized configApi and Zustand store for:
 * - Single source of truth across all components
 * - Proper API routing (works in dev + Docker production)
 * - Pydantic validation error handling from backend
 * 
 * USAGE:
 *   const { get, set, loading, error } = useConfig();
 *   
 *   // Read a value (with type coercion and default)
 *   const finalK = get('FINAL_K', 10);           // number
 *   const model = get('GEN_MODEL', '');          // string
 *   
 *   // Write a value (auto-saves to backend via configApi)
 *   set('FINAL_K', 20);
 *   set('GEN_MODEL', 'gpt-4o');
 *   
 *   // Bulk update
 *   set({ FINAL_K: 20, GEN_MODEL: 'gpt-4o' });
 */

import { useEffect, useCallback, useRef, useState } from 'react';
import { useConfigStore } from '@/stores';
import { configApi } from '@/api';

// Debounce saves to avoid hammering the backend
const SAVE_DEBOUNCE_MS = 300;

export function useConfig() {
  const { 
    config, 
    loading, 
    error, 
    saving,
    loadConfig, 
    saveConfig,
    updateEnv 
  } = useConfigStore();
  
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingUpdates = useRef<Record<string, any>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  // Load config on mount if not loaded
  useEffect(() => {
    if (!config && !loading) {
      loadConfig();
    }
  }, [config, loading, loadConfig]);

  /**
   * Get a config value with type coercion
   */
  const get = useCallback(<T extends string | number | boolean>(
    key: string, 
    defaultValue: T
  ): T => {
    const env = config?.env || {};
    const rawValue = env[key];
    
    if (rawValue === undefined || rawValue === null || rawValue === '') {
      return defaultValue;
    }

    // Handle masked secrets
    if (rawValue === '••••••••••••••••') {
      return '' as T;
    }

    // Type coercion based on defaultValue type
    if (typeof defaultValue === 'number') {
      const num = parseFloat(String(rawValue));
      return (isNaN(num) ? defaultValue : num) as T;
    }
    
    if (typeof defaultValue === 'boolean') {
      const str = String(rawValue).toLowerCase();
      return (str === '1' || str === 'true' || str === 'on') as unknown as T;
    }
    
    return String(rawValue) as T;
  }, [config]);

  /**
   * Set config value(s) - debounced save to backend via configApi
   * Handles Pydantic validation errors from backend
   */
  const set = useCallback((
    keyOrUpdates: string | Record<string, any>,
    value?: any
  ) => {
    // Clear any previous validation error
    setValidationError(null);
    
    // Normalize to object
    const updates = typeof keyOrUpdates === 'string' 
      ? { [keyOrUpdates]: value }
      : keyOrUpdates;

    // Update local state immediately for responsive UI (optimistic update)
    Object.entries(updates).forEach(([k, v]) => {
      updateEnv(k, v);
      pendingUpdates.current[k] = v;
    });

    // Debounce the actual save
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      const toSave = { ...pendingUpdates.current };
      pendingUpdates.current = {};
      
      try {
        // Use the centralized configApi which handles routing for dev/docker
        await configApi.saveConfig({ env: toSave });
        
        // Reload to get any backend-normalized values
        await configApi.reloadEnv();
        await loadConfig();
        
        console.log('[useConfig] Saved:', Object.keys(toSave));
      } catch (err: any) {
        console.error('[useConfig] Save failed:', err);
        
        // Extract Pydantic validation error if present
        const detail = err?.response?.data?.detail || err?.message || 'Save failed';
        setValidationError(detail);
        
        // Reload to revert optimistic update
        await loadConfig();
      }
    }, SAVE_DEBOUNCE_MS);
  }, [updateEnv, loadConfig]);

  /**
   * Force immediate save (bypass debounce) - useful for "Apply" buttons
   */
  const saveNow = useCallback(async (updates: Record<string, any>) => {
    setValidationError(null);
    
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = null;
    }
    
    // Merge with any pending updates
    const allUpdates = { ...pendingUpdates.current, ...updates };
    pendingUpdates.current = {};
    
    // Update local state
    Object.entries(allUpdates).forEach(([k, v]) => updateEnv(k, v));
    
    try {
      // Save via configApi
      await configApi.saveConfig({ env: allUpdates });
      await configApi.reloadEnv();
      await loadConfig();
      
      console.log('[useConfig] Saved immediately:', Object.keys(allUpdates));
    } catch (err: any) {
      console.error('[useConfig] Immediate save failed:', err);
      
      const detail = err?.response?.data?.detail || err?.message || 'Save failed';
      setValidationError(detail);
      
      // Reload to revert
      await loadConfig();
      throw err; // Re-throw so caller knows it failed
    }
  }, [updateEnv, loadConfig]);

  /**
   * Reload config from backend
   */
  const reload = useCallback(async () => {
    setValidationError(null);
    await configApi.reloadEnv();
    return loadConfig();
  }, [loadConfig]);

  /**
   * Clear validation error
   */
  const clearError = useCallback(() => {
    setValidationError(null);
  }, []);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  return {
    // State
    config,
    loading,
    error: validationError || error, // Prefer validation error if present
    validationError,
    saving,
    
    // Simple API
    get,
    set,
    saveNow,
    reload,
    clearError,
    
    // Raw data for advanced use
    env: config?.env || {},
    repos: config?.repos || [],
    hints: (config as any)?.hints || {},
  };
}

/**
 * Hook for a single config field - even simpler API
 * 
 * USAGE:
 *   const [finalK, setFinalK] = useConfigField('FINAL_K', 10);
 */
export function useConfigField<T extends string | number | boolean>(
  key: string,
  defaultValue: T
): [T, (value: T) => void, { loading: boolean; error: string | null }] {
  const { get, set, loading, error } = useConfig();
  
  const value = get(key, defaultValue);
  const setValue = useCallback((newValue: T) => {
    set(key, newValue);
  }, [key, set]);
  
  return [value, setValue, { loading, error }];
}

export default useConfig;
