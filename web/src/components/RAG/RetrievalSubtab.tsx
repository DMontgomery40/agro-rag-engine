// AGRO - RAG Retrieval Subtab
// Retrieval parameters configuration with sliders and test query section

import { useState, useEffect } from 'react';
import { useConfigStore } from '@/stores';

export function RetrievalSubtab() {
  const { config, loading, updateEnv } = useConfigStore();

  // Retrieval parameters
  const [mqRewrites, setMqRewrites] = useState(3);
  const [finalK, setFinalK] = useState(10);
  const [useSemanticSynonyms, setUseSemanticSynonyms] = useState(true);
  const [topkDense, setTopkDense] = useState(75);
  const [vectorBackend, setVectorBackend] = useState('Qdrant');
  const [topkSparse, setTopkSparse] = useState(75);
  const [hydrationMode, setHydrationMode] = useState('Lazy');
  const [hydrationMaxChars, setHydrationMaxChars] = useState(2000);
  const [vendorMode, setVendorMode] = useState('Prefer First Party');

  // Test query
  const [testQuery, setTestQuery] = useState('');
  const [testResults, setTestResults] = useState<string>('');
  const [testRunning, setTestRunning] = useState(false);

  // Initialize from config
  useEffect(() => {
    if (config?.env) {
      const env = config.env;
      setMqRewrites(Number(env.MQ_REWRITES) || 3);
      setFinalK(Number(env.FINAL_K) || 10);
      setUseSemanticSynonyms(Number(env.USE_SEMANTIC_SYNONYMS) === 1);
      setTopkDense(Number(env.TOPK_DENSE) || 75);
      setVectorBackend((env.VECTOR_BACKEND as string) || 'Qdrant');
      setTopkSparse(Number(env.TOPK_SPARSE) || 75);
      setHydrationMode((env.HYDRATION_MODE as string) || 'Lazy');
      setHydrationMaxChars(Number(env.HYDRATION_MAX_CHARS) || 2000);
      setVendorMode((env.VENDOR_MODE as string) || 'Prefer First Party');
    }
  }, [config]);

  const handleTestQuery = async () => {
    if (!testQuery.trim()) return;

    setTestRunning(true);
    setTestResults('Searching...');

    try {
      const apiBase = window.location.origin.replace(':5173', ':8012');
      const repo = config?.env.REPO as string || 'agro';

      const params = new URLSearchParams({
        q: testQuery,
        repo: repo,
        top_k: finalK.toString()
      });

      const response = await fetch(`${apiBase}/search?${params}`);

      if (!response.ok) {
        throw new Error(`Search failed: ${response.statusText}`);
      }

      const data = await response.json();

      if (data.results && Array.isArray(data.results)) {
        const formattedResults = data.results
          .slice(0, 10)
          .map((r: any, idx: number) => {
            return `${idx + 1}. ${r.file_path}:${r.start_line}-${r.end_line} (score: ${r.rerank_score?.toFixed(3) || r.score?.toFixed(3) || 'N/A'})`;
          })
          .join('\n');

        setTestResults(
          `Query: "${testQuery}"\nRepo: ${repo}\nResults: ${data.results.length}\n\n${formattedResults || 'No results found'}`
        );
      } else {
        setTestResults('No results found');
      }
    } catch (error) {
      console.error('Test query error:', error);
      setTestResults(`Error: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure RAG server is running on port 8012`);
    } finally {
      setTestRunning(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '20px', color: 'var(--fg-muted)' }}>Loading configuration...</div>;
  }

  return (
    <div id="tab-rag-retrieval" className="rag-subtab-content">
      {/* Generation Models Section - matches /gui */}
      <div className="settings-section">
        <h3>Generation Models</h3>
        <button className="small-button" id="btn-add-gen-model" style={{ marginBottom: '12px' }}>Add Model</button>
        
        <div className="input-row">
          <div className="input-group">
            <label>Primary Model (GEN_MODEL)</label>
            <select name="GEN_MODEL" id="gen-model-select" className="model-select" data-component-filter="GEN">
              <option value="">Select a model...</option>
            </select>
          </div>
          <div className="input-group">
            <label>OpenAI API Key</label>
            <input type="password" name="OPENAI_API_KEY" />
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
                  Sets a global default temperature for generation. 0.0 = deterministic; try 0.2 sometimes, or 0.04 for light variation in docs.
                </div>
              </span>
            </label>
            <input type="number" name="GEN_TEMPERATURE" defaultValue="0.0" min="0" max="2" step="0.01" />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Enrich Model (ENRICH_MODEL)</label>
            <select name="ENRICH_MODEL" id="enrich-model-select" className="model-select" data-component-filter="GEN">
              <option value="">Select a model...</option>
            </select>
          </div>
          <div className="input-group">
            <label>Enrich Model (Ollama)</label>
            <select name="ENRICH_MODEL_OLLAMA" id="enrich-model-ollama-select" className="model-select">
              <option value="">Select a model...</option>
            </select>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Anthropic API Key</label>
            <input type="password" name="ANTHROPIC_API_KEY" />
          </div>
          <div className="input-group">
            <label>Google API Key</label>
            <input type="password" name="GOOGLE_API_KEY" />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Ollama URL</label>
            <input type="text" name="OLLAMA_URL" placeholder="http://127.0.0.1:11434" />
          </div>
          <div className="input-group">
            <label>OpenAI Base URL (optional)</label>
            <input type="text" name="OPENAI_BASE_URL" placeholder="For vLLM proxy" />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>HTTP Override Model</label>
            <select name="GEN_MODEL_HTTP" id="http-override-model-select">
              <option value="">None (use global)</option>
            </select>
          </div>
          <div className="input-group">
            <label>MCP Override Model</label>
            <select name="GEN_MODEL_MCP" id="mcp-override-model-select">
              <option value="">None (use global)</option>
            </select>
          </div>
          <div className="input-group">
            <label>CLI Override Model</label>
            <select name="GEN_MODEL_CLI" id="cli-override-model-select">
              <option value="">None (use global)</option>
            </select>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Enrich Backend</label>
            <select name="ENRICH_BACKEND" id="enrich-backend-select">
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="google">Google</option>
              <option value="ollama">Ollama</option>
            </select>
          </div>
        </div>
      </div>

      {/* Retrieval Parameters Section */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>Retrieval Parameters</h3>
        <p className="small" style={{ color: 'var(--fg-muted)' }}>
          Hybrid search fuses sparse (BM25) + dense (vectors). These knobs tune candidate counts and
          hydration behavior.
        </p>

        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '20px',
          }}
        >
          {/* Multi-Query Rewrites */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--fg-muted)',
                marginBottom: '8px',
              }}
            >
              MULTI-QUERY REWRITES
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Query Expansion via LLM Rewriting</span>
                  Number of query variations to automatically generate using the LLM.
                </div>
              </span>
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                name="MQ_REWRITES"
                type="range"
                min="1"
                max="6"
                step="1"
                value={mqRewrites}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMqRewrites(val);
                  updateEnv('MQ_REWRITES', val);
                }}
                style={{ flex: 1 }}
              />
              <input
                name="MQ_REWRITES"
                type="number"
                min="1"
                max="6"
                value={mqRewrites}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setMqRewrites(val);
                  updateEnv('MQ_REWRITES', val);
                }}
                style={{
                  width: '60px',
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

          {/* Final K */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--fg-muted)',
                marginBottom: '8px',
              }}
            >
              FINAL K
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Final Results Count</span>
                  Number of top results to return after fusion and reranking.
                </div>
              </span>
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                name="FINAL_K"
                type="range"
                min="1"
                max="100"
                step="1"
                value={finalK}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFinalK(val);
                  updateEnv('FINAL_K', val);
                }}
                style={{ flex: 1 }}
              />
              <input
                name="FINAL_K"
                type="number"
                min="1"
                max="100"
                value={finalK}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setFinalK(val);
                  updateEnv('FINAL_K', val);
                }}
                style={{
                  width: '60px',
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

          {/* Use Semantic Synonyms */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--fg-muted)',
                marginBottom: '8px',
              }}
            >
              USE SEMANTIC SYNONYMS
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Query Expansion via Synonym Replacement</span>
                  Expands user queries with hand-curated semantic synonyms.
                </div>
              </span>
            </label>
            <select
              name="USE_SEMANTIC_SYNONYMS"
              value={useSemanticSynonyms ? 'ON' : 'OFF'}
              onChange={(e) => {
                const val = e.target.value === 'ON';
                setUseSemanticSynonyms(val);
                updateEnv('USE_SEMANTIC_SYNONYMS', val ? 1 : 0);
              }}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 10px',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            >
              <option value="ON">ON</option>
              <option value="OFF">OFF</option>
            </select>
          </div>

          {/* Top-K Dense */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--fg-muted)',
                marginBottom: '8px',
              }}
            >
              TOP-K DENSE (QDRANT)
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Dense Vector Candidates</span>
                  Number of candidates to retrieve from Qdrant vector search before fusion.
                </div>
              </span>
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                name="TOPK_DENSE"
                type="range"
                min="1"
                max="200"
                step="1"
                value={topkDense}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTopkDense(val);
                  updateEnv('TOPK_DENSE', val);
                }}
                style={{ flex: 1 }}
              />
              <input
                name="TOPK_DENSE"
                type="number"
                min="1"
                max="200"
                value={topkDense}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTopkDense(val);
                  updateEnv('TOPK_DENSE', val);
                }}
                style={{
                  width: '60px',
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

          {/* Vector Backend */}
          <div>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--fg-muted)',
                marginBottom: '8px',
              }}
            >
              VECTOR BACKEND
            </label>
            <input
              name="VECTOR_BACKEND"
              type="text"
              value={vectorBackend}
              onChange={(e) => {
                setVectorBackend(e.target.value);
                updateEnv('VECTOR_BACKEND', e.target.value);
              }}
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

          {/* Top-K Sparse */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--fg-muted)',
                marginBottom: '8px',
              }}
            >
              TOP-K SPARSE (BM25)
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Sparse BM25 Candidates</span>
                  Number of candidates to retrieve from BM25 keyword search before fusion.
                </div>
              </span>
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                name="TOPK_SPARSE"
                type="range"
                min="1"
                max="200"
                step="1"
                value={topkSparse}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTopkSparse(val);
                  updateEnv('TOPK_SPARSE', val);
                }}
                style={{ flex: 1 }}
              />
              <input
                name="TOPK_SPARSE"
                type="number"
                min="1"
                max="200"
                value={topkSparse}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setTopkSparse(val);
                  updateEnv('TOPK_SPARSE', val);
                }}
                style={{
                  width: '60px',
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

          {/* Hydration Mode */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--fg-muted)',
                marginBottom: '8px',
              }}
            >
              HYDRATION MODE
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Code Loading Strategy</span>
                  Controls when full code is loaded. "Lazy" loads code from chunks.jsonl after retrieval.
                </div>
              </span>
            </label>
            <select
              name="HYDRATION_MODE"
              value={hydrationMode}
              onChange={(e) => {
                setHydrationMode(e.target.value);
                updateEnv('HYDRATION_MODE', e.target.value);
              }}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 10px',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            >
              <option value="Lazy">Lazy</option>
              <option value="None">None</option>
              <option value="Eager">Eager</option>
            </select>
          </div>

          {/* Hydration Max Chars */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--fg-muted)',
                marginBottom: '8px',
              }}
            >
              HYDRATION MAX CHARS
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Code Truncation Limit</span>
                  Maximum characters to load per chunk when hydrating.
                </div>
              </span>
            </label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input
                name="HYDRATION_MAX_CHARS"
                type="range"
                min="0"
                max="10000"
                step="100"
                value={hydrationMaxChars}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setHydrationMaxChars(val);
                  updateEnv('HYDRATION_MAX_CHARS', val);
                }}
                style={{ flex: 1 }}
              />
              <input
                name="HYDRATION_MAX_CHARS"
                type="number"
                min="0"
                max="10000"
                step="100"
                value={hydrationMaxChars}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  setHydrationMaxChars(val);
                  updateEnv('HYDRATION_MAX_CHARS', val);
                }}
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

          {/* Vendor Mode */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--fg-muted)',
                marginBottom: '8px',
              }}
            >
              VENDOR MODE
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">First-Party vs Vendor Code</span>
                  Controls scoring bonus for first-party vs vendor code.
                </div>
              </span>
            </label>
            <select
              name="VENDOR_MODE"
              value={vendorMode}
              onChange={(e) => {
                setVendorMode(e.target.value);
                updateEnv('VENDOR_MODE', e.target.value);
              }}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 10px',
                borderRadius: '4px',
                fontSize: '13px',
              }}
            >
              <option value="Prefer First Party">Prefer First Party</option>
              <option value="Prefer Vendor">Prefer Vendor</option>
              <option value="Neutral">Neutral</option>
            </select>
          </div>
        </div>
      </div>

      {/* Test Query Section */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--ok)' }}>
        <h3>Test Query</h3>
        <p className="small" style={{ color: 'var(--fg-muted)' }}>
          Test your retrieval configuration with a sample query to see how it performs.
        </p>

        <div
          style={{
            background: 'var(--card-bg)',
            border: '1px solid var(--line)',
            borderRadius: '8px',
            padding: '20px',
            marginTop: '12px',
          }}
        >
          <div style={{ marginBottom: '12px' }}>
            <label
              style={{
                display: 'block',
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--fg-muted)',
                marginBottom: '6px',
              }}
            >
              QUERY
            </label>
            <input
              type="text"
              value={testQuery}
              onChange={(e) => setTestQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTestQuery();
              }}
              placeholder="Enter test query..."
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '10px 12px',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <button
            onClick={handleTestQuery}
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
              marginBottom: '16px',
            }}
          >
            {testRunning ? 'Running...' : 'Test'}
          </button>

          {/* Results Preview */}
          {testResults && (
            <div>
              <label
                style={{
                  display: 'block',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: 'var(--fg-muted)',
                  marginBottom: '6px',
                }}
              >
                RESULTS
              </label>
              <div
                style={{
                  background: 'var(--bg-elev1)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  padding: '12px',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  fontFamily: 'monospace',
                  fontSize: '12px',
                  color: 'var(--fg)',
                  whiteSpace: 'pre-wrap',
                }}
              >
                {testResults}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Routing Trace Section - matches /gui */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--accent)' }}>
        <h3>Routing Trace</h3>
        <p className="small">View the routing log to see how queries are dispatched through the pipeline.</p>
        
        <div className="input-row">
          <div className="input-group">
            <button id="btn-trace-latest" className="small-button">View Latest Trace</button>
          </div>
          <div className="input-group">
            <button id="btn-trace-open-ls" className="small-button">Open in LangSmith</button>
          </div>
        </div>

        <div
          id="trace-output"
          style={{
            background: 'var(--code-bg)',
            border: '1px solid var(--line)',
            borderRadius: '6px',
            padding: '12px',
            marginTop: '12px',
            fontFamily: "'SF Mono', monospace",
            fontSize: '11px',
            minHeight: '100px',
            maxHeight: '400px',
            overflowY: 'auto',
            color: 'var(--fg-muted)',
          }}
        >
          Click "View Latest Trace" to see routing log
        </div>
      </div>
    </div>
  );
}
