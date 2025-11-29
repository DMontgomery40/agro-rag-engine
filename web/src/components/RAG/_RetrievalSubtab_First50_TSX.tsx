// THIS IS A PARTIAL FILE containing ONLY the first 50% TSX conversion
// This will be integrated back into RetrievalSubtab.tsx

// FIRST 50%: Generation Models + Retrieval Parameters sections (FULLY CONVERTED TO TSX)
// ============================================================================

{/* ========================================================================== */}
{/* SECTION: Generation Models */}
{/* ========================================================================== */}

<div className="settings-section">
  <h3>Generation Models</h3>
  <button
    className="small-button"
    id="btn-add-gen-model"
    style={{ marginBottom: '12px' }}
    onClick={() => {
      // This button should trigger a model addition dialog
      alert('Model addition dialog - to be wired to backend model management');
    }}
  >
    Add Model
  </button>

  <div className="input-row">
    <div className="input-group">
      <label>
        Primary Model (GEN_MODEL)
        <span className="help-icon" data-tooltip="GEN_MODEL">?</span>
      </label>
      <select
        name="GEN_MODEL"
        id="gen-model-select"
        className="model-select"
        value={get('GEN_MODEL', '')}
        onChange={(e) => set('GEN_MODEL', e.target.value)}
      >
        <option value="">Select a model...</option>
        {availableModels.map((model) => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
    </div>

    <div className="input-group">
      <label>
        OpenAI API Key
        <span className="help-icon" data-tooltip="OPENAI_API_KEY">?</span>
      </label>
      <input
        type="password"
        name="OPENAI_API_KEY"
        value={get('OPENAI_API_KEY', '')}
        onChange={(e) => set('OPENAI_API_KEY', e.target.value)}
        placeholder="sk-..."
      />
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        Default Temperature (GEN_TEMPERATURE)
        <span className="help-icon" data-tooltip="GEN_TEMPERATURE">?</span>
      </label>
      <input
        type="number"
        name="GEN_TEMPERATURE"
        value={get('GEN_TEMPERATURE', 0.0)}
        onChange={(e) => setGenTemperature(parseFloat(e.target.value) || 0.0)}
        min={0}
        max={2}
        step={0.01}
      />
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        Enrich Model (ENRICH_MODEL)
        <span className="help-icon" data-tooltip="ENRICH_MODEL">?</span>
      </label>
      <select
        name="ENRICH_MODEL"
        id="enrich-model-select"
        className="model-select"
        value={get('ENRICH_MODEL', '')}
        onChange={(e) => set('ENRICH_MODEL', e.target.value)}
      >
        <option value="">Select a model...</option>
        {availableModels.map((model) => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
    </div>

    <div className="input-group">
      <label>
        Enrich Model (Ollama)
        <span className="help-icon" data-tooltip="ENRICH_MODEL_OLLAMA">?</span>
      </label>
      <select
        name="ENRICH_MODEL_OLLAMA"
        id="enrich-model-ollama-select"
        className="model-select"
        value={get('ENRICH_MODEL_OLLAMA', '')}
        onChange={(e) => set('ENRICH_MODEL_OLLAMA', e.target.value)}
      >
        <option value="">Select a model...</option>
        {/* Ollama models would be populated from backend */}
      </select>
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        Anthropic API Key
        <span className="help-icon" data-tooltip="ANTHROPIC_API_KEY">?</span>
      </label>
      <input
        type="password"
        name="ANTHROPIC_API_KEY"
        value={get('ANTHROPIC_API_KEY', '')}
        onChange={(e) => set('ANTHROPIC_API_KEY', e.target.value)}
        placeholder="sk-ant-..."
      />
    </div>

    <div className="input-group">
      <label>
        Google API Key
        <span className="help-icon" data-tooltip="GOOGLE_API_KEY">?</span>
      </label>
      <input
        type="password"
        name="GOOGLE_API_KEY"
        value={get('GOOGLE_API_KEY', '')}
        onChange={(e) => set('GOOGLE_API_KEY', e.target.value)}
        placeholder="..."
      />
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        Ollama URL
        <span className="help-icon" data-tooltip="OLLAMA_URL">?</span>
      </label>
      <input
        type="text"
        name="OLLAMA_URL"
        value={get('OLLAMA_URL', 'http://127.0.0.1:11434')}
        onChange={(e) => set('OLLAMA_URL', e.target.value)}
        placeholder="http://127.0.0.1:11434"
      />
    </div>

    <div className="input-group">
      <label>
        OpenAI Base URL (optional)
        <span className="help-icon" data-tooltip="OPENAI_BASE_URL">?</span>
      </label>
      <input
        type="text"
        name="OPENAI_BASE_URL"
        value={get('OPENAI_BASE_URL', '')}
        onChange={(e) => set('OPENAI_BASE_URL', e.target.value)}
        placeholder="For vLLM proxy"
      />
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        HTTP Override Model
        <span className="help-icon" data-tooltip="GEN_MODEL_HTTP">?</span>
      </label>
      <select
        name="GEN_MODEL_HTTP"
        id="http-override-model-select"
        value={get('GEN_MODEL_HTTP', '')}
        onChange={(e) => set('GEN_MODEL_HTTP', e.target.value)}
      >
        <option value="">Select a model...</option>
        {availableModels.map((model) => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
    </div>

    <div className="input-group">
      <label>
        MCP Override Model
        <span className="help-icon" data-tooltip="GEN_MODEL_MCP">?</span>
      </label>
      <select
        name="GEN_MODEL_MCP"
        id="mcp-override-model-select"
        value={get('GEN_MODEL_MCP', '')}
        onChange={(e) => set('GEN_MODEL_MCP', e.target.value)}
      >
        <option value="">Select a model...</option>
        {availableModels.map((model) => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        CLI Override Model
        <span className="help-icon" data-tooltip="GEN_MODEL_CLI">?</span>
      </label>
      <select
        name="GEN_MODEL_CLI"
        id="cli-override-model-select"
        value={get('GEN_MODEL_CLI', '')}
        onChange={(e) => set('GEN_MODEL_CLI', e.target.value)}
      >
        <option value="">Select a model...</option>
        {availableModels.map((model) => (
          <option key={model} value={model}>{model}</option>
        ))}
      </select>
    </div>

    <div className="input-group">
      <label>
        Enrich Backend
        <span className="help-icon" data-tooltip="ENRICH_BACKEND">?</span>
      </label>
      <select
        name="ENRICH_BACKEND"
        id="enrich-backend-select"
        value={get('ENRICH_BACKEND', '')}
        onChange={(e) => set('ENRICH_BACKEND', e.target.value)}
      >
        <option value="">Default</option>
        <option value="openai">OpenAI</option>
        <option value="anthropic">Anthropic</option>
        <option value="google">Google</option>
        <option value="cohere">Cohere</option>
        <option value="ollama">Ollama</option>
        <option value="local">Local</option>
        <option value="mlx">MLX (Apple)</option>
      </select>
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        Max Tokens
        <span className="help-icon" data-tooltip="GEN_MAX_TOKENS">?</span>
      </label>
      <input
        type="number"
        id="GEN_MAX_TOKENS"
        name="GEN_MAX_TOKENS"
        value={get('GEN_MAX_TOKENS', 2048)}
        onChange={(e) => setGenMaxTokens(parseInt(e.target.value, 10) || 2048)}
        min={100}
        max={8192}
        step={128}
      />
    </div>

    <div className="input-group">
      <label>
        Top-P (Nucleus Sampling)
        <span className="help-icon" data-tooltip="GEN_TOP_P">?</span>
      </label>
      <input
        type="number"
        id="GEN_TOP_P"
        name="GEN_TOP_P"
        value={get('GEN_TOP_P', 1.0)}
        onChange={(e) => setGenTopP(parseFloat(e.target.value) || 1.0)}
        min={0.0}
        max={1.0}
        step={0.05}
      />
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        Timeout (seconds)
        <span className="help-icon" data-tooltip="GEN_TIMEOUT">?</span>
      </label>
      <input
        type="number"
        id="GEN_TIMEOUT"
        name="GEN_TIMEOUT"
        value={get('GEN_TIMEOUT', 60)}
        onChange={(e) => setGenTimeout(parseInt(e.target.value, 10) || 60)}
        min={10}
        max={300}
        step={5}
      />
    </div>

    <div className="input-group">
      <label>
        Retry Max
        <span className="help-icon" data-tooltip="GEN_RETRY_MAX">?</span>
      </label>
      <input
        type="number"
        id="GEN_RETRY_MAX"
        name="GEN_RETRY_MAX"
        value={get('GEN_RETRY_MAX', 2)}
        onChange={(e) => setGenRetryMax(parseInt(e.target.value, 10) || 2)}
        min={1}
        max={5}
        step={1}
      />
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        Enrich Disabled
        <span className="help-icon" data-tooltip="ENRICH_DISABLED">?</span>
      </label>
      <select
        id="ENRICH_DISABLED"
        name="ENRICH_DISABLED"
        value={get('ENRICH_DISABLED', '0')}
        onChange={(e) => set('ENRICH_DISABLED', e.target.value)}
      >
        <option value="0">No (Enable Enrichment)</option>
        <option value="1">Yes (Disable Enrichment)</option>
      </select>
    </div>
  </div>
</div>

{/* ========================================================================== */}
{/* SECTION: Retrieval Parameters */}
{/* ========================================================================== */}

<div className="settings-section">
  <h3>Retrieval Parameters</h3>
  <p className="small">
    Hybrid search fuses sparse (BM25) + dense (vectors). These knobs tune candidate counts and hydration behavior.
  </p>

  <div className="input-row">
    <div className="input-group">
      <label>
        Multi-Query Rewrites
        <span className="help-icon" data-tooltip="MAX_QUERY_REWRITES">?</span>
      </label>
      <input
        type="number"
        name="MAX_QUERY_REWRITES"
        value={mqRewrites}
        onChange={(e) => setMqRewrites(parseInt(e.target.value, 10) || 2)}
        min={1}
      />
    </div>

    <div className="input-group">
      <label>
        Final K
        <span className="help-icon" data-tooltip="FINAL_K">?</span>
      </label>
      <input
        type="number"
        name="FINAL_K"
        value={get('FINAL_K', 10)}
        onChange={(e) => setFinalK(parseInt(e.target.value, 10) || 10)}
        min={1}
      />
    </div>

    <div className="input-group">
      <label>
        Use Semantic Synonyms
        <span className="help-icon" data-tooltip="USE_SEMANTIC_SYNONYMS">?</span>
      </label>
      <select
        name="USE_SEMANTIC_SYNONYMS"
        value={get('USE_SEMANTIC_SYNONYMS', '1')}
        onChange={(e) => set('USE_SEMANTIC_SYNONYMS', e.target.value)}
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
        <span className="help-icon" data-tooltip="TOPK_DENSE">?</span>
      </label>
      <input
        type="number"
        name="TOPK_DENSE"
        value={get('TOPK_DENSE', 75)}
        onChange={(e) => setTopkDense(parseInt(e.target.value, 10) || 75)}
        min={1}
      />
    </div>

    <div className="input-group">
      <label>
        Vector Backend
        <span className="help-icon" data-tooltip="VECTOR_BACKEND">?</span>
      </label>
      <select
        name="VECTOR_BACKEND"
        value={get('VECTOR_BACKEND', 'qdrant')}
        onChange={(e) => set('VECTOR_BACKEND', e.target.value)}
      >
        <option value="qdrant">Qdrant</option>
        <option value="faiss">FAISS (experimental)</option>
      </select>
    </div>

    <div className="input-group">
      <label>
        Top-K Sparse (BM25)
        <span className="help-icon" data-tooltip="TOPK_SPARSE">?</span>
      </label>
      <input
        type="number"
        name="TOPK_SPARSE"
        value={get('TOPK_SPARSE', 75)}
        onChange={(e) => setTopkSparse(parseInt(e.target.value, 10) || 75)}
        min={1}
      />
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        Hydration Mode
        <span className="help-icon" data-tooltip="HYDRATION_MODE">?</span>
      </label>
      <select
        name="HYDRATION_MODE"
        value={get('HYDRATION_MODE', 'lazy')}
        onChange={(e) => set('HYDRATION_MODE', e.target.value)}
      >
        <option value="lazy">Lazy</option>
        <option value="none">None</option>
      </select>
    </div>

    <div className="input-group">
      <label>
        Hydration Max Chars
        <span className="help-icon" data-tooltip="HYDRATION_MAX_CHARS">?</span>
      </label>
      <input
        type="number"
        name="HYDRATION_MAX_CHARS"
        value={get('HYDRATION_MAX_CHARS', 2000)}
        onChange={(e) => setHydrationMaxChars(parseInt(e.target.value, 10) || 2000)}
      />
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        Vendor Mode
        <span className="help-icon" data-tooltip="VENDOR_MODE">?</span>
      </label>
      <select
        name="VENDOR_MODE"
        value={get('VENDOR_MODE', 'prefer_first_party')}
        onChange={(e) => set('VENDOR_MODE', e.target.value)}
      >
        <option value="prefer_first_party">Prefer First Party</option>
        <option value="prefer_vendor">Prefer Vendor</option>
      </select>
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        BM25 Weight
        <span className="help-icon" data-tooltip="BM25_WEIGHT">?</span>
      </label>
      <input
        type="number"
        id="BM25_WEIGHT"
        name="BM25_WEIGHT"
        value={get('BM25_WEIGHT', 0.3)}
        onChange={(e) => setBm25Weight(parseFloat(e.target.value) || 0.3)}
        min={0.0}
        max={1.0}
        step={0.1}
      />
    </div>

    <div className="input-group">
      <label>
        Vector Weight
        <span className="help-icon" data-tooltip="VECTOR_WEIGHT">?</span>
      </label>
      <input
        type="number"
        id="VECTOR_WEIGHT"
        name="VECTOR_WEIGHT"
        value={get('VECTOR_WEIGHT', 0.7)}
        onChange={(e) => setVectorWeight(parseFloat(e.target.value) || 0.7)}
        min={0.0}
        max={1.0}
        step={0.1}
      />
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        Card Search Enabled
        <span className="help-icon" data-tooltip="CARD_SEARCH_ENABLED">?</span>
      </label>
      <select
        id="CARD_SEARCH_ENABLED"
        name="CARD_SEARCH_ENABLED"
        value={get('CARD_SEARCH_ENABLED', '1')}
        onChange={(e) => set('CARD_SEARCH_ENABLED', e.target.value)}
      >
        <option value="1">Enabled</option>
        <option value="0">Disabled</option>
      </select>
    </div>

    <div className="input-group">
      <label>
        Multi-Query M
        <span className="help-icon" data-tooltip="MULTI_QUERY_M">?</span>
      </label>
      <input
        type="number"
        id="MULTI_QUERY_M"
        name="MULTI_QUERY_M"
        value={get('MULTI_QUERY_M', 4)}
        onChange={(e) => setMultiQueryM(parseInt(e.target.value, 10) || 4)}
        min={1}
        max={10}
        step={1}
      />
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        Confidence Top-1 Threshold
        <span className="help-icon" data-tooltip="CONF_TOP1">?</span>
      </label>
      <input
        type="number"
        id="CONF_TOP1"
        name="CONF_TOP1"
        value={get('CONF_TOP1', 0.62)}
        onChange={(e) => setConfTop1(parseFloat(e.target.value) || 0.62)}
        min={0.0}
        max={1.0}
        step={0.01}
      />
    </div>

    <div className="input-group">
      <label>
        Confidence Avg-5 Threshold
        <span className="help-icon" data-tooltip="CONF_AVG5">?</span>
      </label>
      <input
        type="number"
        id="CONF_AVG5"
        name="CONF_AVG5"
        value={get('CONF_AVG5', 0.55)}
        onChange={(e) => setConfAvg5(parseFloat(e.target.value) || 0.55)}
        min={0.0}
        max={1.0}
        step={0.01}
      />
    </div>
  </div>
</div>
