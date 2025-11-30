import { useState, useEffect } from 'react';
import { useConfig } from '@/hooks';
import { EmbeddingMismatchWarning } from '@/components/ui/EmbeddingMismatchWarning';

// RetrievalSubtab: Main retrieval and RAG configuration component
// Converted from legacy HTML to proper TypeScript React
export function RetrievalSubtab() {
  const { get, set, loading, error } = useConfig();

  // ============================================================================
  // STATE - First 50% (Generation Models + Retrieval Parameters sections)
  // ============================================================================

  // Generation Models section

  // Retrieval Parameters section

  // ============================================================================
  // STATE - Last 50% (Advanced RAG Tuning + Routing Trace sections)
  // ============================================================================

  // Advanced RAG Tuning section

  // Routing Trace section

  const [availableModels, setAvailableModels] = useState<string[]>([]);
  
  // ============================================================================
  // LOAD CONFIG ON MOUNT
  // ============================================================================

  useEffect(() => {
    loadModels();
  }, []);

  const loadModels = async () => {
    try {
      const response = await fetch('/api/models');
      const data = await response.json();
      const models = data.models.map((m: any) => m.model);
      setAvailableModels(models);
    } catch (error) {
      console.error('Failed to load models from /api/models:', error);
    }
  };

  
  // ============================================================================
  // UPDATE CONFIG HELPERS
  // ============================================================================

  
  if (loading) {
    return <div style={{ padding: '24px' }}>Loading configuration...</div>;
  }

  return (
    <>
      {/* Embedding Mismatch Warning - Critical for retrieval config */}
      <EmbeddingMismatchWarning variant="inline" showActions={true} />

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
        onChange={(e) => set('GEN_TEMPERATURE', parseFloat(e.target.value) || 0.0)}
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
        onChange={(e) => set('GEN_MAX_TOKENS', parseInt(e.target.value, 10) || 2048)}
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
        onChange={(e) => set('GEN_TOP_P', parseFloat(e.target.value) || 1.0)}
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
        onChange={(e) => set('GEN_TIMEOUT', parseInt(e.target.value, 10) || 60)}
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
        onChange={(e) => set('GEN_RETRY_MAX', parseInt(e.target.value, 10) || 2)}
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
        value={get('MAX_QUERY_REWRITES', 2)}
        onChange={(e) => set('MAX_QUERY_REWRITES', parseInt(e.target.value, 10) || 2)}
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
        onChange={(e) => set('FINAL_K', parseInt(e.target.value, 10) || 10)}
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
        onChange={(e) => set('TOPK_DENSE', parseInt(e.target.value, 10) || 75)}
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
        onChange={(e) => set('TOPK_SPARSE', parseInt(e.target.value, 10) || 75)}
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
        onChange={(e) => set('HYDRATION_MAX_CHARS', parseInt(e.target.value, 10) || 2000)}
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
        onChange={(e) => set('VECTOR_WEIGHT', parseFloat(e.target.value) || 0.7)}
        min={0.0}
        max={1.0}
        step={0.1}
      />
    </div>
  </div>

  <div className="input-row">
    <div className="input-group">
      <label>
        BM25 K1 (Term Frequency)
        <span className="help-icon" data-tooltip="BM25_K1">?</span>
      </label>
      <input
        type="number"
        id="BM25_K1"
        name="BM25_K1"
        value={get('BM25_K1', 1.2)}
        onChange={(e) => setBm25K1(parseFloat(e.target.value) || 1.2)}
        min={0.5}
        max={3.0}
        step={0.1}
      />
    </div>

    <div className="input-group">
      <label>
        BM25 B (Length Penalty)
        <span className="help-icon" data-tooltip="BM25_B">?</span>
      </label>
      <input
        type="number"
        id="BM25_B"
        name="BM25_B"
        value={get('BM25_B', 0.4)}
        onChange={(e) => setBm25B(parseFloat(e.target.value) || 0.4)}
        min={0.0}
        max={1.0}
        step={0.05}
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
        onChange={(e) => set('MULTI_QUERY_M', parseInt(e.target.value, 10) || 4)}
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
      {/* SECTION DIVIDER: Advanced RAG Tuning */}
      {/* ========================================================================== */}

      <div className="settings-section" style={{ borderLeft: '3px solid var(--warn)', marginTop: '24px' }}>
        <h3>
          <span className="accent-orange">●</span> Advanced RAG Tuning
          <span className="help-icon" data-tooltip="ADVANCED_RAG_TUNING">?</span>
        </h3>
        <p className="small">Expert-level controls for fusion weighting, score bonuses, and LangGraph iteration behavior. Changes take effect immediately without re-indexing.</p>

        <div className="input-row">
          <div className="input-group">
            <label>
              RRF K Divisor
              <span className="help-icon" data-tooltip="RRF_K_DIV">?</span>
            </label>
            <input
              type="number"
              name="RRF_K_DIV"
              value={get('RRF_K_DIV', 60)}
              onChange={(e) => set('RRF_K_DIV', parseFloat(e.target.value))}
              min={10}
              max={100}
              step={5}
            />
          </div>
          <div className="input-group">
            <label>
              Card Multiplicative Bonus
              <span className="help-icon" data-tooltip="CARD_BONUS">?</span>
            </label>
            <input
              type="number"
              name="CARD_BONUS"
              value={get('CARD_BONUS', 0.08)}
              onChange={(e) => set('CARD_BONUS', parseFloat(e.target.value))}
              min={0}
              max={0.2}
              step={0.01}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Filename Multiplicative Boost (Exact)
              <span className="help-icon" data-tooltip="FILENAME_BOOST_EXACT">?</span>
            </label>
            <input
              type="number"
              name="FILENAME_BOOST_EXACT"
              value={get('FILENAME_BOOST_EXACT', 1.5)}
              onChange={(e) => set('FILENAME_BOOST_EXACT', parseFloat(e.target.value))}
              min={1.0}
              max={3.0}
              step={0.1}
            />
          </div>
          <div className="input-group">
            <label>
              Filename Multiplicative Boost (Partial)
              <span className="help-icon" data-tooltip="FILENAME_BOOST_PARTIAL">?</span>
            </label>
            <input
              type="number"
              name="FILENAME_BOOST_PARTIAL"
              value={get('FILENAME_BOOST_PARTIAL', 1.2)}
              onChange={(e) => set('FILENAME_BOOST_PARTIAL', parseFloat(e.target.value))}
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
              <span className="help-icon" data-tooltip="LANGGRAPH_FINAL_K">?</span>
            </label>
            <input
              type="number"
              name="LANGGRAPH_FINAL_K"
              value={get('LANGGRAPH_FINAL_K', 20)}
              onChange={(e) => set('LANGGRAPH_FINAL_K', parseInt(e.target.value, 10))}
              min={5}
              max={50}
              step={1}
            />
          </div>
          <div className="input-group">
            <label>
              Max Query Rewrites
              <span className="help-icon" data-tooltip="MAX_QUERY_REWRITES">?</span>
            </label>
            <input
              type="number"
              name="MAX_QUERY_REWRITES"
              value={get('MAX_QUERY_REWRITES', 3)}
              onChange={(e) => set('MAX_QUERY_REWRITES', parseInt(e.target.value, 10))}
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
              <span className="help-icon" data-tooltip="CONF_FALLBACK">?</span>
            </label>
            <input
              type="number"
              name="FALLBACK_CONFIDENCE"
              value={get('FALLBACK_CONFIDENCE', 0.55)}
              onChange={(e) => set('FALLBACK_CONFIDENCE', parseFloat(e.target.value))}
              min={0.3}
              max={0.8}
              step={0.05}
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Layer Multiplicative Bonus (GUI)
              <span className="help-icon" data-tooltip="LAYER_BONUS_GUI">?</span>
            </label>
            <input
              type="number"
              id="LAYER_BONUS_GUI"
              name="LAYER_BONUS_GUI"
              value={get('LAYER_BONUS_GUI', 0.15)}
              onChange={(e) => set('LAYER_BONUS_GUI', parseFloat(e.target.value))}
              min={0.0}
              max={0.5}
              step={0.05}
            />
          </div>
          <div className="input-group">
            <label>
              Layer Multiplicative Bonus (Retrieval)
              <span className="help-icon" data-tooltip="LAYER_BONUS_RETRIEVAL">?</span>
            </label>
            <input
              type="number"
              id="LAYER_BONUS_RETRIEVAL"
              name="LAYER_BONUS_RETRIEVAL"
              value={get('LAYER_BONUS_RETRIEVAL', 0.15)}
              onChange={(e) => set('LAYER_BONUS_RETRIEVAL', parseFloat(e.target.value))}
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
              value={get('VENDOR_PENALTY', -0.1)}
              onChange={(e) => set('VENDOR_PENALTY', parseFloat(e.target.value))}
              min={-0.5}
              max={0.0}
              step={0.05}
            />
          </div>
          <div className="input-group">
            <label>
              Freshness Multiplicative Bonus
              <span className="help-icon" data-tooltip="FRESHNESS_BONUS">?</span>
            </label>
            <input
              type="number"
              id="FRESHNESS_BONUS"
              name="FRESHNESS_BONUS"
              value={get('FRESHNESS_BONUS', 0.05)}
              onChange={(e) => set('FRESHNESS_BONUS', parseFloat(e.target.value))}
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
              value={get('TRACING_MODE', 'off')}
              onChange={(e) => set('TRACING_MODE', e.target.value)}
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
              value={get('TRACE_AUTO_LS', '0')}
              onChange={(e) => set('TRACE_AUTO_LS', e.target.value)}
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
              value={get('TRACE_RETENTION', 50)}
              onChange={(e) => set('TRACE_RETENTION', parseInt(e.target.value, 10))}
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
              value={get('LANGCHAIN_TRACING_V2', '0')}
              onChange={(e) => set('LANGCHAIN_TRACING_V2', e.target.value)}
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
              value={get('LANGCHAIN_ENDPOINT', '')}
              onChange={(e) => set('LANGCHAIN_ENDPOINT', e.target.value)}
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
              value={get('LANGCHAIN_API_KEY', '')}
              onChange={(e) => set('LANGCHAIN_API_KEY', e.target.value)}
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
              value={get('LANGSMITH_API_KEY', '')}
              onChange={(e) => set('LANGSMITH_API_KEY', e.target.value)}
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
              value={get('LANGCHAIN_PROJECT', '')}
              onChange={(e) => set('LANGCHAIN_PROJECT', e.target.value)}
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
              value={get('LANGTRACE_API_HOST', '')}
              onChange={(e) => set('LANGTRACE_API_HOST', e.target.value)}
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
              value={get('LANGTRACE_PROJECT_ID', '')}
              onChange={(e) => set('LANGTRACE_PROJECT_ID', e.target.value)}
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
              value={get('LANGTRACE_API_KEY', '')}
              onChange={(e) => set('LANGTRACE_API_KEY', e.target.value)}
            />
          </div>
        </div>

        <div id="trace-output" className="result-display" style={{ minHeight: '120px', whiteSpace: 'pre-wrap' }}></div>
      </div>
    </>
  );
}
