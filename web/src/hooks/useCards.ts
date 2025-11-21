import { useState, useCallback, useEffect } from 'react';
import { useAPI } from './useAPI';
import type {
  Card,
  CardsResponse,
  CardsBuildOptions,
  LastBuild,
  CardsBuildStatus
} from '@/types/cards';

export function useCards() {
  const { api } = useAPI();
  const [cards, setCards] = useState<Card[]>([]);
  const [lastBuild, setLastBuild] = useState<LastBuild | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isBuilding, setIsBuilding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const response = await fetch(api('/api/cards'));
      if (!response.ok) {
        throw new Error(`Failed to load cards: ${response.status}`);
      }
      const data: CardsResponse = await response.json();
      setCards(Array.isArray(data.cards) ? data.cards : []);
      setLastBuild(data.last_build || null);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error loading cards';
      setError(message);
      console.error('[useCards] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [api]);

  const build = useCallback(async (options: CardsBuildOptions) => {
    try {
      setIsBuilding(true);
      setError(null);

      const params = new URLSearchParams({
        repo: options.repo,
        enrich: options.enrich ? '1' : '0',
        exclude_dirs: options.exclude_dirs || '',
        exclude_patterns: options.exclude_patterns || '',
        exclude_keywords: options.exclude_keywords || ''
      });

      const response = await fetch(api(`/api/cards/build/start?${params}`), {
        method: 'POST'
      });

      if (response.status === 409) {
        const data = await response.json();
        throw new Error(data.detail || 'Job already running');
      }

      if (!response.ok) {
        throw new Error(`Failed to start cards build: ${response.status}`);
      }

      const data = await response.json();
      return data.job_id;
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error building cards';
      setError(message);
      console.error('[useCards] Build error:', err);
      throw err;
    } finally {
      setIsBuilding(false);
    }
  }, [api]);

  const deleteCard = useCallback(async (cardId: string) => {
    try {
      const response = await fetch(api(`/api/cards/${cardId}`), {
        method: 'DELETE'
      });

      if (!response.ok) {
        throw new Error(`Failed to delete card: ${response.status}`);
      }

      // Remove from local state
      setCards(prev => prev.filter(c => c.id !== cardId));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error deleting card';
      setError(message);
      console.error('[useCards] Delete error:', err);
      throw err;
    }
  }, [api]);

  const jumpToLine = useCallback((filePath: string, lineNumber: number | string) => {
    // Dispatch custom event for navigation
    const event = new CustomEvent('cardNavigation', {
      detail: { file: filePath, line: lineNumber }
    });
    window.dispatchEvent(event);
  }, []);

  // Load cards on mount
  useEffect(() => {
    load();
  }, [load]);

  return {
    cards,
    lastBuild,
    isLoading,
    isBuilding,
    error,
    load,
    build,
    deleteCard,
    jumpToLine
  };
}
