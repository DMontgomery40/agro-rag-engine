import { useState, useCallback, useEffect } from 'react';
import { useAPI } from './useAPI';
import { useErrorHandler } from './useErrorHandler';

export interface LangSmithHealth {
  enabled: boolean;
  installed: boolean;
  project: string | null;
  endpoint: string;
  key_present: boolean;
  can_connect: boolean | null;
  identity: Record<string, any>;
  error: string | null;
}

export interface LangSmithRun {
  project: string | null;
  url: string | null;
  source: string;
  error?: string;
}

export interface LangSmithRunListItem {
  id: string;
  name?: string;
  url?: string;
  created_at?: string;
  status?: string;
}

/**
 * Hook for managing LangSmith integration
 * Handles health checks, latest run retrieval, and run listing
 */
export function useLangSmith() {
  const [health, setHealth] = useState<LangSmithHealth | null>(null);
  const [latestRun, setLatestRun] = useState<LangSmithRun | null>(null);
  const [runs, setRuns] = useState<LangSmithRunListItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { api } = useAPI();
  const { handleApiError } = useErrorHandler();

  /**
   * Check LangSmith health and connection status
   */
  const checkHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(api('/health/langsmith'));
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const data: LangSmithHealth = await response.json();
      setHealth(data);
      setIsLoading(false);
      return data;
    } catch (err) {
      const errorMsg = handleApiError(err, 'LangSmith health check');
      setError(errorMsg);
      setIsLoading(false);
      console.error('[useLangSmith] Health check failed:', err);
      return null;
    }
  }, [api, handleApiError]);

  /**
   * Get latest LangSmith run
   * @param project - Optional project name override
   * @param share - Whether to generate a shareable public URL
   */
  const getLatestRun = useCallback(async (project?: string, share: boolean = true): Promise<LangSmithRun | null> => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (project) params.set('project', project);
      params.set('share', String(share));

      const response = await fetch(api(`/api/langsmith/latest?${params.toString()}`));
      if (!response.ok) {
        throw new Error(`Failed to get latest run: ${response.status}`);
      }
      const data: LangSmithRun = await response.json();
      setLatestRun(data);
      setIsLoading(false);
      return data;
    } catch (err) {
      const errorMsg = handleApiError(err, 'Get latest LangSmith run');
      setError(errorMsg);
      setIsLoading(false);
      console.error('[useLangSmith] Get latest run failed:', err);
      return null;
    }
  }, [api, handleApiError]);

  /**
   * List recent LangSmith runs
   * @param project - Optional project name override
   * @param limit - Number of runs to fetch (1-50)
   * @param share - Whether to generate shareable URLs
   */
  const listRuns = useCallback(async (
    project?: string,
    limit: number = 10,
    share: boolean = false
  ): Promise<LangSmithRunListItem[]> => {
    setIsLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (project) params.set('project', project);
      params.set('limit', String(Math.max(1, Math.min(50, limit))));
      params.set('share', String(share));

      const response = await fetch(api(`/api/langsmith/runs?${params.toString()}`));
      if (!response.ok) {
        throw new Error(`Failed to list runs: ${response.status}`);
      }
      const data = await response.json();
      const runsList = data.runs || [];
      setRuns(runsList);
      setIsLoading(false);
      return runsList;
    } catch (err) {
      const errorMsg = handleApiError(err, 'List LangSmith runs');
      setError(errorMsg);
      setIsLoading(false);
      console.error('[useLangSmith] List runs failed:', err);
      return [];
    }
  }, [api, handleApiError]);

  /**
   * Test LangSmith connection
   * Returns true if connected and working, false otherwise
   */
  const testConnection = useCallback(async (): Promise<boolean> => {
    const healthData = await checkHealth();
    return !!(healthData?.can_connect && healthData?.enabled);
  }, [checkHealth]);

  /**
   * Get current LangSmith configuration from environment
   */
  const getConfig = useCallback((): { project: string | null; enabled: boolean } => {
    return {
      project: health?.project || null,
      enabled: health?.enabled || false
    };
  }, [health]);

  // Load health status on mount
  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return {
    health,
    latestRun,
    runs,
    isLoading,
    error,
    checkHealth,
    getLatestRun,
    listRuns,
    testConnection,
    getConfig
  };
}
