import { useState, useCallback, useRef, useEffect } from 'react';
import { EvaluationService, EvalRunResult } from '@/services/EvaluationService';
import { useErrorHandler } from './useErrorHandler';
import { useEventBus } from './useEventBus';
import { useAPI } from './useAPI';

/**
 * Hook for managing evaluation state and execution
 */
export function useEvaluation() {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<EvalRunResult | null>(null);
  const [progress, setProgress] = useState(0);
  const [progressText, setProgressText] = useState('');
  const [currentQuestion, setCurrentQuestion] = useState<string>('');

  const { apiBase } = useAPI();
  const serviceRef = useRef<EvaluationService | null>(null);
  const pollingIntervalRef = useRef<number | null>(null);
  const { handleApiError } = useErrorHandler();
  const { emit } = useEventBus();

  // Initialize service when API base is ready
  useEffect(() => {
    if (apiBase) {
      serviceRef.current = new EvaluationService(apiBase);
    }
  }, [apiBase]);

  /**
   * Start polling for evaluation status
   */
  const startPolling = useCallback(() => {
    if (!serviceRef.current) return;

    // Clear existing interval
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = window.setInterval(async () => {
      try {
        if (!serviceRef.current) return;

        const status = await serviceRef.current.getStatus();

        if (status.running) {
          const progressPercent = status.total > 0
            ? (status.progress / status.total * 100)
            : 10;

          setProgress(progressPercent);
          setProgressText(`Running... ${status.progress}/${status.total} questions`);

          // Emit progress event for UX feedback integration
          emit('eval:progress', {
            percent: progressPercent,
            message: `Evaluating ${status.progress}/${status.total} questions`,
            remaining: status.total - status.progress
          });
        } else {
          // Evaluation finished
          if (pollingIntervalRef.current !== null) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
          }

          // Load results
          const evalResults = await serviceRef.current.getResults();
          setResults(evalResults);
          setProgress(100);
          setProgressText('Complete');
          setIsRunning(false);

          // Add to history
          serviceRef.current.addToHistory(evalResults);

          // Emit completion event
          emit('eval:complete', { results: evalResults });
        }
      } catch (error) {
        console.error('Failed to poll status:', error);

        // Stop polling on error
        if (pollingIntervalRef.current !== null) {
          clearInterval(pollingIntervalRef.current);
          pollingIntervalRef.current = null;
        }

        setIsRunning(false);
        emit('eval:error', { error });
      }
    }, 1000);
  }, [emit]);

  /**
   * Run evaluation with given configuration
   */
  const runEval = useCallback(async (config: {
    use_multi?: boolean;
    final_k?: number;
  } = {}) => {
    if (!serviceRef.current) {
      alert('Service not initialized. Please wait...');
      return;
    }

    setIsRunning(true);
    setProgress(0);
    setProgressText('Starting...');
    setResults(null);

    try {
      // Start evaluation
      await serviceRef.current.runEvaluation(config);

      // Begin polling
      setProgressText('Initializing...');
      startPolling();

      // Emit start event
      emit('eval:start', { config });
    } catch (error) {
      console.error('Failed to start evaluation:', error);

      const errorMessage = handleApiError(error, 'Start evaluation');
      alert(errorMessage);

      setIsRunning(false);
      setProgress(0);
      setProgressText('');
    }
  }, [startPolling, handleApiError, emit]);

  /**
   * Stop evaluation (if running)
   */
  const stopEval = useCallback(() => {
    if (pollingIntervalRef.current !== null) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
    setIsRunning(false);
    setProgressText('Stopped');
    emit('eval:stopped');
  }, [emit]);

  /**
   * Save current results as baseline
   */
  const saveBaseline = useCallback(async () => {
    if (!serviceRef.current || !results) {
      alert('No evaluation results to save');
      return;
    }

    try {
      await serviceRef.current.saveBaseline();
      emit('eval:baseline-saved');
      return true;
    } catch (error) {
      console.error('Failed to save baseline:', error);
      const errorMessage = handleApiError(error, 'Save baseline');
      alert(errorMessage);
      return false;
    }
  }, [results, handleApiError, emit]);

  /**
   * Compare with baseline
   */
  const compareWithBaseline = useCallback(async () => {
    if (!serviceRef.current || !results) {
      alert('No current evaluation results');
      return null;
    }

    try {
      const comparison = await serviceRef.current.compareWithBaseline();
      emit('eval:comparison-complete', { comparison });
      return comparison;
    } catch (error) {
      console.error('Failed to compare:', error);
      alert(error instanceof Error ? error.message : 'Comparison failed');
      return null;
    }
  }, [results, emit]);

  /**
   * Export results to JSON file
   */
  const exportResults = useCallback(() => {
    if (!serviceRef.current || !results) {
      alert('No results to export');
      return;
    }

    serviceRef.current.exportResults(results);
    emit('eval:exported');
  }, [results, emit]);

  /**
   * Clear results
   */
  const clearResults = useCallback(() => {
    setResults(null);
    setProgress(0);
    setProgressText('');
    setCurrentQuestion('');
  }, []);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current !== null) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  return {
    isRunning,
    results,
    progress,
    progressText,
    currentQuestion,
    runEval,
    stopEval,
    saveBaseline,
    compareWithBaseline,
    exportResults,
    clearResults
  };
}
