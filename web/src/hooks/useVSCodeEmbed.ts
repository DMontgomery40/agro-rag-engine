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
  const [retryCount, setRetryCount] = useState(0);
  const [copyButtonText, setCopyButtonText] = useState('Copy URL');
  const [isRestarting, setIsRestarting] = useState(false);
  const healthIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const { api } = useAPI();
  const { handleError } = useErrorHandler();

  const checkHealth = useCallback(async () => {
    console.log('[useVSCodeEmbed] Running health check...');
    try {
      const response = await fetch(api('/health/editor'));

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data: EditorHealth = await response.json();
      console.log('[useVSCodeEmbed] Health check result:', data);

      // Validate response structure
      if (typeof data.ok !== 'boolean' || typeof data.enabled !== 'boolean') {
        throw new Error('Invalid health response format');
      }

      setHealthData(data);
      setIsLoading(false);

      // Reset retry count on successful health check
      if (data.ok) {
        setRetryCount(0);
      }

      // Update iframe URL if editor is healthy and ready
      if (data.ok && data.readiness_stage === 'ready' && data.url) {
        console.log('[useVSCodeEmbed] Editor is ready, setting iframe URL:', data.url);
        setIframeUrl(data.url);
      } else if (!data.ok) {
        console.log('[useVSCodeEmbed] Editor not healthy, clearing iframe URL');
        setIframeUrl('');
        // Increment retry count for exponential backoff
        setRetryCount(prev => Math.min(prev + 1, 5)); // Cap at 5 retries
      }

      return data;
    } catch (error) {
      console.error('[useVSCodeEmbed] Health check failed:', error);
      const errorMessage = error instanceof Error ? error.message : 'Health check failed';
      setHealthData({
        ok: false,
        enabled: false,
        error: errorMessage
      });
      setIsLoading(false);
      setRetryCount(prev => Math.min(prev + 1, 5)); // Cap at 5 retries
      return null;
    }
  }, [api]);

  const startHealthCheck = useCallback(() => {
    if (healthIntervalRef.current) return;

    // Initial check immediately
    checkHealth();

    // Use exponential backoff: 10s, 20s, 40s, 80s, 160s, max 300s (5 min)
    const getInterval = () => {
      const baseInterval = 10000; // 10 seconds
      const exponentialDelay = Math.min(baseInterval * Math.pow(2, retryCount), 300000);
      console.log(`[useVSCodeEmbed] Next health check in ${exponentialDelay / 1000}s (retry count: ${retryCount})`);
      return exponentialDelay;
    };

    const scheduleNext = () => {
      if (healthIntervalRef.current) {
        clearTimeout(healthIntervalRef.current);
      }
      healthIntervalRef.current = setTimeout(async () => {
        await checkHealth();
        scheduleNext();
      }, getInterval());
    };

    scheduleNext();
  }, [checkHealth, retryCount]);

  const stopHealthCheck = useCallback(() => {
    if (healthIntervalRef.current) {
      clearTimeout(healthIntervalRef.current);
      healthIntervalRef.current = null;
      console.log('[useVSCodeEmbed] Health check polling stopped');
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
        setCopyButtonText('Copied!');
        setTimeout(() => {
          setCopyButtonText('Copy URL');
        }, 2000);
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
    setIsRestarting(true);
    console.log('[useVSCodeEmbed] Restarting editor...');
    try {
      const response = await fetch(api('/api/editor/restart'), { method: 'POST' });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      console.log('[useVSCodeEmbed] Restart response:', data);

      if (data.ok !== false) { // Consider ok if not explicitly false
        setIframeUrl('');
        setRetryCount(0); // Reset retry count on restart
        // Wait a bit then trigger health check
        setTimeout(() => {
          checkHealth();
          setIsRestarting(false);
        }, 3000);
        return true;
      } else {
        console.error('[useVSCodeEmbed] Restart failed:', data.error || data.stderr);
        alert('Restart failed: ' + (data.error || data.stderr || 'Unknown error'));
        setIsRestarting(false);
        return false;
      }
    } catch (error) {
      console.error('[useVSCodeEmbed] Failed to restart editor:', error);
      handleError(error);
      alert('Restart failed: ' + (error as Error).message);
      setIsRestarting(false);
      return false;
    }
  }, [api, checkHealth, handleError]);

  // Start health check on mount, stop on unmount
  // Restart when retryCount changes to apply new backoff interval
  useEffect(() => {
    stopHealthCheck(); // Clear any existing interval
    startHealthCheck();
    return () => stopHealthCheck();
  }, [retryCount]); // Dependency on retryCount to restart with new interval

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
    copyButtonText,
    isRestarting,
    checkHealth,
    openInWindow,
    copyUrl,
    restart
  };
}
