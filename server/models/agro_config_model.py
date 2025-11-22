"""Pydantic models for agro_config.json validation and type safety.

This module defines the schema for tunable RAG parameters stored in agro_config.json.
Using Pydantic provides:
- Type validation at load time
- Range validation (e.g., rrf_k_div must be 1-200)
- Clear error messages for invalid configs
- Default values that match current hardcoded values
- JSON schema generation for documentation
"""

from pydantic import BaseModel, Field, field_validator, model_validator


class RetrievalConfig(BaseModel):
    """Configuration for retrieval and search parameters."""

    rrf_k_div: int = Field(
        default=60,
        ge=1,
        le=200,
        description="RRF rank smoothing constant (higher = more weight to top ranks)"
    )

    langgraph_final_k: int = Field(
        default=20,
        ge=1,
        le=100,
        description="Number of final results to return in LangGraph pipeline"
    )

    max_query_rewrites: int = Field(
        default=2,
        ge=1,
        le=10,
        description="Maximum number of query rewrites for multi-query expansion"
    )

    fallback_confidence: float = Field(
        default=0.55,
        ge=0.0,
        le=1.0,
        description="Confidence threshold for fallback retrieval strategies"
    )

    final_k: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Default top-k for search results"
    )

    eval_final_k: int = Field(
        default=5,
        ge=1,
        le=50,
        description="Top-k for evaluation runs"
    )

    conf_top1: float = Field(
        default=0.62,
        ge=0.0,
        le=1.0,
        description="Confidence threshold for top-1"
    )

    conf_avg5: float = Field(
        default=0.55,
        ge=0.0,
        le=1.0,
        description="Confidence threshold for avg top-5"
    )

    conf_any: float = Field(
        default=0.55,
        ge=0.0,
        le=1.0,
        description="Minimum confidence threshold"
    )

    eval_multi: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable multi-query in eval"
    )

    query_expansion_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable synonym expansion"
    )

    bm25_weight: float = Field(
        default=0.3,
        ge=0.0,
        le=1.0,
        description="Weight for BM25 in hybrid search"
    )

    vector_weight: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Weight for vector search"
    )

    card_search_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable card-based retrieval"
    )

    multi_query_m: int = Field(
        default=4,
        ge=1,
        le=10,
        description="Query variants for multi-query"
    )

    use_semantic_synonyms: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable semantic synonym expansion"
    )

    topk_dense: int = Field(
        default=75,
        ge=10,
        le=200,
        description="Top-K for dense vector search"
    )

    topk_sparse: int = Field(
        default=75,
        ge=10,
        le=200,
        description="Top-K for sparse BM25 search"
    )

    hydration_mode: str = Field(
        default="lazy",
        pattern="^(lazy|eager|off)$",
        description="Result hydration mode"
    )

    hydration_max_chars: int = Field(
        default=2000,
        ge=500,
        le=10000,
        description="Max characters for result hydration"
    )

    disable_rerank: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Disable reranking completely"
    )

    @field_validator('rrf_k_div')
    @classmethod
    def validate_rrf_k_div(cls, v):
        """Ensure RRF k_div is reasonable."""
        if v < 10:
            raise ValueError('rrf_k_div should be at least 10 for meaningful rank smoothing')
        return v

    @model_validator(mode='after')
    def validate_weights_sum_to_one(self):
        """Ensure BM25 and vector weights sum to 1.0."""
        total = self.bm25_weight + self.vector_weight
        if not (0.99 <= total <= 1.01):
            raise ValueError('bm25_weight + vector_weight must sum to 1.0')
        return self


class ScoringConfig(BaseModel):
    """Configuration for result scoring and boosting."""

    card_bonus: float = Field(
        default=0.08,
        ge=0.0,
        le=1.0,
        description="Bonus score for chunks matched via card-based retrieval"
    )

    filename_boost_exact: float = Field(
        default=1.5,
        ge=1.0,
        le=5.0,
        description="Score multiplier when filename exactly matches query terms"
    )

    filename_boost_partial: float = Field(
        default=1.2,
        ge=1.0,
        le=3.0,
        description="Score multiplier when path components match query terms"
    )

    vendor_mode: str = Field(
        default="prefer_first_party",
        pattern="^(prefer_first_party|prefer_vendor|neutral)$",
        description="Vendor code preference"
    )

    path_boosts: str = Field(
        default="/gui,/server,/indexer,/retrieval",
        description="Comma-separated path prefixes to boost"
    )

    @model_validator(mode='after')
    def validate_exact_boost_greater_than_partial(self):
        """Ensure exact boost is greater than partial boost."""
        if self.filename_boost_exact <= self.filename_boost_partial:
            raise ValueError('filename_boost_exact should be greater than filename_boost_partial')
        return self


class LayerBonusConfig(BaseModel):
    """Layer-specific scoring bonuses."""

    gui: float = Field(
        default=0.15,
        ge=0.0,
        le=0.5,
        description="Bonus for GUI layer"
    )

    retrieval: float = Field(
        default=0.15,
        ge=0.0,
        le=0.5,
        description="Bonus for retrieval layer"
    )

    indexer: float = Field(
        default=0.15,
        ge=0.0,
        le=0.5,
        description="Bonus for indexer layer"
    )

    vendor_penalty: float = Field(
        default=-0.1,
        ge=-0.5,
        le=0.0,
        description="Penalty for vendor code"
    )

    freshness_bonus: float = Field(
        default=0.05,
        ge=0.0,
        le=0.3,
        description="Bonus for recent files"
    )


class EmbeddingConfig(BaseModel):
    """Embedding generation and caching configuration."""

    embedding_type: str = Field(
        default="openai",
        pattern="^(openai|voyage|local|mxbai)$",
        description="Embedding provider"
    )
    embedding_model: str = Field(
        default="text-embedding-3-large",
        description="OpenAI embedding model"
    )
    embedding_dim: int = Field(
        default=3072,
        ge=512,
        le=3072,
        description="Embedding dimensions"
    )
    voyage_model: str = Field(
        default="voyage-code-3",
        description="Voyage embedding model"
    )
    embedding_model_local: str = Field(
        default="all-MiniLM-L6-v2",
        description="Local SentenceTransformer model"
    )
    embedding_batch_size: int = Field(
        default=64,
        ge=1,
        le=256,
        description="Batch size for embedding generation"
    )
    embedding_max_tokens: int = Field(
        default=8000,
        ge=512,
        le=8192,
        description="Max tokens per embedding chunk"
    )
    embedding_cache_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable embedding cache"
    )
    embedding_timeout: int = Field(
        default=30,
        ge=5,
        le=120,
        description="Embedding API timeout (seconds)"
    )
    embedding_retry_max: int = Field(
        default=3,
        ge=1,
        le=5,
        description="Max retries for embedding API"
    )

    @field_validator('embedding_dim')
    @classmethod
    def validate_dim_matches_model(cls, v):
        """Ensure dimensions match typical model output."""
        if v not in [128, 256, 384, 512, 768, 1024, 1536, 3072]:
            raise ValueError(f'Uncommon embedding dimension: {v}. Expected one of [128, 256, 384, 512, 768, 1024, 1536, 3072]')
        return v


class ChunkingConfig(BaseModel):
    """Code chunking configuration."""

    chunk_size: int = Field(
        default=1000,
        ge=200,
        le=5000,
        description="Target chunk size (non-whitespace chars)"
    )
    chunk_overlap: int = Field(
        default=200,
        ge=0,
        le=1000,
        description="Overlap between chunks"
    )
    ast_overlap_lines: int = Field(
        default=20,
        ge=0,
        le=100,
        description="Overlap lines for AST chunking"
    )
    max_chunk_size: int = Field(
        default=2000000,
        ge=10000,
        le=10000000,
        description="Max file size to chunk (bytes)"
    )
    min_chunk_chars: int = Field(
        default=50,
        ge=10,
        le=500,
        description="Minimum chunk size"
    )
    greedy_fallback_target: int = Field(
        default=800,
        ge=200,
        le=2000,
        description="Target size for greedy chunking"
    )
    chunking_strategy: str = Field(
        default="ast",
        pattern="^(ast|greedy|hybrid)$",
        description="Chunking strategy"
    )
    preserve_imports: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Include imports in chunks"
    )

    @model_validator(mode='after')
    def validate_overlap_less_than_size(self):
        if self.chunk_overlap >= self.chunk_size:
            raise ValueError('chunk_overlap must be less than chunk_size')
        return self


class IndexingConfig(BaseModel):
    """Indexing and vector storage configuration."""

    qdrant_url: str = Field(
        default="http://127.0.0.1:6333",
        description="Qdrant server URL"
    )
    collection_name: str = Field(
        default="code_chunks_{repo}",
        description="Qdrant collection name template"
    )
    vector_backend: str = Field(
        default="qdrant",
        pattern="^(qdrant|chroma|weaviate)$",
        description="Vector database backend"
    )
    indexing_batch_size: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Batch size for indexing"
    )
    indexing_workers: int = Field(
        default=4,
        ge=1,
        le=16,
        description="Parallel workers for indexing"
    )
    bm25_tokenizer: str = Field(
        default="stemmer",
        pattern="^(stemmer|lowercase|whitespace)$",
        description="BM25 tokenizer type"
    )
    bm25_stemmer_lang: str = Field(
        default="english",
        description="Stemmer language"
    )
    index_excluded_exts: str = Field(
        default=".png,.jpg,.gif,.ico,.svg,.woff,.ttf",
        description="Excluded file extensions (comma-separated)"
    )
    index_max_file_size_mb: int = Field(
        default=10,
        ge=1,
        le=100,
        description="Max file size to index (MB)"
    )
    skip_dense: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Skip dense vector indexing"
    )
    out_dir_base: str = Field(
        default="./out",
        description="Base output directory"
    )
    repos_file: str = Field(
        default="./repos.json",
        description="Repository configuration file"
    )


class RerankingConfig(BaseModel):
    """Reranking configuration for result refinement."""

    reranker_model: str = Field(
        default="cross-encoder/ms-marco-MiniLM-L-12-v2",
        description="Reranker model path"
    )

    agro_reranker_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable reranking"
    )

    agro_reranker_alpha: float = Field(
        default=0.7,
        ge=0.0,
        le=1.0,
        description="Blend weight for reranker scores"
    )

    agro_reranker_topn: int = Field(
        default=50,
        ge=10,
        le=200,
        description="Number of candidates to rerank"
    )

    agro_reranker_batch: int = Field(
        default=16,
        ge=1,
        le=128,
        description="Reranker batch size"
    )

    agro_reranker_maxlen: int = Field(
        default=512,
        ge=128,
        le=2048,
        description="Max token length for reranker"
    )

    agro_reranker_reload_on_change: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Hot-reload on model change"
    )

    agro_reranker_reload_period_sec: int = Field(
        default=60,
        ge=10,
        le=600,
        description="Reload check period (seconds)"
    )

    cohere_rerank_model: str = Field(
        default="rerank-3.5",
        description="Cohere reranker model"
    )

    voyage_rerank_model: str = Field(
        default="rerank-2",
        description="Voyage reranker model"
    )

    reranker_backend: str = Field(
        default="local",
        pattern="^(local|cohere|voyage)$",
        description="Reranker backend"
    )

    reranker_timeout: int = Field(
        default=10,
        ge=5,
        le=60,
        description="Reranker API timeout (seconds)"
    )

    rerank_input_snippet_chars: int = Field(
        default=700,
        ge=200,
        le=2000,
        description="Snippet chars for reranking input"
    )


class GenerationConfig(BaseModel):
    """LLM generation configuration."""

    gen_model: str = Field(
        default="gpt-4o-mini",
        description="Primary generation model"
    )

    gen_temperature: float = Field(
        default=0.0,
        ge=0.0,
        le=2.0,
        description="Generation temperature"
    )

    gen_max_tokens: int = Field(
        default=2048,
        ge=100,
        le=8192,
        description="Max tokens for generation"
    )

    gen_top_p: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Nucleus sampling threshold"
    )

    gen_timeout: int = Field(
        default=60,
        ge=10,
        le=300,
        description="Generation timeout (seconds)"
    )

    gen_retry_max: int = Field(
        default=2,
        ge=1,
        le=5,
        description="Max retries for generation"
    )

    enrich_model: str = Field(
        default="gpt-4o-mini",
        description="Model for code enrichment"
    )

    enrich_backend: str = Field(
        default="openai",
        pattern="^(openai|ollama|mlx)$",
        description="Enrichment backend"
    )

    enrich_disabled: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Disable code enrichment"
    )

    ollama_num_ctx: int = Field(
        default=8192,
        ge=2048,
        le=32768,
        description="Context window for Ollama"
    )

    gen_model_cli: str = Field(
        default="qwen3-coder:14b",
        description="CLI generation model"
    )

    gen_model_ollama: str = Field(
        default="qwen3-coder:30b",
        description="Ollama generation model"
    )


class EnrichmentConfig(BaseModel):
    """Code enrichment and card generation configuration."""

    cards_enrich_default: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable card enrichment by default"
    )

    cards_max: int = Field(
        default=100,
        ge=10,
        le=1000,
        description="Max cards to generate"
    )

    enrich_code_chunks: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable chunk enrichment"
    )

    enrich_min_chars: int = Field(
        default=50,
        ge=10,
        le=500,
        description="Min chars for enrichment"
    )

    enrich_max_chars: int = Field(
        default=1000,
        ge=100,
        le=5000,
        description="Max chars for enrichment prompt"
    )

    enrich_timeout: int = Field(
        default=30,
        ge=5,
        le=120,
        description="Enrichment timeout (seconds)"
    )


class KeywordsConfig(BaseModel):
    """Discriminative keywords configuration."""

    keywords_max_per_repo: int = Field(
        default=50,
        ge=10,
        le=500,
        description="Max discriminative keywords per repo"
    )

    keywords_min_freq: int = Field(
        default=3,
        ge=1,
        le=10,
        description="Min frequency for keyword"
    )

    keywords_boost: float = Field(
        default=1.3,
        ge=1.0,
        le=3.0,
        description="Score boost for keyword matches"
    )

    keywords_auto_generate: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Auto-generate keywords"
    )

    keywords_refresh_hours: int = Field(
        default=24,
        ge=1,
        le=168,
        description="Hours between keyword refresh"
    )


class TracingConfig(BaseModel):
    """Observability and tracing configuration."""

    tracing_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable distributed tracing"
    )

    trace_sampling_rate: float = Field(
        default=1.0,
        ge=0.0,
        le=1.0,
        description="Trace sampling rate (0.0-1.0)"
    )

    prometheus_port: int = Field(
        default=9090,
        ge=1024,
        le=65535,
        description="Prometheus metrics port"
    )

    metrics_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable metrics collection"
    )

    alert_include_resolved: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Include resolved alerts"
    )

    alert_webhook_timeout: int = Field(
        default=5,
        ge=1,
        le=30,
        description="Alert webhook timeout (seconds)"
    )

    log_level: str = Field(
        default="INFO",
        pattern="^(DEBUG|INFO|WARNING|ERROR)$",
        description="Logging level"
    )

    tracing_mode: str = Field(
        default="langsmith",
        pattern="^(langsmith|local|none)$",
        description="Tracing backend mode"
    )

    trace_auto_ls: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Auto-enable LangSmith tracing"
    )

    trace_retention: int = Field(
        default=50,
        ge=10,
        le=500,
        description="Number of traces to retain"
    )

    agro_log_path: str = Field(
        default="data/logs/queries.jsonl",
        description="Query log file path"
    )

    alert_notify_severities: str = Field(
        default="critical,warning",
        description="Alert severities to notify"
    )


class TrainingConfig(BaseModel):
    """Reranker training configuration."""

    reranker_train_epochs: int = Field(
        default=2,
        ge=1,
        le=20,
        description="Training epochs for reranker"
    )

    reranker_train_batch: int = Field(
        default=16,
        ge=1,
        le=128,
        description="Training batch size"
    )

    reranker_train_lr: float = Field(
        default=2e-5,
        ge=1e-6,
        le=1e-3,
        description="Learning rate"
    )

    reranker_warmup_ratio: float = Field(
        default=0.1,
        ge=0.0,
        le=0.5,
        description="Warmup steps ratio"
    )

    triplets_min_count: int = Field(
        default=100,
        ge=10,
        le=10000,
        description="Min triplets for training"
    )

    triplets_mine_mode: str = Field(
        default="replace",
        pattern="^(replace|append)$",
        description="Triplet mining mode"
    )

    agro_reranker_model_path: str = Field(
        default="models/cross-encoder-agro",
        description="Reranker model path"
    )

    agro_reranker_mine_mode: str = Field(
        default="replace",
        pattern="^(replace|append)$",
        description="Triplet mining mode"
    )

    agro_reranker_mine_reset: int = Field(
        default=0,
        ge=0,
        le=1,
        description="Reset triplets file before mining"
    )

    agro_triplets_path: str = Field(
        default="data/training/triplets.jsonl",
        description="Training triplets file path"
    )


class UIConfig(BaseModel):
    """User interface configuration."""

    chat_streaming_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable streaming responses"
    )

    chat_history_max: int = Field(
        default=50,
        ge=10,
        le=500,
        description="Max chat history messages"
    )

    editor_port: int = Field(
        default=4440,
        ge=1024,
        le=65535,
        description="Embedded editor port"
    )

    grafana_dashboard_uid: str = Field(
        default="agro-overview",
        description="Default Grafana dashboard UID"
    )

    grafana_dashboard_slug: str = Field(
        default="agro-overview",
        description="Grafana dashboard slug"
    )

    grafana_base_url: str = Field(
        default="http://127.0.0.1:3000",
        description="Grafana base URL"
    )

    grafana_auth_mode: str = Field(
        default="anonymous",
        description="Grafana authentication mode"
    )

    grafana_embed_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable Grafana embedding"
    )

    grafana_kiosk: str = Field(
        default="tv",
        description="Grafana kiosk mode"
    )

    grafana_org_id: int = Field(
        default=1,
        description="Grafana organization ID"
    )

    grafana_refresh: str = Field(
        default="10s",
        description="Grafana refresh interval"
    )

    editor_bind: str = Field(
        default="local",
        description="Editor bind mode"
    )

    editor_embed_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable editor embedding"
    )

    editor_enabled: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Enable embedded editor"
    )

    editor_image: str = Field(
        default="agro-vscode:latest",
        description="Editor Docker image"
    )

    theme_mode: str = Field(
        default="dark",
        pattern="^(light|dark|auto)$",
        description="UI theme mode"
    )

    open_browser: int = Field(
        default=1,
        ge=0,
        le=1,
        description="Auto-open browser on start"
    )


class HydrationConfig(BaseModel):
    """Context hydration configuration."""
    
    hydration_mode: str = Field(
        default="lazy",
        pattern="^(lazy|eager|none)$",
        description="Context hydration mode"
    )
    
    hydration_max_chars: int = Field(
        default=2000,
        ge=500,
        le=10000,
        description="Max characters to hydrate"
    )


class EvaluationConfig(BaseModel):
    """Evaluation dataset configuration."""
    
    golden_path: str = Field(
        default="data/evaluation_dataset.json",
        description="Golden evaluation dataset path"
    )
    
    baseline_path: str = Field(
        default="data/evals/eval_baseline.json",
        description="Baseline results path"
    )
    
    eval_multi_m: int = Field(
        default=10,
        ge=1,
        le=20,
        description="Multi-query variants for evaluation"
    )


class AgroConfigRoot(BaseModel):
    """Root configuration model for agro_config.json.

    This is the top-level model that contains all configuration categories.
    The nested structure provides logical grouping and better organization.
    """

    retrieval: RetrievalConfig = Field(default_factory=RetrievalConfig)
    scoring: ScoringConfig = Field(default_factory=ScoringConfig)
    layer_bonus: LayerBonusConfig = Field(default_factory=LayerBonusConfig)
    embedding: EmbeddingConfig = Field(default_factory=EmbeddingConfig)
    chunking: ChunkingConfig = Field(default_factory=ChunkingConfig)
    indexing: IndexingConfig = Field(default_factory=IndexingConfig)
    reranking: RerankingConfig = Field(default_factory=RerankingConfig)
    generation: GenerationConfig = Field(default_factory=GenerationConfig)
    enrichment: EnrichmentConfig = Field(default_factory=EnrichmentConfig)
    keywords: KeywordsConfig = Field(default_factory=KeywordsConfig)
    tracing: TracingConfig = Field(default_factory=TracingConfig)
    training: TrainingConfig = Field(default_factory=TrainingConfig)
    ui: UIConfig = Field(default_factory=UIConfig)
    hydration: HydrationConfig = Field(default_factory=HydrationConfig)
    evaluation: EvaluationConfig = Field(default_factory=EvaluationConfig)

    class Config:
        # Allow extra fields for forward compatibility
        extra = 'allow'
        # Use nested JSON structure
        json_schema_extra = {
            "description": "AGRO RAG Engine tunable configuration parameters",
            "title": "AGRO Config"
        }

    def to_flat_dict(self) -> dict[str, any]:
        """Convert nested config to flat dict with env-style keys.

        This provides backward compatibility with existing code that expects
        flat environment variable names like 'RRF_K_DIV' instead of nested
        access like config.retrieval.rrf_k_div.

        Returns:
            Flat dictionary mapping env-style keys to values:
            {
                'RRF_K_DIV': 60,
                'CARD_BONUS': 0.08,
                ...
            }
        """
        return {
            # Retrieval params (existing + new)
            'RRF_K_DIV': self.retrieval.rrf_k_div,
            'LANGGRAPH_FINAL_K': self.retrieval.langgraph_final_k,
            'MAX_QUERY_REWRITES': self.retrieval.max_query_rewrites,
            'FALLBACK_CONFIDENCE': self.retrieval.fallback_confidence,
            'FINAL_K': self.retrieval.final_k,
            'EVAL_FINAL_K': self.retrieval.eval_final_k,
            'CONF_TOP1': self.retrieval.conf_top1,
            'CONF_AVG5': self.retrieval.conf_avg5,
            'CONF_ANY': self.retrieval.conf_any,
            'EVAL_MULTI': self.retrieval.eval_multi,
            'QUERY_EXPANSION_ENABLED': self.retrieval.query_expansion_enabled,
            'BM25_WEIGHT': self.retrieval.bm25_weight,
            'VECTOR_WEIGHT': self.retrieval.vector_weight,
            'CARD_SEARCH_ENABLED': self.retrieval.card_search_enabled,
            'MULTI_QUERY_M': self.retrieval.multi_query_m,
            'USE_SEMANTIC_SYNONYMS': self.retrieval.use_semantic_synonyms,
            'TOPK_DENSE': self.retrieval.topk_dense,
            'TOPK_SPARSE': self.retrieval.topk_sparse,
            'DISABLE_RERANK': self.retrieval.disable_rerank,
            # Scoring params
            'CARD_BONUS': self.scoring.card_bonus,
            'FILENAME_BOOST_EXACT': self.scoring.filename_boost_exact,
            'FILENAME_BOOST_PARTIAL': self.scoring.filename_boost_partial,
            'VENDOR_MODE': self.scoring.vendor_mode,
            'PATH_BOOSTS': self.scoring.path_boosts,
            # Layer bonus params
            'LAYER_BONUS_GUI': self.layer_bonus.gui,
            'LAYER_BONUS_RETRIEVAL': self.layer_bonus.retrieval,
            'LAYER_BONUS_INDEXER': self.layer_bonus.indexer,
            'VENDOR_PENALTY': self.layer_bonus.vendor_penalty,
            'FRESHNESS_BONUS': self.layer_bonus.freshness_bonus,
            # Embedding params (10 new)
            'EMBEDDING_TYPE': self.embedding.embedding_type,
            'EMBEDDING_MODEL': self.embedding.embedding_model,
            'EMBEDDING_DIM': self.embedding.embedding_dim,
            'VOYAGE_MODEL': self.embedding.voyage_model,
            'EMBEDDING_MODEL_LOCAL': self.embedding.embedding_model_local,
            'EMBEDDING_BATCH_SIZE': self.embedding.embedding_batch_size,
            'EMBEDDING_MAX_TOKENS': self.embedding.embedding_max_tokens,
            'EMBEDDING_CACHE_ENABLED': self.embedding.embedding_cache_enabled,
            'EMBEDDING_TIMEOUT': self.embedding.embedding_timeout,
            'EMBEDDING_RETRY_MAX': self.embedding.embedding_retry_max,
            # Chunking params (8 new)
            'CHUNK_SIZE': self.chunking.chunk_size,
            'CHUNK_OVERLAP': self.chunking.chunk_overlap,
            'AST_OVERLAP_LINES': self.chunking.ast_overlap_lines,
            'MAX_CHUNK_SIZE': self.chunking.max_chunk_size,
            'MIN_CHUNK_CHARS': self.chunking.min_chunk_chars,
            'GREEDY_FALLBACK_TARGET': self.chunking.greedy_fallback_target,
            'CHUNKING_STRATEGY': self.chunking.chunking_strategy,
            'PRESERVE_IMPORTS': self.chunking.preserve_imports,
            # Indexing params (9 new)
            'QDRANT_URL': self.indexing.qdrant_url,
            'COLLECTION_NAME': self.indexing.collection_name,
            'VECTOR_BACKEND': self.indexing.vector_backend,
            'INDEXING_BATCH_SIZE': self.indexing.indexing_batch_size,
            'INDEXING_WORKERS': self.indexing.indexing_workers,
            'BM25_TOKENIZER': self.indexing.bm25_tokenizer,
            'BM25_STEMMER_LANG': self.indexing.bm25_stemmer_lang,
            'INDEX_EXCLUDED_EXTS': self.indexing.index_excluded_exts,
            'INDEX_MAX_FILE_SIZE_MB': self.indexing.index_max_file_size_mb,
            'SKIP_DENSE': self.indexing.skip_dense,
            'OUT_DIR_BASE': self.indexing.out_dir_base,
            'REPOS_FILE': self.indexing.repos_file,
    # Reranking params (13)
            'RERANKER_MODEL': self.reranking.reranker_model,
            'AGRO_RERANKER_ENABLED': self.reranking.agro_reranker_enabled,
            'AGRO_RERANKER_ALPHA': self.reranking.agro_reranker_alpha,
            'AGRO_RERANKER_TOPN': self.reranking.agro_reranker_topn,
            'AGRO_RERANKER_BATCH': self.reranking.agro_reranker_batch,
            'AGRO_RERANKER_MAXLEN': self.reranking.agro_reranker_maxlen,
            'AGRO_RERANKER_RELOAD_ON_CHANGE': self.reranking.agro_reranker_reload_on_change,
            'AGRO_RERANKER_RELOAD_PERIOD_SEC': self.reranking.agro_reranker_reload_period_sec,
            'COHERE_RERANK_MODEL': self.reranking.cohere_rerank_model,
            'VOYAGE_RERANK_MODEL': self.reranking.voyage_rerank_model,
            'RERANKER_BACKEND': self.reranking.reranker_backend,
            'RERANKER_TIMEOUT': self.reranking.reranker_timeout,
            'RERANK_INPUT_SNIPPET_CHARS': self.reranking.rerank_input_snippet_chars,
    # Generation params (12)
            'GEN_MODEL': self.generation.gen_model,
            'GEN_TEMPERATURE': self.generation.gen_temperature,
            'GEN_MAX_TOKENS': self.generation.gen_max_tokens,
            'GEN_TOP_P': self.generation.gen_top_p,
            'GEN_TIMEOUT': self.generation.gen_timeout,
            'GEN_RETRY_MAX': self.generation.gen_retry_max,
            'ENRICH_MODEL': self.generation.enrich_model,
            'ENRICH_BACKEND': self.generation.enrich_backend,
            'ENRICH_DISABLED': self.generation.enrich_disabled,
            'OLLAMA_NUM_CTX': self.generation.ollama_num_ctx,
            'GEN_MODEL_CLI': self.generation.gen_model_cli,
            'GEN_MODEL_OLLAMA': self.generation.gen_model_ollama,
            # Enrichment params (6)
            'CARDS_ENRICH_DEFAULT': self.enrichment.cards_enrich_default,
            'CARDS_MAX': self.enrichment.cards_max,
            'ENRICH_CODE_CHUNKS': self.enrichment.enrich_code_chunks,
            'ENRICH_MIN_CHARS': self.enrichment.enrich_min_chars,
            'ENRICH_MAX_CHARS': self.enrichment.enrich_max_chars,
            'ENRICH_TIMEOUT': self.enrichment.enrich_timeout,
            # Keywords params (5)
            'KEYWORDS_MAX_PER_REPO': self.keywords.keywords_max_per_repo,
            'KEYWORDS_MIN_FREQ': self.keywords.keywords_min_freq,
            'KEYWORDS_BOOST': self.keywords.keywords_boost,
            'KEYWORDS_AUTO_GENERATE': self.keywords.keywords_auto_generate,
            'KEYWORDS_REFRESH_HOURS': self.keywords.keywords_refresh_hours,
    # Tracing params (12)
            'TRACING_ENABLED': self.tracing.tracing_enabled,
            'TRACE_SAMPLING_RATE': self.tracing.trace_sampling_rate,
            'PROMETHEUS_PORT': self.tracing.prometheus_port,
            'METRICS_ENABLED': self.tracing.metrics_enabled,
            'ALERT_INCLUDE_RESOLVED': self.tracing.alert_include_resolved,
            'ALERT_WEBHOOK_TIMEOUT': self.tracing.alert_webhook_timeout,
            'LOG_LEVEL': self.tracing.log_level,
            'TRACING_MODE': self.tracing.tracing_mode,
            'TRACE_AUTO_LS': self.tracing.trace_auto_ls,
            'TRACE_RETENTION': self.tracing.trace_retention,
            'AGRO_LOG_PATH': self.tracing.agro_log_path,
            'ALERT_NOTIFY_SEVERITIES': self.tracing.alert_notify_severities,
    # Training params (10)
            'RERANKER_TRAIN_EPOCHS': self.training.reranker_train_epochs,
            'RERANKER_TRAIN_BATCH': self.training.reranker_train_batch,
            'RERANKER_TRAIN_LR': self.training.reranker_train_lr,
            'RERANKER_WARMUP_RATIO': self.training.reranker_warmup_ratio,
            'TRIPLETS_MIN_COUNT': self.training.triplets_min_count,
            'TRIPLETS_MINE_MODE': self.training.triplets_mine_mode,
            'AGRO_RERANKER_MODEL_PATH': self.training.agro_reranker_model_path,
            'AGRO_RERANKER_MINE_MODE': self.training.agro_reranker_mine_mode,
            'AGRO_RERANKER_MINE_RESET': self.training.agro_reranker_mine_reset,
            'AGRO_TRIPLETS_PATH': self.training.agro_triplets_path,
    # UI params (17)
            'CHAT_STREAMING_ENABLED': self.ui.chat_streaming_enabled,
            'CHAT_HISTORY_MAX': self.ui.chat_history_max,
            'EDITOR_PORT': self.ui.editor_port,
            'GRAFANA_DASHBOARD_UID': self.ui.grafana_dashboard_uid,
            'GRAFANA_DASHBOARD_SLUG': self.ui.grafana_dashboard_slug,
            'GRAFANA_BASE_URL': self.ui.grafana_base_url,
            'GRAFANA_AUTH_MODE': self.ui.grafana_auth_mode,
            'GRAFANA_EMBED_ENABLED': self.ui.grafana_embed_enabled,
            'GRAFANA_KIOSK': self.ui.grafana_kiosk,
            'GRAFANA_ORG_ID': self.ui.grafana_org_id,
            'GRAFANA_REFRESH': self.ui.grafana_refresh,
            'EDITOR_BIND': self.ui.editor_bind,
            'EDITOR_EMBED_ENABLED': self.ui.editor_embed_enabled,
            'EDITOR_ENABLED': self.ui.editor_enabled,
            'EDITOR_IMAGE': self.ui.editor_image,
            'THEME_MODE': self.ui.theme_mode,
            'OPEN_BROWSER': self.ui.open_browser,
            # Hydration params (2)
            'HYDRATION_MODE': self.hydration.hydration_mode,
            'HYDRATION_MAX_CHARS': self.hydration.hydration_max_chars,
            # Evaluation params (3)
            'GOLDEN_PATH': self.evaluation.golden_path,
            'BASELINE_PATH': self.evaluation.baseline_path,
            'EVAL_MULTI_M': self.evaluation.eval_multi_m,
        }

    @classmethod
    def from_flat_dict(cls, data: dict[str, any]) -> 'AgroConfigRoot':
        """Create config from flat env-style dict.

        This allows the API to receive updates in the traditional flat format
        and convert them to the nested structure for storage.

        Args:
            data: Flat dictionary with env-style keys

        Returns:
            AgroConfigRoot instance with nested structure
        """
        return cls(
            retrieval=RetrievalConfig(
                rrf_k_div=data.get('RRF_K_DIV', 60),
                langgraph_final_k=data.get('LANGGRAPH_FINAL_K', 20),
                max_query_rewrites=data.get('MAX_QUERY_REWRITES', 2),
                fallback_confidence=data.get('FALLBACK_CONFIDENCE', 0.55),
                final_k=data.get('FINAL_K', 10),
                eval_final_k=data.get('EVAL_FINAL_K', 5),
                conf_top1=data.get('CONF_TOP1', 0.62),
                conf_avg5=data.get('CONF_AVG5', 0.55),
                conf_any=data.get('CONF_ANY', 0.55),
                eval_multi=data.get('EVAL_MULTI', 1),
                query_expansion_enabled=data.get('QUERY_EXPANSION_ENABLED', 1),
                bm25_weight=data.get('BM25_WEIGHT', 0.3),
                vector_weight=data.get('VECTOR_WEIGHT', 0.7),
                card_search_enabled=data.get('CARD_SEARCH_ENABLED', 1),
                multi_query_m=data.get('MULTI_QUERY_M', 4),
                use_semantic_synonyms=data.get('USE_SEMANTIC_SYNONYMS', 1),
                topk_dense=data.get('TOPK_DENSE', 75),
                topk_sparse=data.get('TOPK_SPARSE', 75),
                hydration_mode=data.get('HYDRATION_MODE', 'lazy'),
                hydration_max_chars=data.get('HYDRATION_MAX_CHARS', 2000),
                disable_rerank=data.get('DISABLE_RERANK', 0),
            ),
            scoring=ScoringConfig(
                card_bonus=data.get('CARD_BONUS', 0.08),
                filename_boost_exact=data.get('FILENAME_BOOST_EXACT', 1.5),
                filename_boost_partial=data.get('FILENAME_BOOST_PARTIAL', 1.2),
                vendor_mode=data.get('VENDOR_MODE', 'prefer_first_party'),
                path_boosts=data.get('PATH_BOOSTS', '/gui,/server,/indexer,/retrieval'),
            ),
            layer_bonus=LayerBonusConfig(
                gui=data.get('LAYER_BONUS_GUI', 0.15),
                retrieval=data.get('LAYER_BONUS_RETRIEVAL', 0.15),
                indexer=data.get('LAYER_BONUS_INDEXER', 0.15),
                vendor_penalty=data.get('VENDOR_PENALTY', -0.1),
                freshness_bonus=data.get('FRESHNESS_BONUS', 0.05),
            ),
            embedding=EmbeddingConfig(
                embedding_type=data.get('EMBEDDING_TYPE', 'openai'),
                embedding_model=data.get('EMBEDDING_MODEL', 'text-embedding-3-large'),
                embedding_dim=data.get('EMBEDDING_DIM', 3072),
                voyage_model=data.get('VOYAGE_MODEL', 'voyage-code-3'),
                embedding_model_local=data.get('EMBEDDING_MODEL_LOCAL', 'all-MiniLM-L6-v2'),
                embedding_batch_size=data.get('EMBEDDING_BATCH_SIZE', 64),
                embedding_max_tokens=data.get('EMBEDDING_MAX_TOKENS', 8000),
                embedding_cache_enabled=data.get('EMBEDDING_CACHE_ENABLED', 1),
                embedding_timeout=data.get('EMBEDDING_TIMEOUT', 30),
                embedding_retry_max=data.get('EMBEDDING_RETRY_MAX', 3),
            ),
            chunking=ChunkingConfig(
                chunk_size=data.get('CHUNK_SIZE', 1000),
                chunk_overlap=data.get('CHUNK_OVERLAP', 200),
                ast_overlap_lines=data.get('AST_OVERLAP_LINES', 20),
                max_chunk_size=data.get('MAX_CHUNK_SIZE', 2000000),
                min_chunk_chars=data.get('MIN_CHUNK_CHARS', 50),
                greedy_fallback_target=data.get('GREEDY_FALLBACK_TARGET', 800),
                chunking_strategy=data.get('CHUNKING_STRATEGY', 'ast'),
                preserve_imports=data.get('PRESERVE_IMPORTS', 1),
            ),
            indexing=IndexingConfig(
                qdrant_url=data.get('QDRANT_URL', 'http://127.0.0.1:6333'),
                collection_name=data.get('COLLECTION_NAME', 'code_chunks_{repo}'),
                vector_backend=data.get('VECTOR_BACKEND', 'qdrant'),
                indexing_batch_size=data.get('INDEXING_BATCH_SIZE', 100),
                indexing_workers=data.get('INDEXING_WORKERS', 4),
                bm25_tokenizer=data.get('BM25_TOKENIZER', 'stemmer'),
                bm25_stemmer_lang=data.get('BM25_STEMMER_LANG', 'english'),
                index_excluded_exts=data.get('INDEX_EXCLUDED_EXTS', '.png,.jpg,.gif,.ico,.svg,.woff,.ttf'),
                index_max_file_size_mb=data.get('INDEX_MAX_FILE_SIZE_MB', 10),
                skip_dense=data.get('SKIP_DENSE', 0),
                out_dir_base=data.get('OUT_DIR_BASE', './out'),
                repos_file=data.get('REPOS_FILE', './repos.json'),
            ),
            reranking=RerankingConfig(
                reranker_model=data.get('RERANKER_MODEL', 'cross-encoder/ms-marco-MiniLM-L-12-v2'),
                agro_reranker_enabled=data.get('AGRO_RERANKER_ENABLED', 1),
                agro_reranker_alpha=data.get('AGRO_RERANKER_ALPHA', 0.7),
                agro_reranker_topn=data.get('AGRO_RERANKER_TOPN', 50),
                agro_reranker_batch=data.get('AGRO_RERANKER_BATCH', 16),
                agro_reranker_maxlen=data.get('AGRO_RERANKER_MAXLEN', 512),
                agro_reranker_reload_on_change=data.get('AGRO_RERANKER_RELOAD_ON_CHANGE', 0),
                agro_reranker_reload_period_sec=data.get('AGRO_RERANKER_RELOAD_PERIOD_SEC', 60),
                cohere_rerank_model=data.get('COHERE_RERANK_MODEL', 'rerank-3.5'),
                voyage_rerank_model=data.get('VOYAGE_RERANK_MODEL', 'rerank-2'),
                reranker_backend=data.get('RERANKER_BACKEND', 'local'),
                reranker_timeout=data.get('RERANKER_TIMEOUT', 10),
                rerank_input_snippet_chars=data.get('RERANK_INPUT_SNIPPET_CHARS', 700),
            ),
            generation=GenerationConfig(
                gen_model=data.get('GEN_MODEL', 'gpt-4o-mini'),
                gen_temperature=data.get('GEN_TEMPERATURE', 0.0),
                gen_max_tokens=data.get('GEN_MAX_TOKENS', 2048),
                gen_top_p=data.get('GEN_TOP_P', 1.0),
                gen_timeout=data.get('GEN_TIMEOUT', 60),
                gen_retry_max=data.get('GEN_RETRY_MAX', 2),
                enrich_model=data.get('ENRICH_MODEL', 'gpt-4o-mini'),
                enrich_backend=data.get('ENRICH_BACKEND', 'openai'),
                enrich_disabled=data.get('ENRICH_DISABLED', 0),
                ollama_num_ctx=data.get('OLLAMA_NUM_CTX', 8192),
                gen_model_cli=data.get('GEN_MODEL_CLI', 'qwen3-coder:14b'),
                gen_model_ollama=data.get('GEN_MODEL_OLLAMA', 'qwen3-coder:30b'),
            ),
            enrichment=EnrichmentConfig(
                cards_enrich_default=data.get('CARDS_ENRICH_DEFAULT', 1),
                cards_max=data.get('CARDS_MAX', 100),
                enrich_code_chunks=data.get('ENRICH_CODE_CHUNKS', 1),
                enrich_min_chars=data.get('ENRICH_MIN_CHARS', 50),
                enrich_max_chars=data.get('ENRICH_MAX_CHARS', 1000),
                enrich_timeout=data.get('ENRICH_TIMEOUT', 30),
            ),
            keywords=KeywordsConfig(
                keywords_max_per_repo=data.get('KEYWORDS_MAX_PER_REPO', 50),
                keywords_min_freq=data.get('KEYWORDS_MIN_FREQ', 3),
                keywords_boost=data.get('KEYWORDS_BOOST', 1.3),
                keywords_auto_generate=data.get('KEYWORDS_AUTO_GENERATE', 1),
                keywords_refresh_hours=data.get('KEYWORDS_REFRESH_HOURS', 24),
            ),
            tracing=TracingConfig(
                tracing_enabled=data.get('TRACING_ENABLED', 1),
                trace_sampling_rate=data.get('TRACE_SAMPLING_RATE', 1.0),
                prometheus_port=data.get('PROMETHEUS_PORT', 9090),
                metrics_enabled=data.get('METRICS_ENABLED', 1),
                alert_include_resolved=data.get('ALERT_INCLUDE_RESOLVED', 1),
                alert_webhook_timeout=data.get('ALERT_WEBHOOK_TIMEOUT', 5),
                log_level=data.get('LOG_LEVEL', 'INFO'),
                tracing_mode=data.get('TRACING_MODE', 'langsmith'),
                trace_auto_ls=data.get('TRACE_AUTO_LS', 1),
                trace_retention=data.get('TRACE_RETENTION', 50),
                agro_log_path=data.get('AGRO_LOG_PATH', 'data/logs/queries.jsonl'),
                alert_notify_severities=data.get('ALERT_NOTIFY_SEVERITIES', 'critical,warning'),
            ),
            training=TrainingConfig(
                reranker_train_epochs=data.get('RERANKER_TRAIN_EPOCHS', 2),
                reranker_train_batch=data.get('RERANKER_TRAIN_BATCH', 16),
                reranker_train_lr=data.get('RERANKER_TRAIN_LR', 2e-5),
                reranker_warmup_ratio=data.get('RERANKER_WARMUP_RATIO', 0.1),
                triplets_min_count=data.get('TRIPLETS_MIN_COUNT', 100),
                triplets_mine_mode=data.get('TRIPLETS_MINE_MODE', 'replace'),
                agro_reranker_model_path=data.get('AGRO_RERANKER_MODEL_PATH', 'models/cross-encoder-agro'),
                agro_reranker_mine_mode=data.get('AGRO_RERANKER_MINE_MODE', 'replace'),
                agro_reranker_mine_reset=data.get('AGRO_RERANKER_MINE_RESET', 0),
                agro_triplets_path=data.get('AGRO_TRIPLETS_PATH', 'data/training/triplets.jsonl'),
            ),
            ui=UIConfig(
                chat_streaming_enabled=data.get('CHAT_STREAMING_ENABLED', 1),
                chat_history_max=data.get('CHAT_HISTORY_MAX', 50),
                editor_port=data.get('EDITOR_PORT', 4440),
                grafana_dashboard_uid=data.get('GRAFANA_DASHBOARD_UID', 'agro-overview'),
                grafana_dashboard_slug=data.get('GRAFANA_DASHBOARD_SLUG', 'agro-overview'),
                grafana_base_url=data.get('GRAFANA_BASE_URL', 'http://127.0.0.1:3000'),
                grafana_auth_mode=data.get('GRAFANA_AUTH_MODE', 'anonymous'),
                grafana_embed_enabled=data.get('GRAFANA_EMBED_ENABLED', 1),
                grafana_kiosk=data.get('GRAFANA_KIOSK', 'tv'),
                grafana_org_id=data.get('GRAFANA_ORG_ID', 1),
                grafana_refresh=data.get('GRAFANA_REFRESH', '10s'),
                editor_bind=data.get('EDITOR_BIND', 'local'),
                editor_embed_enabled=data.get('EDITOR_EMBED_ENABLED', 1),
                editor_enabled=data.get('EDITOR_ENABLED', 1),
                editor_image=data.get('EDITOR_IMAGE', 'agro-vscode:latest'),
                theme_mode=data.get('THEME_MODE', 'dark'),
                open_browser=data.get('OPEN_BROWSER', 1),
            )
        )


# Default config instance for easy access
DEFAULT_CONFIG = AgroConfigRoot()

# Set of keys that belong in agro_config.json (not .env)
AGRO_CONFIG_KEYS = {
    # Retrieval params (21 - added 6 new)
    'RRF_K_DIV',
    'LANGGRAPH_FINAL_K',
    'MAX_QUERY_REWRITES',
    'FALLBACK_CONFIDENCE',
    'FINAL_K',
    'EVAL_FINAL_K',
    'CONF_TOP1',
    'CONF_AVG5',
    'CONF_ANY',
    'EVAL_MULTI',
    'QUERY_EXPANSION_ENABLED',
    'BM25_WEIGHT',
    'VECTOR_WEIGHT',
    'CARD_SEARCH_ENABLED',
    'MULTI_QUERY_M',
    'USE_SEMANTIC_SYNONYMS',
    'TOPK_DENSE',
    'TOPK_SPARSE',
    'HYDRATION_MODE',
    'HYDRATION_MAX_CHARS',
    'DISABLE_RERANK',
    # Scoring params (5 - added 2 new)
    'CARD_BONUS',
    'FILENAME_BOOST_EXACT',
    'FILENAME_BOOST_PARTIAL',
    'VENDOR_MODE',
    'PATH_BOOSTS',
    # Layer bonus params (5)
    'LAYER_BONUS_GUI',
    'LAYER_BONUS_RETRIEVAL',
    'LAYER_BONUS_INDEXER',
    'VENDOR_PENALTY',
    'FRESHNESS_BONUS',
    # Embedding params (10)
    'EMBEDDING_TYPE',
    'EMBEDDING_MODEL',
    'EMBEDDING_DIM',
    'VOYAGE_MODEL',
    'EMBEDDING_MODEL_LOCAL',
    'EMBEDDING_BATCH_SIZE',
    'EMBEDDING_MAX_TOKENS',
    'EMBEDDING_CACHE_ENABLED',
    'EMBEDDING_TIMEOUT',
    'EMBEDDING_RETRY_MAX',
    # Chunking params (8)
    'CHUNK_SIZE',
    'CHUNK_OVERLAP',
    'AST_OVERLAP_LINES',
    'MAX_CHUNK_SIZE',
    'MIN_CHUNK_CHARS',
    'GREEDY_FALLBACK_TARGET',
    'CHUNKING_STRATEGY',
    'PRESERVE_IMPORTS',
    # Indexing params (12)
    'QDRANT_URL',
    'COLLECTION_NAME',
    'VECTOR_BACKEND',
    'INDEXING_BATCH_SIZE',
    'INDEXING_WORKERS',
    'BM25_TOKENIZER',
    'BM25_STEMMER_LANG',
    'INDEX_EXCLUDED_EXTS',
    'INDEX_MAX_FILE_SIZE_MB',
    'SKIP_DENSE',
    'OUT_DIR_BASE',
    'REPOS_FILE',
    # Reranking params (13)
    'RERANKER_MODEL',
    'AGRO_RERANKER_ENABLED',
    'AGRO_RERANKER_ALPHA',
    'AGRO_RERANKER_TOPN',
    'AGRO_RERANKER_BATCH',
    'AGRO_RERANKER_MAXLEN',
    'AGRO_RERANKER_RELOAD_ON_CHANGE',
    'AGRO_RERANKER_RELOAD_PERIOD_SEC',
    'COHERE_RERANK_MODEL',
    'VOYAGE_RERANK_MODEL',
    'RERANKER_BACKEND',
    'RERANKER_TIMEOUT',
    'RERANK_INPUT_SNIPPET_CHARS',
    # Generation params (12)
    'GEN_MODEL',
    'GEN_TEMPERATURE',
    'GEN_MAX_TOKENS',
    'GEN_TOP_P',
    'GEN_TIMEOUT',
    'GEN_RETRY_MAX',
    'ENRICH_MODEL',
    'ENRICH_BACKEND',
    'ENRICH_DISABLED',
    'OLLAMA_NUM_CTX',
    'GEN_MODEL_CLI',
    'GEN_MODEL_OLLAMA',
    # Enrichment params (6)
    'CARDS_ENRICH_DEFAULT',
    'CARDS_MAX',
    'ENRICH_CODE_CHUNKS',
    'ENRICH_MIN_CHARS',
    'ENRICH_MAX_CHARS',
    'ENRICH_TIMEOUT',
    # Keywords params (5)
    'KEYWORDS_MAX_PER_REPO',
    'KEYWORDS_MIN_FREQ',
    'KEYWORDS_BOOST',
    'KEYWORDS_AUTO_GENERATE',
    'KEYWORDS_REFRESH_HOURS',
    # Tracing params (12)
    'TRACING_ENABLED',
    'TRACE_SAMPLING_RATE',
    'PROMETHEUS_PORT',
    'METRICS_ENABLED',
    'ALERT_INCLUDE_RESOLVED',
    'ALERT_WEBHOOK_TIMEOUT',
    'LOG_LEVEL',
    'TRACING_MODE',
    'TRACE_AUTO_LS',
    'TRACE_RETENTION',
    'AGRO_LOG_PATH',
    'ALERT_NOTIFY_SEVERITIES',
    # Training params (10)
    'RERANKER_TRAIN_EPOCHS',
    'RERANKER_TRAIN_BATCH',
    'RERANKER_TRAIN_LR',
    'RERANKER_WARMUP_RATIO',
    'TRIPLETS_MIN_COUNT',
    'TRIPLETS_MINE_MODE',
    'AGRO_RERANKER_MODEL_PATH',
    'AGRO_RERANKER_MINE_MODE',
    'AGRO_RERANKER_MINE_RESET',
    'AGRO_TRIPLETS_PATH',
    # UI params (17)
    'CHAT_STREAMING_ENABLED',
    'CHAT_HISTORY_MAX',
    'EDITOR_PORT',
    'GRAFANA_DASHBOARD_UID',
    'GRAFANA_DASHBOARD_SLUG',
    'GRAFANA_BASE_URL',
    'GRAFANA_AUTH_MODE',
    'GRAFANA_EMBED_ENABLED',
    'GRAFANA_KIOSK',
    'GRAFANA_ORG_ID',
    'GRAFANA_REFRESH',
    'EDITOR_BIND',
    'EDITOR_EMBED_ENABLED',
    'EDITOR_ENABLED',
    'EDITOR_IMAGE',
    'THEME_MODE',
    'OPEN_BROWSER',
    # Hydration params (2)
    'HYDRATION_MODE',
    'HYDRATION_MAX_CHARS',
    # Evaluation params (3)
    'GOLDEN_PATH',
    'BASELINE_PATH',
    'EVAL_MULTI_M',
}
