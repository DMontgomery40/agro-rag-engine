import { useState, useEffect } from 'react';

// RetrievalSubtab: Main retrieval and RAG configuration component
// Converted from legacy HTML to proper TypeScript React
export function RetrievalSubtab() {

  // ============================================================================
  // STATE - First 50% (Generation Models + Retrieval Parameters sections)
  // ============================================================================

  // Generation Models section
  const [genModel, setGenModel] = useState<string>('');
  const [openaiApiKey, setOpenaiApiKey] = useState<string>('');
  const [genTemperature, setGenTemperature] = useState<number>(0.0);
  const [enrichModel, setEnrichModel] = useState<string>('');
  const [enrichModelOllama, setEnrichModelOllama] = useState<string>('');
  const [anthropicApiKey, setAnthropicApiKey] = useState<string>('');
  const [googleApiKey, setGoogleApiKey] = useState<string>('');
  const [ollamaUrl, setOllamaUrl] = useState<string>('http://127.0.0.1:11434');
  const [openaiBaseUrl, setOpenaiBaseUrl] = useState<string>('');
  const [genModelHttp, setGenModelHttp] = useState<string>('');
  const [genModelMcp, setGenModelMcp] = useState<string>('');
  const [genModelCli, setGenModelCli] = useState<string>('');
  const [enrichBackend, setEnrichBackend] = useState<string>('');
  const [genMaxTokens, setGenMaxTokens] = useState<number>(2048);
  const [genTopP, setGenTopP] = useState<number>(1.0);
  const [genTimeout, setGenTimeout] = useState<number>(60);
  const [genRetryMax, setGenRetryMax] = useState<number>(2);
  const [enrichDisabled, setEnrichDisabled] = useState<string>('0');

  // Retrieval Parameters section
  const [multiQueryRewrites, setMultiQueryRewrites] = useState<number>(2);
  const [finalK, setFinalK] = useState<number>(10);
  const [useSemanticSynonyms, setUseSemanticSynonyms] = useState<string>('1');
  const [topkDense, setTopkDense] = useState<number>(75);
  const [vectorBackend, setVectorBackend] = useState<string>('qdrant');
  const [topkSparse, setTopkSparse] = useState<number>(75);
  const [hydrationMode, setHydrationMode] = useState<string>('lazy');
  const [hydrationMaxChars, setHydrationMaxChars] = useState<number>(2000);
  const [vendorMode, setVendorMode] = useState<string>('prefer_first_party');
  const [bm25Weight, setBm25Weight] = useState<number>(0.3);
  const [vectorWeight, setVectorWeight] = useState<number>(0.7);
  const [cardSearchEnabled, setCardSearchEnabled] = useState<string>('1');
  const [multiQueryM, setMultiQueryM] = useState<number>(4);
  const [confTop1, setConfTop1] = useState<number>(0.62);
  const [confAvg5, setConfAvg5] = useState<number>(0.55);

  // ============================================================================
  // STATE - Last 50% (Advanced RAG Tuning + Routing Trace sections)
  // ============================================================================

  // Advanced RAG Tuning section
  const [rrfKDiv, setRrfKDiv] = useState<number>(60);
  const [cardBonus, setCardBonus] = useState<number>(0.08);
  const [filenameBoostExact, setFilenameBoostExact] = useState<number>(1.5);
  const [filenameBoostPartial, setFilenameBoostPartial] = useState<number>(1.2);
  const [langgraphFinalK, setLanggraphFinalK] = useState<number>(20);
  const [maxQueryRewrites, setMaxQueryRewrites] = useState<number>(3);
  const [fallbackConfidence, setFallbackConfidence] = useState<number>(0.55);
  const [layerBonusGui, setLayerBonusGui] = useState<number>(0.15);
  const [layerBonusRetrieval, setLayerBonusRetrieval] = useState<number>(0.15);
  const [vendorPenalty, setVendorPenalty] = useState<number>(-0.1);
  const [freshnessBonus, setFreshnessBonus] = useState<number>(0.05);

  // Routing Trace section
  const [tracingMode, setTracingMode] = useState<string>('off');
  const [traceAutoLs, setTraceAutoLs] = useState<string>('0');
  const [traceRetention, setTraceRetention] = useState<number>(50);
  const [langchainTracingV2, setLangchainTracingV2] = useState<string>('0');
  const [langchainEndpoint, setLangchainEndpoint] = useState<string>('');
  const [langchainApiKey, setLangchainApiKey] = useState<string>('');
  const [langsmithApiKey, setLangsmithApiKey] = useState<string>('');
  const [langchainProject, setLangchainProject] = useState<string>('');
  const [langtraceApiHost, setLangtraceApiHost] = useState<string>('');
  const [langtraceProjectId, setLangtraceProjectId] = useState<string>('');
  const [langtraceApiKey, setLangtraceApiKey] = useState<string>('');

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // ============================================================================
  // LOAD CONFIG ON MOUNT
  // ============================================================================

  useEffect(() => {
    loadConfig();
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const response = await fetch('/api/prices');
      const data = await response.json();
      const models = data.models.map((m: any) => m.model);
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to load models from /api/prices:', error);
    }
  };

  const loadConfig = async () => {
    try {
      const response = await fetch('/api/config');
      const data = await response.json();
      const env = data.env || {};

      // Generation Models section
      setGenModel(env.GEN_MODEL || '');
      setOpenaiApiKey(env.OPENAI_API_KEY === '••••••••••••••••' ? '' : (env.OPENAI_API_KEY || ''));
      setGenTemperature(parseFloat(env.GEN_TEMPERATURE || '0.0'));
      setEnrichModel(env.ENRICH_MODEL || '');
      setEnrichModelOllama(env.ENRICH_MODEL_OLLAMA || '');
      setAnthropicApiKey(env.ANTHROPIC_API_KEY === '••••••••••••••••' ? '' : (env.ANTHROPIC_API_KEY || ''));
      setGoogleApiKey(env.GOOGLE_API_KEY === '••••••••••••••••' ? '' : (env.GOOGLE_API_KEY || ''));
      setOllamaUrl(env.OLLAMA_URL || 'http://127.0.0.1:11434');
      setOpenaiBaseUrl(env.OPENAI_BASE_URL || '');
      setGenModelHttp(env.GEN_MODEL_HTTP || '');
      setGenModelMcp(env.GEN_MODEL_MCP || '');
      setGenModelCli(env.GEN_MODEL_CLI || '');
      setEnrichBackend(env.ENRICH_BACKEND || '');
      setGenMaxTokens(parseInt(env.GEN_MAX_TOKENS || '2048', 10));
      setGenTopP(parseFloat(env.GEN_TOP_P || '1.0'));
      setGenTimeout(parseInt(env.GEN_TIMEOUT || '60', 10));
      setGenRetryMax(parseInt(env.GEN_RETRY_MAX || '2', 10));
      setEnrichDisabled(env.ENRICH_DISABLED || '0');

      // Retrieval Parameters section
      setMultiQueryRewrites(parseInt(env.MAX_QUERY_REWRITES || '2', 10));
      setFinalK(parseInt(env.FINAL_K || '10', 10));
      setUseSemanticSynonyms(env.USE_SEMANTIC_SYNONYMS || '1');
      setTopkDense(parseInt(env.TOPK_DENSE || '75', 10));
      setVectorBackend(env.VECTOR_BACKEND || 'qdrant');
      setTopkSparse(parseInt(env.TOPK_SPARSE || '75', 10));
      setHydrationMode(env.HYDRATION_MODE || 'lazy');
      setHydrationMaxChars(parseInt(env.HYDRATION_MAX_CHARS || '2000', 10));
      setVendorMode(env.VENDOR_MODE || 'prefer_first_party');
      setBm25Weight(parseFloat(env.BM25_WEIGHT || '0.3'));
      setVectorWeight(parseFloat(env.VECTOR_WEIGHT || '0.7'));
      setCardSearchEnabled(env.CARD_SEARCH_ENABLED || '1');
      setMultiQueryM(parseInt(env.MULTI_QUERY_M || '4', 10));
      setConfTop1(parseFloat(env.CONF_TOP1 || '0.62'));
      setConfAvg5(parseFloat(env.CONF_AVG5 || '0.55'));

      // Advanced RAG Tuning
      setRrfKDiv(parseFloat(env.RRF_K_DIV || '60'));
      setCardBonus(parseFloat(env.CARD_BONUS || '0.08'));
      setFilenameBoostExact(parseFloat(env.FILENAME_BOOST_EXACT || '1.5'));
      setFilenameBoostPartial(parseFloat(env.FILENAME_BOOST_PARTIAL || '1.2'));
      setLanggraphFinalK(parseInt(env.LANGGRAPH_FINAL_K || '20', 10));
      setMaxQueryRewrites(parseInt(env.MAX_QUERY_REWRITES || '3', 10));
      setFallbackConfidence(parseFloat(env.FALLBACK_CONFIDENCE || '0.55'));
      setLayerBonusGui(parseFloat(env.LAYER_BONUS_GUI || '0.15'));
      setLayerBonusRetrieval(parseFloat(env.LAYER_BONUS_RETRIEVAL || '0.15'));
      setVendorPenalty(parseFloat(env.VENDOR_PENALTY || '-0.1'));
      setFreshnessBonus(parseFloat(env.FRESHNESS_BONUS || '0.05'));

      // Routing Trace
      setTracingMode(env.TRACING_MODE || 'off');
      setTraceAutoLs(env.TRACE_AUTO_LS || '0');
      setTraceRetention(parseInt(env.TRACE_RETENTION || '50', 10));
      setLangchainTracingV2(env.LANGCHAIN_TRACING_V2 || '0');
      setLangchainEndpoint(env.LANGCHAIN_ENDPOINT || '');
      setLangchainApiKey(env.LANGCHAIN_API_KEY === '••••••••••••••••' ? '' : (env.LANGCHAIN_API_KEY || ''));
      setLangsmithApiKey(env.LANGSMITH_API_KEY === '••••••••••••••••' ? '' : (env.LANGSMITH_API_KEY || ''));
      setLangchainProject(env.LANGCHAIN_PROJECT || '');
      setLangtraceApiHost(env.LANGTRACE_API_HOST || '');
      setLangtraceProjectId(env.LANGTRACE_PROJECT_ID || '');
      setLangtraceApiKey(env.LANGTRACE_API_KEY === '••••••••••••••••' ? '' : (env.LANGTRACE_API_KEY || ''));

      // Load available models
      if (data.available_models) {
        setAvailableModels(data.available_models);
      }

      setLoading(false);
    } catch (error) {
      console.error('Failed to load config:', error);
      setLoading(false);
    }
  };

  // ============================================================================
  // UPDATE CONFIG HELPERS
  // ============================================================================

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

      // Reload config to ensure backend picks up changes
      await fetch('/api/env/reload', { method: 'POST' });
    } catch (error) {
      console.error(`Error updating ${key}:`, error);
      alert(`Failed to update ${key}`);
    }
  };

  if (loading) {
    return <div style={{ padding: '24px' }}>Loading configuration...</div>;
  }

  return (
    <>
      {/* Generation Models and Retrieval Parameters */}

      <div className="settings-section">
        <h3>Generation Models</h3>

        <div className="input-row">
          <div className="input-group">
            <label>
              Primary Model (GEN_MODEL)
              <span className="help-icon" data-tooltip="GEN_MODEL">?</span>
            </label>
            <select
              name="GEN_MODEL"
              id="gen-model-select"
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
        name="MAX_QUERY_REWRITES"
        value={multiQueryRewrites}
        onChange={(e) => setMultiQueryRewrites(parseInt(e.target.value, 10) || 2)}
        onBlur={() => updateConfig('MAX_QUERY_REWRITES', multiQueryRewrites)}
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
      {/* SECTION DIVIDER: Advanced RAG Tuning */}
      {/* ========================================================================== */}

      <div className="settings-section" style={{ borderLeft: '3px solid var(--warn)', marginTop: '24px' }}>
        <h3>
          <span className="accent-orange">●</span> Advanced RAG Tuning
          <span className="tooltip-wrap">
            <span className="help-icon">?</span>
            <div className="tooltip-bubble">
              <span className="tt-title">Advanced Parameters</span>
              Fine-tune scoring, fusion, and iteration behavior. These parameters significantly affect retrieval quality and performance. Only modify if you understand the implications.
              <div className="tt-badges">
                <span className="tt-badge warn">Expert Only</span>
                <span className="tt-badge">No Re-index</span>
              </div>
            </div>
          </span>
        </h3>
        <p className="small">Expert-level controls for fusion weighting, score bonuses, and LangGraph iteration behavior. Changes take effect immediately without re-indexing.</p>

        <div className="input-row">
          <div className="input-group">
            <label>
              RRF K Divisor
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Reciprocal Rank Fusion (RRF) - Hybrid Search Weighting</span>
                  Controls how hybrid search combines BM25 (keyword) and vector (semantic) results using the RRF algorithm. Formula: score += 1/(K + rank). Lower K = BM25 and vector have more equal weight. Higher K = only top results matter equally.
                  <br /><br />
                  <strong>Examples:</strong> K=30 (favor top results, aggressive fusion), K=60 (balanced, recommended), K=100 (flatten ranking, lenient fusion)
                  <br /><strong>Tuning:</strong> Lower if keywords and semantics compete; higher if you want diversity.
                  <br />Default: 60. Range: 10-100.
                  <div className="tt-links">
                    <a href="https://en.wikipedia.org/wiki/Reciprocal_rank_fusion" target="_blank" rel="noopener">RRF Algorithm</a>
                    <a href="https://www.pinecone.io/learn/hybrid-search-intro/" target="_blank" rel="noopener">Hybrid Search Explained</a>
                    <a href="/docs/RETRIEVAL.md#rrf-fusion" target="_blank" rel="noopener">RRF Tuning Guide</a>
                  </div>
                  <div className="tt-badges">
                    <span className="tt-badge info">Affects Fusion</span>
                    <span className="tt-badge">No Re-index</span>
                  </div>
                </div>
              </span>
            </label>
            <input
              type="number"
              name="RRF_K_DIV"
              value={rrfKDiv}
              onChange={(e) => setRrfKDiv(parseFloat(e.target.value))}
              onBlur={() => updateConfig('RRF_K_DIV', rrfKDiv)}
              min={10}
              max={100}
              step={5}
            />
          </div>
          <div className="input-group">
            <label>
              Card Bonus
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Card Semantic Summary Bonus - Intent-Based Retrieval</span>
                  Score boost applied to chunks when matching against AI-generated code card summaries (not raw code). Cards are semantic summaries of code modules/features created by ENRICH_CODE_CHUNKS. Enables "where is auth handled?" to find auth modules even if code contains different keywords.
                  <br /><br />
                  <strong>Use Case:</strong> Improving conceptual queries by matching against high-level summaries. Raises the score when a card matches, prioritizing that chunk.
                  <br /><strong>Tuning:</strong> Increase (0.12-0.15) if cards are finding relevant code; decrease (0.04-0.06) if cards cause noise.
                  <br />Default: 0.08. Range: 0.0-0.2.
                  <div className="tt-links">
                    <a href="/docs/CARDS.md" target="_blank" rel="noopener">Cards Feature</a>
                    <a href="/files/indexer/build_cards.py" target="_blank" rel="noopener">Cards Builder Source</a>
                    <a href="/docs/RETRIEVAL.md#card-scoring" target="_blank" rel="noopener">Card Scoring Logic</a>
                  </div>
                  <div className="tt-badges">
                    <span className="tt-badge info">Improves Intent</span>
                    <span className="tt-badge">Requires ENRICH_CODE_CHUNKS</span>
                    <span className="tt-badge">No Re-index</span>
                  </div>
                </div>
              </span>
            </label>
            <input
              type="number"
              name="CARD_BONUS"
              value={cardBonus}
              onChange={(e) => setCardBonus(parseFloat(e.target.value))}
              onBlur={() => updateConfig('CARD_BONUS', cardBonus)}
              min={0}
              max={0.2}
              step={0.01}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Filename Boost (Exact Match)
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Filename Exact Match Score Multiplier - File-Specific Queries</span>
                  Score multiplier (not additive) applied when query terms match the filename EXACTLY. Example: query "auth.py" matching file "auth.py" gets multiplied by 1.5x.
                  <br /><br />
                  <strong>Purpose:</strong> Users often ask "find file X.py" - this boost rewards exact filename matches, improving precision for file-specific questions.
                  <br /><strong>Tuning:</strong> Increase (2.0+) to strongly prefer exact filename matches; decrease (1.2) if boost causes over-matching.
                  <br />Default: 1.5. Range: 1.0-3.0.
                  <div className="tt-links">
                    <a href="/docs/RETRIEVAL.md#path-scoring" target="_blank" rel="noopener">Path Scoring Rules</a>
                    <a href="/docs/RETRIEVAL.md#tuning-multipliers" target="_blank" rel="noopener">Tuning Score Multipliers</a>
                  </div>
                  <div className="tt-badges">
                    <span className="tt-badge info">Precision Boost</span>
                    <span className="tt-badge">No Re-index</span>
                  </div>
                </div>
              </span>
            </label>
            <input
              type="number"
              name="FILENAME_BOOST_EXACT"
              value={filenameBoostExact}
              onChange={(e) => setFilenameBoostExact(parseFloat(e.target.value))}
              onBlur={() => updateConfig('FILENAME_BOOST_EXACT', filenameBoostExact)}
              min={1.0}
              max={3.0}
              step={0.1}
            />
          </div>
          <div className="input-group">
            <label>
              Filename Boost (Partial Match)
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Path Component Partial Match Score Multiplier - Directory Path Bonus</span>
                  Score multiplier applied when query terms match ANY component of the file path (directories or partial filename). Example: query "auth" matching "src/auth/oauth.py" or "routes/authentication.ts" gets multiplied by 1.2x.
                  <br /><br />
                  <strong>Purpose:</strong> Improves recall by rewarding hits in relevant directories. Users ask "where is auth handled?" and this finds files in "auth/" or "authentication/" dirs.
                  <br /><strong>Tuning:</strong> Increase (1.5+) for stronger directory matching; decrease (1.05) if path matches create noise.
                  <br /><strong>Difference from Exact:</strong> Partial matches ANY path component (dir name, filename prefix); Exact requires full filename match.
                  <br />Default: 1.2. Range: 1.0-2.0.
                  <div className="tt-links">
                    <a href="/docs/RETRIEVAL.md#path-scoring" target="_blank" rel="noopener">Path Scoring Rules</a>
                    <a href="/docs/RETRIEVAL.md#precision-vs-recall" target="_blank" rel="noopener">Precision vs Recall Tuning</a>
                  </div>
                  <div className="tt-badges">
                    <span className="tt-badge info">Recall Boost</span>
                    <span className="tt-badge">No Re-index</span>
                  </div>
                </div>
              </span>
            </label>
            <input
              type="number"
              name="FILENAME_BOOST_PARTIAL"
              value={filenameBoostPartial}
              onChange={(e) => setFilenameBoostPartial(parseFloat(e.target.value))}
              onBlur={() => updateConfig('FILENAME_BOOST_PARTIAL', filenameBoostPartial)}
              min={1.0}
              max={2.0}
              step={0.1}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              LangGraph Final K
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">LangGraph Document Count</span>
                  Number of documents retrieved for LangGraph RAG pipeline (used by /answer endpoint). Higher = more context but slower + costlier. Separate from retrieval Final K. Default: 20. Range: 5-50.
                  <div className="tt-badges">
                    <span className="tt-badge info">Context Window</span>
                    <span className="tt-badge warn">Higher Cost</span>
                  </div>
                </div>
              </span>
            </label>
            <input
              type="number"
              name="LANGGRAPH_FINAL_K"
              value={langgraphFinalK}
              onChange={(e) => setLanggraphFinalK(parseInt(e.target.value, 10))}
              onBlur={() => updateConfig('LANGGRAPH_FINAL_K', langgraphFinalK)}
              min={5}
              max={50}
              step={1}
            />
          </div>
          <div className="input-group">
            <label>
              Max Query Rewrites
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Iteration Limit</span>
                  Maximum number of query rewrite iterations in LangGraph when confidence is low. Each iteration generates a new query variant and retrieves again. Default: 3. Range: 1-5.
                  <div className="tt-badges">
                    <span className="tt-badge info">Adaptive Search</span>
                    <span className="tt-badge warn">Higher Latency</span>
                  </div>
                </div>
              </span>
            </label>
            <input
              type="number"
              name="MAX_QUERY_REWRITES"
              value={maxQueryRewrites}
              onChange={(e) => setMaxQueryRewrites(parseInt(e.target.value, 10))}
              onBlur={() => updateConfig('MAX_QUERY_REWRITES', maxQueryRewrites)}
              min={1}
              max={5}
              step={1}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Fallback Confidence Threshold
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Low-Confidence Fallback</span>
                  When initial retrieval confidence is below this threshold, triggers a fallback multi-query search with expanded parameters. Lower = more aggressive fallback. Default: 0.55. Range: 0.3-0.8.
                  <div className="tt-badges">
                    <span className="tt-badge info">Recall Safety Net</span>
                    <span className="tt-badge warn">Extra API Calls</span>
                  </div>
                </div>
              </span>
            </label>
            <input
              type="number"
              name="FALLBACK_CONFIDENCE"
              value={fallbackConfidence}
              onChange={(e) => setFallbackConfidence(parseFloat(e.target.value))}
              onBlur={() => updateConfig('FALLBACK_CONFIDENCE', fallbackConfidence)}
              min={0.3}
              max={0.8}
              step={0.05}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Layer Bonus (GUI)
              <span className="help-icon" data-tooltip="LAYER_BONUS_GUI">?</span>
            </label>
            <input
              type="number"
              id="LAYER_BONUS_GUI"
              name="LAYER_BONUS_GUI"
              value={layerBonusGui}
              onChange={(e) => setLayerBonusGui(parseFloat(e.target.value))}
              onBlur={() => updateConfig('LAYER_BONUS_GUI', layerBonusGui)}
              min={0.0}
              max={0.5}
              step={0.05}
            />
          </div>
          <div className="input-group">
            <label>
              Layer Bonus (Retrieval)
              <span className="help-icon" data-tooltip="LAYER_BONUS_RETRIEVAL">?</span>
            </label>
            <input
              type="number"
              id="LAYER_BONUS_RETRIEVAL"
              name="LAYER_BONUS_RETRIEVAL"
              value={layerBonusRetrieval}
              onChange={(e) => setLayerBonusRetrieval(parseFloat(e.target.value))}
              onBlur={() => updateConfig('LAYER_BONUS_RETRIEVAL', layerBonusRetrieval)}
              min={0.0}
              max={0.5}
              step={0.05}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Vendor Penalty
              <span className="help-icon" data-tooltip="VENDOR_PENALTY">?</span>
            </label>
            <input
              type="number"
              id="VENDOR_PENALTY"
              name="VENDOR_PENALTY"
              value={vendorPenalty}
              onChange={(e) => setVendorPenalty(parseFloat(e.target.value))}
              onBlur={() => updateConfig('VENDOR_PENALTY', vendorPenalty)}
              min={-0.5}
              max={0.0}
              step={0.05}
            />
          </div>
          <div className="input-group">
            <label>
              Freshness Bonus
              <span className="help-icon" data-tooltip="FRESHNESS_BONUS">?</span>
            </label>
            <input
              type="number"
              id="FRESHNESS_BONUS"
              name="FRESHNESS_BONUS"
              value={freshnessBonus}
              onChange={(e) => setFreshnessBonus(parseFloat(e.target.value))}
              onBlur={() => updateConfig('FRESHNESS_BONUS', freshnessBonus)}
              min={0.0}
              max={0.3}
              step={0.05}
            />
          </div>
        </div>
      </div>

      {/* ========================================================================== */}
      {/* SECTION DIVIDER: Routing Trace */}
      {/* ========================================================================== */}

      <div className="settings-section" style={{ marginTop: '16px', borderLeft: '3px solid var(--link)' }}>
        <h3>Routing Trace</h3>
        <div className="input-row">
          <div className="input-group">
            <label>Load Latest Trace</label>
            <button className="small-button" id="btn-trace-latest">Open</button>
          </div>
          <div className="input-group">
            <label>Open in LangSmith</label>
            <button className="small-button" id="btn-trace-open-ls">Open</button>
          </div>
          <div className="input-group">
            <label>
              Tracing Mode
              <span className="help-icon" data-tooltip="TRACING_MODE">?</span>
            </label>
            <select
              name="TRACING_MODE"
              value={tracingMode}
              onChange={(e) => { setTracingMode(e.target.value); updateConfig('TRACING_MODE', e.target.value); }}
            >
              <option value="off">Off</option>
              <option value="local">Local</option>
              <option value="langsmith">LangSmith</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              Auto-open in LangSmith
              <span className="help-icon" data-tooltip="TRACE_AUTO_LS">?</span>
            </label>
            <select
              name="TRACE_AUTO_LS"
              value={traceAutoLs}
              onChange={(e) => { setTraceAutoLs(e.target.value); updateConfig('TRACE_AUTO_LS', e.target.value); }}
            >
              <option value="0">No</option>
              <option value="1">Yes</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              Trace Retention
              <span className="help-icon" data-tooltip="TRACE_RETENTION">?</span>
            </label>
            <input
              type="number"
              name="TRACE_RETENTION"
              value={traceRetention}
              onChange={(e) => setTraceRetention(parseInt(e.target.value, 10))}
              onBlur={() => updateConfig('TRACE_RETENTION', traceRetention)}
              min={1}
              max={500}
            />
          </div>
        </div>

        {/* LangSmith / LangChain Tracing Settings */}
        <div className="input-row">
          <div className="input-group">
            <label>
              LangChain Tracing V2 (LANGCHAIN_TRACING_V2)
              <span className="help-icon" data-tooltip="LANGCHAIN_TRACING_V2">?</span>
            </label>
            <select
              name="LANGCHAIN_TRACING_V2"
              value={langchainTracingV2}
              onChange={(e) => { setLangchainTracingV2(e.target.value); updateConfig('LANGCHAIN_TRACING_V2', e.target.value); }}
            >
              <option value="0">Off</option>
              <option value="1">On</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              LangSmith Endpoint (LANGCHAIN_ENDPOINT)
              <span className="help-icon" data-tooltip="LANGCHAIN_ENDPOINT">?</span>
            </label>
            <input
              type="text"
              name="LANGCHAIN_ENDPOINT"
              placeholder="https://api.smith.langchain.com"
              value={langchainEndpoint}
              onChange={(e) => setLangchainEndpoint(e.target.value)}
              onBlur={() => updateConfig('LANGCHAIN_ENDPOINT', langchainEndpoint)}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              LangSmith API Key (LANGCHAIN_API_KEY)
              <span className="help-icon" data-tooltip="LANGCHAIN_API_KEY">?</span>
            </label>
            <input
              type="password"
              name="LANGCHAIN_API_KEY"
              placeholder="sk-..."
              value={langchainApiKey}
              onChange={(e) => setLangchainApiKey(e.target.value)}
              onBlur={() => { if (langchainApiKey) updateConfig('LANGCHAIN_API_KEY', langchainApiKey); }}
            />
          </div>
          <div className="input-group">
            <label>
              LangSmith API Key (alias) (LANGSMITH_API_KEY)
              <span className="help-icon" data-tooltip="LANGSMITH_API_KEY">?</span>
            </label>
            <input
              type="password"
              name="LANGSMITH_API_KEY"
              placeholder="ls_..."
              value={langsmithApiKey}
              onChange={(e) => setLangsmithApiKey(e.target.value)}
              onBlur={() => { if (langsmithApiKey) updateConfig('LANGSMITH_API_KEY', langsmithApiKey); }}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              LangSmith Project (LANGCHAIN_PROJECT)
              <span className="help-icon" data-tooltip="LANGCHAIN_PROJECT">?</span>
            </label>
            <input
              type="text"
              name="LANGCHAIN_PROJECT"
              placeholder="agro"
              value={langchainProject}
              onChange={(e) => setLangchainProject(e.target.value)}
              onBlur={() => updateConfig('LANGCHAIN_PROJECT', langchainProject)}
            />
          </div>
        </div>

        {/* LangTrace Settings */}
        <div className="input-row">
          <div className="input-group">
            <label>
              LangTrace API Host (LANGTRACE_API_HOST)
              <span className="help-icon" data-tooltip="LANGTRACE_API_HOST">?</span>
            </label>
            <input
              type="text"
              name="LANGTRACE_API_HOST"
              placeholder="https://app.langtrace.ai/project/.../traces"
              value={langtraceApiHost}
              onChange={(e) => setLangtraceApiHost(e.target.value)}
              onBlur={() => updateConfig('LANGTRACE_API_HOST', langtraceApiHost)}
            />
          </div>
          <div className="input-group">
            <label>
              LangTrace Project ID (LANGTRACE_PROJECT_ID)
              <span className="help-icon" data-tooltip="LANGTRACE_PROJECT_ID">?</span>
            </label>
            <input
              type="text"
              name="LANGTRACE_PROJECT_ID"
              placeholder="cmg..."
              value={langtraceProjectId}
              onChange={(e) => setLangtraceProjectId(e.target.value)}
              onBlur={() => updateConfig('LANGTRACE_PROJECT_ID', langtraceProjectId)}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group full-width">
            <label>
              LangTrace API Key (LANGTRACE_API_KEY)
              <span className="help-icon" data-tooltip="LANGTRACE_API_KEY">?</span>
            </label>
            <input
              type="password"
              name="LANGTRACE_API_KEY"
              placeholder="..."
              value={langtraceApiKey}
              onChange={(e) => setLangtraceApiKey(e.target.value)}
              onBlur={() => { if (langtraceApiKey) updateConfig('LANGTRACE_API_KEY', langtraceApiKey); }}
            />
          </div>
        </div>

        <div id="trace-output" className="result-display" style={{ minHeight: '120px', whiteSpace: 'pre-wrap' }}></div>
      </div>
    </>
  );
}
