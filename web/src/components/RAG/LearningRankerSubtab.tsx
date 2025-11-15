// AGRO - Learning Ranker Subtab
// Self-improving retrieval through user feedback and cross-encoder training

import { useState, useEffect, useCallback } from 'react';
import { useGlobalState } from '@/hooks/useGlobalState';
import { useAPI } from '@/hooks/useAPI';

interface RerankerStatus {
  enabled: string;
  queryCount: string;
  tripletCount: string;
}

interface RerankerMetrics {
  mrr?: number;
  hit_at_1?: number;
  hit_at_3?: number;
  hit_at_5?: number;
  hit_at_10?: number;
}

export function LearningRankerSubtab() {
  const { state } = useGlobalState();
  const { api } = useAPI();
  const config = state.config || {};

  // Configuration state
  const [enabled, setEnabled] = useState(config.AGRO_RERANKER_ENABLED || '0');
  const [modelPath, setModelPath] = useState(config.AGRO_RERANKER_MODEL_PATH || 'models/cross-encoder-agro');
  const [logPath, setLogPath] = useState(config.AGRO_LOG_PATH || 'data/logs/queries.jsonl');
  const [tripletsPath, setTripletsPath] = useState(config.AGRO_TRIPLETS_PATH || 'data/training/triplets.jsonl');
  const [mineMode, setMineMode] = useState(config.AGRO_RERANKER_MINE_MODE || 'append');
  const [mineReset, setMineReset] = useState(config.AGRO_RERANKER_MINE_RESET || '0');
  const [alpha, setAlpha] = useState(config.AGRO_RERANKER_ALPHA || 0.7);
  const [maxLen, setMaxLen] = useState(config.AGRO_RERANKER_MAXLEN || 512);
  const [batch, setBatch] = useState(config.AGRO_RERANKER_BATCH || 16);
  const [epochs, setEpochs] = useState(2);
  const [trainBatch, setTrainBatch] = useState(16);

  // Status and results
  const [status, setStatus] = useState<RerankerStatus>({
    enabled: '...',
    queryCount: '...',
    tripletCount: '...'
  });
  const [currentTask, setCurrentTask] = useState('Ready');
  const [mineResult, setMineResult] = useState('');
  const [trainResult, setTrainResult] = useState('');
  const [evalResult, setEvalResult] = useState('');
  const [metrics, setMetrics] = useState<RerankerMetrics>({});
  const [isLogsVisible, setIsLogsVisible] = useState(false);
  const [logs, setLogs] = useState('');
  const [cronStatus, setCronStatus] = useState('');
  const [cronTime, setCronTime] = useState('02:15');
  const [testQuery, setTestQuery] = useState('Where is OAuth validated?');
  const [smokeResult, setSmokeResult] = useState('');
  const [isSmokeVisible, setIsSmokeVisible] = useState(false);
  const [cost24h, setCost24h] = useState('$0.00');
  const [costAvg, setCostAvg] = useState('$0.00');
  const [noHits, setNoHits] = useState('Loading no-hit queries...');

  // Reranker info from server
  const [rerankerInfo, setRerankerInfo] = useState({
    enabled: '—',
    path: '—',
    device: '—',
    alpha: '—',
    topn: '—',
    batch: '—',
    maxlen: '—'
  });

  // Sync state with config changes
  useEffect(() => {
    if (config.AGRO_RERANKER_ENABLED !== undefined) setEnabled(config.AGRO_RERANKER_ENABLED);
    if (config.AGRO_RERANKER_MODEL_PATH !== undefined) setModelPath(config.AGRO_RERANKER_MODEL_PATH);
    if (config.AGRO_LOG_PATH !== undefined) setLogPath(config.AGRO_LOG_PATH);
    if (config.AGRO_TRIPLETS_PATH !== undefined) setTripletsPath(config.AGRO_TRIPLETS_PATH);
    if (config.AGRO_RERANKER_MINE_MODE !== undefined) setMineMode(config.AGRO_RERANKER_MINE_MODE);
    if (config.AGRO_RERANKER_MINE_RESET !== undefined) setMineReset(config.AGRO_RERANKER_MINE_RESET);
    if (config.AGRO_RERANKER_ALPHA !== undefined) setAlpha(config.AGRO_RERANKER_ALPHA);
    if (config.AGRO_RERANKER_MAXLEN !== undefined) setMaxLen(config.AGRO_RERANKER_MAXLEN);
    if (config.AGRO_RERANKER_BATCH !== undefined) setBatch(config.AGRO_RERANKER_BATCH);
  }, [config]);

  // Fetch reranker status
  const fetchStatus = useCallback(async () => {
    try {
      const response = await fetch(api('/reranker/status'));
      if (response.ok) {
        const data = await response.json();
        setStatus({
          enabled: data.enabled ? 'Yes' : 'No',
          queryCount: data.query_count?.toString() || '0',
          tripletCount: data.triplet_count?.toString() || '0'
        });
      }
    } catch (err) {
      console.error('[LearningRanker] Failed to fetch status:', err);
    }
  }, [api]);

  // Fetch reranker info from server
  const fetchRerankerInfo = useCallback(async () => {
    try {
      const response = await fetch(api('/config'));
      if (response.ok) {
        const data = await response.json();
        if (data.reranker) {
          setRerankerInfo({
            enabled: data.reranker.enabled ? 'Yes' : 'No',
            path: data.reranker.model_path || '—',
            device: data.reranker.device || '—',
            alpha: data.reranker.alpha?.toString() || '—',
            topn: data.reranker.topn?.toString() || '—',
            batch: data.reranker.batch?.toString() || '—',
            maxlen: data.reranker.maxlen?.toString() || '—'
          });
        }
      }
    } catch (err) {
      console.error('[LearningRanker] Failed to fetch reranker info:', err);
    }
  }, [api]);

  useEffect(() => {
    fetchStatus();
    fetchRerankerInfo();
    const interval = setInterval(() => {
      fetchStatus();
      fetchRerankerInfo();
    }, 5000);
    return () => clearInterval(interval);
  }, [fetchStatus, fetchRerankerInfo]);

  // Initialize LiveTerminal for streaming logs (matches /gui/js/reranker.js initRerankerTerminal)
  useEffect(() => {
    const initTerminal = () => {
      const w = window as any;
      if (w.LiveTerminal && !w._rerankerTerminal) {
        try {
          w._rerankerTerminal = new w.LiveTerminal('reranker-terminal-container');
          console.log('[LearningRanker] Live terminal initialized');
        } catch (e) {
          console.warn('[LearningRanker] Failed to init terminal:', e);
        }
      }
    };

    // Try immediate init
    initTerminal();

    // Also try after a delay in case LiveTerminal loads late
    const timeout = setTimeout(initTerminal, 1000);
    return () => clearTimeout(timeout);
  }, []);

  // Training workflow handlers
  const handleMineTriplets = async () => {
    setCurrentTask('Mining triplets from query logs...');
    setMineResult('Processing...');
    try {
      const response = await fetch(api('/reranker/mine'), { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setMineResult(`✓ Mined ${data.count || 0} triplets`);
        fetchStatus();
      } else {
        setMineResult(`✗ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setMineResult(`✗ Failed to mine triplets: ${err}`);
    }
    setCurrentTask('Ready');
  };

  const handleTrain = async () => {
    setCurrentTask('Training cross-encoder model (this may take 5-15 minutes)...');
    setTrainResult('Training in progress...');
    try {
      const response = await fetch(api('/reranker/train'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ epochs, batch: trainBatch })
      });
      const data = await response.json();
      if (response.ok) {
        setTrainResult(`✓ Training completed in ${data.duration || 'N/A'}s`);
        fetchStatus();
      } else {
        setTrainResult(`✗ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setTrainResult(`✗ Training failed: ${err}`);
    }
    setCurrentTask('Ready');
  };

  const handleEvaluate = async () => {
    setCurrentTask('Evaluating model performance...');
    setEvalResult('Evaluating...');
    try {
      const response = await fetch(api('/reranker/evaluate'), { method: 'POST' });
      const data = await response.json();
      if (response.ok) {
        setMetrics(data.metrics || {});
        setEvalResult(`✓ Evaluation complete`);
      } else {
        setEvalResult(`✗ Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setEvalResult(`✗ Evaluation failed: ${err}`);
    }
    setCurrentTask('Ready');
  };

  const handleSaveBaseline = async () => {
    try {
      const response = await fetch(api('/reranker/baseline/save'), { method: 'POST' });
      if (response.ok) {
        alert('Baseline saved successfully');
      } else {
        alert('Failed to save baseline');
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  const handleCompareBaseline = async () => {
    try {
      const response = await fetch(api('/reranker/baseline/compare'));
      const data = await response.json();
      if (response.ok) {
        alert(`Comparison:\nCurrent MRR: ${data.current_mrr}\nBaseline MRR: ${data.baseline_mrr}\nDelta: ${data.delta}`);
      } else {
        alert('Failed to compare baseline');
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  const handleRollback = async () => {
    if (!confirm('Rollback to previous model version?')) return;
    try {
      const response = await fetch(api('/reranker/rollback'), { method: 'POST' });
      if (response.ok) {
        alert('Model rolled back successfully');
        fetchStatus();
      } else {
        alert('Failed to rollback model');
      }
    } catch (err) {
      alert(`Error: ${err}`);
    }
  };

  const handleViewLogs = async () => {
    try {
      const response = await fetch(api('/reranker/logs'));
      const data = await response.json();
      if (response.ok) {
        setLogs(JSON.stringify(data.logs || [], null, 2));
        setIsLogsVisible(true);
      }
    } catch (err) {
      setLogs(`Error loading logs: ${err}`);
      setIsLogsVisible(true);
    }
  };

  const handleDownloadLogs = async () => {
    try {
      const response = await fetch(api('/reranker/logs'));
      const data = await response.json();
      if (response.ok) {
        const blob = new Blob([JSON.stringify(data.logs, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'query-logs.json';
        a.click();
        URL.revokeObjectURL(url);
      }
    } catch (err) {
      alert(`Error downloading logs: ${err}`);
    }
  };

  const handleClearLogs = async () => {
    if (!confirm('Clear all query logs? This cannot be undone.')) return;
    try {
      const response = await fetch(api('/reranker/logs/clear'), { method: 'POST' });
      if (response.ok) {
        alert('Logs cleared successfully');
        setLogs('');
        setIsLogsVisible(false);
        fetchStatus();
      }
    } catch (err) {
      alert(`Error clearing logs: ${err}`);
    }
  };

  const handleSetupCron = async () => {
    try {
      const response = await fetch(api('/reranker/cron/setup'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ time: cronTime })
      });
      if (response.ok) {
        setCronStatus(`Nightly training scheduled for ${cronTime}`);
      } else {
        setCronStatus('Failed to setup cron job');
      }
    } catch (err) {
      setCronStatus(`Error: ${err}`);
    }
  };

  const handleRemoveCron = async () => {
    try {
      const response = await fetch(api('/reranker/cron/remove'), { method: 'POST' });
      if (response.ok) {
        setCronStatus('Nightly training disabled');
      } else {
        setCronStatus('Failed to remove cron job');
      }
    } catch (err) {
      setCronStatus(`Error: ${err}`);
    }
  };

  const handleSmokeTest = async () => {
    setSmokeResult('Running smoke test...');
    setIsSmokeVisible(true);
    try {
      const response = await fetch(api('/reranker/smoketest'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery })
      });
      const data = await response.json();
      if (response.ok) {
        setSmokeResult(JSON.stringify(data, null, 2));
      } else {
        setSmokeResult(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (err) {
      setSmokeResult(`Error: ${err}`);
    }
  };

  return (
    <div id="tab-rag-learning-ranker" className="rag-subtab-content">
      {/* Header */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h2 style={{ color: 'var(--link)' }}>🧠 Learning Reranker System</h2>
        <p className="small">
          Self-improving retrieval through user feedback. Trains a cross-encoder that learns from thumbs-up/down and clicks to rank better results higher - without touching your chat model.
        </p>
      </div>

      {/* Status Overview */}
      <div className="settings-section">
        <h3>📊 System Status</h3>
        <div className="input-row">
          <div className="input-group">
            <label>Reranker Status</label>
            <div id="reranker-enabled-status" style={{ padding: '8px', background: 'var(--card-bg)', borderRadius: '4px', fontFamily: "'SF Mono', monospace", fontSize: '13px' }}>
              {status.enabled}
            </div>
          </div>
          <div className="input-group">
            <label>Logged Queries</label>
            <div id="reranker-query-count" style={{ padding: '8px', background: 'var(--card-bg)', borderRadius: '4px', fontFamily: "'SF Mono', monospace", fontSize: '13px' }}>
              {status.queryCount}
            </div>
          </div>
          <div className="input-group">
            <label>Training Triplets</label>
            <div id="reranker-triplet-count" style={{ padding: '8px', background: 'var(--card-bg)', borderRadius: '4px', fontFamily: "'SF Mono', monospace", fontSize: '13px' }}>
              {status.tripletCount}
            </div>
          </div>
        </div>
      </div>

      {/* Training Workflow */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
        <h3>🎓 Training Workflow</h3>
        <p className="small">Click buttons below in order. Each step shows progress and results.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', margin: '16px 0' }}>
          <div style={{ background: 'var(--chip-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--link)' }}>1. Mine Triplets</h4>
            <p style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '12px' }}>Extract training data from logs</p>
            <button
              id="reranker-mine-btn"
              onClick={handleMineTriplets}
              style={{
                width: '100%',
                background: 'var(--link)',
                color: 'var(--fg)',
                border: 'none',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Mine Triplets
            </button>
            <div id="reranker-mine-result" style={{ marginTop: '8px', fontSize: '11px', color: 'var(--fg-muted)' }}>{mineResult}</div>
          </div>

          <div style={{ background: 'var(--chip-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--accent)' }}>2. Train Model</h4>
            <p style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '12px' }}>Fine-tune cross-encoder (5-15 min)</p>
            <button
              id="reranker-train-btn"
              onClick={handleTrain}
              style={{
                width: '100%',
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                border: 'none',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Train Model
            </button>
            <div id="reranker-train-result" style={{ marginTop: '8px', fontSize: '11px', color: 'var(--fg-muted)' }}>{trainResult}</div>
          </div>

          <div style={{ background: 'var(--chip-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '16px' }}>
            <h4 style={{ margin: '0 0 8px 0', color: 'var(--warn)' }}>3. Evaluate</h4>
            <p style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '12px' }}>Measure MRR and Hit@K metrics</p>
            <button
              id="reranker-eval-btn"
              onClick={handleEvaluate}
              style={{
                width: '100%',
                background: 'var(--warn)',
                color: 'var(--fg)',
                border: 'none',
                padding: '8px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Evaluate
            </button>
            <div id="reranker-eval-result" style={{ marginTop: '8px', fontSize: '11px', color: 'var(--fg-muted)' }}>{evalResult}</div>
          </div>
        </div>

        <div style={{ marginTop: '16px', padding: '12px', background: 'var(--card-bg)', borderRadius: '6px', borderLeft: '3px solid var(--link)' }}>
          <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginBottom: '4px' }}>Current Task:</div>
          <div id="reranker-status" style={{ fontSize: '14px', fontFamily: "'SF Mono', monospace", color: 'var(--fg-muted)' }}>{currentTask}</div>
        </div>

        {/* Live Terminal - matches /gui line 3611 */}
        <div id="reranker-terminal-container" style={{ marginTop: '16px' }}></div>
      </div>

      {/* Settings */}
      <div className="settings-section">
        <h3>⚙️ Reranker Configuration</h3>
        <div className="input-row">
          <div className="input-group">
            <label>Enable Learning Reranker</label>
            <select name="AGRO_RERANKER_ENABLED" value={enabled} onChange={(e) => setEnabled(e.target.value)}>
              <option value="0">OFF</option>
              <option value="1">ON</option>
            </select>
          </div>
          <div className="input-group">
            <label>Model Path (AGRO_RERANKER_MODEL_PATH)</label>
            <input
              type="text"
              name="AGRO_RERANKER_MODEL_PATH"
              placeholder="cross-encoder/ms-marco-MiniLM-L-12-v2"
              value={modelPath}
              onChange={(e) => setModelPath(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Telemetry Log Path</label>
            <input
              type="text"
              name="AGRO_LOG_PATH"
              placeholder="data/logs/queries.jsonl"
              value={logPath}
              onChange={(e) => setLogPath(e.target.value)}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Triplets Output (AGRO_TRIPLETS_PATH)</label>
            <input
              type="text"
              name="AGRO_TRIPLETS_PATH"
              placeholder="data/training/triplets.jsonl"
              value={tripletsPath}
              onChange={(e) => setTripletsPath(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>Mine Mode (AGRO_RERANKER_MINE_MODE)</label>
            <select name="AGRO_RERANKER_MINE_MODE" value={mineMode} onChange={(e) => setMineMode(e.target.value)}>
              <option value="append">append</option>
              <option value="replace">replace</option>
            </select>
          </div>
          <div className="input-group">
            <label>Reset Before Mine (AGRO_RERANKER_MINE_RESET)</label>
            <select name="AGRO_RERANKER_MINE_RESET" value={mineReset} onChange={(e) => setMineReset(e.target.value)}>
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>
        </div>

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
            <div
              style={{
                fontSize: '11px',
                color: 'var(--fg-muted)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                marginBottom: '6px'
              }}
            >
              Current Reranker (Server)
            </div>
            <div id="reranker-info-panel" className="mono" style={{ fontSize: '12px', lineHeight: 1.6 }}>
              <div>Enabled: <span>{rerankerInfo.enabled}</span></div>
              <div>Model Path: <span>{rerankerInfo.path}</span></div>
              <div>Device: <span>{rerankerInfo.device}</span></div>
              <div>
                Alpha: <span>{rerankerInfo.alpha}</span> • TopN: <span>{rerankerInfo.topn}</span> • Batch: <span>{rerankerInfo.batch}</span> • MaxLen: <span>{rerankerInfo.maxlen}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Blend Alpha (CE Weight)</label>
            <input
              type="number"
              name="AGRO_RERANKER_ALPHA"
              value={alpha}
              min="0.0"
              max="1.0"
              step="0.05"
              onChange={(e) => setAlpha(parseFloat(e.target.value) || 0.7)}
            />
          </div>
          <div className="input-group">
            <label>Max Sequence Length</label>
            <input
              type="number"
              name="AGRO_RERANKER_MAXLEN"
              value={maxLen}
              min="128"
              max="1024"
              step="64"
              onChange={(e) => setMaxLen(parseInt(e.target.value) || 512)}
            />
          </div>
          <div className="input-group">
            <label>Batch Size (Inference)</label>
            <input
              type="number"
              name="AGRO_RERANKER_BATCH"
              value={batch}
              min="1"
              max="64"
              step="4"
              onChange={(e) => setBatch(parseInt(e.target.value) || 16)}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Training Epochs</label>
            <input
              id="reranker-epochs"
              type="number"
              value={epochs}
              min="1"
              max="10"
              onChange={(e) => setEpochs(parseInt(e.target.value) || 2)}
            />
          </div>
          <div className="input-group">
            <label>Training Batch Size</label>
            <input
              id="reranker-batch"
              type="number"
              value={trainBatch}
              min="1"
              max="64"
              step="4"
              onChange={(e) => setTrainBatch(parseInt(e.target.value) || 16)}
            />
          </div>
        </div>
      </div>

      {/* Evaluation Results */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--warn)' }}>
        <h3>📊 Evaluation Metrics</h3>
        <div id="reranker-metrics-display" style={{ background: 'var(--card-bg)', borderRadius: '6px', padding: '16px', minHeight: '120px' }}>
          {Object.keys(metrics).length > 0 ? (
            <div style={{ fontFamily: "'SF Mono', monospace", fontSize: '13px' }}>
              <div>MRR: {metrics.mrr?.toFixed(4) || 'N/A'}</div>
              <div>Hit@1: {metrics.hit_at_1?.toFixed(4) || 'N/A'}</div>
              <div>Hit@3: {metrics.hit_at_3?.toFixed(4) || 'N/A'}</div>
              <div>Hit@5: {metrics.hit_at_5?.toFixed(4) || 'N/A'}</div>
              <div>Hit@10: {metrics.hit_at_10?.toFixed(4) || 'N/A'}</div>
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
              id="reranker-save-baseline"
              onClick={handleSaveBaseline}
              style={{
                background: 'var(--link)',
                color: 'var(--on-link)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
                fontWeight: 600
              }}
            >
              Save as Baseline
            </button>
          </div>
          <div className="input-group">
            <button
              id="reranker-compare-baseline"
              onClick={handleCompareBaseline}
              style={{
                background: 'var(--warn)',
                color: 'var(--on-warn)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
                width: '100%'
              }}
            >
              Compare vs Baseline
            </button>
          </div>
          <div className="input-group">
            <button
              id="reranker-rollback"
              onClick={handleRollback}
              style={{
                background: 'var(--err)',
                color: 'var(--on-err)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
                fontWeight: 600
              }}
            >
              Rollback Model
            </button>
          </div>
        </div>
      </div>

      {/* Log Viewer */}
      <div className="settings-section">
        <h3>📝 Query Logs</h3>
        <div className="input-row">
          <div className="input-group">
            <button
              id="reranker-view-logs"
              onClick={handleViewLogs}
              style={{
                background: 'var(--bg-elev1)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              View Logs
            </button>
          </div>
          <div className="input-group">
            <button
              id="reranker-download-logs"
              onClick={handleDownloadLogs}
              style={{
                background: 'var(--bg-elev1)',
                color: 'var(--fg)',
                border: '1px solid var(--line)',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Download Logs
            </button>
          </div>
          <div className="input-group">
            <button
              id="reranker-clear-logs"
              onClick={handleClearLogs}
              style={{
                background: 'var(--err)',
                color: 'var(--on-err)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Clear Logs
            </button>
          </div>
        </div>
        {isLogsVisible && (
          <div
            id="reranker-logs-viewer"
            style={{
              marginTop: '16px',
              background: 'var(--card-bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '12px',
              maxHeight: '400px',
              overflowY: 'auto',
              fontFamily: "'SF Mono', monospace",
              fontSize: '11px'
            }}
          >
            {logs}
          </div>
        )}
      </div>

      {/* Automation */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--warn)' }}>
        <h3>🔄 Automation</h3>
        <p className="small">Set up nightly training to automatically improve the reranker.</p>

        <div className="input-row">
          <div className="input-group">
            <label>Nightly Training Time</label>
            <input id="reranker-cron-time" type="time" value={cronTime} onChange={(e) => setCronTime(e.target.value)} />
          </div>
          <div className="input-group">
            <label>&nbsp;</label>
            <button
              id="reranker-setup-cron"
              onClick={handleSetupCron}
              style={{
                background: 'var(--link)',
                color: 'var(--on-link)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                width: '100%',
                fontWeight: 600
              }}
            >
              Setup Nightly Job
            </button>
          </div>
        </div>

        <div style={{ marginTop: '8px' }}>
          <button
            id="reranker-remove-cron"
            onClick={handleRemoveCron}
            style={{
              background: 'var(--err)',
              color: 'var(--on-err)',
              border: 'none',
              padding: '8px 16px',
              borderRadius: '4px',
              cursor: 'pointer',
              width: '100%',
              fontWeight: 600
            }}
          >
            Remove Nightly Job
          </button>
        </div>

        {cronStatus && (
          <div id="reranker-cron-status" style={{ marginTop: '12px', padding: '8px', background: 'var(--card-bg)', borderRadius: '4px', fontSize: '12px', color: 'var(--fg-muted)' }}>
            {cronStatus}
          </div>
        )}
      </div>

      {/* Smoke Test */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
        <h3>🧪 Smoke Test</h3>
        <p className="small">Verify end-to-end functionality: query → retrieve → rerank → log → feedback.</p>
        <div className="input-row">
          <div className="input-group">
            <label>Test Query</label>
            <input
              id="reranker-test-query"
              type="text"
              placeholder="Where is OAuth validated?"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
            />
          </div>
          <div className="input-group">
            <label>&nbsp;</label>
            <button
              id="reranker-smoke-test"
              onClick={handleSmokeTest}
              style={{
                background: 'var(--accent)',
                color: 'var(--accent-contrast)',
                border: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                cursor: 'pointer',
                fontWeight: 600,
                width: '100%'
              }}
            >
              Run Smoke Test
            </button>
          </div>
        </div>
        {isSmokeVisible && (
          <div
            id="reranker-smoke-result"
            style={{
              marginTop: '16px',
              background: 'var(--card-bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '12px',
              fontFamily: "'SF Mono', monospace",
              fontSize: '11px'
            }}
          >
            {smokeResult}
          </div>
        )}
      </div>

      {/* Cost Tracking */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--warn)' }}>
        <h3>💰 Cost Tracking</h3>
        <div className="input-row">
          <div className="input-group">
            <label>Total Cost (Last 24h)</label>
            <div
              id="reranker-cost-24h"
              style={{
                padding: '8px',
                background: 'var(--card-bg)',
                borderRadius: '4px',
                fontFamily: "'SF Mono', monospace",
                fontSize: '13px',
                color: 'var(--accent)'
              }}
            >
              {cost24h}
            </div>
          </div>
          <div className="input-group">
            <label>Avg Cost per Query</label>
            <div
              id="reranker-cost-avg"
              style={{
                padding: '8px',
                background: 'var(--card-bg)',
                borderRadius: '4px',
                fontFamily: "'SF Mono', monospace",
                fontSize: '13px',
                color: 'var(--accent)'
              }}
            >
              {costAvg}
            </div>
          </div>
        </div>
        <button
          style={{
            background: 'var(--bg-elev1)',
            color: 'var(--fg)',
            border: '1px solid var(--line)',
            padding: '8px 16px',
            borderRadius: '4px',
            cursor: 'pointer',
            width: '100%',
            marginTop: '8px',
            fontWeight: 600
          }}
        >
          View Cost Breakdown
        </button>
      </div>

      {/* No-Hit Tracking */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--err)' }}>
        <h3>⚠️ No-Hit Queries</h3>
        <p className="small">Queries that returned no relevant results. Consider reindexing or adding these terms to your corpus.</p>
        <div
          id="reranker-nohits-list"
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '12px',
            maxHeight: '200px',
            overflowY: 'auto',
            fontFamily: "'SF Mono', monospace",
            fontSize: '11px'
          }}
        >
          <div style={{ color: 'var(--fg-muted)', textAlign: 'center', padding: '20px' }}>{noHits}</div>
        </div>
      </div>
    </div>
  );
}
