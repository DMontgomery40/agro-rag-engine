import { useState, useCallback, useEffect, useRef } from 'react';
import { useAPI } from './useAPI';
import { useErrorHandler } from './useErrorHandler';

export interface EditorHealth {
  ok: boolean;
  enabled: boolean;
  url?: string;
  reason?: string;
  error?: string;
  readiness_stage?: string;
  uptime_seconds?: number;
}

/**
 * Hook for managing embedded VS Code server iframe
 */
export function useVSCodeEmbed() {
  const [healthData, setHealthData] = useState<EditorHealth | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [iframeUrl, setIframeUrl] = useState('');
  const healthIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { api } = useAPI();
  const { handleError } = useErrorHandler();

  const checkHealth = useCallback(async () => {
    try {
      const response = await fetch(api('/health/editor'));
      const data: EditorHealth = await response.json();
      setHealthData(data);
      setIsLoading(false);

      // Update iframe URL if editor is healthy and ready
      if (data.ok && data.readiness_stage === 'ready' && data.url) {
        setIframeUrl(data.url);
      } else if (!data.ok) {
        setIframeUrl('');
      }

      return data;
    } catch (error) {
      console.error('[useVSCodeEmbed] Health check failed:', error);
      setHealthData({
        ok: false,
        enabled: false,
        error: 'Health check failed'
      });
      setIsLoading(false);
      return null;
    }
  }, [api]);

  const startHealthCheck = useCallback(() => {
    if (healthIntervalRef.current) return;

    checkHealth();
    healthIntervalRef.current = setInterval(checkHealth, 10000);
  }, [checkHealth]);

  const stopHealthCheck = useCallback(() => {
    if (healthIntervalRef.current) {
      clearInterval(healthIntervalRef.current);
      healthIntervalRef.current = null;
    }
  }, []);

  const openInWindow = useCallback(async () => {
    try {
      const response = await fetch(api('/health/editor'));
      const data: EditorHealth = await response.json();

      if (data.url) {
        window.open(data.url, '_blank');
      } else {
        alert('Editor URL not available');
      }
    } catch (error) {
      console.error('[useVSCodeEmbed] Failed to open editor window:', error);
      handleError(error);
    }
  }, [api, handleError]);

  const copyUrl = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(api('/health/editor'));
      const data: EditorHealth = await response.json();

      if (data.url) {
        await navigator.clipboard.writeText(data.url);
        return true;
      } else {
        alert('Editor URL not available');
        return false;
      }
    } catch (error) {
      console.error('[useVSCodeEmbed] Failed to copy URL:', error);
      handleError(error);
      return false;
    }
  }, [api, handleError]);

  const restart = useCallback(async (): Promise<boolean> => {
    try {
      const response = await fetch(api('/api/editor/restart'), { method: 'POST' });
      const data = await response.json();

      if (data.ok) {
        setIframeUrl('');
        setTimeout(() => {
          checkHealth();
        }, 3000);
        return true;
      } else {
        console.error('[useVSCodeEmbed] Restart failed:', data.error || data.stderr);
        alert('Restart failed: ' + (data.error || 'Unknown error'));
        return false;
      }
    } catch (error) {
      console.error('[useVSCodeEmbed] Failed to restart editor:', error);
      handleError(error);
      alert('Restart failed: ' + (error as Error).message);
      return false;
    }
  }, [api, checkHealth, handleError]);

  // Start health check on mount, stop on unmount
  useEffect(() => {
    startHealthCheck();
    return () => stopHealthCheck();
  }, [startHealthCheck, stopHealthCheck]);

  const getStatusMessage = useCallback(() => {
    if (!healthData) return 'Checking...';

    if (healthData.ok) return 'Healthy';

    if (!healthData.enabled) return 'Disabled';

    if (healthData.readiness_stage === 'startup_delay') {
      return `Initializing (${healthData.uptime_seconds}s uptime)...`;
    }

    if (healthData.readiness_stage === 'timeout') {
      return 'Service timeout - may still be starting up';
    }

    if (healthData.readiness_stage === 'connection_failed') {
      return 'Cannot connect to service';
    }

    return healthData.reason || healthData.error || 'Unknown error';
  }, [healthData]);

  const getStatusColor = useCallback(() => {
    if (!healthData) return 'var(--fg-muted)';
    if (healthData.ok) return 'var(--accent)';
    if (!healthData.enabled) return 'var(--fg-muted)';
    return 'var(--err)';
  }, [healthData]);

  return {
    healthData,
    isLoading,
    iframeUrl,
    isHealthy: healthData?.ok ?? false,
    isEnabled: healthData?.enabled ?? false,
    statusMessage: getStatusMessage(),
    statusColor: getStatusColor(),
    checkHealth,
    openInWindow,
    copyUrl,
    restart
  };
}
