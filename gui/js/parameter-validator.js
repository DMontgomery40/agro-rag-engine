/**
 * Parameter Validation Library for AGRO RAG Engine
 *
 * Provides client-side validation for all 100 RAG parameters before sending to backend.
 * Definitions extracted from server/models/agro_config_model.py (Pydantic schema).
 *
 * Usage:
 *   const result = ParameterValidator.validate('FINAL_K', '10', ParameterValidator.getParamDef('FINAL_K'));
 *   if (result.valid) {
 *     // Use result.value (properly typed)
 *   } else {
 *     // Show result.error to user
 *   }
 */

(function() {
  'use strict';

  /**
   * Parameter type definitions for all 100 RAG parameters.
   * Organized by category matching the Pydantic model structure.
   */
  const PARAM_TYPES = {
    // ========================================
    // RETRIEVAL PARAMETERS (15)
    // ========================================
    RRF_K_DIV: {
      type: 'int',
      min: 1,
      max: 200,
      default: 60,
      category: 'retrieval',
      description: 'RRF rank smoothing constant (higher = more weight to top ranks)'
    },
    LANGGRAPH_FINAL_K: {
      type: 'int',
      min: 1,
      max: 100,
      default: 20,
      category: 'retrieval',
      description: 'Number of final results to return in LangGraph pipeline'
    },
    MAX_QUERY_REWRITES: {
      type: 'int',
      min: 1,
      max: 10,
      default: 2,
      category: 'retrieval',
      description: 'Maximum number of query rewrites for multi-query expansion'
    },
    FALLBACK_CONFIDENCE: {
      type: 'float',
      min: 0.0,
      max: 1.0,
      default: 0.55,
      step: 0.05,
      category: 'retrieval',
      description: 'Confidence threshold for fallback retrieval strategies'
    },
    FINAL_K: {
      type: 'int',
      min: 1,
      max: 100,
      default: 10,
      category: 'retrieval',
      description: 'Default top-k for search results'
    },
    EVAL_FINAL_K: {
      type: 'int',
      min: 1,
      max: 50,
      default: 5,
      category: 'retrieval',
      description: 'Top-k for evaluation runs'
    },
    CONF_TOP1: {
      type: 'float',
      min: 0.0,
      max: 1.0,
      default: 0.62,
      step: 0.01,
      category: 'retrieval',
      description: 'Confidence threshold for top-1'
    },
    CONF_AVG5: {
      type: 'float',
      min: 0.0,
      max: 1.0,
      default: 0.55,
      step: 0.01,
      category: 'retrieval',
      description: 'Confidence threshold for avg top-5'
    },
    CONF_ANY: {
      type: 'float',
      min: 0.0,
      max: 1.0,
      default: 0.55,
      step: 0.01,
      category: 'retrieval',
      description: 'Minimum confidence threshold'
    },
    EVAL_MULTI: {
      type: 'boolean',
      default: 1,
      category: 'retrieval',
      description: 'Enable multi-query in eval'
    },
    QUERY_EXPANSION_ENABLED: {
      type: 'boolean',
      default: 1,
      category: 'retrieval',
      description: 'Enable synonym expansion'
    },
    BM25_WEIGHT: {
      type: 'float',
      min: 0.0,
      max: 1.0,
      default: 0.3,
      step: 0.1,
      category: 'retrieval',
      description: 'Weight for BM25 in hybrid search'
    },
    VECTOR_WEIGHT: {
      type: 'float',
      min: 0.0,
      max: 1.0,
      default: 0.7,
      step: 0.1,
      category: 'retrieval',
      description: 'Weight for vector search'
    },
    CARD_SEARCH_ENABLED: {
      type: 'boolean',
      default: 1,
      category: 'retrieval',
      description: 'Enable card-based retrieval'
    },
    MULTI_QUERY_M: {
      type: 'int',
      min: 1,
      max: 10,
      default: 4,
      category: 'retrieval',
      description: 'Query variants for multi-query'
    },

    // ========================================
    // SCORING PARAMETERS (3)
    // ========================================
    CARD_BONUS: {
      type: 'float',
      min: 0.0,
      max: 1.0,
      default: 0.08,
      step: 0.01,
      category: 'scoring',
      description: 'Bonus score for chunks matched via card-based retrieval'
    },
    FILENAME_BOOST_EXACT: {
      type: 'float',
      min: 1.0,
      max: 5.0,
      default: 1.5,
      step: 0.1,
      category: 'scoring',
      description: 'Score multiplier when filename exactly matches query terms'
    },
    FILENAME_BOOST_PARTIAL: {
      type: 'float',
      min: 1.0,
      max: 3.0,
      default: 1.2,
      step: 0.1,
      category: 'scoring',
      description: 'Score multiplier when path components match query terms'
    },

    // ========================================
    // LAYER BONUS PARAMETERS (5)
    // ========================================
    LAYER_BONUS_GUI: {
      type: 'float',
      min: 0.0,
      max: 0.5,
      default: 0.15,
      step: 0.05,
      category: 'layer_bonus',
      description: 'Bonus for GUI layer'
    },
    LAYER_BONUS_RETRIEVAL: {
      type: 'float',
      min: 0.0,
      max: 0.5,
      default: 0.15,
      step: 0.05,
      category: 'layer_bonus',
      description: 'Bonus for retrieval layer'
    },
    LAYER_BONUS_INDEXER: {
      type: 'float',
      min: 0.0,
      max: 0.5,
      default: 0.15,
      step: 0.05,
      category: 'layer_bonus',
      description: 'Bonus for indexer layer'
    },
    VENDOR_PENALTY: {
      type: 'float',
      min: -0.5,
      max: 0.0,
      default: -0.1,
      step: 0.05,
      category: 'layer_bonus',
      description: 'Penalty for vendor code'
    },
    FRESHNESS_BONUS: {
      type: 'float',
      min: 0.0,
      max: 0.3,
      default: 0.05,
      step: 0.01,
      category: 'layer_bonus',
      description: 'Bonus for recent files'
    },

    // ========================================
    // EMBEDDING PARAMETERS (10)
    // ========================================
    EMBEDDING_TYPE: {
      type: 'enum',
      values: ['openai', 'voyage', 'local', 'mxbai'],
      default: 'openai',
      category: 'embedding',
      description: 'Embedding provider'
    },
    EMBEDDING_MODEL: {
      type: 'string',
      default: 'text-embedding-3-large',
      category: 'embedding',
      description: 'OpenAI embedding model'
    },
    EMBEDDING_DIM: {
      type: 'int',
      min: 512,
      max: 3072,
      default: 3072,
      category: 'embedding',
      description: 'Embedding dimensions'
    },
    VOYAGE_MODEL: {
      type: 'string',
      default: 'voyage-code-3',
      category: 'embedding',
      description: 'Voyage embedding model'
    },
    EMBEDDING_MODEL_LOCAL: {
      type: 'string',
      default: 'all-MiniLM-L6-v2',
      category: 'embedding',
      description: 'Local SentenceTransformer model'
    },
    EMBEDDING_BATCH_SIZE: {
      type: 'int',
      min: 1,
      max: 256,
      default: 64,
      category: 'embedding',
      description: 'Batch size for embedding generation'
    },
    EMBEDDING_MAX_TOKENS: {
      type: 'int',
      min: 512,
      max: 8192,
      default: 8000,
      category: 'embedding',
      description: 'Max tokens per embedding chunk'
    },
    EMBEDDING_CACHE_ENABLED: {
      type: 'boolean',
      default: 1,
      category: 'embedding',
      description: 'Enable embedding cache'
    },
    EMBEDDING_TIMEOUT: {
      type: 'int',
      min: 5,
      max: 120,
      default: 30,
      category: 'embedding',
      description: 'Embedding API timeout (seconds)'
    },
    EMBEDDING_RETRY_MAX: {
      type: 'int',
      min: 1,
      max: 5,
      default: 3,
      category: 'embedding',
      description: 'Max retries for embedding API'
    },

    // ========================================
    // CHUNKING PARAMETERS (8)
    // ========================================
    CHUNK_SIZE: {
      type: 'int',
      min: 200,
      max: 5000,
      default: 1000,
      category: 'chunking',
      description: 'Target chunk size (non-whitespace chars)'
    },
    CHUNK_OVERLAP: {
      type: 'int',
      min: 0,
      max: 1000,
      default: 200,
      category: 'chunking',
      description: 'Overlap between chunks'
    },
    AST_OVERLAP_LINES: {
      type: 'int',
      min: 0,
      max: 100,
      default: 20,
      category: 'chunking',
      description: 'Overlap lines for AST chunking'
    },
    MAX_CHUNK_SIZE: {
      type: 'int',
      min: 10000,
      max: 10000000,
      default: 2000000,
      category: 'chunking',
      description: 'Max file size to chunk (bytes)'
    },
    MIN_CHUNK_CHARS: {
      type: 'int',
      min: 10,
      max: 500,
      default: 50,
      category: 'chunking',
      description: 'Minimum chunk size'
    },
    GREEDY_FALLBACK_TARGET: {
      type: 'int',
      min: 200,
      max: 2000,
      default: 800,
      category: 'chunking',
      description: 'Target size for greedy chunking'
    },
    CHUNKING_STRATEGY: {
      type: 'enum',
      values: ['ast', 'greedy', 'hybrid'],
      default: 'ast',
      category: 'chunking',
      description: 'Chunking strategy'
    },
    PRESERVE_IMPORTS: {
      type: 'boolean',
      default: 1,
      category: 'chunking',
      description: 'Include imports in chunks'
    },

    // ========================================
    // INDEXING PARAMETERS (9)
    // ========================================
    QDRANT_URL: {
      type: 'url',
      default: 'http://127.0.0.1:6333',
      category: 'indexing',
      description: 'Qdrant server URL'
    },
    COLLECTION_NAME: {
      type: 'string',
      default: 'code_chunks_{repo}',
      category: 'indexing',
      description: 'Qdrant collection name template'
    },
    VECTOR_BACKEND: {
      type: 'enum',
      values: ['qdrant', 'chroma', 'weaviate'],
      default: 'qdrant',
      category: 'indexing',
      description: 'Vector database backend'
    },
    INDEXING_BATCH_SIZE: {
      type: 'int',
      min: 10,
      max: 1000,
      default: 100,
      category: 'indexing',
      description: 'Batch size for indexing'
    },
    INDEXING_WORKERS: {
      type: 'int',
      min: 1,
      max: 16,
      default: 4,
      category: 'indexing',
      description: 'Parallel workers for indexing'
    },
    BM25_TOKENIZER: {
      type: 'enum',
      values: ['stemmer', 'lowercase', 'whitespace'],
      default: 'stemmer',
      category: 'indexing',
      description: 'BM25 tokenizer type'
    },
    BM25_STEMMER_LANG: {
      type: 'string',
      default: 'english',
      category: 'indexing',
      description: 'Stemmer language'
    },
    INDEX_EXCLUDED_EXTS: {
      type: 'string',
      default: '.png,.jpg,.gif,.ico,.svg,.woff,.ttf',
      category: 'indexing',
      description: 'Excluded file extensions (comma-separated)'
    },
    INDEX_MAX_FILE_SIZE_MB: {
      type: 'int',
      min: 1,
      max: 100,
      default: 10,
      category: 'indexing',
      description: 'Max file size to index (MB)'
    },

    // ========================================
    // RERANKING PARAMETERS (12)
    // ========================================
    RERANKER_MODEL: {
      type: 'string',
      default: 'cross-encoder/ms-marco-MiniLM-L-12-v2',
      category: 'reranking',
      description: 'Reranker model path'
    },
    AGRO_RERANKER_ENABLED: {
      type: 'boolean',
      default: 1,
      category: 'reranking',
      description: 'Enable reranking'
    },
    AGRO_RERANKER_ALPHA: {
      type: 'float',
      min: 0.0,
      max: 1.0,
      default: 0.7,
      step: 0.1,
      category: 'reranking',
      description: 'Blend weight for reranker scores'
    },
    AGRO_RERANKER_TOPN: {
      type: 'int',
      min: 10,
      max: 200,
      default: 50,
      category: 'reranking',
      description: 'Number of candidates to rerank'
    },
    AGRO_RERANKER_BATCH: {
      type: 'int',
      min: 1,
      max: 128,
      default: 16,
      category: 'reranking',
      description: 'Reranker batch size'
    },
    AGRO_RERANKER_MAXLEN: {
      type: 'int',
      min: 128,
      max: 2048,
      default: 512,
      category: 'reranking',
      description: 'Max token length for reranker'
    },
    AGRO_RERANKER_RELOAD_ON_CHANGE: {
      type: 'boolean',
      default: 0,
      category: 'reranking',
      description: 'Hot-reload on model change'
    },
    AGRO_RERANKER_RELOAD_PERIOD_SEC: {
      type: 'int',
      min: 10,
      max: 600,
      default: 60,
      category: 'reranking',
      description: 'Reload check period (seconds)'
    },
    COHERE_RERANK_MODEL: {
      type: 'string',
      default: 'rerank-3.5',
      category: 'reranking',
      description: 'Cohere reranker model'
    },
    VOYAGE_RERANK_MODEL: {
      type: 'string',
      default: 'rerank-2',
      category: 'reranking',
      description: 'Voyage reranker model'
    },
    RERANKER_BACKEND: {
      type: 'enum',
      values: ['local', 'cohere', 'voyage'],
      default: 'local',
      category: 'reranking',
      description: 'Reranker backend'
    },
    RERANKER_TIMEOUT: {
      type: 'int',
      min: 5,
      max: 60,
      default: 10,
      category: 'reranking',
      description: 'Reranker API timeout (seconds)'
    },

    // ========================================
    // GENERATION PARAMETERS (10)
    // ========================================
    GEN_MODEL: {
      type: 'string',
      default: 'gpt-4o-mini',
      category: 'generation',
      description: 'Primary generation model'
    },
    GEN_TEMPERATURE: {
      type: 'float',
      min: 0.0,
      max: 2.0,
      default: 0.0,
      step: 0.1,
      category: 'generation',
      description: 'Generation temperature'
    },
    GEN_MAX_TOKENS: {
      type: 'int',
      min: 100,
      max: 8192,
      default: 2048,
      category: 'generation',
      description: 'Max tokens for generation'
    },
    GEN_TOP_P: {
      type: 'float',
      min: 0.0,
      max: 1.0,
      default: 1.0,
      step: 0.1,
      category: 'generation',
      description: 'Nucleus sampling threshold'
    },
    GEN_TIMEOUT: {
      type: 'int',
      min: 10,
      max: 300,
      default: 60,
      category: 'generation',
      description: 'Generation timeout (seconds)'
    },
    GEN_RETRY_MAX: {
      type: 'int',
      min: 1,
      max: 5,
      default: 2,
      category: 'generation',
      description: 'Max retries for generation'
    },
    ENRICH_MODEL: {
      type: 'string',
      default: 'gpt-4o-mini',
      category: 'generation',
      description: 'Model for code enrichment'
    },
    ENRICH_BACKEND: {
      type: 'enum',
      values: ['openai', 'ollama', 'mlx'],
      default: 'openai',
      category: 'generation',
      description: 'Enrichment backend'
    },
    ENRICH_DISABLED: {
      type: 'boolean',
      default: 0,
      category: 'generation',
      description: 'Disable code enrichment'
    },
    OLLAMA_NUM_CTX: {
      type: 'int',
      min: 2048,
      max: 32768,
      default: 8192,
      category: 'generation',
      description: 'Context window for Ollama'
    },

    // ========================================
    // ENRICHMENT PARAMETERS (6)
    // ========================================
    CARDS_ENRICH_DEFAULT: {
      type: 'boolean',
      default: 1,
      category: 'enrichment',
      description: 'Enable card enrichment by default'
    },
    CARDS_MAX: {
      type: 'int',
      min: 10,
      max: 1000,
      default: 100,
      category: 'enrichment',
      description: 'Max cards to generate'
    },
    ENRICH_CODE_CHUNKS: {
      type: 'boolean',
      default: 1,
      category: 'enrichment',
      description: 'Enable chunk enrichment'
    },
    ENRICH_MIN_CHARS: {
      type: 'int',
      min: 10,
      max: 500,
      default: 50,
      category: 'enrichment',
      description: 'Min chars for enrichment'
    },
    ENRICH_MAX_CHARS: {
      type: 'int',
      min: 100,
      max: 5000,
      default: 1000,
      category: 'enrichment',
      description: 'Max chars for enrichment prompt'
    },
    ENRICH_TIMEOUT: {
      type: 'int',
      min: 5,
      max: 120,
      default: 30,
      category: 'enrichment',
      description: 'Enrichment timeout (seconds)'
    },

    // ========================================
    // KEYWORDS PARAMETERS (5)
    // ========================================
    KEYWORDS_MAX_PER_REPO: {
      type: 'int',
      min: 10,
      max: 500,
      default: 50,
      category: 'keywords',
      description: 'Max discriminative keywords per repo'
    },
    KEYWORDS_MIN_FREQ: {
      type: 'int',
      min: 1,
      max: 10,
      default: 3,
      category: 'keywords',
      description: 'Min frequency for keyword'
    },
    KEYWORDS_BOOST: {
      type: 'float',
      min: 1.0,
      max: 3.0,
      default: 1.3,
      step: 0.1,
      category: 'keywords',
      description: 'Score boost for keyword matches'
    },
    KEYWORDS_AUTO_GENERATE: {
      type: 'boolean',
      default: 1,
      category: 'keywords',
      description: 'Auto-generate keywords'
    },
    KEYWORDS_REFRESH_HOURS: {
      type: 'int',
      min: 1,
      max: 168,
      default: 24,
      category: 'keywords',
      description: 'Hours between keyword refresh'
    },

    // ========================================
    // TRACING PARAMETERS (7)
    // ========================================
    TRACING_ENABLED: {
      type: 'boolean',
      default: 1,
      category: 'tracing',
      description: 'Enable distributed tracing'
    },
    TRACE_SAMPLING_RATE: {
      type: 'float',
      min: 0.0,
      max: 1.0,
      default: 1.0,
      step: 0.1,
      category: 'tracing',
      description: 'Trace sampling rate (0.0-1.0)'
    },
    PROMETHEUS_PORT: {
      type: 'int',
      min: 1024,
      max: 65535,
      default: 9090,
      category: 'tracing',
      description: 'Prometheus metrics port'
    },
    METRICS_ENABLED: {
      type: 'boolean',
      default: 1,
      category: 'tracing',
      description: 'Enable metrics collection'
    },
    ALERT_INCLUDE_RESOLVED: {
      type: 'boolean',
      default: 1,
      category: 'tracing',
      description: 'Include resolved alerts'
    },
    ALERT_WEBHOOK_TIMEOUT: {
      type: 'int',
      min: 1,
      max: 30,
      default: 5,
      category: 'tracing',
      description: 'Alert webhook timeout (seconds)'
    },
    LOG_LEVEL: {
      type: 'enum',
      values: ['DEBUG', 'INFO', 'WARNING', 'ERROR'],
      default: 'INFO',
      category: 'tracing',
      description: 'Logging level'
    },

    // ========================================
    // TRAINING PARAMETERS (6)
    // ========================================
    RERANKER_TRAIN_EPOCHS: {
      type: 'int',
      min: 1,
      max: 20,
      default: 2,
      category: 'training',
      description: 'Training epochs for reranker'
    },
    RERANKER_TRAIN_BATCH: {
      type: 'int',
      min: 1,
      max: 128,
      default: 16,
      category: 'training',
      description: 'Training batch size'
    },
    RERANKER_TRAIN_LR: {
      type: 'float',
      min: 0.000001,
      max: 0.001,
      default: 0.00002,
      step: 0.000001,
      category: 'training',
      description: 'Learning rate'
    },
    RERANKER_WARMUP_RATIO: {
      type: 'float',
      min: 0.0,
      max: 0.5,
      default: 0.1,
      step: 0.05,
      category: 'training',
      description: 'Warmup steps ratio'
    },
    TRIPLETS_MIN_COUNT: {
      type: 'int',
      min: 10,
      max: 10000,
      default: 100,
      category: 'training',
      description: 'Min triplets for training'
    },
    TRIPLETS_MINE_MODE: {
      type: 'enum',
      values: ['replace', 'append'],
      default: 'replace',
      category: 'training',
      description: 'Triplet mining mode'
    },

    // ========================================
    // UI PARAMETERS (4)
    // ========================================
    CHAT_STREAMING_ENABLED: {
      type: 'boolean',
      default: 1,
      category: 'ui',
      description: 'Enable streaming responses'
    },
    CHAT_HISTORY_MAX: {
      type: 'int',
      min: 10,
      max: 500,
      default: 50,
      category: 'ui',
      description: 'Max chat history messages'
    },
    EDITOR_PORT: {
      type: 'int',
      min: 1024,
      max: 65535,
      default: 4440,
      category: 'ui',
      description: 'Embedded editor port'
    },
    GRAFANA_DASHBOARD_UID: {
      type: 'string',
      default: 'agro-overview',
      category: 'ui',
      description: 'Default Grafana dashboard UID'
    }
  };

  /**
   * Validate a parameter value against its definition.
   *
   * @param {string} name - Parameter name (e.g., 'FINAL_K')
   * @param {*} value - Value to validate
   * @param {Object} paramDef - Parameter definition from PARAM_TYPES
   * @returns {Object} - { valid: boolean, value?: any, error?: string }
   */
  function validateParameter(name, value, paramDef) {
    if (!paramDef) {
      return { valid: false, error: `Unknown parameter: ${name}` };
    }

    switch (paramDef.type) {
      case 'int':
        return validateInt(value, paramDef);
      case 'float':
        return validateFloat(value, paramDef);
      case 'boolean':
        return validateBoolean(value);
      case 'enum':
        return validateEnum(value, paramDef);
      case 'string':
        return validateString(value, paramDef);
      case 'url':
        return validateURL(value);
      default:
        return { valid: false, error: `Unknown type: ${paramDef.type}` };
    }
  }

  /**
   * Validate integer value.
   */
  function validateInt(value, def) {
    const num = parseInt(value, 10);
    if (isNaN(num)) {
      return { valid: false, error: 'Must be an integer' };
    }
    if (def.min !== undefined && num < def.min) {
      return { valid: false, error: `Must be at least ${def.min}` };
    }
    if (def.max !== undefined && num > def.max) {
      return { valid: false, error: `Must be at most ${def.max}` };
    }
    return { valid: true, value: num };
  }

  /**
   * Validate float value.
   */
  function validateFloat(value, def) {
    const num = parseFloat(value);
    if (isNaN(num)) {
      return { valid: false, error: 'Must be a number' };
    }
    if (def.min !== undefined && num < def.min) {
      return { valid: false, error: `Must be at least ${def.min}` };
    }
    if (def.max !== undefined && num > def.max) {
      return { valid: false, error: `Must be at most ${def.max}` };
    }
    return { valid: true, value: num };
  }

  /**
   * Validate boolean value.
   * Backend expects 1/0, not true/false.
   */
  function validateBoolean(value) {
    if (typeof value === 'boolean') {
      return { valid: true, value: value ? 1 : 0 };
    }
    if (value === '1' || value === 1 || value === 'true' || value === true) {
      return { valid: true, value: 1 };
    }
    if (value === '0' || value === 0 || value === 'false' || value === false || value === '') {
      return { valid: true, value: 0 };
    }
    return { valid: false, error: 'Must be true or false' };
  }

  /**
   * Validate enum value.
   */
  function validateEnum(value, def) {
    if (def.values.includes(value)) {
      return { valid: true, value: value };
    }
    return { valid: false, error: `Must be one of: ${def.values.join(', ')}` };
  }

  /**
   * Validate string value.
   */
  function validateString(value, def) {
    const str = String(value).trim();
    if (def.pattern && !def.pattern.test(str)) {
      return { valid: false, error: 'Invalid format' };
    }
    return { valid: true, value: str };
  }

  /**
   * Validate URL value.
   */
  function validateURL(value) {
    try {
      new URL(value);
      return { valid: true, value: value };
    } catch (e) {
      return { valid: false, error: 'Invalid URL format' };
    }
  }

  /**
   * Convert form value to proper type for backend.
   *
   * @param {*} value - Raw value from form
   * @param {string} type - Type from parameter definition
   * @returns {*} - Converted value
   */
  function convertType(value, type) {
    switch (type) {
      case 'int':
        return parseInt(value, 10);
      case 'float':
        return parseFloat(value);
      case 'boolean':
        return value === '1' || value === 1 || value === 'true' || value === true ? 1 : 0;
      default:
        return String(value).trim();
    }
  }

  /**
   * Get parameter definition by name.
   *
   * @param {string} name - Parameter name
   * @returns {Object|undefined} - Parameter definition or undefined
   */
  function getParamDef(name) {
    return PARAM_TYPES[name];
  }

  /**
   * Get all parameters for a specific category.
   *
   * @param {string} category - Category name
   * @returns {Object} - Dictionary of parameters in that category
   */
  function getParamsByCategory(category) {
    const result = {};
    Object.keys(PARAM_TYPES).forEach(key => {
      if (PARAM_TYPES[key].category === category) {
        result[key] = PARAM_TYPES[key];
      }
    });
    return result;
  }

  /**
   * Get list of all parameter names.
   *
   * @returns {string[]} - Array of parameter names
   */
  function getAllParamNames() {
    return Object.keys(PARAM_TYPES);
  }

  /**
   * Count total parameters.
   *
   * @returns {number} - Total count
   */
  function getParamCount() {
    return Object.keys(PARAM_TYPES).length;
  }

  // Export to window for use by other scripts
  window.ParameterValidator = {
    validate: validateParameter,
    convertType: convertType,
    getParamDef: getParamDef,
    getParamsByCategory: getParamsByCategory,
    getAllParamNames: getAllParamNames,
    getParamCount: getParamCount,
    PARAM_TYPES: PARAM_TYPES
  };

  // Log initialization
  console.log(`ParameterValidator loaded: ${getParamCount()} parameters defined`);
})();
