import { useState, useCallback, useMemo, useEffect } from 'react';
import { KeywordsService, KeywordsCatalog } from '../services/KeywordsService';
import { useAPI } from './useAPI';

/**
 * useKeywords Hook
 * React hook for managing discriminative keywords
 * Converted from /web/src/modules/keywords.js
 */
export function useKeywords() {
  const { apiBase } = useAPI();
  const service = useMemo(() => new KeywordsService(apiBase), [apiBase]);

  const [catalog, setCatalog] = useState<KeywordsCatalog | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  /**
   * Load keywords catalog
   */
  const loadKeywords = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await service.loadKeywords();
      setCatalog(data);
    } catch (error) {
      console.error('[useKeywords] Failed to load keywords:', error);
    } finally {
      setIsLoading(false);
    }
  }, [service]);

  /**
   * Filter keywords
   */
  const filterKeywords = useCallback((
    category: string = 'all',
    filter: string = '',
    excludeSet: Set<string> = new Set()
  ): string[] => {
    if (!catalog) return [];
    return service.filterKeywords(catalog, category, filter, excludeSet);
  }, [catalog, service]);

  /**
   * Get keyword count
   */
  const getCount = useCallback((): number => {
    return catalog?.keywords?.length || 0;
  }, [catalog]);

  /**
   * Initialize on mount
   */
  useEffect(() => {
    loadKeywords();
  }, [loadKeywords]);

  return {
    catalog,
    isLoading,
    loadKeywords,
    filterKeywords,
    getCount
  };
}
