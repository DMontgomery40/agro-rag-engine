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
  }, [config]);

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
    <div className="rag-subtab-content">
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
            <div className="mono" style={{ fontSize: '12px', lineHeight: 1.6 }}>
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
    </div>
  );
}
