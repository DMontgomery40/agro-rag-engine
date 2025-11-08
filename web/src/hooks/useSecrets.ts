import { useState, useCallback, useEffect } from 'react';
import { useAPI } from './useAPI';
import { useErrorHandler } from './useErrorHandler';

export interface Secret {
  key: string;
  value: string;
  masked: boolean;
}

export interface SecretsState {
  secrets: Record<string, Secret>;
  isLoading: boolean;
  error: string | null;
}

/**
 * Hook for managing secrets and .env file ingestion
 * Handles drag & drop upload and secrets persistence
 */
export function useSecrets() {
  const [secrets, setSecrets] = useState<Record<string, Secret>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { api } = useAPI();
  const { handleApiError } = useErrorHandler();

  /**
   * Load secrets from environment config
   * Backend sends full env snapshot via /api/config
   */
  const loadSecrets = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(api('/api/config'));
      if (!response.ok) {
        throw new Error(`Failed to load config: ${response.status}`);
      }
      const data = await response.json();
      const env = data.env || {};

      // Convert env vars to Secret objects
      const secretsMap: Record<string, Secret> = {};
      const sensitiveKeys = [
        'API_KEY', 'SECRET', 'TOKEN', 'PASSWORD', 'PASS',
        'NETLIFY_API_KEY', 'LANGCHAIN_API_KEY', 'LANGSMITH_API_KEY',
        'ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'LANGTRACE_API_KEY'
      ];

      Object.keys(env).forEach((key) => {
        const value = String(env[key] || '');
        const isSensitive = sensitiveKeys.some(sk => key.toUpperCase().includes(sk));
        secretsMap[key] = {
          key,
          value,
          masked: isSensitive
        };
      });

      setSecrets(secretsMap);
      setIsLoading(false);
    } catch (err) {
      const errorMsg = handleApiError(err, 'Load secrets');
      setError(errorMsg);
      setIsLoading(false);
      console.error('[useSecrets] Load failed:', err);
    }
  }, [api, handleApiError]);

  /**
   * Ingest a secrets file (.env format)
   * @param file - File object to upload
   * @param persist - Whether to persist to .env file on disk
   */
  const ingestFile = useCallback(async (file: File, persist: boolean = false): Promise<boolean> => {
    setIsLoading(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('persist', String(persist));

      const response = await fetch(api('/api/secrets/ingest'), {
        method: 'POST',
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Ingest failed: ${response.status}`);
      }

      const data = await response.json();
      console.log('[useSecrets] Ingest result:', data);

      // Reload secrets to get updated environment
      await loadSecrets();
      setIsLoading(false);
      return true;
    } catch (err) {
      const errorMsg = handleApiError(err, 'Ingest secrets file');
      setError(errorMsg);
      setIsLoading(false);
      console.error('[useSecrets] Ingest failed:', err);
      return false;
    }
  }, [api, handleApiError, loadSecrets]);

  /**
   * Update a single secret value
   * Note: This updates the in-memory environment only, not persisted to disk
   */
  const updateSecret = useCallback((key: string, value: string) => {
    setSecrets(prev => ({
      ...prev,
      [key]: {
        key,
        value,
        masked: prev[key]?.masked ?? false
      }
    }));
  }, []);

  /**
   * Toggle masked state for a secret
   */
  const toggleMask = useCallback((key: string) => {
    setSecrets(prev => {
      if (!prev[key]) return prev;
      return {
        ...prev,
        [key]: {
          ...prev[key],
          masked: !prev[key].masked
        }
      };
    });
  }, []);

  /**
   * Delete a secret from state
   * Note: This is UI-only, does not persist to backend
   */
  const deleteSecret = useCallback((key: string) => {
    setSecrets(prev => {
      const updated = { ...prev };
      delete updated[key];
      return updated;
    });
  }, []);

  // Load secrets on mount
  useEffect(() => {
    loadSecrets();
  }, [loadSecrets]);

  return {
    secrets,
    isLoading,
    error,
    loadSecrets,
    ingestFile,
    updateSecret,
    toggleMask,
    deleteSecret
  };
}
