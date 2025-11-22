import { useState, useEffect } from 'react';

// TypeScript interface for reranker info response
interface RerankerInfo {
  enabled: boolean;
  path: string;
  device: string;
  alpha: number | string;
  topn: number | string;
  batch: number | string;
  maxlen: number | string;
}

export function ExternalRerankersSubtab() {
  // State for each input field
  const [rerankBackend, setRerankBackend] = useState<string>('local');
  const [rerankerModel, setRerankerModel] = useState<string>('');
  const [cohereModel, setCohereModel] = useState<string>('rerank-3.5');
  const [cohereApiKey, setCohereApiKey] = useState<string>('');
  const [trustRemoteCode, setTrustRemoteCode] = useState<string>('1');
  const [snippetChars, setSnippetChars] = useState<number>(700);

  // State for reranker info display
  const [rerankerInfo, setRerankerInfo] = useState<RerankerInfo | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');

  // Load current config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setError('');

      // Fetch config
      const response = await fetch('/api/config');
      if (!response.ok) {
        throw new Error(`Failed to fetch config: ${response.status} ${response.statusText}`);
      }
      const data = await response.json();

      // Extract values from env object
      const env = data.env || {};
      setRerankBackend(env.RERANKER_BACKEND || 'local');
      setRerankerModel(env.RERANKER_MODEL || 'cross-encoder/ms-marco-MiniLM-L-12-v2');
      setCohereModel(env.COHERE_RERANK_MODEL || 'rerank-3.5');
      // Don't populate password field with masked value
      setCohereApiKey(env.COHERE_API_KEY === '••••••••••••••••' ? '' : (env.COHERE_API_KEY || ''));
      setTrustRemoteCode(env.TRANSFORMERS_TRUST_REMOTE_CODE || '1');
      setSnippetChars(parseInt(env.RERANK_INPUT_SNIPPET_CHARS || '700', 10));

      // Fetch reranker info for display panel
      const infoResponse = await fetch('/api/reranker/info');
      if (infoResponse.ok) {
        const info = await infoResponse.json();
        setRerankerInfo(info);
      }

      setLoading(false);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to load config';
      console.error('[ExternalRerankersSubtab] Error loading config:', err);
      setError(errorMsg);
      setLoading(false);
    }
  };

  const updateConfig = async (key: string, value: any) => {
    try {
      setError('');

      const response = await fetch('/api/config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: { [key]: value } })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to update ${key}: ${response.status} ${errorText}`);
      }

      // Reload config after update to get latest values
      await loadConfig();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : `Failed to update ${key}`;
      console.error(`[ExternalRerankersSubtab] Error updating ${key}:`, err);
      setError(errorMsg);
    }
  };

  const handleBackendChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setRerankBackend(value);
    updateConfig('RERANKER_BACKEND', value);
  };

  const handleModelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setRerankerModel(value);
  };

  const handleModelBlur = () => {
    updateConfig('RERANKER_MODEL', rerankerModel);
  };

  const handleCohereModelChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setCohereModel(value);
    updateConfig('COHERE_RERANK_MODEL', value);
  };

  const handleCohereApiKeyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCohereApiKey(value);
  };

  const handleCohereApiKeyBlur = () => {
    if (cohereApiKey) {
      updateConfig('COHERE_API_KEY', cohereApiKey);
    }
  };

  const handleTrustRemoteCodeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    setTrustRemoteCode(value);
    updateConfig('TRANSFORMERS_TRUST_REMOTE_CODE', value);
  };

  const handleSnippetCharsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    setSnippetChars(value);
  };

  const handleSnippetCharsBlur = () => {
    updateConfig('RERANK_INPUT_SNIPPET_CHARS', snippetChars);
  };

  // Show warning when backend is 'none'
  const showNoneWarning = rerankBackend === 'none';

  if (loading) {
    return (
      <div id="tab-rag-ext-rerankers" className="rag-subtab-content" style={{ padding: '24px' }}>
        <div style={{ textAlign: 'center', color: 'var(--fg-muted)' }}>Loading reranker configuration...</div>
      </div>
    );
  }

  return (
    <div id="tab-rag-ext-rerankers" className="rag-subtab-content" style={{ padding: '24px' }}>
      {/* Error Display */}
      {error && (
        <div
          style={{
            marginBottom: '16px',
            padding: '12px',
            background: 'rgba(255, 80, 80, 0.1)',
            border: '1px solid var(--err)',
            borderRadius: '6px',
            color: 'var(--err)',
            fontSize: '12px'
          }}
        >
          <strong>Error:</strong> {error}
        </div>
      )}

      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>
          <span className="accent-pink">●</span> Reranking (Local & External)
          <span className="tooltip-wrap">
            <span className="help-icon">?</span>
            <div className="tooltip-bubble">
              <span className="tt-title">Cross-Encoder Reranking</span>
              Configure reranking backend and models. Supports local (HuggingFace), HF API, and Cohere. Set to "none" for offline/BM25-only operation.
              <div className="tt-badges">
                <span className="tt-badge info">Quality Boost</span>
                <span className="tt-badge warn">May require downloads</span>
              </div>
            </div>
          </span>
        </h3>
        <div className="input-row">
          <div className="input-group">
            <label>
              Rerank Backend (RERANKER_BACKEND)
              <span className="help-icon" data-tooltip="RERANKER_BACKEND">?</span>
            </label>
            <select
              name="RERANKER_BACKEND"
              id="RERANKER_BACKEND"
              value={rerankBackend}
              onChange={handleBackendChange}
            >
              <option value="none">none</option>
              <option value="local">local</option>
              <option value="hf">hf</option>
              <option value="cohere">cohere</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              Local/HF Model (RERANKER_MODEL)
              <span className="help-icon" data-tooltip="RERANKER_MODEL">?</span>
            </label>
            <input
              type="text"
              name="RERANKER_MODEL"
              placeholder="cross-encoder/ms-marco-MiniLM-L-12-v2"
              value={rerankerModel}
              onChange={handleModelChange}
              onBlur={handleModelBlur}
            />
          </div>
        </div>
        <div className="input-row" style={{ marginTop: '8px' }}>
          <div className="input-group full-width" style={{ background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', padding: '10px' }}>
            <div style={{ fontSize: '11px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '6px' }}>
              Current Reranker (Server)
            </div>
            <div className="mono" id="reranker-info-panel-ext" style={{ fontSize: '12px', lineHeight: '1.6' }}>
              {rerankerInfo ? (
                <>
                  <div>Enabled: <span id="reranker-info-enabled-ext">{rerankerInfo.enabled ? 'true' : 'false'}</span></div>
                  <div>Model Path: <span id="reranker-info-path-ext">{rerankerInfo.path || '—'}</span></div>
                  <div>Device: <span id="reranker-info-device-ext">{rerankerInfo.device || '—'}</span></div>
                  <div>
                    Alpha: <span id="reranker-info-alpha-ext">{rerankerInfo.alpha || '—'}</span> •
                    TopN: <span id="reranker-info-topn-ext">{rerankerInfo.topn || '—'}</span> •
                    Batch: <span id="reranker-info-batch-ext">{rerankerInfo.batch || '—'}</span> •
                    MaxLen: <span id="reranker-info-maxlen-ext">{rerankerInfo.maxlen || '—'}</span>
                  </div>
                </>
              ) : (
                <>
                  <div>Enabled: <span id="reranker-info-enabled-ext">—</span></div>
                  <div>Model Path: <span id="reranker-info-path-ext">—</span></div>
                  <div>Device: <span id="reranker-info-device-ext">—</span></div>
                  <div>Alpha: <span id="reranker-info-alpha-ext">—</span> • TopN: <span id="reranker-info-topn-ext">—</span> • Batch: <span id="reranker-info-batch-ext">—</span> • MaxLen: <span id="reranker-info-maxlen-ext">—</span></div>
                </>
              )}
            </div>
            <div
              id="rerank-none-warning"
              style={{
                display: showNoneWarning ? 'block' : 'none',
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
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>
              Cohere Model (COHERE_RERANK_MODEL)
              <span className="help-icon" data-tooltip="COHERE_RERANK_MODEL">?</span>
            </label>
            <select
              name="COHERE_RERANK_MODEL"
              value={cohereModel}
              onChange={handleCohereModelChange}
            >
              <option value="">(select model)</option>
              <option value="rerank-3.5">rerank-3.5</option>
              <option value="rerank-english-v3.0">rerank-english-v3.0</option>
              <option value="rerank-multilingual-v3.0">rerank-multilingual-v3.0</option>
              <option value="rerank-english-lite-v3.0">rerank-english-lite-v3.0</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              Cohere API Key (COHERE_API_KEY)
              <span className="help-icon" data-tooltip="COHERE_API_KEY">?</span>
            </label>
            <input
              type="password"
              name="COHERE_API_KEY"
              placeholder="ck_..."
              value={cohereApiKey}
              onChange={handleCohereApiKeyChange}
              onBlur={handleCohereApiKeyBlur}
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>
              HF Trust Remote Code (TRANSFORMERS_TRUST_REMOTE_CODE)
              <span className="help-icon" data-tooltip="TRANSFORMERS_TRUST_REMOTE_CODE">?</span>
            </label>
            <select
              name="TRANSFORMERS_TRUST_REMOTE_CODE"
              value={trustRemoteCode}
              onChange={handleTrustRemoteCodeChange}
            >
              <option value="1">1</option>
              <option value="0">0</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              Input Snippet Chars (RERANK_INPUT_SNIPPET_CHARS)
              <span className="help-icon" data-tooltip="RERANK_INPUT_SNIPPET_CHARS">?</span>
            </label>
            <input
              type="number"
              name="RERANK_INPUT_SNIPPET_CHARS"
              value={snippetChars}
              min="200"
              max="2000"
              step="50"
              onChange={handleSnippetCharsChange}
              onBlur={handleSnippetCharsBlur}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
