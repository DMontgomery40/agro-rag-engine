/**
 * useEmbeddingStatus Hook
 * 
 * Detects embedding configuration mismatches between the current config
 * and what was used to create the index. This is CRITICAL because mismatched
 * embeddings will cause search to return completely irrelevant results.
 * 
 * The hook fetches from /api/index/stats which now includes:
 * - embedding_config: current configuration from env/config
 * - index_embedding_config: what the index was built with (from last_index.json)
 * - embedding_mismatch: boolean flag for quick checks
 * - embedding_mismatch_details: type/dimension comparison details
 */

import { useState, useEffect, useCallback } from 'react';

export interface EmbeddingStatus {
  // Current configuration (from agro_config.json / env)
  configType: string;
  configDim: number;
  configModel: string;
  
  // Index configuration (from last_index.json)
  indexType: string | null;
  indexDim: number | null;
  indexedAt: string | null;
  indexPath: string | null;
  
  // Mismatch status
  isMismatched: boolean;
  hasIndex: boolean;
  
  // Detailed comparison
  typeMatch: boolean;
  dimMatch: boolean;
  
  // Index stats
  totalChunks: number;
}

interface UseEmbeddingStatusResult {
  status: EmbeddingStatus | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useEmbeddingStatus(): UseEmbeddingStatusResult {
  const [status, setStatus] = useState<EmbeddingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const checkStatus = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch('/api/index/stats');
      if (!response.ok) {
        throw new Error(`Failed to fetch index stats: ${response.status}`);
      }

      const data = await response.json();

      // Extract current config
      const embeddingConfig = data.embedding_config || {};
      const configType = (embeddingConfig.provider || 'openai').toLowerCase();
      const configDim = embeddingConfig.dimensions || 3072;
      const configModel = embeddingConfig.model || 'text-embedding-3-large';

      // Extract index config (may be null if no index)
      const indexConfig = data.index_embedding_config;
      
      // Use explicit has_index flag from backend, fallback to checking index_embedding_config
      // This ensures we don't show "embeddings match" when there's no actual index
      const hasIndex = data.has_index === true || (indexConfig !== null && data.total_chunks > 0);

      // Get mismatch details
      const mismatchDetails = data.embedding_mismatch_details || {};

      const embeddingStatus: EmbeddingStatus = {
        configType,
        configDim,
        configModel,
        indexType: indexConfig?.provider || null,
        indexDim: indexConfig?.dimensions || null,
        indexedAt: indexConfig?.indexed_at || null,
        indexPath: indexConfig?.index_path || null,
        isMismatched: data.embedding_mismatch === true,
        hasIndex,
        typeMatch: mismatchDetails.type_match !== false,
        dimMatch: mismatchDetails.dim_match !== false,
        totalChunks: data.total_chunks || 0,
      };

      setStatus(embeddingStatus);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error checking embedding status');
      console.error('[useEmbeddingStatus] Error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Initial check on mount
  useEffect(() => {
    checkStatus();

    // Re-check on config changes and index completion
    const handleConfigChange = () => checkStatus();
    window.addEventListener('config-updated', handleConfigChange);
    window.addEventListener('index-completed', handleConfigChange);
    window.addEventListener('dashboard-refresh', handleConfigChange);

    return () => {
      window.removeEventListener('config-updated', handleConfigChange);
      window.removeEventListener('index-completed', handleConfigChange);
      window.removeEventListener('dashboard-refresh', handleConfigChange);
    };
  }, [checkStatus]);

  return {
    status,
    loading,
    error,
    refresh: checkStatus,
  };
}

