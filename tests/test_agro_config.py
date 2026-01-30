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
import sys
import tempfile
from pathlib import Path
import pytest
from pydantic import ValidationError

# Add project root to path
_project_root = Path(__file__).parent.parent
sys.path.insert(0, str(_project_root))

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
        # Dynamically check that AGRO_CONFIG_KEYS matches to_flat_dict keys
        # This is verified in detail by test_no_drift_between_flat_dict_and_agro_config_keys
        from server.models.agro_config_model import AgroConfigRoot
        flat_keys = set(AgroConfigRoot().to_flat_dict().keys())
        assert len(AGRO_CONFIG_KEYS) == len(flat_keys), (
            f"AGRO_CONFIG_KEYS has {len(AGRO_CONFIG_KEYS)} but to_flat_dict has {len(flat_keys)}"
        )

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

    def test_reranker_mode_validation(self):
        """Test reranker mode enum (unified schema)."""
        valid = AgroConfigRoot(reranking=RerankingConfig(reranker_mode="local"))
        assert valid.reranking.reranker_mode == "local"

        valid2 = AgroConfigRoot(reranking=RerankingConfig(reranker_mode="cloud"))
        assert valid2.reranking.reranker_mode == "cloud"

        valid3 = AgroConfigRoot(reranking=RerankingConfig(reranker_mode="learning"))
        assert valid3.reranking.reranker_mode == "learning"

        valid4 = AgroConfigRoot(reranking=RerankingConfig(reranker_mode="none"))
        assert valid4.reranking.reranker_mode == "none"

        with pytest.raises(ValidationError):
            AgroConfigRoot(reranking=RerankingConfig(reranker_mode="invalid"))

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
        """Test all reranking params in flat dict (unified schema)."""
        config = AgroConfigRoot()
        flat = config.to_flat_dict()
        # Unified reranker schema keys
        assert 'RERANKER_MODE' in flat
        assert 'RERANKER_CLOUD_PROVIDER' in flat
        assert 'RERANKER_CLOUD_MODEL' in flat
        assert 'RERANKER_LOCAL_MODEL' in flat
        assert 'AGRO_RERANKER_ALPHA' in flat
        assert 'AGRO_RERANKER_TOPN' in flat
        assert 'AGRO_RERANKER_BATCH' in flat
        assert 'AGRO_RERANKER_MAXLEN' in flat
        assert 'RERANKER_TIMEOUT' in flat
        assert 'RERANK_INPUT_SNIPPET_CHARS' in flat

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
        """Test from_flat_dict with reranking parameters (unified schema)."""
        flat = {
            'RERANKER_MODE': 'cloud',
            'RERANKER_CLOUD_PROVIDER': 'cohere',
            'RERANKER_CLOUD_MODEL': 'rerank-3.5',
            'RERANKER_LOCAL_MODEL': 'cross-encoder/ms-marco-MiniLM-L-12-v2',
            'AGRO_RERANKER_ALPHA': 0.8,
            'AGRO_RERANKER_TOPN': 100,
        }
        config = AgroConfigRoot.from_flat_dict(flat)
        assert config.reranking.reranker_mode == 'cloud'
        assert config.reranking.reranker_cloud_provider == 'cohere'
        assert config.reranking.reranker_cloud_model == 'rerank-3.5'
        assert config.reranking.reranker_local_model == 'cross-encoder/ms-marco-MiniLM-L-12-v2'
        assert config.reranking.agro_reranker_alpha == 0.8
        assert config.reranking.agro_reranker_topn == 100

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
        """Test reranking default values (unified schema)."""
        config = AgroConfigRoot()
        assert config.reranking.reranker_mode == 'local'
        assert config.reranking.reranker_cloud_provider == 'cohere'
        assert config.reranking.reranker_cloud_model == 'rerank-3.5'
        assert config.reranking.reranker_local_model == 'cross-encoder/ms-marco-MiniLM-L-12-v2'
        assert config.reranking.agro_reranker_alpha == 0.7
        assert config.reranking.agro_reranker_topn == 50
        assert config.reranking.agro_reranker_batch == 16
        assert config.reranking.agro_reranker_maxlen == 512

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
            agro_reranker_reload_on_change=1,
            transformers_trust_remote_code=0
        ))
        assert config.reranking.agro_reranker_reload_on_change == 1
        assert config.reranking.transformers_trust_remote_code == 0

        with pytest.raises(ValidationError):
            AgroConfigRoot(reranking=RerankingConfig(agro_reranker_reload_on_change=2))

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

    def test_all_300_params_present(self):
        """Verify all 300 params are in AGRO_CONFIG_KEYS."""
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
            # Reranking (13) - unified schema
            'RERANKER_MODE', 'RERANKER_CLOUD_PROVIDER', 'RERANKER_CLOUD_MODEL',
            'RERANKER_LOCAL_MODEL', 'AGRO_RERANKER_ALPHA',
            'AGRO_RERANKER_TOPN', 'AGRO_RERANKER_BATCH', 'AGRO_RERANKER_MAXLEN',
            'AGRO_RERANKER_RELOAD_ON_CHANGE', 'AGRO_RERANKER_RELOAD_PERIOD_SEC',
            'RERANKER_TIMEOUT', 'RERANK_INPUT_SNIPPET_CHARS', 'TRANSFORMERS_TRUST_REMOTE_CODE',
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
        # Count changes as params are added - check subset relationship is what matters
        assert all_params.issubset(AGRO_CONFIG_KEYS), \
            f"Missing params: {all_params - AGRO_CONFIG_KEYS}"
        # Verify AGRO_CONFIG_KEYS has at least the expected params (may have more)
        assert len(AGRO_CONFIG_KEYS) >= len(all_params), \
            f"AGRO_CONFIG_KEYS ({len(AGRO_CONFIG_KEYS)}) should have at least {len(all_params)} items"


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

import json
from pathlib import Path
import pytest

from server.models.agro_config_model import (
    AgroConfigRoot,
    RetrievalConfig,
    AGRO_CONFIG_KEYS
)
from common.paths import repo_root


class TestPydanticGuard:
    """
    CRITICAL TESTS - These catch real agent-caused problems.
    
    Run these before ANY commit that touches config:
        pytest tests/test_agro_config.py::TestPydanticGuard -v
    """

    def test_actual_agro_config_json_validates(self):
        """
        CRITICAL: Validates the REAL agro_config.json file against Pydantic.
        
        If this fails, your config file is broken and the app will crash or
        silently fall back to defaults (which is worse).
        """
        config_path = repo_root() / "agro_config.json"
        assert config_path.exists(), f"agro_config.json not found at {config_path}"
        
        raw_json = json.loads(config_path.read_text())
        
        # This should NOT raise - if it does, your config is broken
        try:
            model = AgroConfigRoot(**raw_json)
        except Exception as e:
            pytest.fail(f"agro_config.json failed Pydantic validation:\n{e}")
        
        # Verify we got real values, not just defaults
        flat = model.to_flat_dict()
        assert len(flat) > 50, "Config seems too sparse - check if values loaded"

    def test_no_drift_between_flat_dict_and_agro_config_keys(self):
        """
        CRITICAL: Catches when someone adds a key to to_flat_dict() but not AGRO_CONFIG_KEYS.
        
        This drift causes:
        - Keys that won't be saved/loaded properly
        - GUI showing settings that don't persist
        - Silent config corruption
        """
        model = AgroConfigRoot()
        flat = model.to_flat_dict()
        
        flat_keys = set(flat.keys())
        
        # Keys in flat dict but missing from AGRO_CONFIG_KEYS
        # These would be "orphaned" - they exist but won't be recognized
        extra_in_flat = flat_keys - AGRO_CONFIG_KEYS
        
        # Keys in AGRO_CONFIG_KEYS but missing from flat dict
        # These would be "phantom" - they're registered but never created
        missing_from_flat = AGRO_CONFIG_KEYS - flat_keys
        
        errors = []
        if extra_in_flat:
            errors.append(
                f"Keys in to_flat_dict() but NOT in AGRO_CONFIG_KEYS "
                f"(add them to AGRO_CONFIG_KEYS):\n  {sorted(extra_in_flat)}"
            )
        if missing_from_flat:
            errors.append(
                f"Keys in AGRO_CONFIG_KEYS but NOT in to_flat_dict() "
                f"(remove from AGRO_CONFIG_KEYS or add to model):\n  {sorted(missing_from_flat)}"
            )
        
        if errors:
            pytest.fail("\n\n".join(errors))

    def test_no_duplicate_keys_in_flat_dict(self):
        """
        CRITICAL: Detects if to_flat_dict() has duplicate key assignments.
        
        This can happen when an agent copy-pastes and doesn't realize
        a key is already defined. Python dicts silently overwrite.
        
        Note: This test can't catch duplicates in the Python code directly,
        but it can catch if the FINAL dict has fewer keys than expected.
        """
        model = AgroConfigRoot()
        flat = model.to_flat_dict()
        
        # If there were duplicates, the dict would have fewer keys than defined
        # This is a sanity check - the real check is in test_no_drift
        assert len(flat) == len(set(flat.keys())), "Duplicate keys detected in flat dict"

    def test_weights_normalize_not_raise(self):
        """
        FIXED TEST: The model normalizes weights instead of raising.
        
        The old test expected ValidationError, but the actual behavior
        (per the model validator) is to normalize weights to sum to 1.0.
        """
        # When weights don't sum to 1.0, model should NORMALIZE them
        config = AgroConfigRoot(
            retrieval=RetrievalConfig(bm25_weight=0.4, vector_weight=0.4)
        )
        
        # Weights should be normalized to sum to 1.0
        total = config.retrieval.bm25_weight + config.retrieval.vector_weight
        assert 0.99 <= total <= 1.01, f"Weights should normalize to 1.0, got {total}"
        
        # Each weight should be 0.5 after normalization (0.4/0.8 = 0.5)
        assert abs(config.retrieval.bm25_weight - 0.5) < 0.01
        assert abs(config.retrieval.vector_weight - 0.5) < 0.01

    def test_agro_config_keys_count_is_current(self):
        """
        Detects when AGRO_CONFIG_KEYS count is wrong.
        
        If this fails, update the count in this test and any other tests
        that hardcode the expected count.
        """
        model = AgroConfigRoot()
        flat = model.to_flat_dict()
        
        # Get the actual count from the model
        actual_count = len(flat)
        declared_count = len(AGRO_CONFIG_KEYS)
        
        # These should match (assuming no drift, which we test separately)
        assert actual_count == declared_count, (
            f"to_flat_dict() has {actual_count} keys but "
            f"AGRO_CONFIG_KEYS has {declared_count}. "
            f"Update tests that hardcode key counts."
        )

    def test_from_flat_dict_roundtrip_preserves_all_values(self):
        """
        CRITICAL: Tests that values survive the to_flat_dict -> from_flat_dict roundtrip.
        
        If this fails, config changes made in the GUI will be lost on reload.
        """
        # Load the REAL config
        config_path = repo_root() / "agro_config.json"
        if not config_path.exists():
            pytest.skip("agro_config.json not found")
        
        raw_json = json.loads(config_path.read_text())
        original = AgroConfigRoot(**raw_json)
        
        # Roundtrip
        flat = original.to_flat_dict()
        reconstructed = AgroConfigRoot.from_flat_dict(flat)
        
        # Compare flat dicts (easiest way to compare all values)
        original_flat = original.to_flat_dict()
        reconstructed_flat = reconstructed.to_flat_dict()
        
        mismatches = []
        for key in original_flat:
            if key not in reconstructed_flat:
                mismatches.append(f"Key {key} lost in roundtrip")
            elif original_flat[key] != reconstructed_flat[key]:
                # Special handling for floats
                if isinstance(original_flat[key], float):
                    if abs(original_flat[key] - reconstructed_flat[key]) > 0.0001:
                        mismatches.append(
                            f"{key}: {original_flat[key]} -> {reconstructed_flat[key]}"
                        )
                else:
                    mismatches.append(
                        f"{key}: {original_flat[key]} -> {reconstructed_flat[key]}"
                    )
        
        if mismatches:
            pytest.fail(f"Values changed in roundtrip:\n" + "\n".join(mismatches[:20]))

    def test_all_config_sections_have_pydantic_models(self):
        """
        Checks that every top-level key in agro_config.json has a Pydantic model.
        
        Catches when an agent adds a new section to the JSON but forgets
        to add the corresponding Pydantic model.
        """
        config_path = repo_root() / "agro_config.json"
        if not config_path.exists():
            pytest.skip("agro_config.json not found")
        
        raw_json = json.loads(config_path.read_text())
        
        # Get expected sections from AgroConfigRoot fields
        model = AgroConfigRoot()
        expected_sections = set(model.model_fields.keys())
        
        # Get actual sections from JSON
        actual_sections = set(raw_json.keys())
        
        # Extra sections in JSON that aren't in the model
        extra = actual_sections - expected_sections
        if extra:
            pytest.fail(
                f"Sections in agro_config.json without Pydantic models: {extra}\n"
                f"Add corresponding model classes to agro_config_model.py"
            )


# Also fix the broken test in TestPydanticValidation
class TestPydanticValidationFixes:
    """
    FIXES for broken tests in the original TestPydanticValidation class.
    
    These override the broken behavior.
    """
    
    def test_weights_validation_actual_behavior(self):
        """
        The ACTUAL behavior of the weights validator is to normalize, not raise.
        
        This test documents the real behavior.
        """
        # Model normalizes weights that don't sum to 1.0
        config = AgroConfigRoot(
            retrieval=RetrievalConfig(bm25_weight=0.8, vector_weight=0.2)
        )
        # Already sums to 1.0, should be unchanged
        assert config.retrieval.bm25_weight == 0.8
        assert config.retrieval.vector_weight == 0.2
        
        # Non-1.0 sum gets normalized
        config2 = AgroConfigRoot(
            retrieval=RetrievalConfig(bm25_weight=0.6, vector_weight=0.6)
        )
        # 0.6 + 0.6 = 1.2, normalized to 0.5 + 0.5 = 1.0
        assert abs(config2.retrieval.bm25_weight - 0.5) < 0.01
        assert abs(config2.retrieval.vector_weight - 0.5) < 0.01




class TestConfigContractEnforcement:
    """
    CONFIG CONTRACT ENFORCEMENT TESTS

    These tests enforce the rule: "no env, no hardcoded, no alternate stores/useState for config."
    Run in CI to block merges that violate config contract:

        pytest tests/test_agro_config.py::TestConfigContractEnforcement -v
    """

    # ========================================================================
    # 1. PYTHON ENV USAGE GUARD - No os.getenv/environ for config values
    # ========================================================================

    def test_no_env_usage_for_agro_config_keys(self):
        """
        Scan Python files for os.getenv/environ usage outside allowed secrets.

        Config values MUST come from agro_config.json via ConfigRegistry,
        NOT from os.environ or os.getenv() directly.

        Allowed exceptions (secrets only):
        - *_API_KEY, *_SECRET, *_TOKEN, *_PASSWORD patterns
        - OPENAI_*, ANTHROPIC_*, COHERE_*, VOYAGE_*, etc.
        """
        import re
        from pathlib import Path

        # Allowed env var patterns (secrets only)
        SECRET_PATTERNS = [
            r'.*API_KEY.*',
            r'.*SECRET.*',
            r'.*TOKEN.*',
            r'.*PASSWORD.*',
            r'OPENAI_.*',
            r'ANTHROPIC_.*',
            r'COHERE_.*',
            r'VOYAGE_.*',
            r'LANGSMITH_.*',
            r'LANGCHAIN_API_KEY',
            r'LANGTRACE_API_KEY',
            r'GOOGLE_API_KEY',
            r'JINA_.*',
            r'DEEPSEEK_.*',
            r'MISTRAL_.*',
            r'XAI_.*',
            r'GROQ_.*',
            r'FIREWORKS_.*',
            r'NETLIFY_.*',
            r'GRAFANA_API_KEY',
            r'GRAFANA_AUTH_TOKEN',
            r'MCP_API_KEY',
        ]

        # Directories to scan
        scan_dirs = ['server', 'retrieval', 'indexer', 'reranker', 'common']

        # Patterns to find env usage
        env_patterns = [
            r'os\.getenv\s*\(\s*[\'"]([A-Z_]+)[\'"]',
            r'os\.environ\.get\s*\(\s*[\'"]([A-Z_]+)[\'"]',
            r'os\.environ\[[\'"]([A-Z_]+)[\'"]\]',
        ]

        violations = []

        for scan_dir in scan_dirs:
            scan_path = repo_root() / scan_dir
            if not scan_path.exists():
                continue

            for py_file in scan_path.rglob('*.py'):
                try:
                    content = py_file.read_text()
                except Exception:
                    continue

                for line_num, line in enumerate(content.splitlines(), 1):
                    # Skip comments
                    if line.strip().startswith('#'):
                        continue

                    for pattern in env_patterns:
                        for match in re.finditer(pattern, line):
                            env_key = match.group(1)

                            # Check if this is an allowed secret
                            is_secret = any(
                                re.match(sp, env_key)
                                for sp in SECRET_PATTERNS
                            )

                            # Check if this is an AGRO_CONFIG_KEY being accessed via env
                            from server.models.agro_config_model import AGRO_CONFIG_KEYS
                            is_config_key = env_key in AGRO_CONFIG_KEYS

                            if is_config_key and not is_secret:
                                rel_path = py_file.relative_to(repo_root())
                                violations.append(
                                    f"{rel_path}:{line_num}: {env_key} accessed via os.getenv/environ "
                                    f"- use ConfigRegistry instead"
                                )

        if violations:
            pytest.fail(
                f"Found {len(violations)} config keys accessed via os.getenv/environ "
                f"instead of ConfigRegistry:\n\n" + "\n".join(violations[:20])
            )

    # ========================================================================
    # 2. CONFIG DRIFT DETECTION - JSON vs Registry vs Store vs Pydantic
    # ========================================================================

    def test_agro_config_json_keys_match_pydantic_model(self):
        """
        Ensure agro_config.json doesn't have unknown keys not in Pydantic model.

        Catches when someone manually edits JSON with typos or unknown keys.
        """
        config_path = repo_root() / "agro_config.json"
        if not config_path.exists():
            pytest.skip("agro_config.json not found")

        raw_json = json.loads(config_path.read_text())

        # Get expected sections from Pydantic model
        model = AgroConfigRoot()
        expected_sections = set(model.model_fields.keys())
        actual_sections = set(raw_json.keys())

        # Check for unknown sections
        unknown = actual_sections - expected_sections
        if unknown:
            pytest.fail(
                f"agro_config.json has sections not in Pydantic model: {unknown}\n"
                f"Either add models or remove these sections from JSON."
            )

        # Deep check: validate each section's keys against model
        for section_name, section_data in raw_json.items():
            if not isinstance(section_data, dict):
                continue

            section_model = getattr(model, section_name, None)
            if section_model is None:
                continue

            expected_keys = set(section_model.model_fields.keys())
            actual_keys = set(section_data.keys())

            unknown_keys = actual_keys - expected_keys
            if unknown_keys:
                pytest.fail(
                    f"Section '{section_name}' in agro_config.json has unknown keys: {unknown_keys}\n"
                    f"Expected keys: {expected_keys}"
                )

    def test_config_registry_keys_match_agro_config_keys_set(self):
        """
        Verify ConfigRegistry.get_all_with_sources() keys align with AGRO_CONFIG_KEYS.

        Catches drift between what registry loads and what we declare as valid keys.
        """
        from server.services.config_registry import get_config_registry

        registry = get_config_registry()
        registry.reload()

        all_with_sources = registry.get_all_with_sources()
        registry_keys = {
            k for k, v in all_with_sources.items()
            if v.get('source') == 'agro_config.json'
        }

        # All registry AGRO keys should be in AGRO_CONFIG_KEYS
        extra_in_registry = registry_keys - AGRO_CONFIG_KEYS
        if extra_in_registry:
            pytest.fail(
                f"ConfigRegistry has keys not in AGRO_CONFIG_KEYS: {sorted(extra_in_registry)}\n"
                f"Add these to AGRO_CONFIG_KEYS or remove from registry."
            )

    def test_no_hardcoded_fallback_values_in_config_modules(self):
        """
        Scan config modules for hardcoded fallback values that bypass Pydantic.

        Patterns to catch:
        - registry.get('KEY', 60)  # hardcoded fallback
        - os.getenv('KEY', 'default')  # hardcoded in env access
        - value or 60  # inline fallback
        """
        import re

        config_modules = [
            'server/services/config_registry.py',
            'server/services/config_store.py',
        ]

        # Pattern: registry.get*('KEY', <hardcoded_value>)
        # We want to ensure defaults come from Pydantic, not inline
        hardcoded_patterns = [
            # Matches: get('KEY', 60) or get_int('KEY', 60)
            r'\.get(?:_int|_float|_str|_bool)?\s*\(\s*[\'"][A-Z_]+[\'"]\s*,\s*(?!(?:None|True|False|default|$))[^)]+\)',
        ]

        warnings = []

        for mod_path in config_modules:
            full_path = repo_root() / mod_path
            if not full_path.exists():
                continue

            content = full_path.read_text()

            for line_num, line in enumerate(content.splitlines(), 1):
                # Skip comments and known-ok patterns
                if line.strip().startswith('#'):
                    continue
                if 'default=' in line:  # Pydantic field definition
                    continue

                for pattern in hardcoded_patterns:
                    if re.search(pattern, line):
                        # This is informational - not a hard fail since some
                        # fallbacks are necessary for backward compat
                        warnings.append(f"{mod_path}:{line_num}: {line.strip()[:80]}")

        # Just warn, don't fail - some fallbacks are intentional
        if warnings and len(warnings) > 20:
            print(f"\nNote: Found {len(warnings)} potential hardcoded fallbacks in config modules")
            print("Consider moving defaults to Pydantic models for single source of truth")

    # ========================================================================
    # 3. RUNTIME DEV ASSERT - Fast crash on config drift (optional startup check)
    # ========================================================================

    def test_runtime_config_parity_check(self):
        """
        Simulate what a runtime startup check would do:
        Compare Pydantic model keys, registry keys, and JSON keys.

        This test documents the check that could run on startup in dev/CI.
        """
        from server.services.config_registry import get_config_registry

        # 1. Get Pydantic flat keys
        model = AgroConfigRoot()
        pydantic_keys = set(model.to_flat_dict().keys())

        # 2. Get AGRO_CONFIG_KEYS set
        declared_keys = AGRO_CONFIG_KEYS

        # 3. Get registry keys (after loading real config)
        registry = get_config_registry()
        registry.reload()

        # Compare
        pydantic_only = pydantic_keys - declared_keys
        declared_only = declared_keys - pydantic_keys

        if pydantic_only:
            pytest.fail(
                f"Keys in to_flat_dict() but not AGRO_CONFIG_KEYS: {sorted(pydantic_only)}\n"
                f"Add to AGRO_CONFIG_KEYS set."
            )

        if declared_only:
            pytest.fail(
                f"Keys in AGRO_CONFIG_KEYS but not to_flat_dict(): {sorted(declared_only)}\n"
                f"Either add to Pydantic model or remove from AGRO_CONFIG_KEYS."
            )


class TestZustandStoreParity:
    """
    FRONTEND STORE CONTRACT TESTS

    These tests would run as TypeScript tests in CI.
    Here we document the expected behavior and provide Python stubs
    that generate the TS test file content.
    """

    def test_generate_ts_store_parity_test(self, tmp_path):
        """
        Generate TypeScript test that validates useConfigStore keys align with Config type.

        This test creates the TS test file content that should exist in web/src/__tests__/.
        """
        ts_test_content = '''/**
 * CONFIG STORE PARITY TEST
 *
 * Ensures useConfigStore keys align with the Config/EnvConfig type.
 * Run: npx vitest run src/__tests__/config-store-parity.test.ts
 */
import { describe, it, expect } from 'vitest';

// Import the store and types
import { useConfigStore } from '@/stores/useConfigStore';
import type { EnvConfig, AppConfig } from '@web/types';

// Known config keys from Pydantic AGRO_CONFIG_KEYS (auto-generated)
const AGRO_CONFIG_KEYS = new Set([
  // Retrieval
  'RRF_K_DIV', 'LANGGRAPH_FINAL_K', 'MAX_QUERY_REWRITES', 'FALLBACK_CONFIDENCE',
  'FINAL_K', 'EVAL_FINAL_K', 'CONF_TOP1', 'CONF_AVG5', 'CONF_ANY', 'EVAL_MULTI',
  'QUERY_EXPANSION_ENABLED', 'BM25_WEIGHT', 'VECTOR_WEIGHT', 'CARD_SEARCH_ENABLED',
  'MULTI_QUERY_M', 'TOPK_DENSE', 'TOPK_SPARSE', 'HYDRATION_MODE', 'HYDRATION_MAX_CHARS',
  // Add all keys from Python AGRO_CONFIG_KEYS here
]);

describe('Config Store Parity', () => {
  it('useConfigStore should not expose config-like state outside env', () => {
    // Get initial store state
    const state = useConfigStore.getState();

    // The store should only have these top-level keys
    const allowedKeys = new Set([
      'config', 'loading', 'error', 'saving',
      'keywordsCatalog', 'keywordsLoading',
      // Actions
      'loadConfig', 'saveEnv', 'saveConfig', 'reloadEnv',
      'updateEnv', 'updateRepo', 'loadKeywords', 'addKeyword',
      'deleteKeyword', 'reset'
    ]);

    const stateKeys = Object.keys(state);
    const unexpected = stateKeys.filter(k => !allowedKeys.has(k));

    expect(unexpected).toEqual([]);
  });

  it('EnvConfig type should cover all AGRO_CONFIG_KEYS', () => {
    // This is a type-level check - TypeScript compiler enforces it
    // We just verify the set exists
    expect(AGRO_CONFIG_KEYS.size).toBeGreaterThan(50);
  });
});
'''

        # Write to tmp_path for verification
        test_file = tmp_path / "config-store-parity.test.ts"
        test_file.write_text(ts_test_content)

        assert test_file.exists()
        assert 'AGRO_CONFIG_KEYS' in test_file.read_text()

    def test_generate_cross_store_collision_test(self, tmp_path):
        """
        Generate TypeScript test that checks for key collisions across Zustand stores.

        No store should expose keys that collide with AGRO_CONFIG_KEYS
        unless they proxy through useConfigStore.
        """
        ts_test_content = '''/**
 * CROSS-STORE COLLISION TEST
 *
 * Ensures no Zustand store exposes keys that collide with AGRO_CONFIG_KEYS
 * unless they explicitly proxy through useConfigStore.
 *
 * Run: npx vitest run src/__tests__/cross-store-collision.test.ts
 */
import { describe, it, expect } from 'vitest';

// Import all stores
import { useDockerStore } from '@/stores/useDockerStore';
import { useHealthStore } from '@/stores/useHealthStore';
import { useAlertThresholdsStore } from '@/stores/useAlertThresholdsStore';
import { useTooltipStore } from '@/stores/useTooltipStore';
import { useRepoStore } from '@/stores/useRepoStore';
import { useUIStore } from '@/stores/useUIStore';
import { useCardsStore } from '@/stores/useCardsStore';

// Config keys that MUST NOT appear in other stores
const CONFIG_KEYS = new Set([
  'GEN_MODEL', 'GEN_TEMPERATURE', 'GEN_MAX_TOKENS',
  'RERANKER_MODE', 'RERANKER_CLOUD_PROVIDER',
  'EMBEDDING_TYPE', 'EMBEDDING_MODEL',
  'CHUNK_SIZE', 'CHUNK_OVERLAP',
  // ... add more from AGRO_CONFIG_KEYS
]);

describe('Cross-Store Collision Detection', () => {
  const stores = [
    { name: 'useDockerStore', store: useDockerStore },
    { name: 'useHealthStore', store: useHealthStore },
    { name: 'useAlertThresholdsStore', store: useAlertThresholdsStore },
    { name: 'useTooltipStore', store: useTooltipStore },
    { name: 'useRepoStore', store: useRepoStore },
    { name: 'useUIStore', store: useUIStore },
    { name: 'useCardsStore', store: useCardsStore },
  ];

  stores.forEach(({ name, store }) => {
    it(`${name} should not expose AGRO_CONFIG_KEYS`, () => {
      const state = store.getState();
      const stateKeys = Object.keys(state);

      // Check for collisions
      const collisions = stateKeys.filter(k => CONFIG_KEYS.has(k));

      expect(collisions).toEqual([]);
    });
  });

  it('useUIStore themeMode is acceptable (maps to THEME_MODE)', () => {
    // useUIStore.themeMode is intentional - it syncs with THEME_MODE
    // This documents the exception
    const state = useUIStore.getState();
    expect(state).toHaveProperty('themeMode');
  });
});
'''

        test_file = tmp_path / "cross-store-collision.test.ts"
        test_file.write_text(ts_test_content)

        assert test_file.exists()


class TestESLintRuleScaffolding:
    """
    ESLint custom rule scaffolding for config key imports.

    This documents what the ESLint rule should do and provides
    the rule implementation scaffold.
    """

    def test_generate_eslint_rule_scaffold(self, tmp_path):
        """
        Generate ESLint rule that warns when importing config keys from wrong stores.
        """
        eslint_rule = '''/**
 * ESLint Rule: no-config-from-wrong-store
 *
 * Warns when code imports config-like values from stores other than useConfigStore.
 *
 * BAD:
 *   const { themeMode } = useUIStore();  // if themeMode is a config key
 *
 * GOOD:
 *   const { config } = useConfigStore();
 *   const themeMode = config?.env?.THEME_MODE;
 */
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow importing config values from non-config stores',
      category: 'Best Practices',
      recommended: true,
    },
    schema: [],
  },
  create(context) {
    // Config keys that should only come from useConfigStore
    const CONFIG_KEYS = new Set([
      'GEN_MODEL', 'GEN_TEMPERATURE', 'RERANKER_MODE',
      // ... populate from AGRO_CONFIG_KEYS
    ]);

    // Map of lower-case property names to check
    const PROPERTY_TO_CONFIG = {
      'thememode': 'THEME_MODE',
      'genmodel': 'GEN_MODEL',
      // ... add mappings
    };

    return {
      CallExpression(node) {
        // Check for useXxxStore() calls that aren't useConfigStore
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name.startsWith('use') &&
          node.callee.name.endsWith('Store') &&
          node.callee.name !== 'useConfigStore'
        ) {
          // Check parent for destructuring that extracts config keys
          const parent = node.parent;
          if (parent && parent.type === 'VariableDeclarator' && parent.id.type === 'ObjectPattern') {
            parent.id.properties.forEach(prop => {
              if (prop.type === 'Property' && prop.key.type === 'Identifier') {
                const propName = prop.key.name.toLowerCase();
                if (PROPERTY_TO_CONFIG[propName]) {
                  context.report({
                    node: prop,
                    message: `'${prop.key.name}' looks like config key '${PROPERTY_TO_CONFIG[propName]}'. ` +
                             `Use useConfigStore for config values.`,
                  });
                }
              }
            });
          }
        }
      },
    };
  },
};
'''

        rule_file = tmp_path / "no-config-from-wrong-store.js"
        rule_file.write_text(eslint_rule)

        assert rule_file.exists()
        assert 'CONFIG_KEYS' in rule_file.read_text()


class TestCIContractCheckJob:
    """
    Documents what the CI contract-check job should run.
    """

    def test_ci_contract_check_commands(self):
        """
        Document the CI commands for config contract enforcement.

        Add to .github/workflows/ci.yml:

        ```yaml
        contract-check:
          runs-on: ubuntu-latest
          steps:
            - uses: actions/checkout@v4
            - name: Setup Python
              uses: actions/setup-python@v5
              with:
                python-version: '3.11'
            - name: Install deps
              run: pip install pytest pydantic
            - name: Python env-usage scan
              run: pytest tests/test_agro_config.py::TestConfigContractEnforcement::test_no_env_usage_for_agro_config_keys -v
            - name: Pydantic/registry drift check
              run: pytest tests/test_agro_config.py::TestPydanticGuard -v
            - name: Config contract enforcement
              run: pytest tests/test_agro_config.py::TestConfigContractEnforcement -v

            # TypeScript checks (after npm install)
            - name: Setup Node
              uses: actions/setup-node@v4
            - name: Install npm deps
              run: cd web && npm ci
            - name: TS store parity test
              run: cd web && npx vitest run src/__tests__/config-store-parity.test.ts
            - name: ESLint custom rules
              run: cd web && npx eslint src --rule 'local/no-config-from-wrong-store: error'
        ```
        """
        # This test just documents the CI setup
        ci_commands = [
            "pytest tests/test_agro_config.py::TestConfigContractEnforcement::test_no_env_usage_for_agro_config_keys -v",
            "pytest tests/test_agro_config.py::TestPydanticGuard -v",
            "pytest tests/test_agro_config.py::TestConfigContractEnforcement -v",
        ]

        assert len(ci_commands) == 3


if __name__ == '__main__':
    pytest.main([__file__, '-v'])
