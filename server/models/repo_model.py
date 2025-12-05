"""
Per-repository configuration models.

These models define repo-specific overrides that can be set in repos.json.
When use_global is True (or indexing is undefined), global settings from agro_config.json apply.
"""

from typing import Optional

from pydantic import BaseModel, Field


class RepoIndexingConfig(BaseModel):
    """Per-repo indexing configuration overrides.

    Fields mirror the relevant fields from EmbeddingConfig, ChunkingConfig, and IndexingConfig
    but are all Optional since repos inherit from global config by default.

    NOTE: Provider-specific fields like voyage_model or embedding_model_local are NOT included.
    The embedding_model field is generic and works for any provider.
    """

    use_global: bool = Field(
        default=True,
        description="When True, inherit all settings from global agro_config.json. When False, use overrides below."
    )

    # Embedding settings (from EmbeddingConfig)
    embedding_type: Optional[str] = Field(
        default=None,
        description="Embedding provider override (e.g., 'openai', 'voyage', 'local', 'cohere')"
    )
    embedding_model: Optional[str] = Field(
        default=None,
        description="Embedding model name for the selected provider"
    )
    embedding_dim: Optional[int] = Field(
        default=None,
        ge=128,
        le=4096,
        description="Embedding dimensions override"
    )

    # Chunking settings (from ChunkingConfig)
    chunk_size: Optional[int] = Field(
        default=None,
        ge=200,
        le=5000,
        description="Target chunk size override"
    )
    chunk_overlap: Optional[int] = Field(
        default=None,
        ge=0,
        le=1000,
        description="Chunk overlap override"
    )
    chunking_strategy: Optional[str] = Field(
        default=None,
        description="Chunking strategy override ('ast', 'greedy', 'hybrid')"
    )

    # Indexing settings (from IndexingConfig)
    indexing_batch_size: Optional[int] = Field(
        default=None,
        ge=10,
        le=1000,
        description="Batch size for indexing override"
    )
    indexing_workers: Optional[int] = Field(
        default=None,
        ge=1,
        le=16,
        description="Parallel workers for indexing override"
    )

    # BM25 settings (from IndexingConfig)
    bm25_tokenizer: Optional[str] = Field(
        default=None,
        description="BM25 tokenizer type override ('stemmer', 'lowercase', 'whitespace')"
    )
    bm25_stemmer_lang: Optional[str] = Field(
        default=None,
        description="Stemmer language override"
    )
    bm25_stopwords_lang: Optional[str] = Field(
        default=None,
        description="Stopwords language code override"
    )

    class Config:
        extra = "forbid"  # Reject unknown fields
