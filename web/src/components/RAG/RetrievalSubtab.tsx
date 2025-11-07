// AGRO - RAG Retrieval Subtab
// Generation models and retrieval parameters configuration

import { useState, useEffect } from 'react';
import { useConfigStore } from '@/stores';

export function RetrievalSubtab() {
  const { config, loading, updateEnv } = useConfigStore();

  // Local state for form inputs
  const [genModel, setGenModel] = useState('');
  const [openaiApiKey, setOpenaiApiKey] = useState('');
  const [genTemperature, setGenTemperature] = useState(0.0);
  const [enrichModel, setEnrichModel] = useState('');
  const [enrichModelOllama, setEnrichModelOllama] = useState('');
  const [anthropicApiKey, setAnthropicApiKey] = useState('');
  const [googleApiKey, setGoogleApiKey] = useState('');
  const [ollamaUrl, setOllamaUrl] = useState('');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState('');
  const [genModelHttp, setGenModelHttp] = useState('');
  const [genModelMcp, setGenModelMcp] = useState('');
  const [genModelCli, setGenModelCli] = useState('');
  const [enrichBackend, setEnrichBackend] = useState('');

  // Retrieval parameters
  const [mqRewrites, setMqRewrites] = useState(2);
  const [finalK, setFinalK] = useState(10);
  const [useSemanticSynonyms, setUseSemanticSynonyms] = useState(1);
  const [topkDense, setTopkDense] = useState(75);
  const [vectorBackend, setVectorBackend] = useState('qdrant');
  const [topkSparse, setTopkSparse] = useState(75);
  const [hydrationMode, setHydrationMode] = useState('lazy');
  const [hydrationMaxChars, setHydrationMaxChars] = useState(2000);
  const [vendorMode, setVendorMode] = useState('prefer_first_party');

  // Initialize from config
  useEffect(() => {
    if (config?.env) {
      const env = config.env;
      setGenModel((env.GEN_MODEL as string) || '');
      setOpenaiApiKey((env.OPENAI_API_KEY as string) || '');
      setGenTemperature(Number(env.GEN_TEMPERATURE) || 0.0);
      setEnrichModel((env.ENRICH_MODEL as string) || '');
      setEnrichModelOllama((env.ENRICH_MODEL_OLLAMA as string) || '');
      setAnthropicApiKey((env.ANTHROPIC_API_KEY as string) || '');
      setGoogleApiKey((env.GOOGLE_API_KEY as string) || '');
      setOllamaUrl((env.OLLAMA_URL as string) || '');
      setOpenaiBaseUrl((env.OPENAI_BASE_URL as string) || '');
      setGenModelHttp((env.GEN_MODEL_HTTP as string) || '');
      setGenModelMcp((env.GEN_MODEL_MCP as string) || '');
      setGenModelCli((env.GEN_MODEL_CLI as string) || '');
      setEnrichBackend((env.ENRICH_BACKEND as string) || '');

      setMqRewrites(Number(env.MQ_REWRITES) || 2);
      setFinalK(Number(env.FINAL_K) || 10);
      setUseSemanticSynonyms(Number(env.USE_SEMANTIC_SYNONYMS) !== undefined ? Number(env.USE_SEMANTIC_SYNONYMS) : 1);
      setTopkDense(Number(env.TOPK_DENSE) || 75);
      setVectorBackend((env.VECTOR_BACKEND as string) || 'qdrant');
      setTopkSparse(Number(env.TOPK_SPARSE) || 75);
      setHydrationMode((env.HYDRATION_MODE as string) || 'lazy');
      setHydrationMaxChars(Number(env.HYDRATION_MAX_CHARS) || 2000);
      setVendorMode((env.VENDOR_MODE as string) || 'prefer_first_party');
    }
  }, [config]);

  // Handler for input changes that update the store
  const handleChange = (key: string, value: string | number | boolean) => {
    updateEnv(key, value);
  };

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--fg-muted)' }}>Loading configuration...</div>;
  }

  return (
    <div id="tab-rag-retrieval" className="rag-subtab-content">
      {/* Generation Models Section */}
      <div className="settings-section">
        <h3>Generation Models</h3>
        <button className="small-button" id="btn-add-gen-model" style={{ marginBottom: '12px' }}>
          Add Model
        </button>
        <div className="input-row">
          <div className="input-group">
            <label>Primary Model (GEN_MODEL)</label>
            <input
              type="text"
              name="GEN_MODEL"
              placeholder="gpt-4o-mini or qwen3-coder:30b"
              list="gen-model-list"
              value={genModel}
              onChange={(e) => {
                setGenModel(e.target.value);
                handleChange('GEN_MODEL', e.target.value);
              }}
            />
            <datalist id="gen-model-list"></datalist>
          </div>
          <div className="input-group">
            <label>OpenAI API Key</label>
            <input
              type="password"
              name="OPENAI_API_KEY"
              value={openaiApiKey}
              onChange={(e) => {
                setOpenaiApiKey(e.target.value);
                handleChange('OPENAI_API_KEY', e.target.value);
              }}
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>
              Default Temperature (GEN_TEMPERATURE)
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Default Response Creativity</span>
                  Sets a global default temperature for generation. 0.0 = deterministic; try 0.2
                  sometimes, or 0.04 for light variation in docs.
                </div>
              </span>
            </label>
            <input
              type="number"
              name="GEN_TEMPERATURE"
              value={genTemperature}
              min="0"
              max="2"
              step="0.01"
              onChange={(e) => {
                const val = Number(e.target.value);
                setGenTemperature(val);
                handleChange('GEN_TEMPERATURE', val);
              }}
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Enrich Model (ENRICH_MODEL)</label>
            <input
              type="text"
              name="ENRICH_MODEL"
              placeholder="gpt-4o-mini"
              value={enrichModel}
              onChange={(e) => {
                setEnrichModel(e.target.value);
                handleChange('ENRICH_MODEL', e.target.value);
              }}
            />
          </div>
          <div className="input-group">
            <label>Enrich Model (Ollama)</label>
            <input
              type="text"
              name="ENRICH_MODEL_OLLAMA"
              placeholder="qwen3-coder:30b"
              value={enrichModelOllama}
              onChange={(e) => {
                setEnrichModelOllama(e.target.value);
                handleChange('ENRICH_MODEL_OLLAMA', e.target.value);
              }}
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Anthropic API Key</label>
            <input
              type="password"
              name="ANTHROPIC_API_KEY"
              value={anthropicApiKey}
              onChange={(e) => {
                setAnthropicApiKey(e.target.value);
                handleChange('ANTHROPIC_API_KEY', e.target.value);
              }}
            />
          </div>
          <div className="input-group">
            <label>Google API Key</label>
            <input
              type="password"
              name="GOOGLE_API_KEY"
              value={googleApiKey}
              onChange={(e) => {
                setGoogleApiKey(e.target.value);
                handleChange('GOOGLE_API_KEY', e.target.value);
              }}
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Ollama URL</label>
            <input
              type="text"
              name="OLLAMA_URL"
              placeholder="http://127.0.0.1:11434"
              value={ollamaUrl}
              onChange={(e) => {
                setOllamaUrl(e.target.value);
                handleChange('OLLAMA_URL', e.target.value);
              }}
            />
          </div>
          <div className="input-group">
            <label>OpenAI Base URL (optional)</label>
            <input
              type="text"
              name="OPENAI_BASE_URL"
              placeholder="For vLLM proxy"
              value={openaiBaseUrl}
              onChange={(e) => {
                setOpenaiBaseUrl(e.target.value);
                handleChange('OPENAI_BASE_URL', e.target.value);
              }}
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>HTTP Override Model</label>
            <input
              type="text"
              name="GEN_MODEL_HTTP"
              value={genModelHttp}
              onChange={(e) => {
                setGenModelHttp(e.target.value);
                handleChange('GEN_MODEL_HTTP', e.target.value);
              }}
            />
          </div>
          <div className="input-group">
            <label>MCP Override Model</label>
            <input
              type="text"
              name="GEN_MODEL_MCP"
              value={genModelMcp}
              onChange={(e) => {
                setGenModelMcp(e.target.value);
                handleChange('GEN_MODEL_MCP', e.target.value);
              }}
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>CLI Override Model</label>
            <input
              type="text"
              name="GEN_MODEL_CLI"
              value={genModelCli}
              onChange={(e) => {
                setGenModelCli(e.target.value);
                handleChange('GEN_MODEL_CLI', e.target.value);
              }}
            />
          </div>
          <div className="input-group">
            <label>Enrich Backend</label>
            <select
              name="ENRICH_BACKEND"
              value={enrichBackend}
              onChange={(e) => {
                setEnrichBackend(e.target.value);
                handleChange('ENRICH_BACKEND', e.target.value);
              }}
            >
              <option value="">Default</option>
              <option value="openai">OpenAI</option>
              <option value="mlx">MLX (Apple)</option>
              <option value="ollama">Ollama</option>
            </select>
          </div>
        </div>
      </div>

      {/* Retrieval Parameters Section */}
      <div className="settings-section">
        <h3>Retrieval Parameters</h3>
        <p className="small">
          Hybrid search fuses sparse (BM25) + dense (vectors). These knobs tune candidate counts and
          hydration behavior.
        </p>
        <div className="input-row">
          <div className="input-group">
            <label>
              Multi-Query Rewrites
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Query Expansion via LLM Rewriting - Improved Recall</span>
                  Number of query variations to automatically generate using the LLM. Each variation
                  searches independently via hybrid search, results are merged and reranked together.
                  Higher = better chance of finding relevant code but increases latency and API costs.
                  <br />
                  <br />
                  <strong>Example:</strong> Query "how do we handle payments?" might expand to:
                  <br />- "payment processing implementation"
                  <br />- "stripe integration"
                  <br />- "checkout flow"
                  <br />
                  <br />
                  <strong>Tuning:</strong> 1-2 for speed, 3-4 for balanced, 5-6 for thorough but
                  expensive searches.
                  <br />
                  Default: 2. Range: 1-6.
                  <div className="tt-links">
                    <a href="https://arxiv.org/abs/2305.14283" target="_blank" rel="noopener">
                      Multi-Query RAG Paper
                    </a>
                    <a
                      href="https://python.langchain.com/docs/how_to/MultiQueryRetriever/"
                      target="_blank"
                      rel="noopener"
                    >
                      LangChain Implementation
                    </a>
                    <a href="/docs/RETRIEVAL.md#multi-query" target="_blank" rel="noopener">
                      Multi-Query Tuning Guide
                    </a>
                  </div>
                  <div className="tt-badges">
                    <span className="tt-badge info">Better Recall</span>
                    <span className="tt-badge warn">Higher Cost</span>
                    <span className="tt-badge warn">Higher Latency</span>
                  </div>
                </div>
              </span>
            </label>
            <input
              type="number"
              name="MQ_REWRITES"
              value={mqRewrites}
              min="1"
              onChange={(e) => {
                const val = Number(e.target.value);
                setMqRewrites(val);
                handleChange('MQ_REWRITES', val);
              }}
            />
          </div>
          <div className="input-group">
            <label>
              Final K
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Final Results Count</span>
                  Number of top results to return after fusion and reranking. This is what you get
                  back from search. Higher = more context but more noise. Default: 10. Range: 5-30.
                  <div className="tt-badges">
                    <span className="tt-badge info">Core Setting</span>
                  </div>
                </div>
              </span>
            </label>
            <input
              type="number"
              name="FINAL_K"
              value={finalK}
              min="1"
              onChange={(e) => {
                const val = Number(e.target.value);
                setFinalK(val);
                handleChange('FINAL_K', val);
              }}
            />
          </div>
          <div className="input-group">
            <label>
              Use Semantic Synonyms
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">
                    Query Expansion via Synonym Replacement - Domain Terminology
                  </span>
                  Expands user queries with hand-curated semantic synonyms to handle domain-specific
                  terminology and abbreviations. Example: "auth" expands to "auth authentication oauth
                  jwt bearer token login".
                  <br />
                  <br />
                  <strong>Purpose:</strong> Handles acronyms and domain synonyms that LLM rewriting
                  might miss. E.g., "JWT" might not rewrite to "json web token".
                  <br />
                  <strong>Configuration:</strong> Edit data/semantic_synonyms.json to add
                  domain-specific synonym mappings for your codebase.
                  <br />
                  <strong>Note:</strong> Different from Multi-Query Rewrites - this uses pre-defined
                  synonyms, not LLM-generated variations.
                  <br />
                  Default: ON (enabled).
                  <div className="tt-links">
                    <a href="/files/data/semantic_synonyms.json" target="_blank" rel="noopener">
                      Synonym Config File
                    </a>
                    <a href="/docs/RETRIEVAL.md#synonyms" target="_blank" rel="noopener">
                      Synonym Setup Guide
                    </a>
                    <a href="/docs/DOMAIN_CUSTOMIZATION.md" target="_blank" rel="noopener">
                      Domain Terminology
                    </a>
                  </div>
                  <div className="tt-badges">
                    <span className="tt-badge info">Better Recall</span>
                    <span className="tt-badge">No Re-index</span>
                  </div>
                </div>
              </span>
            </label>
            <select
              name="USE_SEMANTIC_SYNONYMS"
              value={useSemanticSynonyms}
              onChange={(e) => {
                const val = Number(e.target.value);
                setUseSemanticSynonyms(val);
                handleChange('USE_SEMANTIC_SYNONYMS', val);
              }}
            >
              <option value="1">ON</option>
              <option value="0">OFF</option>
            </select>
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>
              Top-K Dense (Qdrant)
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Dense Vector Candidates</span>
                  Number of candidates to retrieve from Qdrant vector search before fusion. Higher =
                  better recall for semantic matches but slower. Should be &gt;= Final K. Default: 75.
                  Range: 20-200.
                  <div className="tt-badges">
                    <span className="tt-badge info">Semantic Search</span>
                  </div>
                </div>
              </span>
            </label>
            <input
              type="number"
              name="TOPK_DENSE"
              value={topkDense}
              min="1"
              onChange={(e) => {
                const val = Number(e.target.value);
                setTopkDense(val);
                handleChange('TOPK_DENSE', val);
              }}
            />
          </div>
          <div className="input-group">
            <label>Vector Backend</label>
            <select
              name="VECTOR_BACKEND"
              value={vectorBackend}
              onChange={(e) => {
                setVectorBackend(e.target.value);
                handleChange('VECTOR_BACKEND', e.target.value);
              }}
            >
              <option value="qdrant">Qdrant</option>
              <option value="faiss">FAISS (experimental)</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              Top-K Sparse (BM25)
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Sparse BM25 Candidates</span>
                  Number of candidates to retrieve from BM25 keyword search before fusion. Higher =
                  better recall for exact matches but slower. Should be &gt;= Final K. Default: 75.
                  Range: 20-200.
                  <div className="tt-badges">
                    <span className="tt-badge info">Keyword Search</span>
                  </div>
                </div>
              </span>
            </label>
            <input
              type="number"
              name="TOPK_SPARSE"
              value={topkSparse}
              min="1"
              onChange={(e) => {
                const val = Number(e.target.value);
                setTopkSparse(val);
                handleChange('TOPK_SPARSE', val);
              }}
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>
              Hydration Mode
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Code Loading Strategy</span>
                  Controls when full code is loaded. "Lazy" loads code from chunks.jsonl after
                  retrieval. "None" only returns metadata (file path, line numbers). Lazy is
                  recommended. None is faster but returns no code.
                  <div className="tt-badges">
                    <span className="tt-badge">Lazy Recommended</span>
                  </div>
                </div>
              </span>
            </label>
            <select
              name="HYDRATION_MODE"
              value={hydrationMode}
              onChange={(e) => {
                setHydrationMode(e.target.value);
                handleChange('HYDRATION_MODE', e.target.value);
              }}
            >
              <option value="lazy">Lazy</option>
              <option value="none">None</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              Hydration Max Chars
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Code Truncation Limit</span>
                  Maximum characters to load per chunk when hydrating. Prevents huge chunks from
                  bloating responses. 0 = no limit. Default: 2000. Range: 500-5000.
                  <div className="tt-badges">
                    <span className="tt-badge">Performance</span>
                  </div>
                </div>
              </span>
            </label>
            <input
              type="number"
              name="HYDRATION_MAX_CHARS"
              value={hydrationMaxChars}
              onChange={(e) => {
                const val = Number(e.target.value);
                setHydrationMaxChars(val);
                handleChange('HYDRATION_MAX_CHARS', val);
              }}
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>
              Vendor Mode
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">First-Party vs Vendor Code</span>
                  Controls scoring bonus for first-party vs vendor code. "Prefer First Party" boosts
                  your code (+0.06) and penalizes vendor libs (-0.08). "Prefer Vendor" boosts vendor
                  code. Most use cases prefer first party.
                  <div className="tt-badges">
                    <span className="tt-badge info">Code Priority</span>
                  </div>
                </div>
              </span>
            </label>
            <select
              name="VENDOR_MODE"
              value={vendorMode}
              onChange={(e) => {
                setVendorMode(e.target.value);
                handleChange('VENDOR_MODE', e.target.value);
              }}
            >
              <option value="prefer_first_party">Prefer First Party</option>
              <option value="prefer_vendor">Prefer Vendor</option>
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
