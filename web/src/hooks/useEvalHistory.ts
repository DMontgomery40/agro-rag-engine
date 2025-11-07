import { useState, useCallback, useEffect } from 'react';
import { EvalHistoryEntry } from '@/services/EvaluationService';
import { useEventBus } from './useEventBus';

const EVAL_HISTORY_KEY = 'agro_eval_history';
const MAX_HISTORY_ENTRIES = 20;

/**
 * Hook for managing evaluation history (localStorage-based)
 */
export function useEvalHistory() {
  const [runs, setRuns] = useState<EvalHistoryEntry[]>([]);
  const [selectedRunIndex, setSelectedRunIndex] = useState<number | null>(null);
  const { emit, on } = useEventBus();

  /**
   * Load history from localStorage
   */
  const loadHistory = useCallback(() => {
    try {
      const stored = localStorage.getItem(EVAL_HISTORY_KEY);
      const history: EvalHistoryEntry[] = stored ? JSON.parse(stored) : [];
      setRuns(history);
      emit('eval-history:loaded', { count: history.length });
    } catch (error) {
      console.error('Failed to load eval history:', error);
      setRuns([]);
    }
  }, [emit]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    localStorage.removeItem(EVAL_HISTORY_KEY);
    setRuns([]);
    setSelectedRunIndex(null);
    emit('eval-history:cleared');
  }, [emit]);

  /**
   * Delete a specific run
   */
  const deleteRun = useCallback((index: number) => {
    const history = [...runs];
    history.splice(index, 1);
    localStorage.setItem(EVAL_HISTORY_KEY, JSON.stringify(history));
    setRuns(history);

    // Clear selection if deleted run was selected
    if (selectedRunIndex === index) {
      setSelectedRunIndex(null);
    }

    emit('eval-history:deleted', { index });
  }, [runs, selectedRunIndex, emit]);

  /**
   * Select a run for detailed view
   */
  const selectRun = useCallback((index: number | null) => {
    setSelectedRunIndex(index);
    if (index !== null) {
      emit('eval-history:selected', { run: runs[index] });
    }
  }, [runs, emit]);

  /**
   * Get the selected run
   */
  const selectedRun = selectedRunIndex !== null ? runs[selectedRunIndex] : null;

  /**
   * Compare two runs by their indices
   */
  const compareRuns = useCallback((index1: number, index2: number) => {
    if (index1 >= runs.length || index2 >= runs.length) {
      return null;
    }

    const run1 = runs[index1];
    const run2 = runs[index2];

    const top1Delta = ((run1.topk / run1.total) - (run2.topk / run2.total)) * 100;
    const topkDelta = ((run1.topk / run1.total) - (run2.topk / run2.total)) * 100;

    const comparison = {
      run1,
      run2,
      deltas: {
        top1: top1Delta,
        topk: topkDelta,
        time: run1.secs - run2.secs
      }
    };

    emit('eval-history:compared', comparison);
    return comparison;
  }, [runs, emit]);

  /**
   * Get statistics for a specific config type
   */
  const getConfigStats = useCallback((config: string) => {
    const configRuns = runs.filter(r => r.config === config);

    if (configRuns.length === 0) {
      return null;
    }

    const avgTop1 = configRuns.reduce((sum, r) => sum + (r.top1 / r.total), 0) / configRuns.length;
    const avgTopK = configRuns.reduce((sum, r) => sum + (r.topk / r.total), 0) / configRuns.length;
    const avgTime = configRuns.reduce((sum, r) => sum + r.secs, 0) / configRuns.length;

    return {
      config,
      runCount: configRuns.length,
      avgTop1Accuracy: avgTop1,
      avgTopKAccuracy: avgTopK,
      avgDuration: avgTime,
      lastRun: configRuns[0] // Most recent
    };
  }, [runs]);

  /**
   * Export history as JSON
   */
  const exportHistory = useCallback(() => {
    const dataStr = JSON.stringify(runs, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `eval_history_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
    emit('eval-history:exported');
  }, [runs, emit]);

  /**
   * Calculate delta vs previous run with same config
   */
  const getDeltaVsPrevious = useCallback((index: number) => {
    if (index >= runs.length) return null;

    const currentRun = runs[index];

    // Find previous run with same config
    for (let i = index + 1; i < runs.length; i++) {
      if (runs[i].config === currentRun.config) {
        const prevRun = runs[i];
        const currentTop5Pct = (currentRun.topk / currentRun.total) * 100;
        const prevTop5Pct = (prevRun.topk / prevRun.total) * 100;
        const delta = currentTop5Pct - prevTop5Pct;

        return {
          delta,
          previousRun: prevRun,
          improved: delta > 0
        };
      }
    }

    return null;
  }, [runs]);

  /**
   * Get trend data for charts
   */
  const getTrendData = useCallback((config?: string) => {
    const filteredRuns = config
      ? runs.filter(r => r.config === config)
      : runs;

    return filteredRuns.map(r => ({
      timestamp: new Date(r.timestamp).getTime(),
      top1: (r.top1 / r.total) * 100,
      topk: (r.topk / r.total) * 100,
      duration: r.secs,
      config: r.config
    }));
  }, [runs]);

  // Load history on mount
  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  // Listen for eval completion to refresh history
  useEffect(() => {
    const cleanup = on('eval:complete', () => {
      loadHistory();
    });

    return cleanup;
  }, [on, loadHistory]);

  return {
    runs,
    selectedRun,
    selectedRunIndex,
    loadHistory,
    clearHistory,
    deleteRun,
    selectRun,
    compareRuns,
    getConfigStats,
    exportHistory,
    getDeltaVsPrevious,
    getTrendData
  };
}
