import { useState, useCallback, useEffect } from 'react';
import { useAPI } from './useAPI';
import { useErrorHandler } from './useErrorHandler';
import { useEventBus } from './useEventBus';

export interface GoldenQuestion {
  q: string;
  repo: string;
  expect_paths: string[];
}

export interface GoldenTestResult {
  top1_hit: boolean;
  topk_hit: boolean;
  top_paths?: string[];
  all_results?: Array<{
    file_path: string;
    start_line: number;
    rerank_score: number;
  }>;
}

/**
 * Hook for managing golden questions (CRUD operations)
 */
export function useGoldenQuestions() {
  const [questions, setQuestions] = useState<GoldenQuestion[]>([]);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(false);

  const { api } = useAPI();
  const { handleApiError } = useErrorHandler();
  const { emit } = useEventBus();

  /**
   * Load all golden questions from backend
   */
  const loadQuestions = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch(api('/api/golden'));
      const data = await response.json();
      setQuestions(data.questions || []);
      emit('golden:loaded', { count: data.questions?.length || 0 });
    } catch (error) {
      console.error('Failed to load golden questions:', error);
      const errorMessage = handleApiError(error, 'Load golden questions');
      throw new Error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [api, handleApiError, emit]);

  /**
   * Add a new golden question
   */
  const addQuestion = useCallback(async (question: GoldenQuestion) => {
    try {
      const response = await fetch(api('/api/golden'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(question)
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to add question');
      }

      // Reload questions
      await loadQuestions();
      emit('golden:added', { question });
      return true;
    } catch (error) {
      console.error('Failed to add question:', error);
      throw error;
    }
  }, [api, loadQuestions, emit]);

  /**
   * Update an existing golden question
   */
  const updateQuestion = useCallback(async (index: number, question: GoldenQuestion) => {
    try {
      const response = await fetch(api(`/api/golden/${index}`), {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(question)
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error(data.error || 'Failed to update');
      }

      // Reload questions
      await loadQuestions();
      emit('golden:updated', { index, question });
      return true;
    } catch (error) {
      console.error('Failed to update question:', error);
      throw error;
    }
  }, [api, loadQuestions, emit]);

  /**
   * Delete a golden question
   */
  const deleteQuestion = useCallback(async (index: number) => {
    try {
      const response = await fetch(api(`/api/golden/${index}`), {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!data.ok) {
        throw new Error('Failed to delete');
      }

      // Reload questions
      await loadQuestions();
      emit('golden:deleted', { index });
      return true;
    } catch (error) {
      console.error('Failed to delete question:', error);
      throw error;
    }
  }, [api, loadQuestions, emit]);

  /**
   * Test a single question
   */
  const testQuestion = useCallback(async (
    question: GoldenQuestion,
    config: { final_k?: number; use_multi?: boolean } = {}
  ): Promise<GoldenTestResult> => {
    try {
      const response = await fetch(api('/api/golden/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: question.q,
          repo: question.repo,
          expect_paths: question.expect_paths,
          final_k: config.final_k ?? 5,
          use_multi: config.use_multi ?? true
        })
      });

      const data = await response.json();
      emit('golden:tested', { question, result: data });
      return data;
    } catch (error) {
      console.error('Test failed:', error);
      throw error;
    }
  }, [api, emit]);

  /**
   * Bulk add recommended questions
   */
  const bulkAddRecommended = useCallback(async (recommendedQuestions: GoldenQuestion[]) => {
    let added = 0;
    const errors: string[] = [];

    for (const question of recommendedQuestions) {
      try {
        await addQuestion(question);
        added += 1;
      } catch (error) {
        errors.push(`Failed to add "${question.q}": ${error}`);
      }
    }

    emit('golden:bulk-added', { added, errors });
    return { added, errors };
  }, [addQuestion, emit]);

  /**
   * Run tests on all questions
   */
  const runAllTests = useCallback(async () => {
    const results: Array<{ question: GoldenQuestion; result: GoldenTestResult }> = [];
    let top1 = 0;
    let topk = 0;

    for (const question of questions) {
      try {
        const result = await testQuestion(question);
        results.push({ question, result });

        if (result.top1_hit) top1 += 1;
        else if (result.topk_hit) topk += 1;
      } catch (error) {
        console.error(`Test failed for "${question.q}":`, error);
      }
    }

    const summary = {
      total: questions.length,
      top1,
      topk,
      results
    };

    emit('golden:all-tested', summary);
    return summary;
  }, [questions, testQuestion, emit]);

  /**
   * Export questions as JSON
   */
  const exportQuestions = useCallback(() => {
    const dataStr = JSON.stringify(questions, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'golden_questions_export.json';
    a.click();
    URL.revokeObjectURL(url);
    emit('golden:exported');
  }, [questions, emit]);

  /**
   * Import questions from JSON file
   */
  const importQuestions = useCallback(async (file: File) => {
    try {
      const text = await file.text();
      const importedQuestions: GoldenQuestion[] = JSON.parse(text);

      if (!Array.isArray(importedQuestions)) {
        throw new Error('Invalid format: expected array of questions');
      }

      const result = await bulkAddRecommended(importedQuestions);
      return result;
    } catch (error) {
      console.error('Failed to import questions:', error);
      throw error;
    }
  }, [bulkAddRecommended]);

  /**
   * Selection management
   */
  const selectQuestion = useCallback((index: number) => {
    setSelectedIndices(prev => new Set(prev).add(index));
  }, []);

  const deselectQuestion = useCallback((index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      next.delete(index);
      return next;
    });
  }, []);

  const toggleSelection = useCallback((index: number) => {
    setSelectedIndices(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIndices(new Set());
  }, []);

  const selectAll = useCallback(() => {
    setSelectedIndices(new Set(questions.map((_, i) => i)));
  }, [questions]);

  /**
   * Delete selected questions
   */
  const deleteSelected = useCallback(async () => {
    const indices = Array.from(selectedIndices).sort((a, b) => b - a); // Delete from end to avoid index shifts

    for (const index of indices) {
      try {
        await deleteQuestion(index);
      } catch (error) {
        console.error(`Failed to delete question at index ${index}:`, error);
      }
    }

    clearSelection();
  }, [selectedIndices, deleteQuestion, clearSelection]);

  // Auto-load questions on mount
  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  return {
    questions,
    selectedIndices,
    isLoading,
    loadQuestions,
    addQuestion,
    updateQuestion,
    deleteQuestion,
    testQuestion,
    bulkAddRecommended,
    runAllTests,
    exportQuestions,
    importQuestions,
    selectQuestion,
    deselectQuestion,
    toggleSelection,
    clearSelection,
    selectAll,
    deleteSelected
  };
}
