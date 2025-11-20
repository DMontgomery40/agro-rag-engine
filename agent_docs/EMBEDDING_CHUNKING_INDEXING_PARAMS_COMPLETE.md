# Embedding, Chunking & Indexing Parameters Implementation - COMPLETE

**Date:** 2025-11-20
**Agent:** Code Implementation Agent
**Task:** Implement 27 new embedding, chunking, and indexing parameters in agro_config.json system

---

## SUMMARY

Successfully implemented 27 new tunable parameters across three categories:
- **Embedding** (10 parameters)
- **Chunking** (8 parameters)
- **Indexing** (9 parameters)

**Total Test Coverage:** 86 tests passing (59 existing + 27 new)
**Total AGRO_CONFIG_KEYS:** 78 (23 original + 28 reranking/generation/enrichment + 27 new)

---

## FILES MODIFIED

### 1. server/models/agro_config_model.py
**Changes:**
- Added `EmbeddingConfig` class with 10 fields
- Added `ChunkingConfig` class with 8 fields
- Added `IndexingConfig` class with 9 fields
- Updated `AgroConfigRoot` to include embedding, chunking, indexing sections
- Updated `AGRO_CONFIG_KEYS` set: 51 → 78 keys (+27)
- Updated `to_flat_dict()` method with 27 new mappings
- Updated `from_flat_dict()` method with 27 new mappings
- Added custom validators:
  - `EmbeddingConfig.validate_dim_matches_model()` - ensures embedding_dim is standard
  - `ChunkingConfig.validate_overlap_less_than_size()` - ensures chunk_overlap < chunk_size

**Line Count:** +320 lines

### 2. agro_config.json
**Changes:**
- Added `embedding` section with 10 parameters
- Added `chunking` section with 8 parameters
- Added `indexing` section with 9 parameters

**Line Count:** +34 lines

### 3. tests/test_agro_config.py
**Changes:**
- Updated imports to include `EmbeddingConfig`, `ChunkingConfig`, `IndexingConfig`
- Added 27 new test methods:
  - `test_embedding_type_validation()`
  - `test_embedding_dim_validation()`
  - `test_embedding_batch_size_range()`
  - `test_embedding_max_tokens_range()`
  - `test_embedding_cache_enabled_validation()`
  - `test_embedding_timeout_range()`
  - `test_embedding_retry_max_range()`
  - `test_chunk_overlap_validation()`
  - `test_chunk_size_range()`
  - `test_ast_overlap_lines_range()`
  - `test_chunking_strategy_validation()`
  - `test_preserve_imports_validation()`
  - `test_vector_backend_validation()`
  - `test_bm25_tokenizer_validation()`
  - `test_indexing_batch_size_range()`
  - `test_indexing_workers_range()`
  - `test_index_max_file_size_mb_range()`
  - `test_embedding_params_in_flat_dict()`
  - `test_chunking_params_in_flat_dict()`
  - `test_indexing_params_in_flat_dict()`
  - `test_embedding_defaults()`
  - `test_chunking_defaults()`
  - `test_indexing_defaults()`
  - `test_from_flat_dict_with_embedding_params()`
  - `test_from_flat_dict_with_chunking_params()`
  - `test_from_flat_dict_with_indexing_params()`
  - `test_embedding_chunking_indexing_roundtrip()`
- Updated `test_keys_complete()` to verify 78 total keys
- Fixed `test_no_secret_keys()` to avoid false positive on BM25_TOKENIZER

**Line Count:** +370 lines

---

## NEW PARAMETERS (27 TOTAL)

### Embedding Category (10 params)

| Parameter | Default | Range/Options | Description |
|-----------|---------|---------------|-------------|
| `embedding_type` | `"openai"` | `openai\|voyage\|local\|mxbai` | Embedding provider |
| `embedding_model` | `"text-embedding-3-large"` | string | OpenAI embedding model |
| `embedding_dim` | `3072` | `512-3072` (standard dims only) | Embedding dimensions |
| `voyage_model` | `"voyage-code-3"` | string | Voyage embedding model |
| `embedding_model_local` | `"all-MiniLM-L6-v2"` | string | Local SentenceTransformer model |
| `embedding_batch_size` | `64` | `1-256` | Batch size for embedding generation |
| `embedding_max_tokens` | `8000` | `512-8192` | Max tokens per embedding chunk |
| `embedding_cache_enabled` | `1` | `0\|1` | Enable embedding cache |
| `embedding_timeout` | `30` | `5-120` | Embedding API timeout (seconds) |
| `embedding_retry_max` | `3` | `1-5` | Max retries for embedding API |

### Chunking Category (8 params)

| Parameter | Default | Range/Options | Description |
|-----------|---------|---------------|-------------|
| `chunk_size` | `1000` | `200-5000` | Target chunk size (non-whitespace chars) |
| `chunk_overlap` | `200` | `0-1000` | Overlap between chunks |
| `ast_overlap_lines` | `20` | `0-100` | Overlap lines for AST chunking |
| `max_chunk_size` | `2000000` | `10000-10000000` | Max file size to chunk (bytes) |
| `min_chunk_chars` | `50` | `10-500` | Minimum chunk size |
| `greedy_fallback_target` | `800` | `200-2000` | Target size for greedy chunking |
| `chunking_strategy` | `"ast"` | `ast\|greedy\|hybrid` | Chunking strategy |
| `preserve_imports` | `1` | `0\|1` | Include imports in chunks |

### Indexing Category (9 params)

| Parameter | Default | Range/Options | Description |
|-----------|---------|---------------|-------------|
| `qdrant_url` | `"http://127.0.0.1:6333"` | string | Qdrant server URL |
| `collection_name` | `"code_chunks_{repo}"` | string | Qdrant collection name template |
| `vector_backend` | `"qdrant"` | `qdrant\|chroma\|weaviate` | Vector database backend |
| `indexing_batch_size` | `100` | `10-1000` | Batch size for indexing |
| `indexing_workers` | `4` | `1-16` | Parallel workers for indexing |
| `bm25_tokenizer` | `"stemmer"` | `stemmer\|lowercase\|whitespace` | BM25 tokenizer type |
| `bm25_stemmer_lang` | `"english"` | string | Stemmer language |
| `index_excluded_exts` | `".png,.jpg,.gif,..."` | string | Excluded file extensions (comma-separated) |
| `index_max_file_size_mb` | `10` | `1-100` | Max file size to index (MB) |

---

## TEST RESULTS

```bash
$ pytest tests/test_agro_config.py -v
============================= test session starts ==============================
collected 86 items

tests/test_agro_config.py::TestPydanticValidation::test_default_values PASSED
tests/test_agro_config.py::TestPydanticValidation::test_rrf_k_div_validation PASSED
tests/test_agro_config.py::TestPydanticValidation::test_filename_boost_validation PASSED
...
tests/test_agro_config.py::TestPydanticValidation::test_embedding_type_validation PASSED
tests/test_agro_config.py::TestPydanticValidation::test_embedding_dim_validation PASSED
tests/test_agro_config.py::TestPydanticValidation::test_chunk_overlap_validation PASSED
tests/test_agro_config.py::TestPydanticValidation::test_vector_backend_validation PASSED
...
tests/test_agro_config.py::TestAgroConfigKeys::test_keys_complete PASSED
tests/test_agro_config.py::TestAgroConfigKeys::test_no_secret_keys PASSED

======================== 86 passed, 1 warning in 0.15s =========================
```

**Result:** ✅ ALL 86 TESTS PASSING

---

## VALIDATION FEATURES

### Pydantic Validators Implemented

1. **Embedding Dimension Validator**
   - Ensures `embedding_dim` is one of: [128, 256, 384, 512, 768, 1024, 1536, 3072]
   - Prevents uncommon dimensions that might indicate misconfiguration

2. **Chunk Overlap Validator**
   - Ensures `chunk_overlap < chunk_size`
   - Prevents invalid chunking configuration

3. **Enum Validators**
   - `embedding_type`: openai|voyage|local|mxbai
   - `chunking_strategy`: ast|greedy|hybrid
   - `vector_backend`: qdrant|chroma|weaviate
   - `bm25_tokenizer`: stemmer|lowercase|whitespace

4. **Range Validators**
   - All numeric parameters have `ge` (greater-than-or-equal) and `le` (less-than-or-equal) constraints
   - Prevents out-of-range values at validation time

---

## USAGE EXAMPLES

### Via ConfigRegistry (Recommended)

```python
from server.services.config_registry import get_config_registry

registry = get_config_registry()

# Get embedding settings
embedding_type = registry.get_str('EMBEDDING_TYPE', 'openai')
embedding_dim = registry.get_int('EMBEDDING_DIM', 3072)
batch_size = registry.get_int('EMBEDDING_BATCH_SIZE', 64)

# Get chunking settings
chunk_size = registry.get_int('CHUNK_SIZE', 1000)
chunk_overlap = registry.get_int('CHUNK_OVERLAP', 200)
strategy = registry.get_str('CHUNKING_STRATEGY', 'ast')

# Get indexing settings
qdrant_url = registry.get_str('QDRANT_URL', 'http://127.0.0.1:6333')
indexing_workers = registry.get_int('INDEXING_WORKERS', 4)
```

### Via AgroConfigRoot (Direct)

```python
from server.models.agro_config_model import AgroConfigRoot
import json

# Load from agro_config.json
with open('agro_config.json') as f:
    config = AgroConfigRoot(**json.load(f))

# Access nested config
print(config.embedding.embedding_type)  # "openai"
print(config.chunking.chunk_size)       # 1000
print(config.indexing.qdrant_url)       # "http://127.0.0.1:6333"

# Convert to flat dict for backward compatibility
flat = config.to_flat_dict()
print(flat['EMBEDDING_TYPE'])  # "openai"
print(flat['CHUNK_SIZE'])      # 1000
```

### Updating Configuration

```python
from server.services.config_registry import get_config_registry

registry = get_config_registry()

# Update multiple params at once
registry.update_agro_config({
    'EMBEDDING_DIM': 1536,           # Switch to smaller embeddings
    'CHUNK_SIZE': 1500,              # Increase chunk size
    'INDEXING_WORKERS': 8,           # More parallel workers
})

# File is automatically saved to agro_config.json
```

---

## INTEGRATION NOTES

### Module-Level Caching Pattern (Recommended for Future Work)

For files that use these parameters frequently, implement module-level caching:

```python
from server.services.config_registry import get_config_registry

# Module-level cached configuration
_config_registry = get_config_registry()
_EMBEDDING_TYPE = _config_registry.get_str('EMBEDDING_TYPE', 'openai')
_EMBEDDING_DIM = _config_registry.get_int('EMBEDDING_DIM', 3072)
_CHUNK_SIZE = _config_registry.get_int('CHUNK_SIZE', 1000)

def reload_config():
    """Reload all cached config values."""
    global _EMBEDDING_TYPE, _EMBEDDING_DIM, _CHUNK_SIZE
    _EMBEDDING_TYPE = _config_registry.get_str('EMBEDDING_TYPE', 'openai')
    _EMBEDDING_DIM = _config_registry.get_int('EMBEDDING_DIM', 3072)
    _CHUNK_SIZE = _config_registry.get_int('CHUNK_SIZE', 1000)
```

**Files that could benefit from this pattern:**
- `indexer/index_repo.py` (uses embedding and indexing params)
- `retrieval/ast_chunker.py` (uses chunking params)
- `retrieval/embed_cache.py` (uses embedding params)

---

## BACKWARD COMPATIBILITY

All changes are backward compatible:
- ✅ Existing code using environment variables continues to work
- ✅ `.env` values take precedence over `agro_config.json`
- ✅ Default values match current hardcoded values
- ✅ `to_flat_dict()` and `from_flat_dict()` maintain API compatibility

---

## NEXT STEPS (OPTIONAL)

1. **Add module-level caching** to indexer/ast_chunker/embed_cache files
2. **Update GUI** to expose these parameters in Admin → RAG Config
3. **Add API endpoints** for runtime parameter updates
4. **Create migration script** to populate agro_config.json from existing .env values

---

## VERIFICATION COMMAND

```bash
# Run all config tests
pytest tests/test_agro_config.py -v

# Quick validation
python3 -c "
from server.models.agro_config_model import AgroConfigRoot, AGRO_CONFIG_KEYS
c = AgroConfigRoot()
print(f'Total keys: {len(AGRO_CONFIG_KEYS)}')
print(f'Embedding: {c.embedding.embedding_type}')
print(f'Chunking: {c.chunking.chunk_size}')
print(f'Indexing: {c.indexing.qdrant_url}')
print('✅ All configs loaded successfully!')
"
```

---

## COMPLETION CHECKLIST

- [x] EmbeddingConfig class created with 10 parameters
- [x] ChunkingConfig class created with 8 parameters
- [x] IndexingConfig class created with 9 parameters
- [x] AgroConfigRoot updated with new sections
- [x] AGRO_CONFIG_KEYS updated (+27 keys, now 78 total)
- [x] to_flat_dict() updated with 27 new mappings
- [x] from_flat_dict() updated with 27 new mappings
- [x] agro_config.json updated with 3 new sections
- [x] 27 new test methods added
- [x] All 86 tests passing
- [x] Pydantic validation working (enums, ranges, custom validators)
- [x] Documentation updated

---

**STATUS: ✅ COMPLETE**

All 27 embedding, chunking, and indexing parameters have been successfully implemented, tested, and integrated into the agro_config.json system. The implementation follows the established pattern and maintains backward compatibility with existing code.
