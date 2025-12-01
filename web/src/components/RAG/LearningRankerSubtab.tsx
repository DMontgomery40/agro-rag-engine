/**
 * Learning Reranker Subtab Component
 *
 * This component manages the Learning Reranker system, which is a self-improving
 * cross-encoder model that learns from user feedback (thumbs up/down, clicks).
 *
 * IMPORTANT: This component handles CROSS-ENCODER/RERANKER TRAINING AND EVALUATION ONLY.
 * For full RAG pipeline evaluation (retrieval + generation), see EvaluateSubtab.tsx
 *
 * Backend APIs:
 * - /api/config - Get/set reranker configuration
 * - /api/reranker/status - Get current training/mining status
 * - /api/reranker/mine - Mine training triplets from logs
 * - /api/reranker/train - Train the cross-encoder model
 * - /api/reranker/evaluate - Evaluate cross-encoder performance (MRR, Hit@K)
 * - /api/reranker/logs/* - Log management endpoints
 * - /api/reranker/baseline/* - Baseline comparison endpoints
 */

import { useState, useEffect } from 'react';

/**
 * Reranker status object returned from backend
 */
interface RerankerStatus {
  running: boolean;
  task: string;
  progress: number;
  message: string;
  result: {
    ok: boolean;
    output?: string;
    error?: string;
  } | null;
  live_output: string[];
}

/**
 * Reranker info object from config
 */
interface RerankerInfo {
  enabled: boolean;
  path: string;
  device: string;
  alpha: number;
  topn: number;
  batch: number;
  maxlen: number;
}

/**
 * Training metrics from evaluation
 */
interface EvalMetrics {
  mrr?: number;
  hit1?: number;
  hit3?: number;
  hit5?: number;
}

/**
 * ---agentspec
 * what: |
 *   React component managing learning ranker config UI. Wires 6 state vars (reranker toggle, model path, available models, log/triplets paths, mine mode) to /api/config endpoint.
 *
 * why: |
 *   Centralizes ranker configuration in single subtab; state-to-API binding enables live config updates without page reload.
 *
 * guardrails:
 *   - DO NOT assume availableModels populates automatically; fetch on mount
 *   - NOTE: mineMode values are 'append' or 'replace'; validate before POST
 *   - ASK USER: Confirm /api/config endpoint exists and accepts all 6 fields
 * ---/agentspec
 */
export function LearningRankerSubtab() {

  // Configuration state - all inputs wired to /api/config
  const [rerankerEnabled, setRerankerEnabled] = useState<string>('0');
  const [modelPath, setModelPath] = useState<string>('models/cross-encoder-agro');
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [logPath, setLogPath] = useState<string>('data/logs/queries.jsonl');
  const [tripletsPath, setTripletsPath] = useState<string>('data/training/triplets.jsonl');
  const [mineMode, setMineMode] = useState<string>('append');
  const [mineReset, setMineReset] = useState<string>('0');
  const [blendAlpha, setBlendAlpha] = useState<number>(0.7);
  const [maxSeqLength, setMaxSeqLength] = useState<number>(512);
  const [batchSize, setBatchSize] = useState<number>(16);
  const [rerankerTopN, setRerankerTopN] = useState<number>(50);
  const [voyageRerankerModel, setVoyageRerankerModel] = useState<string>('rerank-2');
  const [reloadOnChange, setReloadOnChange] = useState<string>('0');
  const [trainEpochs, setTrainEpochs] = useState<number>(2);
  const [trainBatchSize, setTrainBatchSize] = useState<number>(16);
  const [trainMaxLength, setTrainMaxLength] = useState<number>(512);
  const [trainLearningRate, setTrainLearningRate] = useState<number>(0.00002);
  const [warmupRatio, setWarmupRatio] = useState<number>(0.1);
  const [tripletsMinCount, setTripletsMinCount] = useState<number>(100);
  const [tripletsMineMode, setTripletsMineMode] = useState<string>('replace');

  // Status and display state
  const [rerankerInfo, setRerankerInfo] = useState<RerankerInfo | null>(null);
  const [loggedQueries, setLoggedQueries] = useState<number>(0);
  const [tripletCount, setTripletCount] = useState<number>(0);
  const [status, setStatus] = useState<RerankerStatus | null>(null);
  const [evalMetrics, setEvalMetrics] = useState<EvalMetrics | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [showLogs, setShowLogs] = useState<boolean>(false);
  const [cronTime, setCronTime] = useState<string>('02:15');
  const [cronStatus, setCronStatus] = useState<string>('');
  const [testQuery, setTestQuery] = useState<string>('Where is OAuth validated?');
  const [smokeTestResult, setSmokeTestResult] = useState<any>(null);
  const [showSmokeResult, setShowSmokeResult] = useState<boolean>(false);
  const [cost24h, setCost24h] = useState<number>(0);
  const [costAvg, setCostAvg] = useState<number>(0);
  const [noHitQueries, setNoHitQueries] = useState<any[]>([]);
  const [terminalOutput, setTerminalOutput] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Load configuration and status on mount
  useEffect(() => {
    loadConfig();
    loadStatus();
    loadCounts();
    loadCosts();
    loadNoHits();

    // Poll status every 2 seconds when tasks are running
    /**
     * ---agentspec
     * what: |
     *   Sets up 2-second polling interval to call loadStatus(). Cleans up interval on unmount via returned cleanup function.
     *
     * why: |
     *   useEffect dependency array ensures interval runs once; cleanup prevents memory leaks.
     *
     * guardrails:
     *   - DO NOT hardcode 2000ms; make configurable for test/prod environments
     *   - NOTE: Cleanup function must clear interval before component unmounts
     * ---/agentspec
     */
    const interval = setInterval(() => {
      loadStatus();
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  /**
   * Load configuration from /api/config
   */
  /**
   * ---agentspec
   * what: |
   *   Fetches config from /api/config endpoint. Extracts env vars (AGRO_RERANKER_ENABLED, AGRO_RERANKER_MODEL_PATH, AGRO_LOG_PATH) and sets state with defaults.
   *
   * why: |
   *   Centralizes config loading at app init; decouples env setup from component logic.
   *
   * guardrails:
   *   - DO NOT assume /api/config always succeeds; add error handler
   *   - NOTE: Defaults silently if env vars missing; log warnings for debugging
   * ---/agentspec
   */
  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      const env = data.env || {};

      setRerankerEnabled(env.AGRO_RERANKER_ENABLED || '0');
      setModelPath(env.AGRO_RERANKER_MODEL_PATH || 'models/cross-encoder-agro');
      setLogPath(env.AGRO_LOG_PATH || 'data/logs/queries.jsonl');
      setTripletsPath(env.AGRO_TRIPLETS_PATH || 'data/training/triplets.jsonl');
      setMineMode(env.AGRO_RERANKER_MINE_MODE || 'append');
      setMineReset(env.AGRO_RERANKER_MINE_RESET || '0');
      setBlendAlpha(parseFloat(env.AGRO_RERANKER_ALPHA || '0.7'));
      setMaxSeqLength(parseInt(env.AGRO_RERANKER_MAXLEN || '512', 10));
      setBatchSize(parseInt(env.AGRO_RERANKER_BATCH || '16', 10));
      setRerankerTopN(parseInt(env.AGRO_RERANKER_TOPN || '50', 10));
      setVoyageRerankerModel(env.VOYAGE_RERANK_MODEL || 'rerank-2');
      setReloadOnChange(env.AGRO_RERANKER_RELOAD_ON_CHANGE || '0');
      setTrainEpochs(parseInt(env.RERANKER_TRAIN_EPOCHS || '2', 10));
      setTrainBatchSize(parseInt(env.RERANKER_TRAIN_BATCH || '16', 10));
      setTrainMaxLength(parseInt(env.RERANKER_TRAIN_MAX_LENGTH || '512', 10));
      setTrainLearningRate(parseFloat(env.RERANKER_TRAIN_LR || '0.00002'));
      setWarmupRatio(parseFloat(env.RERANKER_WARMUP_RATIO || '0.1'));
      setTripletsMinCount(parseInt(env.TRIPLETS_MIN_COUNT || '100', 10));
      setTripletsMineMode(env.TRIPLETS_MINE_MODE || 'replace');

      // Load available models from filesystem
      loadAvailableModels();

      setLoading(false);
    } catch (error) {
      console.error('Failed to load config:', error);
      setLoading(false);
    }
  };

  /**
   * Load available reranker models from models directory
   */
  /**
   * ---agentspec
   * what: |
   *   Loads hardcoded cross-encoder model paths from local models/ directory. Returns array of model identifiers for reranking tasks.
   *
   * why: |
   *   Avoids dynamic discovery overhead; pre-validated paths ensure consistent model availability.
   *
   * guardrails:
   *   - DO NOT add models without verifying they exist in models/ directory
   *   - NOTE: Paths are static; runtime model additions require code change
   *   - ASK USER: Should this support dynamic model discovery or config file instead?
   * ---/agentspec
   */
  const loadAvailableModels = async () => {
    // Hardcoded model paths based on models/ directory structure
    const models = [
      'models/cross-encoder-agro',
      'models/cross-encoder-agro.baseline',
      'cross-encoder/ms-marco-MiniLM-L-12-v2',
      'cross-encoder/ms-marco-MiniLM-L-6-v2',
      'BAAI/bge-reranker-base',
      'BAAI/bge-reranker-large'
    ];
    setAvailableModels(models);
  };

  /**
   * Load reranker status from /api/reranker/status
   */
  /**
   * ```
   * ---agentspec
   * what: |
   *   Fetches reranker status from /api/reranker/status endpoint. Updates state with response JSON and terminal output (last 50 lines).
   *
   * why: |
   *   Polls API for live reranker state; slicing terminal output prevents memory bloat from unbounded logs.
   *
   * guardrails:
   *   - DO NOT retry on failure; add error handling
   *   - NOTE: Assumes /api/reranker/status returns {live_output: string[]} shape
   * ---/agentspec
   * ```
   */
  const loadStatus = async () => {
    try {
      const response = await fetch('/api/reranker/status');
      const data = await response.json();
      setStatus(data);

      // Update terminal output
      if (data.live_output && data.live_output.length > 0) {
        setTerminalOutput(data.live_output.slice(-50)); // Last 50 lines
      }

      // Parse eval metrics from result
      if (data.result && data.result.output) {
        parseEvalMetrics(data.result.output);
      }
    } catch (error) {
      console.error('Failed to load status:', error);
    }
  };

  /**
   * Load query and triplet counts
   */
  /**
   * ---agentspec
   * what: |
   *   Fetches query and triplet counts from two endpoints in parallel. Returns Promise resolving to {queries, triplets} objects.
   *
   * why: |
   *   Promise.all parallelizes independent API calls for performance.
   *
   * guardrails:
   *   - DO NOT assume both requests succeed; add .catch() per fetch
   *   - NOTE: Throws if either endpoint returns non-JSON
   * ---/agentspec
   */
  const loadCounts = async () => {
    try {
      const [queriesResp, tripletsResp] = await Promise.all([
        fetch('/api/reranker/logs/count'),
        fetch('/api/reranker/triplets/count')
      ]);

      const queries = await queriesResp.json();
      const triplets = await tripletsResp.json();

      setLoggedQueries(queries.count || 0);
      setTripletCount(triplets.count || 0);
    } catch (error) {
      console.error('Failed to load counts:', error);
    }
  };

  /**
   * Load cost metrics
   */
  /**
   * ---agentspec
   * what: |
   *   Fetches reranker cost metrics from /api/reranker/costs endpoint. Parses JSON response and updates state with 24h total and per-query average.
   *
   * why: |
   *   Centralizes cost data fetching with error handling to keep UI state in sync with backend metrics.
   *
   * guardrails:
   *   - DO NOT retry silently on failure; log errors for debugging
   *   - NOTE: Assumes endpoint returns {total_24h, avg_per_query}; add validation if schema changes
   * ---/agentspec
   */
  const loadCosts = async () => {
    try {
      const response = await fetch('/api/reranker/costs');
      const data = await response.json();
      setCost24h(data.total_24h || 0);
      setCostAvg(data.avg_per_query || 0);
    } catch (error) {
      console.error('Failed to load costs:', error);
    }
  };

  /**
   * Load no-hit queries
   */
  /**
   * ---agentspec
   * what: |
   *   Fetches no-hit queries from /api/reranker/nohits endpoint. Sets noHitQueries state with response array or empty fallback.
   *
   * why: |
   *   Isolates API call logic for reusable data loading with error resilience.
   *
   * guardrails:
   *   - DO NOT retry on failure; logs only
   *   - NOTE: Silently defaults to [] if response.queries missing
   * ---/agentspec
   */
  const loadNoHits = async () => {
    try {
      const response = await fetch('/api/reranker/nohits');
      const data = await response.json();
      setNoHitQueries(data.queries || []);
    } catch (error) {
      console.error('Failed to load no-hits:', error);
    }
  };

  /**
   * Parse evaluation metrics from output text
   */
  /**
   * ---agentspec
   * what: |
   *   Extracts evaluation metrics (MRR@all, Hit@1/3/5) from model output via regex. Returns object with parsed floats or undefined.
   *
   * why: |
   *   Regex parsing decouples metric extraction from eval pipeline; enables reuse across different output formats.
   *
   * guardrails:
   *   - DO NOT assume all metrics present; undefined values expected
   *   - NOTE: Regex fragile to whitespace/format changes; add validation tests
   * ---/agentspec
   */
  const parseEvalMetrics = (output: string) => {
    const mrrMatch = output.match(/MRR@all:\s*([\d.]+)/);
    const hit1Match = output.match(/Hit@1:\s*([\d.]+)/);
    const hit3Match = output.match(/Hit@3:\s*([\d.]+)/);
    const hit5Match = output.match(/Hit@5:\s*([\d.]+)/);

    setEvalMetrics({
      mrr: mrrMatch ? parseFloat(mrrMatch[1]) : undefined,
      hit1: hit1Match ? parseFloat(hit1Match[1]) : undefined,
      hit3: hit3Match ? parseFloat(hit3Match[1]) : undefined,
      hit5: hit5Match ? parseFloat(hit5Match[1]) : undefined
    });
  };

  /**
   * Update config value in backend
   */
  /**
   * ---agentspec
   * what: |
   *   POSTs config key-value pair to /api/config endpoint. Returns response status; caller must handle errors.
   *
   * why: |
   *   Centralizes config updates via API rather than direct env mutation.
   *
   * guardrails:
   *   - DO NOT assume response.ok means success; API may return 200 with error payload
   *   - NOTE: No retry logic; transient failures will propagate to caller
   *   - ASK USER: Should failed updates trigger rollback or alert?
   * ---/agentspec
   */
  const updateConfig = async (key: string, value: any) => {
    try {
      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: { [key]: value } })
      });

      if (!response.ok) {
        throw new Error(`Failed to update ${key}`);
      }

      await loadConfig();
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
      alert(`Failed to update ${key}`);
    }
  };

  // Handler functions for all inputs
  /**
   * ---agentspec
   * what: |
   *   Handles select dropdown changes for reranker toggle and model path. Updates local state and persists to config via updateConfig().
   *
   * why: |
   *   Centralizes UI event handling with immediate state sync and config persistence.
   *
   * guardrails:
   *   - DO NOT assume updateConfig() succeeds; add error handling
   *   - NOTE: setModelPath() defined but handleModelPathChange() incomplete
   * ---/agentspec
   */
  const handleRerankerEnabledChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setRerankerEnabled(value);
    updateConfig('AGRO_RERANKER_ENABLED', value);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles dropdown selection for reranker model path; updates local state and config. Handles text input for log path; updates local state only.
   *
   * why: |
   *   Separates model config (persisted) from log path (UI-only) to match their different lifecycles.
   *
   * guardrails:
   *   - DO NOT persist log path to config; it's UI state only
   *   - NOTE: Model path change triggers updateConfig immediately; log path does not
   * ---/agentspec
   */
  const handleModelPathChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setModelPath(value);
    updateConfig('AGRO_RERANKER_MODEL_PATH', value);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles input field changes and blur events for log path and triplets path config. Updates state on change, persists to config on blur.
   *
   * why: |
   *   Separates UI state updates (immediate) from config persistence (on blur) to avoid excessive writes.
   *
   * guardrails:
   *   - DO NOT persist on every keystroke; only on blur
   *   - NOTE: Assumes updateConfig is idempotent
   * ---/agentspec
   */
  const handleLogPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLogPath(e.target.value);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles file path input changes and blur events for log and triplets paths. Updates config on blur.
   *
   * why: |
   *   Separates input capture (onChange) from persistence (onBlur) to avoid excessive config writes.
   *
   * guardrails:
   *   - DO NOT validate paths here; defer to config layer
   *   - NOTE: Triplets blur handler missing; incomplete implementation
   * ---/agentspec
   */
  const handleLogPathBlur = () => {
    updateConfig('AGRO_LOG_PATH', logPath);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles triplets file path input and mine mode selection. Updates config on blur; syncs state to parent via updateConfig().
   *
   * why: |
   *   Separates input handling from validation; defers config writes to blur event for performance.
   *
   * guardrails:
   *   - DO NOT validate path format here; defer to updateConfig()
   *   - NOTE: Mine mode handler incomplete; requires implementation
   * ---/agentspec
   */
  const handleTripletsPathChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTripletsPath(e.target.value);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles config updates for triplets file path and reranker mine mode. Blur event saves path; select change updates mode immediately.
   *
   * why: |
   *   Separates UI event handlers from config state to keep form logic modular and testable.
   *
   * guardrails:
   *   - DO NOT validate paths here; defer to updateConfig layer
   *   - NOTE: Mine mode change fires immediately; triplets path waits for blur
   * ---/agentspec
   */
  const handleTripletsPathBlur = () => {
    updateConfig('AGRO_TRIPLETS_PATH', tripletsPath);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles dropdown changes for mine mode and mine reset config. Updates local state and persists to config via updateConfig().
   *
   * why: |
   *   Separates UI event handling from config persistence for testability and reusability.
   *
   * guardrails:
   *   - DO NOT assume updateConfig() succeeds; add error handling
   *   - NOTE: State and config may diverge if updateConfig() fails silently
   * ---/agentspec
   */
  const handleMineModeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setMineMode(value);
    updateConfig('AGRO_RERANKER_MINE_MODE', value);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles UI select/input changes for mine reset strategy and blend alpha parameters. Updates local state and persists to config via updateConfig().
   *
   * why: |
   *   Separates event handling from config persistence for testability and reusability across form controls.
   *
   * guardrails:
   *   - DO NOT persist blend alpha immediately; requires explicit save action
   *   - NOTE: mine reset persists on change; blend alpha does not (inconsistent UX)
   * ---/agentspec
   */
  const handleMineResetChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setMineReset(value);
    updateConfig('AGRO_RERANKER_MINE_RESET', value);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles blend alpha slider input and blur events. Updates AGRO_RERANKER_ALPHA config on blur.
   *
   * why: |
   *   Separates input parsing from config persistence to avoid excessive updates.
   *
   * guardrails:
   *   - DO NOT update config on every keystroke; defer to blur event
   *   - NOTE: parseFloat() may return NaN; add validation before config write
   * ---/agentspec
   */
  const handleBlendAlphaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBlendAlpha(parseFloat(e.target.value));
  };

  /**
   * ---agentspec
   * what: |
   *   Updates AGRO_RERANKER_ALPHA config on blur; parses max sequence length from input onChange. Outputs: config mutation + local state update.
   *
   * why: |
   *   Separates input parsing (onChange) from config persistence (onBlur) to avoid redundant updates.
   *
   * guardrails:
   *   - DO NOT parse without radix 10; parseInt defaults to octal for "0" prefix
   *   - NOTE: handleMaxSeqLengthBlur incomplete; add updateConfig call
   * ---/agentspec
   */
  const handleBlendAlphaBlur = () => {
    updateConfig('AGRO_RERANKER_ALPHA', blendAlpha);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles UI input changes for maxSeqLength and batchSize. Updates local state on change, persists to config on blur.
   *
   * why: |
   *   Separates immediate UI responsiveness (onChange) from config persistence (onBlur) to avoid excessive writes.
   *
   * guardrails:
   *   - DO NOT persist on every keystroke; use onBlur to batch updates
   *   - NOTE: parseInt(value, 10) required; missing radix causes octal parsing bugs
   * ---/agentspec
   */
  const handleMaxSeqLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMaxSeqLength(parseInt(e.target.value, 10));
  };

  /**
   * ---agentspec
   * what: |
   *   Updates reranker config on blur; syncs batch size state on input change. Inputs: form events. Outputs: config updates + state mutations.
   *
   * why: |
   *   Separates input handling (onChange) from persistence (onBlur) to avoid excessive writes.
   *
   * guardrails:
   *   - DO NOT parse batch size without radix 10; prevents octal misinterpretation
   *   - NOTE: Config update happens only on blur, not on every keystroke
   * ---/agentspec
   */
  const handleMaxSeqLengthBlur = () => {
    updateConfig('AGRO_RERANKER_MAXLEN', maxSeqLength);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles batch size input changes and config updates. Parses input value to int, syncs to config on blur.
   *
   * why: |
   *   Separates input parsing from config persistence; blur event prevents excessive updates.
   *
   * guardrails:
   *   - DO NOT update config on every keystroke; use blur to batch writes
   *   - NOTE: parseInt(value, 10) required; missing radix causes octal parsing bugs
   * ---/agentspec
   */
  const handleBatchSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBatchSize(parseInt(e.target.value, 10));
  };

  /**
   * ---agentspec
   * what: |
   *   Updates reranker config on blur events. Parses input value to int, syncs to state on change, persists to config on blur.
   *
   * why: |
   *   Separates UI state updates (onChange) from config persistence (onBlur) to avoid excessive writes.
   *
   * guardrails:
   *   - DO NOT persist on every keystroke; batch writes on blur only
   *   - NOTE: parseInt(e.target.value, 10) assumes valid numeric input; add validation for NaN
   * ---/agentspec
   */
  const handleBatchSizeBlur = () => {
    updateConfig('AGRO_RERANKER_BATCH', batchSize);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles reranker configuration updates. onChange parses input to int; onBlur persists to config via updateConfig('AGRO_RERANKER_TOPN', value).
   *
   * why: |
   *   Separates input parsing from persistence to avoid premature saves on every keystroke.
   *
   * guardrails:
   *   - DO NOT save on every onChange; defer to onBlur
   *   - NOTE: parseInt(value, 10) required; missing radix causes bugs in some browsers
   * ---/agentspec
   */
  const handleRerankerTopNChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setRerankerTopN(parseInt(e.target.value, 10));
  };

  /**
   * ---agentspec
   * what: |
   *   Updates reranker config on blur; syncs rerankerTopN to AGRO_RERANKER_TOPN. Handles Voyage reranker model input changes and persists on blur.
   *
   * why: |
   *   Separates input capture (onChange) from persistence (onBlur) to avoid excessive config writes.
   *
   * guardrails:
   *   - DO NOT persist on every keystroke; batch updates on blur only
   *   - NOTE: Assumes updateConfig() handles validation; no local type-checking
   * ---/agentspec
   */
  const handleRerankerTopNBlur = () => {
    updateConfig('AGRO_RERANKER_TOPN', rerankerTopN);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles Voyage reranker model input changes and config persistence. Updates local state on change, syncs to config on blur.
   *
   * why: |
   *   Separates UI state updates (immediate feedback) from config writes (debounced via blur) to avoid excessive updates.
   *
   * guardrails:
   *   - DO NOT write to config on every keystroke; use blur event
   *   - NOTE: Assumes updateConfig('VOYAGE_RERANK_MODEL', value) is idempotent
   * ---/agentspec
   */
  const handleVoyageRerankerModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVoyageRerankerModel(e.target.value);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles config updates for Voyage reranker model and reload-on-change behavior. Blur event triggers model save; select change updates reload strategy.
   *
   * why: |
   *   Separates UI event handlers from config persistence logic for testability.
   *
   * guardrails:
   *   - DO NOT assume blur fires on every model change; only on field exit
   *   - NOTE: updateConfig must handle both string model names and enum values
   * ---/agentspec
   */
  const handleVoyageRerankerModelBlur = () => {
    updateConfig('VOYAGE_RERANK_MODEL', voyageRerankerModel);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles UI select/input changes for reranker config. Updates local state and persists AGRO_RERANKER_RELOAD_ON_CHANGE to config; trainEpochs updates state only.
   *
   * why: |
   *   Separates config persistence (reload behavior) from transient UI state (epochs) to match storage requirements.
   *
   * guardrails:
   *   - DO NOT persist trainEpochs without explicit updateConfig call; currently state-only
   *   - NOTE: parseInt(e.target.value, 10) assumes valid numeric input; add validation if user-editable
   * ---/agentspec
   */
  const handleReloadOnChangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setReloadOnChange(value);
    updateConfig('AGRO_RERANKER_RELOAD_ON_CHANGE', value);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles input changes for training hyperparameters (epochs, batch size). Parses numeric values and syncs to config on blur.
   *
   * why: |
   *   Separates input parsing from config persistence; blur event prevents excessive updates during typing.
   *
   * guardrails:
   *   - DO NOT update config on every keystroke; use blur to batch updates
   *   - NOTE: parseInt(value, 10) required; omitting radix causes octal parsing bugs
   * ---/agentspec
   */
  const handleTrainEpochsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTrainEpochs(parseInt(e.target.value, 10));
  };

  /**
   * ---agentspec
   * what: |
   *   Updates reranker config on blur; syncs trainEpochs to RERANKER_TRAIN_EPOCHS. Parses trainBatchSize input to int on change, persists on blur.
   *
   * why: |
   *   Deferred updates (blur) reduce config churn; int parsing ensures type safety for numeric hyperparams.
   *
   * guardrails:
   *   - DO NOT update config on every keystroke; blur prevents thrashing
   *   - NOTE: trainBatchSizeBlur handler incomplete; add updateConfig call
   * ---/agentspec
   */
  const handleTrainEpochsBlur = () => {
    updateConfig('RERANKER_TRAIN_EPOCHS', trainEpochs);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles batch size and max length input changes for reranker training config. Updates state on change, persists to config on blur.
   *
   * why: |
   *   Separates input handling (onChange) from persistence (onBlur) to avoid excessive config writes.
   *
   * guardrails:
   *   - DO NOT call updateConfig on every keystroke; use onBlur
   *   - NOTE: parseInt(value, 10) required; omitting radix causes octal parsing bugs
   * ---/agentspec
   */
  const handleTrainBatchSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTrainBatchSize(parseInt(e.target.value, 10));
  };

  /**
   * ---agentspec
   * what: |
   *   Updates reranker training config on blur events. Parses input values, syncs local state to parent config via updateConfig().
   *
   * why: |
   *   Deferred updates on blur prevent excessive re-renders during typing; batch size and max length are training hyperparameters requiring validation.
   *
   * guardrails:
   *   - DO NOT update config on every keystroke; blur batching reduces noise
   *   - NOTE: parseInt(base 10) required; validate range before updateConfig call
   *   - ASK USER: Add error handling for invalid numeric input
   * ---/agentspec
   */
  const handleTrainBatchSizeBlur = () => {
    updateConfig('RERANKER_TRAIN_BATCH', trainBatchSize);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles UI input changes for reranker training hyperparameters (max_length, learning_rate). Updates local state on change, persists to config on blur.
   *
   * why: |
   *   Separates immediate UI responsiveness (onChange) from config persistence (onBlur) to avoid excessive writes.
   *
   * guardrails:
   *   - DO NOT persist on every keystroke; onBlur batches updates
   *   - NOTE: parseInt(base 10) required; validate input range before updateConfig call
   * ---/agentspec
   */
  const handleTrainMaxLengthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTrainMaxLength(parseInt(e.target.value, 10));
  };

  /**
   * ---agentspec
   * what: |
   *   Updates reranker training config on blur events. Parses float input for learning rate; commits trainMaxLength to config store on blur.
   *
   * why: |
   *   Deferred updates (blur vs change) reduce config thrashing; parseFloat ensures numeric type safety.
   *
   * guardrails:
   *   - DO NOT update config on every keystroke; blur batches changes
   *   - NOTE: parseFloat silently coerces invalid input to NaN; add validation before commit
   * ---/agentspec
   */
  const handleTrainMaxLengthBlur = () => {
    updateConfig('RERANKER_TRAIN_MAX_LENGTH', trainMaxLength);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles learning rate and warmup ratio input changes in training config UI. Parses float values, updates local state on change, syncs to config on blur.
   *
   * why: |
   *   Separates immediate UI responsiveness (onChange) from config persistence (onBlur) to avoid excessive writes.
   *
   * guardrails:
   *   - DO NOT validate range here; validation belongs in config layer
   *   - NOTE: parseFloat() silently coerces invalid input; add error boundary if needed
   * ---/agentspec
   */
  const handleTrainLearningRateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTrainLearningRate(parseFloat(e.target.value));
  };

  /**
   * ---agentspec
   * what: |
   *   Handles blur events for training hyperparameters (learning rate, warmup ratio). Updates config on blur; syncs local state on change.
   *
   * why: |
   *   Deferred config updates on blur reduce re-renders; local state tracks user input before commit.
   *
   * guardrails:
   *   - DO NOT update config on every keystroke; batch on blur only
   *   - NOTE: parseFloat() may return NaN; add validation before config write
   * ---/agentspec
   */
  const handleTrainLearningRateBlur = () => {
    updateConfig('RERANKER_TRAIN_LR', trainLearningRate);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles warmup ratio and triplets min count input changes. Updates local state on change, syncs to config on blur.
   *
   * why: |
   *   Separates immediate UI feedback (onChange) from config persistence (onBlur) to avoid excessive updates.
   *
   * guardrails:
   *   - DO NOT validate range here; validate in updateConfig or schema layer
   *   - NOTE: parseFloat may return NaN; add fallback or validation
   * ---/agentspec
   */
  const handleWarmupRatioChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setWarmupRatio(parseFloat(e.target.value));
  };

  /**
   * ---agentspec
   * what: |
   *   Handles blur event for RERANKER_WARMUP_RATIO config update. Parses triplets min count from input onChange, persists on blur.
   *
   * why: |
   *   Separates parse logic (onChange) from persistence (onBlur) to avoid redundant updates during typing.
   *
   * guardrails:
   *   - DO NOT update config on every keystroke; batch on blur only
   *   - NOTE: parseInt(e.target.value, 10) assumes valid numeric input; add validation
   * ---/agentspec
   */
  const handleWarmupRatioBlur = () => {
    updateConfig('RERANKER_WARMUP_RATIO', warmupRatio);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles triplet constraint input changes and blur events. Parses input value to int, updates local state, syncs to config on blur.
   *
   * why: |
   *   Separates input parsing from config persistence; blur event prevents excessive updates.
   *
   * guardrails:
   *   - DO NOT update config on every keystroke; defer to blur
   *   - NOTE: parseInt(value, 10) required; missing radix causes bugs in some browsers
   * ---/agentspec
   */
  const handleTripletsMinCountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTripletsMinCount(parseInt(e.target.value, 10));
  };

  /**
   * ---agentspec
   * what: |
   *   Handles blur event on triplets min count input and dropdown change on triplets mine mode. Updates config via updateConfig() callback.
   *
   * why: |
   *   Separates input handlers from state management; updateConfig() centralizes config persistence.
   *
   * guardrails:
   *   - DO NOT validate input values here; assume updateConfig() handles validation
   *   - NOTE: setTripletsMineMode() called before updateConfig(); ensure idempotent
   * ---/agentspec
   */
  const handleTripletsMinCountBlur = () => {
    updateConfig('TRIPLETS_MIN_COUNT', tripletsMinCount);
  };

  /**
   * ---agentspec
   * what: |
   *   Handles triplets mining mode selection via dropdown. Updates local state and persists to config on change.
   *
   * why: |
   *   Separates UI event handling from config persistence for testability and state consistency.
   *
   * guardrails:
   *   - DO NOT assume updateConfig succeeds; add error handling
   *   - NOTE: value is string; validate against allowed modes before persist
   * ---/agentspec
   */
  const handleTripletsMineModChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTripletsMineMode(value);
    updateConfig('TRIPLETS_MINE_MODE', value);
  };

  // Action handlers
  /**
   * ---agentspec
   * what: |
   *   POST to /api/reranker/mine with log_path, triplets_path, mode. Extracts triplets from logs via reranker API.
   *
   * why: |
   *   Centralizes triplet mining logic server-side; client sends paths + mode, receives mined data.
   *
   * guardrails:
   *   - DO NOT assume response success; add .catch() for network/API errors
   *   - NOTE: Requires valid log_path and triplets_path; validate before POST
   * ---/agentspec
   */
  const handleMineTriplets = async () => {
    try {
      const response = await fetch('/api/reranker/mine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          log_path: logPath,
          triplets_path: tripletsPath,
          mode: mineMode,
          reset: mineReset === '1'
        })
      });
      const data = await response.json();
      if (!data.ok) {
        alert(`Mining failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Mining error:', error);
      alert('Mining failed');
    }
  };

  /**
   * ---agentspec
   * what: |
   *   POSTs training config (epochs, batch_size, max_length) to /api/reranker/train endpoint. Returns training response.
   *
   * why: |
   *   Centralizes reranker model training trigger with validated hyperparameters.
   *
   * guardrails:
   *   - DO NOT train without user confirmation; long-running operation
   *   - NOTE: Requires backend /api/reranker/train endpoint; fails silently if missing
   *   - ASK USER: Add error handling + progress feedback before production
   * ---/agentspec
   */
  const handleTrainModel = async () => {
    try {
      const response = await fetch('/api/reranker/train', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          epochs: trainEpochs,
          batch_size: trainBatchSize,
          max_length: trainMaxLength,
          triplets_path: tripletsPath,
          output_path: modelPath,
          base_model: 'cross-encoder/ms-marco-MiniLM-L-12-v2'
        })
      });
      const data = await response.json();
      if (!data.ok) {
        alert(`Training failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Training error:', error);
      alert('Training failed');
    }
  };

  /**
   * ---agentspec
   * what: |
   *   POSTs empty JSON to /api/reranker/evaluate endpoint. Returns parsed response; checks data.ok flag.
   *
   * why: |
   *   Evaluates reranker model performance via dedicated API route.
   *
   * guardrails:
   *   - DO NOT send empty body; clarify required evaluation params (dataset, metrics, model ID)
   *   - NOTE: data.ok check incomplete; missing error handling for !data.ok case
   *   - ASK USER: What should happen if evaluation fails?
   * ---/agentspec
   */
  const handleEvaluateModel = async () => {
    try {
      const response = await fetch('/api/reranker/evaluate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      });
      const data = await response.json();
      if (!data.ok) {
        alert(`Evaluation failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Evaluation error:', error);
      alert('Evaluation failed');
    }
  };

  /**
   * ---agentspec
   * what: |
   *   Fetches reranker logs from /api/reranker/logs endpoint. Sets logs state and displays UI modal.
   *
   * why: |
   *   Centralizes log retrieval with error handling to prevent UI crashes on fetch failure.
   *
   * guardrails:
   *   - DO NOT expose raw error to user; only console.error
   *   - NOTE: Silent failure if endpoint unavailable; consider user feedback
   * ---/agentspec
   */
  const handleViewLogs = async () => {
    try {
      const response = await fetch('/api/reranker/logs');
      const data = await response.json();
      setLogs(data.logs || []);
      setShowLogs(true);
    } catch (error) {
      console.error('Failed to load logs:', error);
    }
  };

  /**
   * ---agentspec
   * what: |
   *   Handles log download (opens /api/reranker/logs/download in new tab) and log clearing (confirms, then POSTs to clear endpoint).
   *
   * why: |
   *   Separates UI interactions (download/clear) from API calls for testability and reusability.
   *
   * guardrails:
   *   - DO NOT clear logs without user confirmation; destructive operation
   *   - NOTE: Download uses window.open; clear implementation incomplete (try/catch present but no endpoint call shown)
   * ---/agentspec
   */
  const handleDownloadLogs = () => {
    window.open('/api/reranker/logs/download', '_blank');
  };

  /**
   * ```
   * ---agentspec
   * what: |
   *   Clears all query logs via POST to /api/reranker/logs/clear. Confirms user intent, updates local state on success.
   *
   * why: |
   *   Destructive operation requires confirmation; local state sync prevents stale UI.
   *
   * guardrails:
   *   - DO NOT clear without user confirmation; irreversible
   *   - NOTE: Assumes response.json() contains {ok: boolean}
   *   - ASK USER: Add error handling for failed clears
   * ---/agentspec
   * ```
   */
  const handleClearLogs = async () => {
    if (!confirm('Clear all query logs? This cannot be undone.')) {
      return;
    }
    try {
      const response = await fetch('/api/reranker/logs/clear', { method: 'POST' });
      const data = await response.json();
      if (data.ok) {
        setLogs([]);
        setShowLogs(false);
        loadCounts();
      }
    } catch (error) {
      console.error('Failed to clear logs:', error);
    }
  };

  /**
   * ---agentspec
   * what: |
   *   POST to /api/reranker/baseline/save. Saves current reranker state as baseline. Returns {ok: boolean, error?: string}.
   *
   * why: |
   *   Centralizes baseline persistence logic server-side; client triggers via single endpoint.
   *
   * guardrails:
   *   - DO NOT retry on failure; alert user and let them decide
   *   - NOTE: Assumes /api/reranker/baseline/save exists and handles validation server-side
   * ---/agentspec
   */
  const handleSaveBaseline = async () => {
    try {
      const response = await fetch('/api/reranker/baseline/save', { method: 'POST' });
      const data = await response.json();
      if (data.ok) {
        alert('Baseline saved successfully');
      } else {
        alert(`Failed to save baseline: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to save baseline:', error);
    }
  };

  /**
   * ```
   * ---agentspec
   * what: |
   *   Fetches reranker baseline comparison from /api/reranker/baseline/compare. Returns MRR and Hit@1 metrics with deltas; displays via alert().
   *
   * why: |
   *   Client-side handler for A/B comparison without page reload.
   *
   * guardrails:
   *   - DO NOT rely on alert() for production UX; use modal/toast
   *   - NOTE: Assumes /api endpoint returns {ok, baseline, current, delta} or {ok: false, error}
   *   - ASK USER: Add error retry logic and timeout handling
   * ---/agentspec
   * ```
   */
  const handleCompareBaseline = async () => {
    try {
      const response = await fetch('/api/reranker/baseline/compare');
      const data = await response.json();
      if (data.ok) {
        const msg = `Baseline Comparison:\n\nBaseline MRR: ${data.baseline.mrr}\nCurrent MRR: ${data.current.mrr}\nDelta: ${data.delta.mrr > 0 ? '+' : ''}${data.delta.mrr}\n\nBaseline Hit@1: ${data.baseline.hit1}\nCurrent Hit@1: ${data.current.hit1}\nDelta: ${data.delta.hit1 > 0 ? '+' : ''}${data.delta.hit1}`;
        alert(msg);
      } else {
        alert(`Comparison failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to compare baseline:', error);
    }
  };

  /**
   * ---agentspec
   * what: |
   *   Prompts user confirmation, then POSTs to /api/reranker/rollback. Returns success alert or silent abort.
   *
   * why: |
   *   Confirmation gate prevents accidental model downgrades; fetch wraps API call with JSON parsing.
   *
   * guardrails:
   *   - DO NOT rollback without user confirmation; destructive operation
   *   - NOTE: Silent fail if response.ok is false; add error handling
   *   - ASK USER: Should failed rollbacks show error alert?
   * ---/agentspec
   */
  const handleRollback = async () => {
    if (!confirm('Rollback to previous model version? This will replace the current model.')) {
      return;
    }
    try {
      const response = await fetch('/api/reranker/rollback', { method: 'POST' });
      const data = await response.json();
      if (data.ok) {
        alert('Model rolled back successfully');
      } else {
        alert(`Rollback failed: ${data.error}`);
      }
    } catch (error) {
      console.error('Rollback failed:', error);
    }
  };

  /**
   * ---agentspec
   * what: |
   *   POSTs cron setup request to /api/reranker/cron/setup with time payload. Returns JSON response; checks data.ok flag.
   *
   * why: |
   *   Centralizes cron scheduling logic in backend; frontend only sends time parameter.
   *
   * guardrails:
   *   - DO NOT assume data.ok without error handling; add catch for network/parse failures
   *   - NOTE: No timeout or retry logic; add if backend is unreliable
   * ---/agentspec
   */
  const handleSetupCron = async () => {
    try {
      const response = await fetch('/api/reranker/cron/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: cronTime })
      });
      const data = await response.json();
      if (data.ok) {
        setCronStatus(`Nightly job scheduled for ${data.time}`);
      } else {
        alert(`Failed to setup cron: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to setup cron:', error);
    }
  };

  /**
   * ---agentspec
   * what: |
   *   POST to /api/reranker/cron/remove. Removes scheduled nightly reranker job. Updates UI status on success or alerts error.
   *
   * why: |
   *   Centralizes cron removal logic in single handler; decouples UI state from API layer.
   *
   * guardrails:
   *   - DO NOT assume response.ok === data.ok; validate both HTTP status and data.ok
   *   - NOTE: Alert blocks UI; consider toast/snackbar for non-blocking feedback
   *   - ASK USER: Should removal require confirmation dialog to prevent accidental deletion?
   * ---/agentspec
   */
  const handleRemoveCron = async () => {
    try {
      const response = await fetch('/api/reranker/cron/remove', { method: 'POST' });
      const data = await response.json();
      if (data.ok) {
        setCronStatus('Nightly job removed');
      } else {
        alert(`Failed to remove cron: ${data.error}`);
      }
    } catch (error) {
      console.error('Failed to remove cron:', error);
    }
  };

  /**
   * ---agentspec
   * what: |
   *   POST to /api/reranker/smoketest with query string. Returns JSON result, sets state.
   *
   * why: |
   *   Validates reranker endpoint health before production use.
   *
   * guardrails:
   *   - DO NOT retry on failure; smoke test should fail fast
   *   - NOTE: Assumes endpoint exists; no fallback if 404
   * ---/agentspec
   */
  const handleSmokeTest = async () => {
    try {
      const response = await fetch('/api/reranker/smoketest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery })
      });
      const data = await response.json();
      setSmokeTestResult(data);
      setShowSmokeResult(true);
    } catch (error) {
      console.error('Smoke test failed:', error);
      setSmokeTestResult({ ok: false, error: String(error) });
      setShowSmokeResult(true);
    }
  };

  /**
   * ---agentspec
   * what: |
   *   Displays cost breakdown alert on button click. Shows 24h total and per-query average in USD.
   *
   * why: |
   *   Simple modal for users to inspect billing metrics without page navigation.
   *
   * guardrails:
   *   - DO NOT persist alert state; dismiss on user action
   *   - NOTE: Requires cost24h and costAvg props pre-calculated
   * ---/agentspec
   */
  const handleViewCostDetails = () => {
    alert(`Cost breakdown:\nLast 24h: $${cost24h.toFixed(4)}\nAvg per query: $${costAvg.toFixed(6)}`);
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading...</div>;
  }

  return (
    <>
      {/* Header Section */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)', padding: '24px' }}>
        <h2 style={{ color: 'var(--link)' }}>Learning Reranker System</h2>
        <p className="small">
          Self-improving retrieval through user feedback. Trains a cross-encoder that learns from
          thumbs-up/down and clicks to rank better results higher - without touching your chat model.
        </p>
      </div>

      {/* Status Overview */}
      <div className="settings-section">
        <h3>System Status</h3>
        <div className="input-row">
          <div className="input-group">
            <label>Reranker Status</label>
            <div style={{
              padding: '8px',
              background: 'var(--card-bg)',
              borderRadius: '4px',
              fontFamily: "'SF Mono', monospace",
              fontSize: '13px'
            }}>
              {rerankerEnabled === '1' ? 'ENABLED' : 'DISABLED'}
            </div>
          </div>
          <div className="input-group">
            <label>Logged Queries</label>
            <div style={{
              padding: '8px',
              background: 'var(--card-bg)',
              borderRadius: '4px',
              fontFamily: "'SF Mono', monospace",
              fontSize: '13px'
            }}>
              {loggedQueries}
            </div>
          </div>
          <div className="input-group">
            <label>Training Triplets</label>
            <div style={{
              padding: '8px',
              background: 'var(--card-bg)',
              borderRadius: '4px',
              fontFamily: "'SF Mono', monospace",
              fontSize: '13px'
            }}>
              {tripletCount}
            </div>
          </div>
        </div>
      </div>

      {/* Training Workflow */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
        <h3>Training Workflow</h3>
        <p className="small">Click buttons below in order. Each step shows progress and results.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', margin: '16px 0' }}>
          {/* Mine Triplets */}
          <div style={{
            background: 'var(--chip-bg)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '16px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--link)' }}>1. Mine Triplets</h4>
            <p style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '12px' }}>
              Extract training data from logs
            </p>
            <button
              onClick={handleMineTriplets}
              disabled={status?.running}
              style={{
                width: '100%',
                background: 'var(--link)',
                color: 'var(--fg)',
                border: 'none',
                padding: '8px',
                borderRadius: '4px',
                cursor: status?.running ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: status?.running ? 0.5 : 1
              }}
            >
              Mine Triplets
            </button>
            {status?.task === 'mining' && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--fg-muted)' }}>
                {status.message}
              </div>
            )}
          </div>

          {/* Train Model */}
          <div style={{
            background: 'var(--chip-bg)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '16px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent)' }}>2. Train Model</h4>
            <p style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '12px' }}>
              Fine-tune cross-encoder (5-15 min)
            </p>
            <button
              onClick={handleTrainModel}
              disabled={status?.running}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                border: 'none',
                padding: '8px',
                borderRadius: '4px',
                cursor: status?.running ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: status?.running ? 0.5 : 1
              }}
            >
              Train Model
            </button>
            {status?.task === 'training' && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--fg-muted)' }}>
                {status.message} ({status.progress}%)
              </div>
            )}
          </div>

          {/* Evaluate */}
          <div style={{
            background: 'var(--chip-bg)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '16px'
          }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--warn)' }}>3. Evaluate</h4>
            <p style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '12px' }}>
              Measure MRR and Hit@K metrics
            </p>
            <button
              onClick={handleEvaluateModel}
              disabled={status?.running}
              style={{
                width: '100%',
                background: 'var(--warn)',
                color: 'var(--fg)',
                border: 'none',
                padding: '8px',
                borderRadius: '4px',
                cursor: status?.running ? 'not-allowed' : 'pointer',
                fontWeight: '600',
                opacity: status?.running ? 0.5 : 1
              }}
            >
              Evaluate
            </button>
            {status?.task === 'evaluating' && (
              <div style={{ marginTop: '8px', fontSize: '11px', color: 'var(--fg-muted)' }}>
                {status.message}
              </div>
            )}
          </div>
        </div>

        {/* Current Task Status */}
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--card-bg)',
          borderRadius: '6px',
          borderLeft: '3px solid var(--link)'
        }}>
          <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '4px' }}>
            Current Task:
          </div>
          <div style={{ fontSize: '14px', fontFamily: "'SF Mono', monospace", color: 'var(--fg-muted)' }}>
            {status?.running ? status.message : 'Ready'}
          </div>
        </div>

        {/* Live Terminal Output */}
        {terminalOutput.length > 0 && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: '#1a1a1a',
            borderRadius: '6px',
            maxHeight: '300px',
            overflowY: 'auto',
            fontFamily: "'SF Mono', monospace",
            fontSize: '11px',
            color: '#00ff00'
          }}>
            {terminalOutput.map((line, idx) => (
              <div key={idx}>{line}</div>
            ))}
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="settings-section">
        <h3>Reranker Configuration</h3>
        <div className="input-row">
          <div className="input-group">
            <label>
              Enable Learning Reranker
              <span className="help-icon" data-tooltip="AGRO_RERANKER_ENABLED">?</span>
            </label>
            <select
              name="AGRO_RERANKER_ENABLED"
              value={rerankerEnabled}
              onChange={handleRerankerEnabledChange}
            >
              <option value="0">OFF</option>
              <option value="1">ON</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              Model Path (AGRO_RERANKER_MODEL_PATH)
              <span className="help-icon" data-tooltip="AGRO_RERANKER_MODEL_PATH">?</span>
            </label>
            <select
              name="AGRO_RERANKER_MODEL_PATH"
              value={modelPath}
              onChange={handleModelPathChange}
            >
              {availableModels.map(model => (
                <option key={model} value={model}>{model}</option>
              ))}
            </select>
          </div>
          <div className="input-group">
            <label>
              Telemetry Log Path
              <span className="help-icon" data-tooltip="AGRO_LOG_PATH">?</span>
            </label>
            <input
              type="text"
              name="AGRO_LOG_PATH"
              placeholder="data/logs/queries.jsonl"
              value={logPath}
              onChange={handleLogPathChange}
              onBlur={handleLogPathBlur}
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>
              Triplets Output (AGRO_TRIPLETS_PATH)
              <span className="help-icon" data-tooltip="AGRO_TRIPLETS_PATH">?</span>
            </label>
            <input
              type="text"
              name="AGRO_TRIPLETS_PATH"
              placeholder="data/training/triplets.jsonl"
              value={tripletsPath}
              onChange={handleTripletsPathChange}
              onBlur={handleTripletsPathBlur}
            />
          </div>
          <div className="input-group">
            <label>
              Mine Mode (AGRO_RERANKER_MINE_MODE)
              <span className="help-icon" data-tooltip="AGRO_RERANKER_MINE_MODE">?</span>
            </label>
            <select
              name="AGRO_RERANKER_MINE_MODE"
              value={mineMode}
              onChange={handleMineModeChange}
            >
              <option value="append">append</option>
              <option value="replace">replace</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              Reset Before Mine (AGRO_RERANKER_MINE_RESET)
              <span className="help-icon" data-tooltip="AGRO_RERANKER_MINE_RESET">?</span>
            </label>
            <select
              name="AGRO_RERANKER_MINE_RESET"
              value={mineReset}
              onChange={handleMineResetChange}
            >
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>
        </div>

        {/* Current Reranker Info Panel */}
        <div className="input-row" style={{ marginTop: '8px' }}>
          <div
            className="input-group full-width"
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '10px'
            }}
          >
            <div style={{
              fontSize: '11px',
              color: 'var(--fg-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.5px',
              marginBottom: '6px'
            }}>
              Current Reranker (Server)
            </div>
            <div className="mono" style={{ fontSize: '12px', lineHeight: '1.6' }}>
              <div>Enabled: <span>{rerankerInfo?.enabled ? 'true' : 'false'}</span></div>
              <div>Model Path: <span>{rerankerInfo?.path || modelPath}</span></div>
              <div>Device: <span>{rerankerInfo?.device || '—'}</span></div>
              <div>
                Alpha: <span>{rerankerInfo?.alpha || blendAlpha}</span> •
                TopN: <span>{rerankerInfo?.topn || rerankerTopN}</span> •
                Batch: <span>{rerankerInfo?.batch || batchSize}</span> •
                MaxLen: <span>{rerankerInfo?.maxlen || maxSeqLength}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Blend Alpha (CE Weight)
              <span className="help-icon" data-tooltip="AGRO_RERANKER_ALPHA">?</span>
            </label>
            <input
              type="number"
              name="AGRO_RERANKER_ALPHA"
              value={blendAlpha}
              min="0.0"
              max="1.0"
              step="0.05"
              onChange={handleBlendAlphaChange}
              onBlur={handleBlendAlphaBlur}
            />
          </div>
          <div className="input-group">
            <label>
              Max Sequence Length
              <span className="help-icon" data-tooltip="AGRO_RERANKER_MAXLEN">?</span>
            </label>
            <input
              type="number"
              name="AGRO_RERANKER_MAXLEN"
              value={maxSeqLength}
              min="128"
              max="1024"
              step="64"
              onChange={handleMaxSeqLengthChange}
              onBlur={handleMaxSeqLengthBlur}
            />
          </div>
          <div className="input-group">
            <label>
              Batch Size (Inference)
              <span className="help-icon" data-tooltip="AGRO_RERANKER_BATCH">?</span>
            </label>
            <input
              type="number"
              name="AGRO_RERANKER_BATCH"
              value={batchSize}
              min="1"
              max="64"
              step="4"
              onChange={handleBatchSizeChange}
              onBlur={handleBatchSizeBlur}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Reranker Top-N
              <span className="help-icon" data-tooltip="AGRO_RERANKER_TOPN">?</span>
            </label>
            <input
              type="number"
              name="AGRO_RERANKER_TOPN"
              value={rerankerTopN}
              min="10"
              max="200"
              step="5"
              onChange={handleRerankerTopNChange}
              onBlur={handleRerankerTopNBlur}
            />
          </div>
          <div className="input-group">
            <label>
              Voyage Rerank Model
              <span className="help-icon" data-tooltip="VOYAGE_RERANK_MODEL">?</span>
            </label>
            <input
              type="text"
              name="VOYAGE_RERANK_MODEL"
              value={voyageRerankerModel}
              onChange={handleVoyageRerankerModelChange}
              onBlur={handleVoyageRerankerModelBlur}
            />
          </div>
          <div className="input-group">
            <label>
              Reload on Change
              <span className="help-icon" data-tooltip="AGRO_RERANKER_RELOAD_ON_CHANGE">?</span>
            </label>
            <select
              name="AGRO_RERANKER_RELOAD_ON_CHANGE"
              value={reloadOnChange}
              onChange={handleReloadOnChangeChange}
            >
              <option value="0">Disabled</option>
              <option value="1">Enabled</option>
            </select>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Training Epochs
              <span className="help-icon" data-tooltip="RERANKER_TRAIN_EPOCHS">?</span>
            </label>
            <input
              type="number"
              name="RERANKER_TRAIN_EPOCHS"
              value={trainEpochs}
              min="1"
              max="10"
              onChange={handleTrainEpochsChange}
              onBlur={handleTrainEpochsBlur}
            />
          </div>
          <div className="input-group">
            <label>
              Training Batch Size
              <span className="help-icon" data-tooltip="RERANKER_TRAIN_BATCH">?</span>
            </label>
            <input
              type="number"
              name="RERANKER_TRAIN_BATCH"
              value={trainBatchSize}
              min="1"
              max="64"
              step="4"
              onChange={handleTrainBatchSizeChange}
              onBlur={handleTrainBatchSizeBlur}
            />
          </div>
          <div className="input-group">
            <label>
              Training Max Length
              <span className="help-icon" data-tooltip="RERANKER_TRAIN_MAX_LENGTH">?</span>
            </label>
            <input
              type="number"
              name="RERANKER_TRAIN_MAX_LENGTH"
              value={trainMaxLength}
              min="128"
              max="1024"
              step="64"
              onChange={handleTrainMaxLengthChange}
              onBlur={handleTrainMaxLengthBlur}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Training Learning Rate
              <span className="help-icon" data-tooltip="RERANKER_TRAIN_LR">?</span>
            </label>
            <input
              type="number"
              name="RERANKER_TRAIN_LR"
              value={trainLearningRate}
              min="0.000001"
              max="0.001"
              step="0.000001"
              onChange={handleTrainLearningRateChange}
              onBlur={handleTrainLearningRateBlur}
            />
          </div>
          <div className="input-group">
            <label>
              Warmup Ratio
              <span className="help-icon" data-tooltip="RERANKER_WARMUP_RATIO">?</span>
            </label>
            <input
              type="number"
              name="RERANKER_WARMUP_RATIO"
              value={warmupRatio}
              min="0.0"
              max="0.5"
              step="0.05"
              onChange={handleWarmupRatioChange}
              onBlur={handleWarmupRatioBlur}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Triplets Min Count
              <span className="help-icon" data-tooltip="TRIPLETS_MIN_COUNT">?</span>
            </label>
            <input
              type="number"
              name="TRIPLETS_MIN_COUNT"
              value={tripletsMinCount}
              min="10"
              max="10000"
              step="10"
              onChange={handleTripletsMinCountChange}
              onBlur={handleTripletsMinCountBlur}
            />
          </div>
          <div className="input-group">
            <label>
              Triplets Mine Mode
              <span className="help-icon" data-tooltip="TRIPLETS_MINE_MODE">?</span>
            </label>
            <select
              name="TRIPLETS_MINE_MODE"
              value={tripletsMineMode}
              onChange={handleTripletsMineModChange}
            >
              <option value="replace">Replace</option>
              <option value="append">Append</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cross-Encoder Model Performance Evaluation Results */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--warn)' }}>
        <h3>Cross-Encoder Model Performance Evaluation</h3>
        <p className="small" style={{ color: 'var(--fg-muted)', fontSize: '11px', marginBottom: '12px' }}>
          Note: This evaluates ONLY the cross-encoder/reranker model performance (MRR, Hit@K metrics).
          For full RAG pipeline evaluation (retrieval + generation), see the Evaluate subtab.
        </p>
        <div style={{
          background: 'var(--card-bg)',
          borderRadius: '6px',
          padding: '16px',
          minHeight: '120px'
        }}>
          {evalMetrics ? (
            <div style={{ fontFamily: "'SF Mono', monospace", fontSize: '13px' }}>
              <div>MRR@all: <strong>{evalMetrics.mrr?.toFixed(4) || '—'}</strong></div>
              <div>Hit@1: <strong>{evalMetrics.hit1?.toFixed(4) || '—'}</strong></div>
              <div>Hit@3: <strong>{evalMetrics.hit3?.toFixed(4) || '—'}</strong></div>
              <div>Hit@5: <strong>{evalMetrics.hit5?.toFixed(4) || '—'}</strong></div>
            </div>
          ) : (
            <div style={{ color: 'var(--fg-muted)', textAlign: 'center', padding: '20px' }}>
              No evaluation results yet. Click "Evaluate" above.
            </div>
          )}
        </div>

        <div className="input-row" style={{ marginTop: '16px' }}>
          <div className="input-group">
            <button
              onClick={handleSaveBaseline}
              style={{
                background: 'var(--link)',
                color: 'var(--on-link)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
                fontWeight: '600'
              }}
            >
              Save as Baseline
            </button>
          </div>
          <div className="input-group">
            <button
              onClick={handleCompareBaseline}
              style={{
                background: 'var(--warn)',
                color: 'var(--on-warn)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
                width: '100%'
              }}
            >
              Compare vs Baseline
            </button>
          </div>
          <div className="input-group">
            <button
              onClick={handleRollback}
              style={{
                background: 'var(--err)',
                color: 'var(--on-err)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
                fontWeight: '600'
              }}
            >
              Rollback Model
            </button>
          </div>
        </div>
      </div>

      {/* Log Viewer */}
      <div className="settings-section">
        <h3>Query Logs</h3>
        <div className="input-row">
          <div className="input-group">
            <button
              onClick={handleViewLogs}
              style={{
                background: 'var(--bg-elev1)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              View Logs
            </button>
          </div>
          <div className="input-group">
            <button
              onClick={handleDownloadLogs}
              style={{
                background: 'var(--bg-elev1)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Download Logs
            </button>
          </div>
          <div className="input-group">
            <button
              onClick={handleClearLogs}
              style={{
                background: 'var(--err)',
                color: 'var(--on-err)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600'
              }}
            >
              Clear Logs
            </button>
          </div>
        </div>
        {showLogs && (
          <div style={{
            marginTop: '16px',
            background: 'var(--card-bg)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '12px',
            maxHeight: '400px',
            overflowY: 'auto',
            fontFamily: "'SF Mono', monospace",
            fontSize: '11px'
          }}>
            {logs.map((log, idx) => (
              <div key={idx} style={{ marginBottom: '8px', borderBottom: '1px solid var(--line)', paddingBottom: '8px' }}>
                <div><strong>Query:</strong> {log.query_raw}</div>
                <div><strong>Time:</strong> {log.ts}</div>
                <div><strong>Results:</strong> {log.retrieval?.length || 0}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Automation */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--warn)' }}>
        <h3>Automation</h3>
        <p className="small">Set up nightly training to automatically improve the reranker.</p>

        <div className="input-row">
          <div className="input-group">
            <label>Nightly Training Time</label>
            <input
              type="time"
              value={cronTime}
              onChange={(e) => setCronTime(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>&nbsp;</label>
            <button
              onClick={handleSetupCron}
              style={{
                background: 'var(--link)',
                color: 'var(--on-link)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
                fontWeight: '600'
              }}
            >
              Setup Nightly Job
            </button>
          </div>
        </div>

        <div style={{ marginTop: '8px' }}>
          <button
            onClick={handleRemoveCron}
            style={{
              background: 'var(--err)',
              color: 'var(--on-err)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%',
              fontWeight: '600'
            }}
          >
            Remove Nightly Job
          </button>
        </div>

        {cronStatus && (
          <div style={{
            marginTop: '12px',
            padding: '8px',
            background: 'var(--card-bg)',
            borderRadius: '4px',
            fontSize: '12px',
            color: 'var(--fg-muted)'
          }}>
            {cronStatus}
          </div>
        )}
      </div>

      {/* Smoke Test */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
        <h3>Smoke Test</h3>
        <p className="small">Verify end-to-end functionality: query → retrieve → rerank → log → feedback.</p>
        <div className="input-row">
          <div className="input-group">
            <label>Test Query</label>
            <input
              type="text"
              placeholder="Where is OAuth validated?"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>&nbsp;</label>
            <button
              onClick={handleSmokeTest}
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: '600',
                width: '100%'
              }}
            >
              Run Smoke Test
            </button>
          </div>
        </div>
        {showSmokeResult && smokeTestResult && (
          <div style={{
            marginTop: '16px',
            background: 'var(--card-bg)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '12px',
            fontFamily: "'SF Mono', monospace",
            fontSize: '11px'
          }}>
            {smokeTestResult.ok ? (
              <>
                <div>✓ Smoke test passed</div>
                <div>Results: {smokeTestResult.results_count}</div>
                <div>Reranked: {smokeTestResult.reranked ? 'Yes' : 'No'}</div>
                <div>Event ID: {smokeTestResult.event_id}</div>
              </>
            ) : (
              <div style={{ color: 'var(--err)' }}>✗ Error: {smokeTestResult.error}</div>
            )}
          </div>
        )}
      </div>

      {/* Cost Tracking */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--warn)' }}>
        <h3>Cost Tracking</h3>
        <div className="input-row">
          <div className="input-group">
            <label>Total Cost (Last 24h)</label>
            <div style={{
              padding: '8px',
              background: 'var(--card-bg)',
              borderRadius: '4px',
              fontFamily: "'SF Mono', monospace",
              fontSize: '13px',
              color: 'var(--accent)'
            }}>
              ${cost24h.toFixed(4)}
            </div>
          </div>
          <div className="input-group">
            <label>Avg Cost per Query</label>
            <div style={{
              padding: '8px',
              background: 'var(--card-bg)',
              borderRadius: '4px',
              fontFamily: "'SF Mono', monospace",
              fontSize: '13px',
              color: 'var(--accent)'
            }}>
              ${costAvg.toFixed(6)}
            </div>
          </div>
        </div>
        <button
          onClick={handleViewCostDetails}
          style={{
            background: 'var(--bg-elev1)',
            color: 'var(--fg)',
            border: '1px solid var(--line)',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%',
            marginTop: '8px',
            fontWeight: '600'
          }}
        >
          View Cost Breakdown
        </button>
      </div>

      {/* No-Hit Tracking */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--err)' }}>
        <h3>No-Hit Queries</h3>
        <p className="small">
          Queries that returned no relevant results. Consider reindexing or adding these terms to your corpus.
        </p>
        <div style={{
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '12px',
          maxHeight: '200px',
          overflowY: 'auto',
          fontFamily: "'SF Mono', monospace",
          fontSize: '11px'
        }}>
          {noHitQueries.length > 0 ? (
            noHitQueries.map((q, idx) => (
              <div key={idx} style={{ marginBottom: '4px' }}>
                <strong>{q.query}</strong> - {q.ts}
              </div>
            ))
          ) : (
            <div style={{ color: 'var(--fg-muted)', textAlign: 'center', padding: '20px' }}>
              No no-hit queries found
            </div>
          )}
        </div>
      </div>
    </>
  );
}
