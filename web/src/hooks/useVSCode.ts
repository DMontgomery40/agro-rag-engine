import { useState, useEffect, useCallback, useRef } from 'react';
import { useAPI } from './useAPI';
import { useGlobalState } from './useGlobalState';

/**
 * VSCode/Editor integration health data
 */
export interface EditorHealthData {
  ok: boolean;
  enabled: boolean;
  url: string | null;
  reason?: string;
  error?: string;
  readiness_stage?: 'ready' | 'startup_delay' | 'timeout' | 'connection_failed';
  uptime_seconds?: number;
}

/**
 * Editor settings from backend
 */
export interface EditorSettings {
  port: number;
  enabled: boolean;
  host: string;
}

/**
 * Hook for VSCode editor integration
 * Handles health checks, connection status, and editor controls
 */
export function useVSCode() {
  const { api } = useAPI();
  const { getState } = useGlobalState();
  const [healthData, setHealthData] = useState<EditorHealthData | null>(null);
  const [editorSettings, setEditorSettings] = useState<EditorSettings>({
    port: 4440,
    enabled: true,
    host: '127.0.0.1'
  });
  const [isConnected, setIsConnected] = useState(false);
  const [editorUrl, setEditorUrl] = useState<string | null>(null);
  const healthIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const iframeLoadAttempts = useRef(0);

  /**
   * Check if editor embedding is enabled based on environment and settings
   */
  const isEmbeddingEnabled = useCallback((): boolean => {
    try {
      const config = getState('config');
      const ci = String(config?.env?.CI ?? '').toLowerCase();
      if (ci === '1' || ci === 'true' || ci === 'yes') return false;

      const envVal = String(config?.env?.EDITOR_EMBED_ENABLED ?? '1');
      return envVal === '1' || envVal.toLowerCase() === 'true';
    } catch {
      return editorSettings.enabled;
    }
  }, [editorSettings.enabled, getState]);

  /**
   * Check editor health status
   */
  const checkHealth = useCallback(async (): Promise<EditorHealthData | null> => {
    try {
      const response = await fetch(api('/health/editor'));
      const data = await response.json() as EditorHealthData;

      setHealthData(data);
      setIsConnected(data.ok);
      setEditorUrl(data.url);

      return data;
    } catch (error) {
      console.error('[useVSCode] Failed to check health:', error);
      const errorData: EditorHealthData = {
        ok: false,
        enabled: false,
        url: null,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
      setHealthData(errorData);
      setIsConnected(false);
      return errorData;
    }
  }, [api]);

  /**
   * Load editor settings from backend
   */
  const loadSettings = useCallback(async (): Promise<EditorSettings> => {
    try {
      const response = await fetch(api('/api/editor/settings'));
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      if (data.ok) {
        const settings: EditorSettings = {
          port: data.port || 4440,
          enabled: data.enabled !== false,
          host: data.host || '127.0.0.1'
        };
        setEditorSettings(settings);
        return settings;
      }
    } catch (error) {
      console.warn('[useVSCode] Failed to load settings, using defaults:', error);
    }
    return editorSettings;
  }, [api, editorSettings]);

  /**
   * Save editor settings to backend
   */
  const saveSettings = useCallback(async (updates: Partial<EditorSettings>): Promise<boolean> => {
    try {
      // Optimistic update
      setEditorSettings(prev => ({ ...prev, ...updates }));

      const response = await fetch(api('/api/editor/settings'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      if (data.ok) {
        console.log('[useVSCode] Settings saved:', updates);
        return true;
      } else {
        throw new Error(data.error || 'Save failed');
      }
    } catch (error) {
      console.error('[useVSCode] Failed to save settings:', error);
      // Revert on error - reload from backend
      await loadSettings();
      return false;
    }
  }, [api, loadSettings]);

  /**
   * Open editor in new window
   */
  const openInNewWindow = useCallback(async () => {
    try {
      const health = await checkHealth();
      if (health?.url) {
        window.open(health.url, '_blank');
      } else {
        alert('Editor URL not available');
      }
    } catch (error) {
      console.error('[useVSCode] Failed to open editor window:', error);
    }
  }, [checkHealth]);

  /**
   * Copy editor URL to clipboard
   */
  const copyUrl = useCallback(async (): Promise<boolean> => {
    try {
      const health = await checkHealth();
      if (health?.url) {
        await navigator.clipboard.writeText(health.url);
        return true;
      } else {
        alert('Editor URL not available');
        return false;
      }
    } catch (error) {
      console.error('[useVSCode] Failed to copy URL:', error);
      return false;
    }
  }, [checkHealth]);

  /**
   * Restart editor service
   */
  const restart = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(api('/api/editor/restart'), { method: 'POST' });
      const data = await response.json();

      if (data.ok) {
        // Reset iframe load attempts
        iframeLoadAttempts.current = 0;

        // Wait for service to restart then check health
        setTimeout(() => {
          checkHealth();
        }, 3000);

        return true;
      } else {
        console.error('[useVSCode] Restart failed:', data.error || data.stderr);
        alert('Restart failed: ' + (data.error || 'Unknown error'));
        return false;
      }
    } catch (error) {
      console.error('[useVSCode] Failed to restart editor:', error);
      alert('Restart failed: ' + (error instanceof Error ? error.message : 'Unknown error'));
      return false;
    }
  }, [api, checkHealth]);

  /**
   * Start periodic health checks
   */
  const startHealthCheck = useCallback(() => {
    if (!healthIntervalRef.current) {
      checkHealth(); // Initial check
      healthIntervalRef.current = setInterval(() => {
        checkHealth();
      }, 10000); // Every 10 seconds
    }
  }, [checkHealth]);

  /**
   * Stop periodic health checks
   */
  const stopHealthCheck = useCallback(() => {
    if (healthIntervalRef.current) {
      clearInterval(healthIntervalRef.current);
      healthIntervalRef.current = null;
    }
  }, []);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    loadSettings();
    checkHealth();

    return () => {
      stopHealthCheck();
    };
  }, [loadSettings, checkHealth, stopHealthCheck]);

  return {
    // State
    healthData,
    editorSettings,
    isConnected,
    editorUrl,
    isEmbeddingEnabled: isEmbeddingEnabled(),

    // Actions
    checkHealth,
    loadSettings,
    saveSettings,
    openInNewWindow,
    copyUrl,
    restart,
    startHealthCheck,
    stopHealthCheck
  };
}
