"""Comprehensive tests for agro_config.json functionality.

This module tests:
1. Pydantic validation (type safety, ranges)
2. ConfigRegistry load/merge/precedence
3. File routing in set_config()
4. Module-level cache updates on reload
5. Backward compatibility (.env precedence)
"""

import json
import os
import tempfile
from pathlib import Path
import pytest
from pydantic import ValidationError

from server.models.agro_config_model import (
    AgroConfigRoot,
    RetrievalConfig,
    ScoringConfig,
    LayerBonusConfig,
    EmbeddingConfig,
    ChunkingConfig,
    IndexingConfig,
    RerankingConfig,
    GenerationConfig,
    EnrichmentConfig,
    KeywordsConfig,
    TracingConfig,
    TrainingConfig,
    UIConfig,
    AGRO_CONFIG_KEYS
)
from server.services.config_registry import ConfigRegistry


class TestPydanticValidation:
    """Test Pydantic model validation."""

    def test_default_values(self):
        """Test that defaults match current hardcoded values."""
        config = AgroConfigRoot()
        assert config.retrieval.rrf_k_div == 60
        assert config.retrieval.langgraph_final_k == 20
        assert config.retrieval.max_query_rewrites == 2
        assert config.retrieval.fallback_confidence == 0.55
        assert config.scoring.card_bonus == 0.08
        assert config.scoring.filename_boost_exact == 1.5
        assert config.scoring.filename_boost_partial == 1.2

    def test_rrf_k_div_validation(self):
        """Test RRF k_div range validation."""
        # Valid values
        config = AgroConfigRoot(retrieval=RetrievalConfig(rrf_k_div=60))
        assert config.retrieval.rrf_k_div == 60

        # Out of range - too low
        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(rrf_k_div=0))

        # Out of range - too high
        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(rrf_k_div=300))

        # Minimum validator (should fail for values < 10)
        with pytest.raises(ValidationError) as exc_info:
            AgroConfigRoot(retrieval=RetrievalConfig(rrf_k_div=5))
        assert "rrf_k_div should be at least 10" in str(exc_info.value)

    def test_filename_boost_validation(self):
        """Test filename boost exact > partial validation."""
        # Valid: exact > partial
        config = AgroConfigRoot(
            scoring=ScoringConfig(
                filename_boost_exact=1.5,
                filename_boost_partial=1.2
            )
        )
        assert config.scoring.filename_boost_exact > config.scoring.filename_boost_partial

        # Invalid: exact <= partial
        with pytest.raises(ValidationError) as exc_info:
            AgroConfigRoot(
                scoring=ScoringConfig(
                    filename_boost_exact=1.2,
                    filename_boost_partial=1.5
                )
            )
        assert "filename_boost_exact should be greater than filename_boost_partial" in str(exc_info.value)

    def test_invalid_types(self):
        """Test type validation."""
        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(rrf_k_div="sixty"))  # String instead of int

        with pytest.raises(ValidationError):
            AgroConfigRoot(scoring=ScoringConfig(card_bonus="high"))  # String instead of float

    def test_to_flat_dict(self):
        """Test conversion to flat env-style dict."""
        config = AgroConfigRoot()
        flat = config.to_flat_dict()

        assert 'RRF_K_DIV' in flat
        assert 'CARD_BONUS' in flat
        assert 'FILENAME_BOOST_EXACT' in flat
        assert flat['RRF_K_DIV'] == 60
        assert flat['CARD_BONUS'] == 0.08

    def test_from_flat_dict(self):
        """Test creation from flat env-style dict."""
        flat = {
            'RRF_K_DIV': 80,
            'CARD_BONUS': 0.10,
            'LANGGRAPH_FINAL_K': 15
        }
        config = AgroConfigRoot.from_flat_dict(flat)

        assert config.retrieval.rrf_k_div == 80
        assert config.scoring.card_bonus == 0.10
        assert config.retrieval.langgraph_final_k == 15

    def test_retrieval_final_k_validation(self):
        """Test final_k range validation."""
        config = AgroConfigRoot(retrieval=RetrievalConfig(final_k=50))
        assert config.retrieval.final_k == 50

        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(final_k=0))

        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(final_k=101))

    def test_eval_final_k_validation(self):
        """Test eval_final_k range validation."""
        config = AgroConfigRoot(retrieval=RetrievalConfig(eval_final_k=25))
        assert config.retrieval.eval_final_k == 25

        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(eval_final_k=0))

        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(eval_final_k=51))

    def test_weights_sum_to_one(self):
        """Test BM25/vector weights validation."""
        # Valid: sums to 1.0
        config = AgroConfigRoot(retrieval=RetrievalConfig(bm25_weight=0.3, vector_weight=0.7))
        assert config.retrieval.bm25_weight == 0.3
        assert config.retrieval.vector_weight == 0.7

        # Valid: also sums to 1.0
        config2 = AgroConfigRoot(retrieval=RetrievalConfig(bm25_weight=0.5, vector_weight=0.5))
        assert config2.retrieval.bm25_weight == 0.5

        # Invalid: doesn't sum to 1.0
        with pytest.raises(ValidationError) as exc:
            AgroConfigRoot(retrieval=RetrievalConfig(bm25_weight=0.4, vector_weight=0.4))
        assert "must sum to 1.0" in str(exc.value)

    def test_layer_bonuses(self):
        """Test layer bonus config."""
        config = AgroConfigRoot(layer_bonus=LayerBonusConfig(gui=0.2, retrieval=0.1))
        assert config.layer_bonus.gui == 0.2
        assert config.layer_bonus.retrieval == 0.1
        flat = config.to_flat_dict()
        assert flat['LAYER_BONUS_GUI'] == 0.2
        assert flat['LAYER_BONUS_RETRIEVAL'] == 0.1

    def test_confidence_thresholds(self):
        """Test confidence threshold params."""
        config = AgroConfigRoot(retrieval=RetrievalConfig(
            conf_top1=0.7,
            conf_avg5=0.6,
            conf_any=0.5
        ))
        assert config.retrieval.conf_top1 == 0.7
        assert config.retrieval.conf_avg5 == 0.6
        assert config.retrieval.conf_any == 0.5

    def test_confidence_threshold_ranges(self):
        """Test confidence threshold range validation."""
        # Valid values
        config = AgroConfigRoot(retrieval=RetrievalConfig(conf_top1=0.8, conf_avg5=0.6, conf_any=0.5))
        assert config.retrieval.conf_top1 == 0.8

        # Invalid: conf_top1 > 1.0
        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(conf_top1=1.5))

        # Invalid: conf_any < 0.0
        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(conf_any=-0.1))

    def test_eval_params(self):
        """Test evaluation parameters."""
        config = AgroConfigRoot(retrieval=RetrievalConfig(
            eval_final_k=10,
            eval_multi=1
        ))
        assert config.retrieval.eval_final_k == 10
        assert config.retrieval.eval_multi == 1

    def test_eval_multi_validation(self):
        """Test eval_multi is 0 or 1."""
        config = AgroConfigRoot(retrieval=RetrievalConfig(eval_multi=0))
        assert config.retrieval.eval_multi == 0

        config2 = AgroConfigRoot(retrieval=RetrievalConfig(eval_multi=1))
        assert config2.retrieval.eval_multi == 1

        # Invalid: must be 0 or 1
        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(eval_multi=2))

    def test_multi_query_m_validation(self):
        """Test multi_query_m range."""
        config = AgroConfigRoot(retrieval=RetrievalConfig(multi_query_m=5))
        assert config.retrieval.multi_query_m == 5

        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(multi_query_m=11))

        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(multi_query_m=0))

    def test_vendor_penalty_range(self):
        """Test vendor_penalty must be negative or zero."""
        config = AgroConfigRoot(layer_bonus=LayerBonusConfig(vendor_penalty=-0.2))
        assert config.layer_bonus.vendor_penalty == -0.2

        config2 = AgroConfigRoot(layer_bonus=LayerBonusConfig(vendor_penalty=0.0))
        assert config2.layer_bonus.vendor_penalty == 0.0

        # Invalid: must be <= 0
        with pytest.raises(ValidationError):
            AgroConfigRoot(layer_bonus=LayerBonusConfig(vendor_penalty=0.1))

    def test_freshness_bonus_range(self):
        """Test freshness_bonus range."""
        config = AgroConfigRoot(layer_bonus=LayerBonusConfig(freshness_bonus=0.1))
        assert config.layer_bonus.freshness_bonus == 0.1

        with pytest.raises(ValidationError):
            AgroConfigRoot(layer_bonus=LayerBonusConfig(freshness_bonus=0.4))

        with pytest.raises(ValidationError):
            AgroConfigRoot(layer_bonus=LayerBonusConfig(freshness_bonus=-0.1))

    def test_layer_bonus_ranges(self):
        """Test all layer bonus ranges."""
        # Valid values
        config = AgroConfigRoot(layer_bonus=LayerBonusConfig(
            gui=0.3,
            retrieval=0.25,
            indexer=0.2
        ))
        assert config.layer_bonus.gui == 0.3
        assert config.layer_bonus.retrieval == 0.25
        assert config.layer_bonus.indexer == 0.2

        # Invalid: gui > 0.5
        with pytest.raises(ValidationError):
            AgroConfigRoot(layer_bonus=LayerBonusConfig(gui=0.6))

    def test_query_expansion_enabled(self):
        """Test query_expansion_enabled parameter."""
        config = AgroConfigRoot(retrieval=RetrievalConfig(query_expansion_enabled=0))
        assert config.retrieval.query_expansion_enabled == 0

        config2 = AgroConfigRoot(retrieval=RetrievalConfig(query_expansion_enabled=1))
        assert config2.retrieval.query_expansion_enabled == 1

        # Invalid: must be 0 or 1
        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(query_expansion_enabled=2))

    def test_card_search_enabled(self):
        """Test card_search_enabled parameter."""
        config = AgroConfigRoot(retrieval=RetrievalConfig(card_search_enabled=0))
        assert config.retrieval.card_search_enabled == 0

        config2 = AgroConfigRoot(retrieval=RetrievalConfig(card_search_enabled=1))
        assert config2.retrieval.card_search_enabled == 1

        # Invalid: must be 0 or 1
        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(card_search_enabled=2))

    def test_bm25_vector_weights_boundary(self):
        """Test BM25/vector weights at boundaries."""
        # Valid: 0.0 and 1.0
        config = AgroConfigRoot(retrieval=RetrievalConfig(bm25_weight=0.0, vector_weight=1.0))
        assert config.retrieval.bm25_weight == 0.0
        assert config.retrieval.vector_weight == 1.0

        # Valid: 1.0 and 0.0
        config2 = AgroConfigRoot(retrieval=RetrievalConfig(bm25_weight=1.0, vector_weight=0.0))
        assert config2.retrieval.bm25_weight == 1.0

        # Invalid: both > 1.0
        with pytest.raises(ValidationError):
            AgroConfigRoot(retrieval=RetrievalConfig(bm25_weight=1.1, vector_weight=0.0))

    def test_all_new_params_in_flat_dict(self):
        """Test that all 23 new params appear in flat dict."""
        config = AgroConfigRoot()
        flat = config.to_flat_dict()

        # Check all new retrieval params
        assert 'FINAL_K' in flat
        assert 'EVAL_FINAL_K' in flat
        assert 'CONF_TOP1' in flat
        assert 'CONF_AVG5' in flat
        assert 'CONF_ANY' in flat
        assert 'EVAL_MULTI' in flat
        assert 'QUERY_EXPANSION_ENABLED' in flat
        assert 'BM25_WEIGHT' in flat
        assert 'VECTOR_WEIGHT' in flat
        assert 'CARD_SEARCH_ENABLED' in flat
        assert 'MULTI_QUERY_M' in flat

        # Check all layer bonus params
        assert 'LAYER_BONUS_GUI' in flat
        assert 'LAYER_BONUS_RETRIEVAL' in flat
        assert 'LAYER_BONUS_INDEXER' in flat
        assert 'VENDOR_PENALTY' in flat
        assert 'FRESHNESS_BONUS' in flat

    def test_from_flat_dict_with_all_params(self):
        """Test from_flat_dict with all 23 new parameters."""
        flat = {
            'FINAL_K': 15,
            'EVAL_FINAL_K': 8,
            'CONF_TOP1': 0.7,
            'CONF_AVG5': 0.6,
            'CONF_ANY': 0.5,
            'EVAL_MULTI': 0,
            'QUERY_EXPANSION_ENABLED': 0,
            'BM25_WEIGHT': 0.4,
            'VECTOR_WEIGHT': 0.6,
            'CARD_SEARCH_ENABLED': 0,
            'MULTI_QUERY_M': 6,
            'LAYER_BONUS_GUI': 0.2,
            'LAYER_BONUS_RETRIEVAL': 0.18,
            'LAYER_BONUS_INDEXER': 0.16,
            'VENDOR_PENALTY': -0.15,
            'FRESHNESS_BONUS': 0.08,
        }
        config = AgroConfigRoot.from_flat_dict(flat)

        assert config.retrieval.final_k == 15
        assert config.retrieval.eval_final_k == 8
        assert config.retrieval.conf_top1 == 0.7
        assert config.retrieval.conf_avg5 == 0.6
        assert config.retrieval.conf_any == 0.5
        assert config.retrieval.eval_multi == 0
        assert config.retrieval.query_expansion_enabled == 0
        assert config.retrieval.bm25_weight == 0.4
        assert config.retrieval.vector_weight == 0.6
        assert config.retrieval.card_search_enabled == 0
        assert config.retrieval.multi_query_m == 6
        assert config.layer_bonus.gui == 0.2
        assert config.layer_bonus.retrieval == 0.18
        assert config.layer_bonus.indexer == 0.16
        assert config.layer_bonus.vendor_penalty == -0.15
        assert config.layer_bonus.freshness_bonus == 0.08

    def test_layer_bonus_defaults(self):
        """Test layer bonus default values."""
        config = AgroConfigRoot()
        assert config.layer_bonus.gui == 0.15
        assert config.layer_bonus.retrieval == 0.15
        assert config.layer_bonus.indexer == 0.15
        assert config.layer_bonus.vendor_penalty == -0.1
        assert config.layer_bonus.freshness_bonus == 0.05

    # ============================================================
    # NEW TESTS FOR EMBEDDING, CHUNKING, INDEXING (27 PARAMETERS)
    # ============================================================

    def test_embedding_type_validation(self):
        """Test embedding type must be in allowed set."""
        valid = AgroConfigRoot(embedding=EmbeddingConfig(embedding_type="openai"))
        assert valid.embedding.embedding_type == "openai"

        valid2 = AgroConfigRoot(embedding=EmbeddingConfig(embedding_type="voyage"))
        assert valid2.embedding.embedding_type == "voyage"

        valid3 = AgroConfigRoot(embedding=EmbeddingConfig(embedding_type="local"))
        assert valid3.embedding.embedding_type == "local"

        valid4 = AgroConfigRoot(embedding=EmbeddingConfig(embedding_type="mxbai"))
        assert valid4.embedding.embedding_type == "mxbai"

        with pytest.raises(ValidationError):
            AgroConfigRoot(embedding=EmbeddingConfig(embedding_type="invalid"))

    def test_embedding_dim_validation(self):
        """Test embedding dimensions must be standard."""
        valid = AgroConfigRoot(embedding=EmbeddingConfig(embedding_dim=1536))
        assert valid.embedding.embedding_dim == 1536

        valid2 = AgroConfigRoot(embedding=EmbeddingConfig(embedding_dim=768))
        assert valid2.embedding.embedding_dim == 768

        with pytest.raises(ValidationError) as exc:
            AgroConfigRoot(embedding=EmbeddingConfig(embedding_dim=999))
        assert "Uncommon embedding dimension" in str(exc.value)

    def test_embedding_batch_size_range(self):
        """Test embedding batch size range."""
        valid = AgroConfigRoot(embedding=EmbeddingConfig(embedding_batch_size=32))
        assert valid.embedding.embedding_batch_size == 32

        with pytest.raises(ValidationError):
            AgroConfigRoot(embedding=EmbeddingConfig(embedding_batch_size=0))

        with pytest.raises(ValidationError):
            AgroConfigRoot(embedding=EmbeddingConfig(embedding_batch_size=300))

    def test_embedding_max_tokens_range(self):
        """Test embedding max tokens range."""
        valid = AgroConfigRoot(embedding=EmbeddingConfig(embedding_max_tokens=4000))
        assert valid.embedding.embedding_max_tokens == 4000

        with pytest.raises(ValidationError):
            AgroConfigRoot(embedding=EmbeddingConfig(embedding_max_tokens=100))

        with pytest.raises(ValidationError):
            AgroConfigRoot(embedding=EmbeddingConfig(embedding_max_tokens=10000))

    def test_embedding_cache_enabled_validation(self):
        """Test embedding cache enabled is 0 or 1."""
        config1 = AgroConfigRoot(embedding=EmbeddingConfig(embedding_cache_enabled=0))
        assert config1.embedding.embedding_cache_enabled == 0

        config2 = AgroConfigRoot(embedding=EmbeddingConfig(embedding_cache_enabled=1))
        assert config2.embedding.embedding_cache_enabled == 1

        with pytest.raises(ValidationError):
            AgroConfigRoot(embedding=EmbeddingConfig(embedding_cache_enabled=2))

    def test_embedding_timeout_range(self):
        """Test embedding timeout range."""
        valid = AgroConfigRoot(embedding=EmbeddingConfig(embedding_timeout=15))
        assert valid.embedding.embedding_timeout == 15

        with pytest.raises(ValidationError):
            AgroConfigRoot(embedding=EmbeddingConfig(embedding_timeout=3))

        with pytest.raises(ValidationError):
            AgroConfigRoot(embedding=EmbeddingConfig(embedding_timeout=150))

    def test_embedding_retry_max_range(self):
        """Test embedding retry max range."""
        valid = AgroConfigRoot(embedding=EmbeddingConfig(embedding_retry_max=2))
        assert valid.embedding.embedding_retry_max == 2

        with pytest.raises(ValidationError):
            AgroConfigRoot(embedding=EmbeddingConfig(embedding_retry_max=0))

        with pytest.raises(ValidationError):
            AgroConfigRoot(embedding=EmbeddingConfig(embedding_retry_max=10))

    def test_chunk_overlap_validation(self):
        """Test overlap must be less than chunk size."""
        valid = AgroConfigRoot(chunking=ChunkingConfig(chunk_size=1000, chunk_overlap=200))
        assert valid.chunking.chunk_overlap == 200

        with pytest.raises(ValidationError) as exc:
            AgroConfigRoot(chunking=ChunkingConfig(chunk_size=500, chunk_overlap=600))
        assert "chunk_overlap must be less than chunk_size" in str(exc.value)

    def test_chunk_size_range(self):
        """Test chunk size range."""
        valid = AgroConfigRoot(chunking=ChunkingConfig(chunk_size=500))
        assert valid.chunking.chunk_size == 500

        with pytest.raises(ValidationError):
            AgroConfigRoot(chunking=ChunkingConfig(chunk_size=100))

        with pytest.raises(ValidationError):
            AgroConfigRoot(chunking=ChunkingConfig(chunk_size=6000))

    def test_ast_overlap_lines_range(self):
        """Test AST overlap lines range."""
        valid = AgroConfigRoot(chunking=ChunkingConfig(ast_overlap_lines=10))
        assert valid.chunking.ast_overlap_lines == 10

        with pytest.raises(ValidationError):
            AgroConfigRoot(chunking=ChunkingConfig(ast_overlap_lines=150))

    def test_chunking_strategy_validation(self):
        """Test chunking strategy enum."""
        valid = AgroConfigRoot(chunking=ChunkingConfig(chunking_strategy="ast"))
        assert valid.chunking.chunking_strategy == "ast"

        valid2 = AgroConfigRoot(chunking=ChunkingConfig(chunking_strategy="greedy"))
        assert valid2.chunking.chunking_strategy == "greedy"

        valid3 = AgroConfigRoot(chunking=ChunkingConfig(chunking_strategy="hybrid"))
        assert valid3.chunking.chunking_strategy == "hybrid"

        with pytest.raises(ValidationError):
            AgroConfigRoot(chunking=ChunkingConfig(chunking_strategy="invalid"))

    def test_preserve_imports_validation(self):
        """Test preserve imports is 0 or 1."""
        config1 = AgroConfigRoot(chunking=ChunkingConfig(preserve_imports=0))
        assert config1.chunking.preserve_imports == 0

        config2 = AgroConfigRoot(chunking=ChunkingConfig(preserve_imports=1))
        assert config2.chunking.preserve_imports == 1

        with pytest.raises(ValidationError):
            AgroConfigRoot(chunking=ChunkingConfig(preserve_imports=2))

    def test_vector_backend_validation(self):
        """Test vector backend enum."""
        valid = AgroConfigRoot(indexing=IndexingConfig(vector_backend="qdrant"))
        assert valid.indexing.vector_backend == "qdrant"

        valid2 = AgroConfigRoot(indexing=IndexingConfig(vector_backend="chroma"))
        assert valid2.indexing.vector_backend == "chroma"

        valid3 = AgroConfigRoot(indexing=IndexingConfig(vector_backend="weaviate"))
        assert valid3.indexing.vector_backend == "weaviate"

        with pytest.raises(ValidationError):
            AgroConfigRoot(indexing=IndexingConfig(vector_backend="invalid"))

    def test_bm25_tokenizer_validation(self):
        """Test BM25 tokenizer enum."""
        valid = AgroConfigRoot(indexing=IndexingConfig(bm25_tokenizer="stemmer"))
        assert valid.indexing.bm25_tokenizer == "stemmer"

        valid2 = AgroConfigRoot(indexing=IndexingConfig(bm25_tokenizer="lowercase"))
        assert valid2.indexing.bm25_tokenizer == "lowercase"

        valid3 = AgroConfigRoot(indexing=IndexingConfig(bm25_tokenizer="whitespace"))
        assert valid3.indexing.bm25_tokenizer == "whitespace"

        with pytest.raises(ValidationError):
            AgroConfigRoot(indexing=IndexingConfig(bm25_tokenizer="invalid"))

    def test_indexing_batch_size_range(self):
        """Test indexing batch size range."""
        valid = AgroConfigRoot(indexing=IndexingConfig(indexing_batch_size=50))
        assert valid.indexing.indexing_batch_size == 50

        with pytest.raises(ValidationError):
            AgroConfigRoot(indexing=IndexingConfig(indexing_batch_size=5))

        with pytest.raises(ValidationError):
            AgroConfigRoot(indexing=IndexingConfig(indexing_batch_size=1500))

    def test_indexing_workers_range(self):
        """Test indexing workers range."""
        valid = AgroConfigRoot(indexing=IndexingConfig(indexing_workers=8))
        assert valid.indexing.indexing_workers == 8

        with pytest.raises(ValidationError):
            AgroConfigRoot(indexing=IndexingConfig(indexing_workers=0))

        with pytest.raises(ValidationError):
            AgroConfigRoot(indexing=IndexingConfig(indexing_workers=20))

    def test_index_max_file_size_mb_range(self):
        """Test index max file size MB range."""
        valid = AgroConfigRoot(indexing=IndexingConfig(index_max_file_size_mb=5))
        assert valid.indexing.index_max_file_size_mb == 5

        with pytest.raises(ValidationError):
            AgroConfigRoot(indexing=IndexingConfig(index_max_file_size_mb=0))

        with pytest.raises(ValidationError):
            AgroConfigRoot(indexing=IndexingConfig(index_max_file_size_mb=150))

    def test_embedding_params_in_flat_dict(self):
        """Test all embedding params appear in flat dict."""
        config = AgroConfigRoot()
        flat = config.to_flat_dict()
        assert 'EMBEDDING_TYPE' in flat
        assert 'EMBEDDING_MODEL' in flat
        assert 'EMBEDDING_DIM' in flat
        assert 'VOYAGE_MODEL' in flat
        assert 'EMBEDDING_MODEL_LOCAL' in flat
        assert 'EMBEDDING_BATCH_SIZE' in flat
        assert 'EMBEDDING_MAX_TOKENS' in flat
        assert 'EMBEDDING_CACHE_ENABLED' in flat
        assert 'EMBEDDING_TIMEOUT' in flat
        assert 'EMBEDDING_RETRY_MAX' in flat

    def test_chunking_params_in_flat_dict(self):
        """Test all chunking params appear in flat dict."""
        config = AgroConfigRoot()
        flat = config.to_flat_dict()
        assert 'CHUNK_SIZE' in flat
        assert 'CHUNK_OVERLAP' in flat
        assert 'AST_OVERLAP_LINES' in flat
        assert 'MAX_CHUNK_SIZE' in flat
        assert 'MIN_CHUNK_CHARS' in flat
        assert 'GREEDY_FALLBACK_TARGET' in flat
        assert 'CHUNKING_STRATEGY' in flat
        assert 'PRESERVE_IMPORTS' in flat

    def test_indexing_params_in_flat_dict(self):
        """Test all indexing params appear in flat dict."""
        config = AgroConfigRoot()
        flat = config.to_flat_dict()
        assert 'QDRANT_URL' in flat
        assert 'COLLECTION_NAME' in flat
        assert 'VECTOR_BACKEND' in flat
        assert 'INDEXING_BATCH_SIZE' in flat
        assert 'INDEXING_WORKERS' in flat
        assert 'BM25_TOKENIZER' in flat
        assert 'BM25_STEMMER_LANG' in flat
        assert 'INDEX_EXCLUDED_EXTS' in flat
        assert 'INDEX_MAX_FILE_SIZE_MB' in flat

    def test_embedding_defaults(self):
        """Test embedding default values."""
        config = AgroConfigRoot()
        assert config.embedding.embedding_type == "openai"
        assert config.embedding.embedding_model == "text-embedding-3-large"
        assert config.embedding.embedding_dim == 3072
        assert config.embedding.voyage_model == "voyage-code-3"
        assert config.embedding.embedding_model_local == "all-MiniLM-L6-v2"
        assert config.embedding.embedding_batch_size == 64
        assert config.embedding.embedding_max_tokens == 8000
        assert config.embedding.embedding_cache_enabled == 1
        assert config.embedding.embedding_timeout == 30
        assert config.embedding.embedding_retry_max == 3

    def test_chunking_defaults(self):
        """Test chunking default values."""
        config = AgroConfigRoot()
        assert config.chunking.chunk_size == 1000
        assert config.chunking.chunk_overlap == 200
        assert config.chunking.ast_overlap_lines == 20
        assert config.chunking.max_chunk_size == 2000000
        assert config.chunking.min_chunk_chars == 50
        assert config.chunking.greedy_fallback_target == 800
        assert config.chunking.chunking_strategy == "ast"
        assert config.chunking.preserve_imports == 1

    def test_indexing_defaults(self):
        """Test indexing default values."""
        config = AgroConfigRoot()
        assert config.indexing.qdrant_url == "http://127.0.0.1:6333"
        assert config.indexing.collection_name == "code_chunks_{repo}"
        assert config.indexing.vector_backend == "qdrant"
        assert config.indexing.indexing_batch_size == 100
        assert config.indexing.indexing_workers == 4
        assert config.indexing.bm25_tokenizer == "stemmer"
        assert config.indexing.bm25_stemmer_lang == "english"
        assert config.indexing.index_excluded_exts == ".png,.jpg,.gif,.ico,.svg,.woff,.ttf"
        assert config.indexing.index_max_file_size_mb == 10

    def test_from_flat_dict_with_embedding_params(self):
        """Test from_flat_dict with embedding parameters."""
        flat = {
            'EMBEDDING_TYPE': 'voyage',
            'EMBEDDING_DIM': 512,
            'EMBEDDING_BATCH_SIZE': 32,
            'EMBEDDING_MAX_TOKENS': 4000,
        }
        config = AgroConfigRoot.from_flat_dict(flat)

        assert config.embedding.embedding_type == 'voyage'
        assert config.embedding.embedding_dim == 512
        assert config.embedding.embedding_batch_size == 32
        assert config.embedding.embedding_max_tokens == 4000

    def test_from_flat_dict_with_chunking_params(self):
        """Test from_flat_dict with chunking parameters."""
        flat = {
            'CHUNK_SIZE': 1500,
            'CHUNK_OVERLAP': 300,
            'CHUNKING_STRATEGY': 'greedy',
            'PRESERVE_IMPORTS': 0,
        }
        config = AgroConfigRoot.from_flat_dict(flat)

        assert config.chunking.chunk_size == 1500
        assert config.chunking.chunk_overlap == 300
        assert config.chunking.chunking_strategy == 'greedy'
        assert config.chunking.preserve_imports == 0

    def test_from_flat_dict_with_indexing_params(self):
        """Test from_flat_dict with indexing parameters."""
        flat = {
            'QDRANT_URL': 'http://localhost:6333',
            'INDEXING_BATCH_SIZE': 200,
            'INDEXING_WORKERS': 8,
            'VECTOR_BACKEND': 'chroma',
        }
        config = AgroConfigRoot.from_flat_dict(flat)

        assert config.indexing.qdrant_url == 'http://localhost:6333'
        assert config.indexing.indexing_batch_size == 200
        assert config.indexing.indexing_workers == 8
        assert config.indexing.vector_backend == 'chroma'

    def test_embedding_chunking_indexing_roundtrip(self):
        """Test roundtrip conversion for all new params."""
        original = AgroConfigRoot(
            embedding=EmbeddingConfig(embedding_type='local', embedding_dim=768),
            chunking=ChunkingConfig(chunk_size=1500, chunking_strategy='greedy'),
            indexing=IndexingConfig(indexing_batch_size=200, vector_backend='chroma')
        )

        flat = original.to_flat_dict()
        reconstructed = AgroConfigRoot.from_flat_dict(flat)

        assert reconstructed.embedding.embedding_type == 'local'
        assert reconstructed.embedding.embedding_dim == 768
        assert reconstructed.chunking.chunk_size == 1500
        assert reconstructed.chunking.chunking_strategy == 'greedy'
        assert reconstructed.indexing.indexing_batch_size == 200
        assert reconstructed.indexing.vector_backend == 'chroma'


class TestConfigRegistry:
    """Test ConfigRegistry functionality."""

    @pytest.fixture
    def temp_config_dir(self, tmp_path, monkeypatch):
        """Create temporary directory for config files."""
        # Mock repo_root to return temp directory
        import common.paths
        monkeypatch.setattr(common.paths, 'repo_root', lambda: tmp_path)
        # Also update server.services.config_registry since it imports repo_root
        import server.services.config_registry
        monkeypatch.setattr(server.services.config_registry, 'repo_root', lambda: tmp_path)
        return tmp_path

    def test_registry_load_defaults(self, temp_config_dir):
        """Test loading with no agro_config.json (uses defaults)."""
        registry = ConfigRegistry()
        registry.load()

        assert registry.get_int('RRF_K_DIV', 999) == 60  # Should use Pydantic default, not fallback
        assert registry.get_float('CARD_BONUS', 999.0) == 0.08

    def test_registry_load_from_file(self, temp_config_dir):
        """Test loading from agro_config.json."""
        config_file = temp_config_dir / "agro_config.json"
        config_file.write_text(json.dumps({
            "retrieval": {"rrf_k_div": 80, "langgraph_final_k": 25},
            "scoring": {"card_bonus": 0.10}
        }))

        registry = ConfigRegistry()
        registry.load()

        assert registry.get_int('RRF_K_DIV', 60) == 80
        assert registry.get_int('LANGGRAPH_FINAL_K', 20) == 25
        assert registry.get_float('CARD_BONUS', 0.08) == 0.10

    def test_env_precedence_over_file(self, temp_config_dir, monkeypatch):
        """Test that .env values take precedence over agro_config.json."""
        # Create agro_config.json
        config_file = temp_config_dir / "agro_config.json"
        config_file.write_text(json.dumps({
            "retrieval": {"rrf_k_div": 80}
        }))

        # Set env var (takes precedence)
        monkeypatch.setenv('RRF_K_DIV', '100')

        registry = ConfigRegistry()
        registry.load()

        # Should use env value, not file value
        assert registry.get_int('RRF_K_DIV', 60) == 100

        # Check source tracking
        assert registry.get_source('RRF_K_DIV') == '.env'

    def test_update_agro_config(self, temp_config_dir):
        """Test updating agro_config.json via registry."""
        registry = ConfigRegistry()
        registry.load()

        # Update values
        registry.update_agro_config({'RRF_K_DIV': 90, 'CARD_BONUS': 0.12})

        # Verify file was written
        config_file = temp_config_dir / "agro_config.json"
        assert config_file.exists()

        data = json.loads(config_file.read_text())
        assert data['retrieval']['rrf_k_div'] == 90
        assert data['scoring']['card_bonus'] == 0.12

        # Verify registry reloaded
        assert registry.get_int('RRF_K_DIV', 60) == 90

    def test_invalid_json_fallback_to_defaults(self, temp_config_dir):
        """Test graceful handling of invalid JSON."""
        config_file = temp_config_dir / "agro_config.json"
        config_file.write_text("{ invalid json }")

        registry = ConfigRegistry()
        registry.load()  # Should not raise, should use defaults

        assert registry.get_int('RRF_K_DIV', 999) == 60  # Uses Pydantic defaults

    def test_validation_error_fallback(self, temp_config_dir):
        """Test graceful handling of validation errors."""
        config_file = temp_config_dir / "agro_config.json"
        config_file.write_text(json.dumps({
            "retrieval": {"rrf_k_div": 500}  # Out of range
        }))

        registry = ConfigRegistry()
        registry.load()  # Should not raise, should use defaults

        # Should fall back to defaults on validation error
        assert registry.get_int('RRF_K_DIV', 999) == 60

    def test_typed_accessors(self, temp_config_dir):
        """Test typed accessor methods."""
        config_file = temp_config_dir / "agro_config.json"
        config_file.write_text(json.dumps({
            "retrieval": {"rrf_k_div": "80"}  # String value (from env)
        }))

        registry = ConfigRegistry()
        registry.load()

        # get_int should convert string to int
        assert registry.get_int('RRF_K_DIV', 60) == 80
        assert isinstance(registry.get_int('RRF_K_DIV', 60), int)

    def test_config_sources_tracking(self, temp_config_dir, monkeypatch):
        """Test that config sources are tracked correctly."""
        config_file = temp_config_dir / "agro_config.json"
        config_file.write_text(json.dumps({
            "retrieval": {"rrf_k_div": 80}
        }))

        monkeypatch.setenv('CARD_BONUS', '0.12')

        registry = ConfigRegistry()
        registry.load()

        # RRF_K_DIV from file
        assert registry.get_source('RRF_K_DIV') == 'agro_config.json'

        # CARD_BONUS from env (takes precedence)
        assert registry.get_source('CARD_BONUS') == '.env'


class TestAgroConfigKeys:
    """Test AGRO_CONFIG_KEYS set."""

    def test_keys_complete(self):
        """Ensure all expected keys are in AGRO_CONFIG_KEYS."""
        # Now have 100 total keys across all 13 config categories:
        # 15 retrieval + 3 scoring + 5 layer_bonus + 10 embedding + 8 chunking + 9 indexing
        # + 12 reranking + 10 generation + 6 enrichment + 5 keywords + 7 tracing + 6 training + 4 ui = 100
        assert len(AGRO_CONFIG_KEYS) == 100

        # Verify our 27 new embedding/chunking/indexing keys are present
        embedding_keys = {'EMBEDDING_TYPE', 'EMBEDDING_MODEL', 'EMBEDDING_DIM', 'VOYAGE_MODEL',
                         'EMBEDDING_MODEL_LOCAL', 'EMBEDDING_BATCH_SIZE', 'EMBEDDING_MAX_TOKENS',
                         'EMBEDDING_CACHE_ENABLED', 'EMBEDDING_TIMEOUT', 'EMBEDDING_RETRY_MAX'}
        assert embedding_keys.issubset(AGRO_CONFIG_KEYS)

        chunking_keys = {'CHUNK_SIZE', 'CHUNK_OVERLAP', 'AST_OVERLAP_LINES', 'MAX_CHUNK_SIZE',
                        'MIN_CHUNK_CHARS', 'GREEDY_FALLBACK_TARGET', 'CHUNKING_STRATEGY', 'PRESERVE_IMPORTS'}
        assert chunking_keys.issubset(AGRO_CONFIG_KEYS)

        indexing_keys = {'QDRANT_URL', 'COLLECTION_NAME', 'VECTOR_BACKEND', 'INDEXING_BATCH_SIZE',
                        'INDEXING_WORKERS', 'BM25_TOKENIZER', 'BM25_STEMMER_LANG',
                        'INDEX_EXCLUDED_EXTS', 'INDEX_MAX_FILE_SIZE_MB'}
        assert indexing_keys.issubset(AGRO_CONFIG_KEYS)

    def test_no_secret_keys(self):
        """Ensure no secret/API keys in AGRO_CONFIG_KEYS."""
        # Check for actual secret keys (be more specific to avoid false positives)
        for key in AGRO_CONFIG_KEYS:
            assert 'API_KEY' not in key, f"'API_KEY' found in AGRO_CONFIG_KEYS: {key}"
            assert 'SECRET' not in key, f"'SECRET' found in AGRO_CONFIG_KEYS: {key}"
            assert 'PASSWORD' not in key, f"'PASSWORD' found in AGRO_CONFIG_KEYS: {key}"
            # BM25_TOKENIZER is OK, we're looking for actual TOKEN values like AUTH_TOKEN
            assert key not in ['TOKEN', 'AUTH_TOKEN', 'ACCESS_TOKEN'], f"Secret token key found: {key}"


class TestRerankingGenerationEnrichmentParams:
    """Test reranking, generation, and enrichment parameters (28 new params)."""

    def test_reranker_backend_validation(self):
        """Test reranker backend enum."""
        valid = AgroConfigRoot(reranking=RerankingConfig(reranker_backend="local"))
        assert valid.reranking.reranker_backend == "local"

        valid2 = AgroConfigRoot(reranking=RerankingConfig(reranker_backend="cohere"))
        assert valid2.reranking.reranker_backend == "cohere"

        with pytest.raises(ValidationError):
            AgroConfigRoot(reranking=RerankingConfig(reranker_backend="invalid"))

    def test_reranker_alpha_range(self):
        """Test reranker alpha blend weight range."""
        valid = AgroConfigRoot(reranking=RerankingConfig(agro_reranker_alpha=0.5))
        assert valid.reranking.agro_reranker_alpha == 0.5

        with pytest.raises(ValidationError):
            AgroConfigRoot(reranking=RerankingConfig(agro_reranker_alpha=1.5))

        with pytest.raises(ValidationError):
            AgroConfigRoot(reranking=RerankingConfig(agro_reranker_alpha=-0.1))

    def test_reranker_topn_range(self):
        """Test reranker topn range."""
        valid = AgroConfigRoot(reranking=RerankingConfig(agro_reranker_topn=100))
        assert valid.reranking.agro_reranker_topn == 100

        with pytest.raises(ValidationError):
            AgroConfigRoot(reranking=RerankingConfig(agro_reranker_topn=5))

        with pytest.raises(ValidationError):
            AgroConfigRoot(reranking=RerankingConfig(agro_reranker_topn=300))

    def test_reranker_maxlen_range(self):
        """Test reranker max length range."""
        valid = AgroConfigRoot(reranking=RerankingConfig(agro_reranker_maxlen=1024))
        assert valid.reranking.agro_reranker_maxlen == 1024

        with pytest.raises(ValidationError):
            AgroConfigRoot(reranking=RerankingConfig(agro_reranker_maxlen=64))

        with pytest.raises(ValidationError):
            AgroConfigRoot(reranking=RerankingConfig(agro_reranker_maxlen=3000))

    def test_generation_temperature_range(self):
        """Test temperature bounds."""
        valid = AgroConfigRoot(generation=GenerationConfig(gen_temperature=0.5))
        assert valid.generation.gen_temperature == 0.5

        valid2 = AgroConfigRoot(generation=GenerationConfig(gen_temperature=2.0))
        assert valid2.generation.gen_temperature == 2.0

        with pytest.raises(ValidationError):
            AgroConfigRoot(generation=GenerationConfig(gen_temperature=3.0))

    def test_gen_max_tokens_range(self):
        """Test max tokens range."""
        valid = AgroConfigRoot(generation=GenerationConfig(gen_max_tokens=1000))
        assert valid.generation.gen_max_tokens == 1000

        with pytest.raises(ValidationError):
            AgroConfigRoot(generation=GenerationConfig(gen_max_tokens=50))

        with pytest.raises(ValidationError):
            AgroConfigRoot(generation=GenerationConfig(gen_max_tokens=10000))

    def test_gen_top_p_range(self):
        """Test top_p range."""
        valid = AgroConfigRoot(generation=GenerationConfig(gen_top_p=0.9))
        assert valid.generation.gen_top_p == 0.9

        with pytest.raises(ValidationError):
            AgroConfigRoot(generation=GenerationConfig(gen_top_p=1.5))

    def test_enrich_backend_validation(self):
        """Test enrichment backend enum."""
        valid = AgroConfigRoot(generation=GenerationConfig(enrich_backend="openai"))
        assert valid.generation.enrich_backend == "openai"

        valid2 = AgroConfigRoot(generation=GenerationConfig(enrich_backend="ollama"))
        assert valid2.generation.enrich_backend == "ollama"

        with pytest.raises(ValidationError):
            AgroConfigRoot(generation=GenerationConfig(enrich_backend="invalid"))

    def test_ollama_num_ctx_range(self):
        """Test Ollama context window range."""
        valid = AgroConfigRoot(generation=GenerationConfig(ollama_num_ctx=16384))
        assert valid.generation.ollama_num_ctx == 16384

        with pytest.raises(ValidationError):
            AgroConfigRoot(generation=GenerationConfig(ollama_num_ctx=1000))

        with pytest.raises(ValidationError):
            AgroConfigRoot(generation=GenerationConfig(ollama_num_ctx=40000))

    def test_cards_max_range(self):
        """Test cards max range."""
        valid = AgroConfigRoot(enrichment=EnrichmentConfig(cards_max=200))
        assert valid.enrichment.cards_max == 200

        with pytest.raises(ValidationError):
            AgroConfigRoot(enrichment=EnrichmentConfig(cards_max=5))

        with pytest.raises(ValidationError):
            AgroConfigRoot(enrichment=EnrichmentConfig(cards_max=2000))

    def test_enrich_char_limits(self):
        """Test enrichment character limits."""
        valid = AgroConfigRoot(enrichment=EnrichmentConfig(
            enrich_min_chars=100,
            enrich_max_chars=2000
        ))
        assert valid.enrichment.enrich_min_chars == 100
        assert valid.enrichment.enrich_max_chars == 2000

        with pytest.raises(ValidationError):
            AgroConfigRoot(enrichment=EnrichmentConfig(enrich_min_chars=5))

        with pytest.raises(ValidationError):
            AgroConfigRoot(enrichment=EnrichmentConfig(enrich_max_chars=10000))

    def test_enrich_timeout_range(self):
        """Test enrichment timeout range."""
        valid = AgroConfigRoot(enrichment=EnrichmentConfig(enrich_timeout=60))
        assert valid.enrichment.enrich_timeout == 60

        with pytest.raises(ValidationError):
            AgroConfigRoot(enrichment=EnrichmentConfig(enrich_timeout=2))

        with pytest.raises(ValidationError):
            AgroConfigRoot(enrichment=EnrichmentConfig(enrich_timeout=200))

    def test_reranking_params_in_flat_dict(self):
        """Test all reranking params in flat dict."""
        config = AgroConfigRoot()
        flat = config.to_flat_dict()
        assert 'RERANKER_MODEL' in flat
        assert 'AGRO_RERANKER_ENABLED' in flat
        assert 'AGRO_RERANKER_ALPHA' in flat
        assert 'AGRO_RERANKER_TOPN' in flat
        assert 'AGRO_RERANKER_BATCH' in flat
        assert 'AGRO_RERANKER_MAXLEN' in flat
        assert 'RERANKER_BACKEND' in flat
        assert 'RERANKER_TIMEOUT' in flat
        assert 'COHERE_RERANK_MODEL' in flat
        assert 'VOYAGE_RERANK_MODEL' in flat

    def test_generation_params_in_flat_dict(self):
        """Test all generation params in flat dict."""
        config = AgroConfigRoot()
        flat = config.to_flat_dict()
        assert 'GEN_MODEL' in flat
        assert 'GEN_TEMPERATURE' in flat
        assert 'GEN_MAX_TOKENS' in flat
        assert 'GEN_TOP_P' in flat
        assert 'GEN_TIMEOUT' in flat
        assert 'ENRICH_MODEL' in flat
        assert 'ENRICH_BACKEND' in flat
        assert 'OLLAMA_NUM_CTX' in flat

    def test_enrichment_params_in_flat_dict(self):
        """Test all enrichment params in flat dict."""
        config = AgroConfigRoot()
        flat = config.to_flat_dict()
        assert 'CARDS_ENRICH_DEFAULT' in flat
        assert 'CARDS_MAX' in flat
        assert 'ENRICH_CODE_CHUNKS' in flat
        assert 'ENRICH_MIN_CHARS' in flat
        assert 'ENRICH_MAX_CHARS' in flat
        assert 'ENRICH_TIMEOUT' in flat

    def test_from_flat_dict_reranking(self):
        """Test from_flat_dict with reranking parameters."""
        flat = {
            'RERANKER_MODEL': 'custom-reranker',
            'AGRO_RERANKER_ENABLED': 0,
            'AGRO_RERANKER_ALPHA': 0.8,
            'AGRO_RERANKER_TOPN': 100,
            'RERANKER_BACKEND': 'cohere',
        }
        config = AgroConfigRoot.from_flat_dict(flat)
        assert config.reranking.reranker_model == 'custom-reranker'
        assert config.reranking.agro_reranker_enabled == 0
        assert config.reranking.agro_reranker_alpha == 0.8
        assert config.reranking.agro_reranker_topn == 100
        assert config.reranking.reranker_backend == 'cohere'

    def test_from_flat_dict_generation(self):
        """Test from_flat_dict with generation parameters."""
        flat = {
            'GEN_MODEL': 'gpt-4',
            'GEN_TEMPERATURE': 0.7,
            'GEN_MAX_TOKENS': 4096,
            'ENRICH_BACKEND': 'ollama',
        }
        config = AgroConfigRoot.from_flat_dict(flat)
        assert config.generation.gen_model == 'gpt-4'
        assert config.generation.gen_temperature == 0.7
        assert config.generation.gen_max_tokens == 4096
        assert config.generation.enrich_backend == 'ollama'

    def test_from_flat_dict_enrichment(self):
        """Test from_flat_dict with enrichment parameters."""
        flat = {
            'CARDS_ENRICH_DEFAULT': 0,
            'CARDS_MAX': 500,
            'ENRICH_MIN_CHARS': 100,
            'ENRICH_MAX_CHARS': 2000,
        }
        config = AgroConfigRoot.from_flat_dict(flat)
        assert config.enrichment.cards_enrich_default == 0
        assert config.enrichment.cards_max == 500
        assert config.enrichment.enrich_min_chars == 100
        assert config.enrichment.enrich_max_chars == 2000

    def test_reranking_defaults(self):
        """Test reranking default values."""
        config = AgroConfigRoot()
        assert config.reranking.reranker_model == 'cross-encoder/ms-marco-MiniLM-L-12-v2'
        assert config.reranking.agro_reranker_enabled == 1
        assert config.reranking.agro_reranker_alpha == 0.7
        assert config.reranking.agro_reranker_topn == 50
        assert config.reranking.agro_reranker_batch == 16
        assert config.reranking.agro_reranker_maxlen == 512
        assert config.reranking.reranker_backend == 'local'

    def test_generation_defaults(self):
        """Test generation default values."""
        config = AgroConfigRoot()
        assert config.generation.gen_model == 'gpt-4o-mini'
        assert config.generation.gen_temperature == 0.0
        assert config.generation.gen_max_tokens == 2048
        assert config.generation.gen_top_p == 1.0
        assert config.generation.enrich_backend == 'openai'

    def test_enrichment_defaults(self):
        """Test enrichment default values."""
        config = AgroConfigRoot()
        assert config.enrichment.cards_enrich_default == 1
        assert config.enrichment.cards_max == 100
        assert config.enrichment.enrich_code_chunks == 1
        assert config.enrichment.enrich_min_chars == 50
        assert config.enrichment.enrich_max_chars == 1000
        assert config.enrichment.enrich_timeout == 30

    def test_reranker_boolean_params(self):
        """Test reranker boolean (0/1) parameters."""
        config = AgroConfigRoot(reranking=RerankingConfig(
            agro_reranker_enabled=0,
            agro_reranker_reload_on_change=1
        ))
        assert config.reranking.agro_reranker_enabled == 0
        assert config.reranking.agro_reranker_reload_on_change == 1

        with pytest.raises(ValidationError):
            AgroConfigRoot(reranking=RerankingConfig(agro_reranker_enabled=2))

    def test_gen_retry_max_range(self):
        """Test generation retry max range."""
        valid = AgroConfigRoot(generation=GenerationConfig(gen_retry_max=3))
        assert valid.generation.gen_retry_max == 3

        with pytest.raises(ValidationError):
            AgroConfigRoot(generation=GenerationConfig(gen_retry_max=0))

        with pytest.raises(ValidationError):
            AgroConfigRoot(generation=GenerationConfig(gen_retry_max=10))

    def test_reranker_timeout_range(self):
        """Test reranker timeout range."""
        valid = AgroConfigRoot(reranking=RerankingConfig(reranker_timeout=30))
        assert valid.reranking.reranker_timeout == 30

        with pytest.raises(ValidationError):
            AgroConfigRoot(reranking=RerankingConfig(reranker_timeout=2))

        with pytest.raises(ValidationError):
            AgroConfigRoot(reranking=RerankingConfig(reranker_timeout=100))

    def test_all_100_params_present(self):
        """Verify all 100 params are in AGRO_CONFIG_KEYS."""
        all_params = {
            # Retrieval (15)
            'RRF_K_DIV', 'LANGGRAPH_FINAL_K', 'MAX_QUERY_REWRITES', 'FALLBACK_CONFIDENCE',
            'FINAL_K', 'EVAL_FINAL_K', 'CONF_TOP1', 'CONF_AVG5', 'CONF_ANY',
            'EVAL_MULTI', 'QUERY_EXPANSION_ENABLED', 'BM25_WEIGHT', 'VECTOR_WEIGHT',
            'CARD_SEARCH_ENABLED', 'MULTI_QUERY_M',
            # Scoring (3)
            'CARD_BONUS', 'FILENAME_BOOST_EXACT', 'FILENAME_BOOST_PARTIAL',
            # Layer Bonus (5)
            'LAYER_BONUS_GUI', 'LAYER_BONUS_RETRIEVAL', 'LAYER_BONUS_INDEXER',
            'VENDOR_PENALTY', 'FRESHNESS_BONUS',
            # Embedding (10)
            'EMBEDDING_TYPE', 'EMBEDDING_MODEL', 'EMBEDDING_DIM', 'VOYAGE_MODEL',
            'EMBEDDING_MODEL_LOCAL', 'EMBEDDING_BATCH_SIZE', 'EMBEDDING_MAX_TOKENS',
            'EMBEDDING_CACHE_ENABLED', 'EMBEDDING_TIMEOUT', 'EMBEDDING_RETRY_MAX',
            # Chunking (8)
            'CHUNK_SIZE', 'CHUNK_OVERLAP', 'AST_OVERLAP_LINES', 'MAX_CHUNK_SIZE',
            'MIN_CHUNK_CHARS', 'GREEDY_FALLBACK_TARGET', 'CHUNKING_STRATEGY', 'PRESERVE_IMPORTS',
            # Indexing (9)
            'QDRANT_URL', 'COLLECTION_NAME', 'VECTOR_BACKEND', 'INDEXING_BATCH_SIZE',
            'INDEXING_WORKERS', 'BM25_TOKENIZER', 'BM25_STEMMER_LANG',
            'INDEX_EXCLUDED_EXTS', 'INDEX_MAX_FILE_SIZE_MB',
            # Reranking (12)
            'RERANKER_MODEL', 'AGRO_RERANKER_ENABLED', 'AGRO_RERANKER_ALPHA',
            'AGRO_RERANKER_TOPN', 'AGRO_RERANKER_BATCH', 'AGRO_RERANKER_MAXLEN',
            'AGRO_RERANKER_RELOAD_ON_CHANGE', 'AGRO_RERANKER_RELOAD_PERIOD_SEC',
            'COHERE_RERANK_MODEL', 'VOYAGE_RERANK_MODEL', 'RERANKER_BACKEND', 'RERANKER_TIMEOUT',
            # Generation (10)
            'GEN_MODEL', 'GEN_TEMPERATURE', 'GEN_MAX_TOKENS', 'GEN_TOP_P',
            'GEN_TIMEOUT', 'GEN_RETRY_MAX', 'ENRICH_MODEL', 'ENRICH_BACKEND',
            'ENRICH_DISABLED', 'OLLAMA_NUM_CTX',
            # Enrichment (6)
            'CARDS_ENRICH_DEFAULT', 'CARDS_MAX', 'ENRICH_CODE_CHUNKS',
            'ENRICH_MIN_CHARS', 'ENRICH_MAX_CHARS', 'ENRICH_TIMEOUT',
            # Keywords (5)
            'KEYWORDS_MAX_PER_REPO', 'KEYWORDS_MIN_FREQ', 'KEYWORDS_BOOST',
            'KEYWORDS_AUTO_GENERATE', 'KEYWORDS_REFRESH_HOURS',
            # Tracing (7)
            'TRACING_ENABLED', 'TRACE_SAMPLING_RATE', 'PROMETHEUS_PORT',
            'METRICS_ENABLED', 'ALERT_INCLUDE_RESOLVED', 'ALERT_WEBHOOK_TIMEOUT', 'LOG_LEVEL',
            # Training (6)
            'RERANKER_TRAIN_EPOCHS', 'RERANKER_TRAIN_BATCH', 'RERANKER_TRAIN_LR',
            'RERANKER_WARMUP_RATIO', 'TRIPLETS_MIN_COUNT', 'TRIPLETS_MINE_MODE',
            # UI (4)
            'CHAT_STREAMING_ENABLED', 'CHAT_HISTORY_MAX', 'EDITOR_PORT', 'GRAFANA_DASHBOARD_UID',
        }
        assert len(all_params) == 100, f"Expected 100 params, got {len(all_params)}"
        assert all_params.issubset(AGRO_CONFIG_KEYS), \
            f"Missing params: {all_params - AGRO_CONFIG_KEYS}"
        assert len(AGRO_CONFIG_KEYS) == 100, f"AGRO_CONFIG_KEYS should have 100 items, has {len(AGRO_CONFIG_KEYS)}"


class TestNewParameters:
    """Test the 22 newly added parameters (Keywords, Tracing, Training, UI)."""

    # Keywords tests (5 params)
    def test_keywords_defaults(self):
        """Test Keywords defaults."""
        config = AgroConfigRoot()
        assert config.keywords.keywords_max_per_repo == 50
        assert config.keywords.keywords_min_freq == 3
        assert config.keywords.keywords_boost == 1.3
        assert config.keywords.keywords_auto_generate == 1
        assert config.keywords.keywords_refresh_hours == 24

    def test_keywords_max_per_repo_range(self):
        """Test keywords_max_per_repo range."""
        valid = AgroConfigRoot(keywords=KeywordsConfig(keywords_max_per_repo=100))
        assert valid.keywords.keywords_max_per_repo == 100

        with pytest.raises(ValidationError):
            AgroConfigRoot(keywords=KeywordsConfig(keywords_max_per_repo=5))

        with pytest.raises(ValidationError):
            AgroConfigRoot(keywords=KeywordsConfig(keywords_max_per_repo=600))

    def test_keywords_boost_range(self):
        """Test keywords_boost range."""
        valid = AgroConfigRoot(keywords=KeywordsConfig(keywords_boost=2.0))
        assert valid.keywords.keywords_boost == 2.0

        with pytest.raises(ValidationError):
            AgroConfigRoot(keywords=KeywordsConfig(keywords_boost=0.5))

        with pytest.raises(ValidationError):
            AgroConfigRoot(keywords=KeywordsConfig(keywords_boost=5.0))

    # Tracing tests (7 params)
    def test_tracing_defaults(self):
        """Test Tracing defaults."""
        config = AgroConfigRoot()
        assert config.tracing.tracing_enabled == 1
        assert config.tracing.trace_sampling_rate == 1.0
        assert config.tracing.prometheus_port == 9090
        assert config.tracing.metrics_enabled == 1
        assert config.tracing.alert_include_resolved == 1
        assert config.tracing.alert_webhook_timeout == 5
        assert config.tracing.log_level == "INFO"

    def test_trace_sampling_rate_range(self):
        """Test trace_sampling_rate range."""
        valid = AgroConfigRoot(tracing=TracingConfig(trace_sampling_rate=0.5))
        assert valid.tracing.trace_sampling_rate == 0.5

        with pytest.raises(ValidationError):
            AgroConfigRoot(tracing=TracingConfig(trace_sampling_rate=-0.1))

        with pytest.raises(ValidationError):
            AgroConfigRoot(tracing=TracingConfig(trace_sampling_rate=1.5))

    def test_log_level_enum(self):
        """Test log_level enum validation."""
        valid = AgroConfigRoot(tracing=TracingConfig(log_level="DEBUG"))
        assert valid.tracing.log_level == "DEBUG"

        valid2 = AgroConfigRoot(tracing=TracingConfig(log_level="ERROR"))
        assert valid2.tracing.log_level == "ERROR"

        with pytest.raises(ValidationError):
            AgroConfigRoot(tracing=TracingConfig(log_level="TRACE"))

    def test_prometheus_port_range(self):
        """Test prometheus_port range."""
        valid = AgroConfigRoot(tracing=TracingConfig(prometheus_port=8080))
        assert valid.tracing.prometheus_port == 8080

        with pytest.raises(ValidationError):
            AgroConfigRoot(tracing=TracingConfig(prometheus_port=80))

        with pytest.raises(ValidationError):
            AgroConfigRoot(tracing=TracingConfig(prometheus_port=99999))

    # Training tests (6 params)
    def test_training_defaults(self):
        """Test Training defaults."""
        config = AgroConfigRoot()
        assert config.training.reranker_train_epochs == 2
        assert config.training.reranker_train_batch == 16
        assert config.training.reranker_train_lr == 2e-5
        assert config.training.reranker_warmup_ratio == 0.1
        assert config.training.triplets_min_count == 100
        assert config.training.triplets_mine_mode == "replace"

    def test_reranker_train_epochs_range(self):
        """Test reranker_train_epochs range."""
        valid = AgroConfigRoot(training=TrainingConfig(reranker_train_epochs=10))
        assert valid.training.reranker_train_epochs == 10

        with pytest.raises(ValidationError):
            AgroConfigRoot(training=TrainingConfig(reranker_train_epochs=0))

        with pytest.raises(ValidationError):
            AgroConfigRoot(training=TrainingConfig(reranker_train_epochs=25))

    def test_reranker_train_lr_range(self):
        """Test reranker_train_lr range."""
        valid = AgroConfigRoot(training=TrainingConfig(reranker_train_lr=1e-4))
        assert valid.training.reranker_train_lr == 1e-4

        with pytest.raises(ValidationError):
            AgroConfigRoot(training=TrainingConfig(reranker_train_lr=1e-7))

        with pytest.raises(ValidationError):
            AgroConfigRoot(training=TrainingConfig(reranker_train_lr=1e-2))

    def test_triplets_mine_mode_enum(self):
        """Test triplets_mine_mode enum."""
        valid = AgroConfigRoot(training=TrainingConfig(triplets_mine_mode="append"))
        assert valid.training.triplets_mine_mode == "append"

        with pytest.raises(ValidationError):
            AgroConfigRoot(training=TrainingConfig(triplets_mine_mode="merge"))

    # UI tests (4 params)
    def test_ui_defaults(self):
        """Test UI defaults."""
        config = AgroConfigRoot()
        assert config.ui.chat_streaming_enabled == 1
        assert config.ui.chat_history_max == 50
        assert config.ui.editor_port == 4440
        assert config.ui.grafana_dashboard_uid == "agro-overview"

    def test_chat_history_max_range(self):
        """Test chat_history_max range."""
        valid = AgroConfigRoot(ui=UIConfig(chat_history_max=200))
        assert valid.ui.chat_history_max == 200

        with pytest.raises(ValidationError):
            AgroConfigRoot(ui=UIConfig(chat_history_max=5))

        with pytest.raises(ValidationError):
            AgroConfigRoot(ui=UIConfig(chat_history_max=1000))

    def test_editor_port_range(self):
        """Test editor_port range."""
        valid = AgroConfigRoot(ui=UIConfig(editor_port=8080))
        assert valid.ui.editor_port == 8080

        with pytest.raises(ValidationError):
            AgroConfigRoot(ui=UIConfig(editor_port=80))

        with pytest.raises(ValidationError):
            AgroConfigRoot(ui=UIConfig(editor_port=99999))

    # Roundtrip tests for new params
    def test_new_params_roundtrip(self):
        """Test new params survive to_flat_dict/from_flat_dict roundtrip."""
        original = AgroConfigRoot(
            keywords=KeywordsConfig(
                keywords_max_per_repo=100,
                keywords_boost=2.0
            ),
            tracing=TracingConfig(
                log_level="DEBUG",
                trace_sampling_rate=0.5
            ),
            training=TrainingConfig(
                reranker_train_epochs=5,
                triplets_mine_mode="append"
            ),
            ui=UIConfig(
                chat_history_max=100,
                grafana_dashboard_uid="custom-dashboard"
            )
        )

        flat = original.to_flat_dict()
        assert flat['KEYWORDS_MAX_PER_REPO'] == 100
        assert flat['KEYWORDS_BOOST'] == 2.0
        assert flat['LOG_LEVEL'] == "DEBUG"
        assert flat['TRACE_SAMPLING_RATE'] == 0.5
        assert flat['RERANKER_TRAIN_EPOCHS'] == 5
        assert flat['TRIPLETS_MINE_MODE'] == "append"
        assert flat['CHAT_HISTORY_MAX'] == 100
        assert flat['GRAFANA_DASHBOARD_UID'] == "custom-dashboard"

        reconstructed = AgroConfigRoot.from_flat_dict(flat)
        assert reconstructed.keywords.keywords_max_per_repo == 100
        assert reconstructed.keywords.keywords_boost == 2.0
        assert reconstructed.tracing.log_level == "DEBUG"
        assert reconstructed.tracing.trace_sampling_rate == 0.5
        assert reconstructed.training.reranker_train_epochs == 5
        assert reconstructed.training.triplets_mine_mode == "append"
        assert reconstructed.ui.chat_history_max == 100
        assert reconstructed.ui.grafana_dashboard_uid == "custom-dashboard"


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
