// AGRO - External Rerankers Subtab
// Configure external reranking services (Cohere, HF, local models)

import { useState, useEffect } from 'react';
import { useGlobalState } from '@/hooks/useGlobalState';
import { useAPI } from '@/hooks/useAPI';

export function ExternalRerankersSubtab() {
  const { state } = useGlobalState();
  const { api } = useAPI();
  const config = state.config || {};

  // Reranker configuration state
  const [rerankBackend, setRerankBackend] = useState(config.RERANK_BACKEND || 'none');
  const [rerankerModel, setRerankerModel] = useState(config.RERANKER_MODEL || '');
  const [cohereModel, setCohereModel] = useState(config.COHERE_RERANK_MODEL || '');
  const [cohereApiKey, setCohereApiKey] = useState(config.COHERE_API_KEY || '');
  const [trustRemoteCode, setTrustRemoteCode] = useState(config.TRANSFORMERS_TRUST_REMOTE_CODE || '1');
  const [inputSnippetChars, setInputSnippetChars] = useState(config.RERANK_INPUT_SNIPPET_CHARS || 700);
  const [minRerankScore, setMinRerankScore] = useState(config.MIN_RERANK_SCORE || 0.0);
  const [maxRerankK, setMaxRerankK] = useState(config.MAX_RERANK_K || 10);

  // Test state
  const [testQuery, setTestQuery] = useState('');
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<any>(null);

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
    if (config.RERANK_BACKEND !== undefined) setRerankBackend(config.RERANK_BACKEND);
    if (config.RERANKER_MODEL !== undefined) setRerankerModel(config.RERANKER_MODEL);
    if (config.COHERE_RERANK_MODEL !== undefined) setCohereModel(config.COHERE_RERANK_MODEL);
    if (config.COHERE_API_KEY !== undefined) setCohereApiKey(config.COHERE_API_KEY);
    if (config.TRANSFORMERS_TRUST_REMOTE_CODE !== undefined) setTrustRemoteCode(config.TRANSFORMERS_TRUST_REMOTE_CODE);
    if (config.RERANK_INPUT_SNIPPET_CHARS !== undefined) setInputSnippetChars(config.RERANK_INPUT_SNIPPET_CHARS);
    if (config.MIN_RERANK_SCORE !== undefined) setMinRerankScore(config.MIN_RERANK_SCORE);
    if (config.MAX_RERANK_K !== undefined) setMaxRerankK(config.MAX_RERANK_K);
  }, [config]);

  const handleTestReranker = async () => {
    if (!testQuery.trim()) {
      alert('Please enter a test query');
      return;
    }

    setTestRunning(true);
    setTestResults(null);

    try {
      const response = await fetch(api('/reranker/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: testQuery })
      });

      if (response.ok) {
        const data = await response.json();
        setTestResults(data);
      } else {
        alert('Test failed');
      }
    } catch (error) {
      console.error('Test error:', error);
      alert('Test failed');
    } finally {
      setTestRunning(false);
    }
  };

  // Load reranker info from server
  useEffect(() => {
    const fetchRerankerInfo = async () => {
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
        console.error('[ExternalRerankers] Failed to fetch reranker info:', err);
      }
    };

    fetchRerankerInfo();
    const interval = setInterval(fetchRerankerInfo, 5000);
    return () => clearInterval(interval);
  }, [api]);

  return (
    <div id="tab-rag-external-rerankers" className="rag-subtab-content">
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>
          <span className="accent-pink">●</span> Reranking
          <span className="tooltip-wrap">
            <span className="help-icon">?</span>
            <div className="tooltip-bubble">
              <span className="tt-title">Cross-Encoder Reranking</span>
              Configure reranking backend and models. Set to "none" for offline/BM25-only operation.
              <div className="tt-badges">
                <span className="tt-badge info">Quality Boost</span>
                <span className="tt-badge warn">May require downloads</span>
              </div>
            </div>
          </span>
        </h3>

        <div className="input-row">
          <div className="input-group">
            <label>Rerank Backend (RERANK_BACKEND)</label>
            <select
              name="RERANK_BACKEND"
              value={rerankBackend}
              onChange={(e) => setRerankBackend(e.target.value)}
            >
              <option value="none">none</option>
              <option value="local">local</option>
              <option value="hf">hf</option>
              <option value="cohere">cohere</option>
            </select>
          </div>
          <div className="input-group">
            <label>Local/HF Model (RERANKER_MODEL)</label>
            <input
              type="text"
              name="RERANKER_MODEL"
              placeholder="cross-encoder/ms-marco-MiniLM-L-12-v2"
              value={rerankerModel}
              onChange={(e) => setRerankerModel(e.target.value)}
            />
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
            <div id="reranker-info-panel-ext" className="mono" style={{ fontSize: '12px', lineHeight: 1.6 }}>
              <div>Enabled: <span id="reranker-info-enabled-ext">{rerankerInfo.enabled}</span></div>
              <div>Model Path: <span id="reranker-info-path-ext">{rerankerInfo.path}</span></div>
              <div>Device: <span id="reranker-info-device-ext">{rerankerInfo.device}</span></div>
              <div>
                Alpha: <span id="reranker-info-alpha-ext">{rerankerInfo.alpha}</span> • TopN: <span id="reranker-info-topn-ext">{rerankerInfo.topn}</span> • Batch: <span id="reranker-info-batch-ext">{rerankerInfo.batch}</span> • MaxLen: <span id="reranker-info-maxlen-ext">{rerankerInfo.maxlen}</span>
              </div>
            </div>
            {rerankBackend === 'none' && (
              <div 
                id="rerank-none-warning" 
                style={{ 
                  marginTop: '8px', 
                  padding: '8px', 
                  borderRadius: '6px', 
                  background: 'rgba(255, 170, 0, 0.1)', 
                  border: '1px dashed var(--warn)', 
                  color: 'var(--warn)', 
                  fontSize: '12px' 
                }}
              >
                ⚠️ No reranker is effectively enabled. Searches will use raw BM25/vector fusion. Configure <strong>Rerank Backend</strong> or <strong>Cohere API Key</strong>.
              </div>
            )}
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Cohere Model (COHERE_RERANK_MODEL)</label>
            <select
              name="COHERE_RERANK_MODEL"
              value={cohereModel}
              onChange={(e) => setCohereModel(e.target.value)}
            >
              <option value="">(select model)</option>
              <option value="rerank-3.5">rerank-3.5</option>
              <option value="rerank-english-v3.0">rerank-english-v3.0</option>
              <option value="rerank-multilingual-v3.0">rerank-multilingual-v3.0</option>
              <option value="rerank-english-lite-v3.0">rerank-english-lite-v3.0</option>
            </select>
          </div>
          <div className="input-group">
            <label>Cohere API Key (COHERE_API_KEY)</label>
            <input
              type="password"
              name="COHERE_API_KEY"
              placeholder="ck_..."
              value={cohereApiKey}
              onChange={(e) => setCohereApiKey(e.target.value)}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>HF Trust Remote Code (TRANSFORMERS_TRUST_REMOTE_CODE)</label>
            <select
              name="TRANSFORMERS_TRUST_REMOTE_CODE"
              value={trustRemoteCode}
              onChange={(e) => setTrustRemoteCode(e.target.value)}
            >
              <option value="1">1</option>
              <option value="0">0</option>
            </select>
          </div>
          <div className="input-group">
            <label>Input Snippet Chars (RERANK_INPUT_SNIPPET_CHARS)</label>
            <input
              type="number"
              name="RERANK_INPUT_SNIPPET_CHARS"
              value={inputSnippetChars}
              min="200"
              max="2000"
              step="50"
              onChange={(e) => setInputSnippetChars(parseInt(e.target.value) || 700)}
            />
          </div>
        </div>
      </div>

      {/* Advanced Reranker Settings */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
        <h3>
          <span className="accent-blue">●</span> Advanced Settings
          <span className="tooltip-wrap">
            <span className="help-icon">?</span>
            <div className="tooltip-bubble">
              <span className="tt-title">Reranker Fine-Tuning</span>
              Additional controls for filtering and limiting reranked results.
            </div>
          </span>
        </h3>

        <div className="input-row">
          <div className="input-group">
            <label>
              Min Rerank Score (MIN_RERANK_SCORE)
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Score Threshold</span>
                  Minimum relevance score required for reranked results. Results below this threshold are filtered out.
                </div>
              </span>
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={minRerankScore}
                onChange={(e) => setMinRerankScore(parseFloat(e.target.value))}
                style={{ flex: 1 }}
              />
              <input
                type="number"
                value={minRerankScore}
                onChange={(e) => setMinRerankScore(parseFloat(e.target.value) || 0)}
                min="0"
                max="1"
                step="0.01"
                style={{
                  width: '80px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '4px 8px',
                  borderRadius: '4px',
                  textAlign: 'center',
                }}
              />
            </div>
          </div>
          <div className="input-group">
            <label>
              Max Rerank K (MAX_RERANK_K)
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Result Limit</span>
                  Maximum number of results to process through reranker.
                </div>
              </span>
            </label>
            <input
              type="number"
              value={maxRerankK}
              onChange={(e) => setMaxRerankK(parseInt(e.target.value) || 10)}
              min="1"
              max="100"
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 10px',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            />
          </div>
        </div>
      </div>

      {/* Test Reranker Section */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--ok)' }}>
        <h3>
          <span className="accent-green">●</span> Test Reranker
        </h3>
        <p className="small">Test your reranker configuration with a sample query to verify it's working correctly.</p>

        <div style={{ marginTop: '16px' }}>
          <label
            style={{
              display: 'block',
              fontSize: '11px',
              fontWeight: 600,
              color: 'var(--fg-muted)',
              marginBottom: '6px',
            }}
          >
            TEST QUERY
          </label>
          <input
            type="text"
            id="reranker-test-query"
            value={testQuery}
            onChange={(e) => setTestQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleTestReranker();
            }}
            placeholder="e.g., How does hybrid search work?"
            style={{
              width: '100%',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              padding: '10px 12px',
              borderRadius: '4px',
              fontSize: '14px',
              marginBottom: '12px',
            }}
          />

          <button
            id="btn-test-reranker"
            onClick={handleTestReranker}
            disabled={!testQuery.trim() || testRunning}
            style={{
              width: '100%',
              background: testRunning ? 'var(--fg-muted)' : 'var(--ok)',
              color: 'white',
              border: 'none',
              padding: '12px',
              borderRadius: '4px',
              fontWeight: 600,
              cursor: testRunning ? 'not-allowed' : 'pointer',
              fontSize: '14px',
            }}
          >
            {testRunning ? 'Testing...' : 'Test Reranker'}
          </button>

          {/* Performance Metrics */}
          {testResults && (
            <div
              id="reranker-test-results"
              style={{
                marginTop: '16px',
                background: 'var(--card-bg)',
                border: '1px solid var(--line)',
                borderRadius: '6px',
                padding: '16px',
              }}
            >
              <h4 style={{ margin: '0 0 12px 0', color: 'var(--fg)' }}>Performance Metrics</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                <div style={{ background: 'var(--bg-elev1)', padding: '12px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '4px' }}>LATENCY</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--accent)' }}>
                    {testResults.latency || '—'}ms
                  </div>
                </div>
                <div style={{ background: 'var(--bg-elev1)', padding: '12px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '4px' }}>RESULTS</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--link)' }}>
                    {testResults.count || 0}
                  </div>
                </div>
                <div style={{ background: 'var(--bg-elev1)', padding: '12px', borderRadius: '4px', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '4px' }}>AVG SCORE</div>
                  <div style={{ fontSize: '20px', fontWeight: 700, color: 'var(--ok)' }}>
                    {testResults.avg_score ? testResults.avg_score.toFixed(3) : '—'}
                  </div>
                </div>
              </div>

              <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginBottom: '6px' }}>SCORE DISTRIBUTION</div>
              <div
                style={{
                  background: 'var(--code-bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  padding: '12px',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  maxHeight: '200px',
                  overflowY: 'auto',
                }}
              >
                {testResults.results?.map((result: any, idx: number) => (
                  <div key={idx} style={{ marginBottom: '8px' }}>
                    <span style={{ color: 'var(--link)' }}>#{idx + 1}</span> {result.path || result.text?.substring(0, 50)}...
                    <span style={{ float: 'right', color: 'var(--accent)' }}>
                      {result.score?.toFixed(3) || '—'}
                    </span>
                  </div>
                )) || 'No results'}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

