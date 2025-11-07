/**
 * EvaluationService - Core evaluation logic
 * Handles running evaluations, managing results, and coordinating with backend
 */

export interface EvalQuestion {
  q: string;
  repo: string;
  expect_paths: string[];
}

export interface EvalResult {
  question: string;
  repo: string;
  expect_paths: string[];
  top_paths: string[];
  top1_hit: boolean;
  topk_hit: boolean;
  all_results?: Array<{
    file_path: string;
    start_line: number;
    rerank_score: number;
  }>;
}

export interface EvalRunResult {
  top1_accuracy: number;
  topk_accuracy: number;
  duration_secs: number;
  results: EvalResult[];
  rerank_backend?: string;
  final_k?: number;
  use_multi?: boolean;
}

export interface EvalHistoryEntry {
  timestamp: string;
  config: string;
  rerank_backend: string;
  top1: number;
  topk: number;
  total: number;
  secs: number;
  final_k: number;
  use_multi: boolean;
}

export interface EvalComparisonResult {
  ok: boolean;
  baseline: EvalRunResult;
  current: EvalRunResult;
  delta: {
    top1: number;
    topk: number;
  };
  has_regressions: boolean;
  regressions: EvalResult[];
  improvements: EvalResult[];
  message?: string;
}

export class EvaluationService {
  private apiBase: string;
  private abortController: AbortController | null = null;

  constructor(apiBase: string = 'http://127.0.0.1:8012') {
    this.apiBase = apiBase;
  }

  /**
   * Run a full evaluation against golden questions
   */
  async runEvaluation(config: {
    use_multi?: boolean;
    final_k?: number;
  }): Promise<void> {
    const response = await fetch(`${this.apiBase}/api/eval/run`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        use_multi: config.use_multi ?? true,
        final_k: config.final_k ?? 5
      })
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.error || 'Failed to start evaluation');
    }
  }

  /**
   * Get current evaluation status (for polling)
   */
  async getStatus(): Promise<{
    running: boolean;
    progress: number;
    total: number;
  }> {
    const response = await fetch(`${this.apiBase}/api/eval/status`);
    return await response.json();
  }

  /**
   * Get evaluation results after completion
   */
  async getResults(): Promise<EvalRunResult> {
    const response = await fetch(`${this.apiBase}/api/eval/results`);
    const data = await response.json();

    if (data.error) {
      throw new Error(data.error);
    }

    return data;
  }

  /**
   * Save current results as baseline
   */
  async saveBaseline(): Promise<void> {
    const response = await fetch(`${this.apiBase}/api/eval/baseline/save`, {
      method: 'POST'
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error('Failed to save baseline');
    }
  }

  /**
   * Compare current results with baseline
   */
  async compareWithBaseline(): Promise<EvalComparisonResult> {
    const response = await fetch(`${this.apiBase}/api/eval/baseline/compare`);
    const data = await response.json();

    if (!data.ok) {
      throw new Error(data.message || 'No baseline found');
    }

    return data;
  }

  /**
   * Add result to local history (localStorage)
   */
  addToHistory(results: EvalRunResult): void {
    const history = this.getHistory();

    const entry: EvalHistoryEntry = {
      timestamp: new Date().toISOString(),
      config: this.determineConfig(results.rerank_backend),
      rerank_backend: results.rerank_backend || 'none',
      top1: results.results.filter(r => r.top1_hit).length,
      topk: results.results.filter(r => r.topk_hit).length,
      total: results.results.length,
      secs: results.duration_secs,
      final_k: results.final_k || 5,
      use_multi: results.use_multi ?? true
    };

    history.unshift(entry);

    // Keep only last 20 entries
    if (history.length > 20) {
      history.splice(20);
    }

    localStorage.setItem('agro_eval_history', JSON.stringify(history));
  }

  /**
   * Get evaluation history from localStorage
   */
  getHistory(): EvalHistoryEntry[] {
    try {
      const stored = localStorage.getItem('agro_eval_history');
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load eval history:', error);
      return [];
    }
  }

  /**
   * Clear evaluation history
   */
  clearHistory(): void {
    localStorage.removeItem('agro_eval_history');
  }

  /**
   * Determine configuration label based on reranker backend
   */
  private determineConfig(rerank_backend?: string): string {
    if (rerank_backend === 'local') return 'BM25 + Trained CE';
    if (rerank_backend === 'cohere') return 'BM25 + Cohere CE';
    return 'BM25-only';
  }

  /**
   * Export results as JSON file
   */
  exportResults(results: EvalRunResult): void {
    const dataStr = JSON.stringify(results, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    a.download = `eval_results_${timestamp}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
}
