import { useState, useCallback, useMemo } from 'react';
import { MCPRagService, MCPRagResponse, MCPRagResult } from '../services/MCPRagService';
import { useAPI } from './useAPI';

/**
 * useMCPRag Hook
 * React hook for MCP RAG search operations
 * Converted from /web/src/modules/mcp_rag.js
 */
export function useMCPRag() {
  const { apiBase } = useAPI();
  const service = useMemo(() => new MCPRagService(apiBase), [apiBase]);

  const [isSearching, setIsSearching] = useState(false);
  const [results, setResults] = useState<MCPRagResult[]>([]);
  const [error, setError] = useState<string | null>(null);

  /**
   * Execute RAG search
   */
  const search = useCallback(async (
    query: string,
    options: {
      repo?: string;
      top_k?: number;
      force_local?: boolean;
    } = {}
  ): Promise<MCPRagResponse> => {
    setIsSearching(true);
    setError(null);

    try {
      const response = await service.search(query, options);

      if (response.results) {
        setResults(response.results);
      }

      if (response.error) {
        setError(response.error);
      }

      return response;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Search failed';
      setError(errorMsg);
      throw err;
    } finally {
      setIsSearching(false);
    }
  }, [service]);

  /**
   * Format results for display
   */
  const formatResults = useCallback((resultsToFormat?: MCPRagResult[]): string[] => {
    const data = resultsToFormat || results;
    return service.formatResults(data);
  }, [service, results]);

  /**
   * Clear results
   */
  const clearResults = useCallback(() => {
    setResults([]);
    setError(null);
  }, []);

  return {
    isSearching,
    results,
    error,
    search,
    formatResults,
    clearResults
  };
}
