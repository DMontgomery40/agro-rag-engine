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
        value={genModel}
        onChange={(e) => {
          setGenModel(e.target.value);
          updateConfig('GEN_MODEL', e.target.value);
        }}
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
        value={openaiApiKey}
        onChange={(e) => setOpenaiApiKey(e.target.value)}
        onBlur={() => { if (openaiApiKey) updateConfig('OPENAI_API_KEY', openaiApiKey); }}
        placeholder="sk-..."
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
            Sets a global default temperature for generation. 0.0 = deterministic; try 0.2 sometimes, or 0.04 for light variation in docs.
          </div>
        </span>
      </label>
      <input
        type="number"
        name="GEN_TEMPERATURE"
        value={genTemperature}
        onChange={(e) => setGenTemperature(parseFloat(e.target.value) || 0.0)}
        onBlur={() => updateConfig('GEN_TEMPERATURE', genTemperature)}
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
        value={enrichModel}
        onChange={(e) => {
          setEnrichModel(e.target.value);
          updateConfig('ENRICH_MODEL', e.target.value);
        }}
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
        value={enrichModelOllama}
        onChange={(e) => {
          setEnrichModelOllama(e.target.value);
          updateConfig('ENRICH_MODEL_OLLAMA', e.target.value);
        }}
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
        value={anthropicApiKey}
        onChange={(e) => setAnthropicApiKey(e.target.value)}
        onBlur={() => { if (anthropicApiKey) updateConfig('ANTHROPIC_API_KEY', anthropicApiKey); }}
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
        value={googleApiKey}
        onChange={(e) => setGoogleApiKey(e.target.value)}
        onBlur={() => { if (googleApiKey) updateConfig('GOOGLE_API_KEY', googleApiKey); }}
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
        value={ollamaUrl}
        onChange={(e) => setOllamaUrl(e.target.value)}
        onBlur={() => updateConfig('OLLAMA_URL', ollamaUrl)}
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
        value={openaiBaseUrl}
        onChange={(e) => setOpenaiBaseUrl(e.target.value)}
        onBlur={() => updateConfig('OPENAI_BASE_URL', openaiBaseUrl)}
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
        value={genModelHttp}
        onChange={(e) => {
          setGenModelHttp(e.target.value);
          updateConfig('GEN_MODEL_HTTP', e.target.value);
        }}
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
        value={genModelMcp}
        onChange={(e) => {
          setGenModelMcp(e.target.value);
          updateConfig('GEN_MODEL_MCP', e.target.value);
        }}
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
        value={genModelCli}
        onChange={(e) => {
          setGenModelCli(e.target.value);
          updateConfig('GEN_MODEL_CLI', e.target.value);
        }}
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
        value={enrichBackend}
        onChange={(e) => {
          setEnrichBackend(e.target.value);
          updateConfig('ENRICH_BACKEND', e.target.value);
        }}
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
        value={genMaxTokens}
        onChange={(e) => setGenMaxTokens(parseInt(e.target.value, 10) || 2048)}
        onBlur={() => updateConfig('GEN_MAX_TOKENS', genMaxTokens)}
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
        value={genTopP}
        onChange={(e) => setGenTopP(parseFloat(e.target.value) || 1.0)}
        onBlur={() => updateConfig('GEN_TOP_P', genTopP)}
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
        value={genTimeout}
        onChange={(e) => setGenTimeout(parseInt(e.target.value, 10) || 60)}
        onBlur={() => updateConfig('GEN_TIMEOUT', genTimeout)}
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
        value={genRetryMax}
        onChange={(e) => setGenRetryMax(parseInt(e.target.value, 10) || 2)}
        onBlur={() => updateConfig('GEN_RETRY_MAX', genRetryMax)}
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
        value={enrichDisabled}
        onChange={(e) => {
          setEnrichDisabled(e.target.value);
          updateConfig('ENRICH_DISABLED', e.target.value);
        }}
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
        <span className="tooltip-wrap">
          <span className="help-icon">?</span>
          <div className="tooltip-bubble">
            <span className="tt-title">Query Expansion via LLM Rewriting - Improved Recall</span>
            Number of query variations to automatically generate using the LLM. Each variation searches independently via hybrid search, results are merged and reranked together. Higher = better chance of finding relevant code but increases latency and API costs.
            <br /><br />
            <strong>Example:</strong> Query "how do we handle payments?" might expand to:
            <br />- "payment processing implementation"
            <br />- "stripe integration"
            <br />- "checkout flow"
            <br /><br />
            <strong>Tuning:</strong> 1-2 for speed, 3-4 for balanced, 5-6 for thorough but expensive searches.
            <br />Default: 2. Range: 1-6.
            <div className="tt-links">
              <a href="https://arxiv.org/abs/2305.14283" target="_blank" rel="noopener">Multi-Query RAG Paper</a>
              <a href="https://python.langchain.com/docs/how_to/MultiQueryRetriever/" target="_blank" rel="noopener">LangChain Implementation</a>
              <a href="/docs/RETRIEVAL.md#multi-query" target="_blank" rel="noopener">Multi-Query Tuning Guide</a>
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
        onChange={(e) => setMqRewrites(parseInt(e.target.value, 10) || 2)}
        onBlur={() => updateConfig('MQ_REWRITES', mqRewrites)}
        min={1}
      />
    </div>

    <div className="input-group">
      <label>
        Final K
        <span className="tooltip-wrap">
          <span className="help-icon">?</span>
          <div className="tooltip-bubble">
            <span className="tt-title">Final Results Count</span>
            Number of top results to return after fusion and reranking. This is what you get back from search. Higher = more context but more noise. Default: 10. Range: 5-30.
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
        onChange={(e) => setFinalK(parseInt(e.target.value, 10) || 10)}
        onBlur={() => updateConfig('FINAL_K', finalK)}
        min={1}
      />
    </div>

    <div className="input-group">
      <label>
        Use Semantic Synonyms
        <span className="tooltip-wrap">
          <span className="help-icon">?</span>
          <div className="tooltip-bubble">
            <span className="tt-title">Query Expansion via Synonym Replacement - Domain Terminology</span>
            Expands user queries with hand-curated semantic synonyms to handle domain-specific terminology and abbreviations. Example: "auth" expands to "auth authentication oauth jwt bearer token login".
            <br /><br />
            <strong>Purpose:</strong> Handles acronyms and domain synonyms that LLM rewriting might miss. E.g., "JWT" might not rewrite to "json web token".
            <br /><strong>Configuration:</strong> Edit data/semantic_synonyms.json to add domain-specific synonym mappings for your codebase.
            <br /><strong>Note:</strong> Different from Multi-Query Rewrites - this uses pre-defined synonyms, not LLM-generated variations.
            <br />Default: ON (enabled).
            <div className="tt-links">
              <a href="/files/data/semantic_synonyms.json" target="_blank" rel="noopener">Synonym Config File</a>
              <a href="/docs/RETRIEVAL.md#synonyms" target="_blank" rel="noopener">Synonym Setup Guide</a>
              <a href="/docs/DOMAIN_CUSTOMIZATION.md" target="_blank" rel="noopener">Domain Terminology</a>
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
          setUseSemanticSynonyms(e.target.value);
          updateConfig('USE_SEMANTIC_SYNONYMS', e.target.value);
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
            Number of candidates to retrieve from Qdrant vector search before fusion. Higher = better recall for semantic matches but slower. Should be &gt;= Final K. Default: 75. Range: 20-200.
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
        onChange={(e) => setTopkDense(parseInt(e.target.value, 10) || 75)}
        onBlur={() => updateConfig('TOPK_DENSE', topkDense)}
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
        value={vectorBackend}
        onChange={(e) => {
          setVectorBackend(e.target.value);
          updateConfig('VECTOR_BACKEND', e.target.value);
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
            Number of candidates to retrieve from BM25 keyword search before fusion. Higher = better recall for exact matches but slower. Should be &gt;= Final K. Default: 75. Range: 20-200.
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
        onChange={(e) => setTopkSparse(parseInt(e.target.value, 10) || 75)}
        onBlur={() => updateConfig('TOPK_SPARSE', topkSparse)}
        min={1}
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
            Controls when full code is loaded. "Lazy" loads code from chunks.jsonl after retrieval. "None" only returns metadata (file path, line numbers). Lazy is recommended. None is faster but returns no code.
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
          updateConfig('HYDRATION_MODE', e.target.value);
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
            Maximum characters to load per chunk when hydrating. Prevents huge chunks from bloating responses. 0 = no limit. Default: 2000. Range: 500-5000.
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
        onChange={(e) => setHydrationMaxChars(parseInt(e.target.value, 10) || 2000)}
        onBlur={() => updateConfig('HYDRATION_MAX_CHARS', hydrationMaxChars)}
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
            Controls scoring bonus for first-party vs vendor code. "Prefer First Party" boosts your code (+0.06) and penalizes vendor libs (-0.08). "Prefer Vendor" boosts vendor code. Most use cases prefer first party.
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
          updateConfig('VENDOR_MODE', e.target.value);
        }}
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
        value={bm25Weight}
        onChange={(e) => setBm25Weight(parseFloat(e.target.value) || 0.3)}
        onBlur={() => updateConfig('BM25_WEIGHT', bm25Weight)}
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
        value={vectorWeight}
        onChange={(e) => setVectorWeight(parseFloat(e.target.value) || 0.7)}
        onBlur={() => updateConfig('VECTOR_WEIGHT', vectorWeight)}
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
        value={cardSearchEnabled}
        onChange={(e) => {
          setCardSearchEnabled(e.target.value);
          updateConfig('CARD_SEARCH_ENABLED', e.target.value);
        }}
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
        value={multiQueryM}
        onChange={(e) => setMultiQueryM(parseInt(e.target.value, 10) || 4)}
        onBlur={() => updateConfig('MULTI_QUERY_M', multiQueryM)}
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
        value={confTop1}
        onChange={(e) => setConfTop1(parseFloat(e.target.value) || 0.62)}
        onBlur={() => updateConfig('CONF_TOP1', confTop1)}
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
        value={confAvg5}
        onChange={(e) => setConfAvg5(parseFloat(e.target.value) || 0.55)}
        onBlur={() => updateConfig('CONF_AVG5', confAvg5)}
        min={0.0}
        max={1.0}
        step={0.01}
      />
    </div>
  </div>
</div>
