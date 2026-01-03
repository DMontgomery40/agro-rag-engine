---
paths: retrieval/**/*.py
---

# Hybrid Search System

Multi-strategy search combining sparse (BM25) and dense (vector) methods.

## Architecture

```
Query → Query Expansion → BM25 + Vector Search → RRF Fusion → Reranking → Results
```

## Key Files

| File | Lines | Purpose |
|------|-------|---------|
| `retrieval/hybrid_search.py` | 851 | Main search engine, RRF fusion, query routing |
| `retrieval/ast_chunker.py` | 353 | Tree-sitter AST-based code chunking |
| `retrieval/rerank.py` | 633 | Cross-encoder reranking orchestration |
| `retrieval/embed_cache.py` | 74 | Embedding cache layer (Redis) |
| `retrieval/synonym_expander.py` | 160 | Query synonym expansion |
| `reranker/config.py` | 241 | Unified reranker settings loader |

## Primary Functions

```python
from retrieval.hybrid_search import search_routed_multi, search_routed

# Multi-pass search (default) - generates M query variations, merges
results = search_routed_multi(
    query="how does indexing work",
    repo_override="agro",
    m=10,           # Number of query variations
    final_k=5       # Return top K results
)

# Single-pass search
results = search_routed(query, repo, top_k=5)
```

## Configuration (Always via Registry)

```python
from server.services.config_registry import get_config_registry

registry = get_config_registry()
bm25_weight = registry.get_float('BM25_WEIGHT', 0.3)
vector_weight = registry.get_float('VECTOR_WEIGHT', 0.7)
rrf_k = registry.get_int('RRF_K_DIV', 60)
topk_dense = registry.get_int('TOPK_DENSE', 75)
topk_sparse = registry.get_int('TOPK_SPARSE', 75)
```

**Never use `os.getenv()` for config values.**

## Scoring System

### RRF Fusion (Reciprocal Rank Fusion)
```python
# Combines BM25 and vector scores:
score = sum(1 / (k + rank) for each retriever)
# k = RRF_K_DIV (default 60)
```

### Multiplicative Boosts (applied in v2 search)
```python
FILENAME_BOOST_EXACT    # Exact filename/path term match (default 1.5)
FILENAME_BOOST_PARTIAL  # Partial filename/path match (default 1.2)
KEYWORDS_BOOST          # Repo keyword matches (default 1.3)
PATH_BOOSTS             # 6% per boosted path prefix (cap 1.18)
LAYER_INTENT_MATRIX     # Intent→layer multipliers (see agro_config.json)
FILETYPE_BOOSTS         # .py 1.3, ts/tsx/js 1.2, go/rs/java/c/cpp 1.15, md 0.7, txt/rst 0.5
```

Legacy boosts loaded but not currently applied in v2: `CARD_BONUS`, `FRESHNESS_BONUS`, `VENDOR_PENALTY`, and additive `LAYER_BONUS_{GUI,RETRIEVAL,INDEXER}`.

## AST Chunking (`ast_chunker.py`)

Tree-sitter based code chunking with language-aware parsing.

### Supported Languages
Python, JavaScript, TypeScript, Go, Java, Rust, C/C++, Bash, YAML, Markdown

### Key Features
- Function/class extraction from AST nodes
- Import statement tracking (stored in chunk metadata)
- Overlap window controlled by `AST_OVERLAP_LINES` (default 20)
- Fallback to regex-based chunking for unsupported languages

### Chunking Strategies (wired via `CHUNKING_STRATEGY`)
```python
CHUNKING_STRATEGY = 'ast'      # AST-aware (default)
CHUNKING_STRATEGY = 'greedy'   # Fixed-size greedy chunking
CHUNKING_STRATEGY = 'hybrid'   # AST with greedy fallback
```

## Query Classification

Routes queries to domain-specific handlers based on keywords:
- **GUI queries** → boosted results from `web/`, `gui/`
- **Retrieval queries** → boosted results from `retrieval/`
- **Indexer queries** → boosted results from `indexer/`
- **Eval queries** → boosted results from `eval/`
- **Infra queries** → boosted results from `infra/`, `scripts/`

## Module Reload Protocol

Implement `reload_config()` for cached values:

```python
_cached_weights = None

def reload_config():
    global _cached_weights
    _cached_weights = None

def get_weights():
    global _cached_weights
    if _cached_weights is None:
        registry = get_config_registry()
        _cached_weights = {
            'bm25': registry.get_float('BM25_WEIGHT', 0.3),
            'vector': registry.get_float('VECTOR_WEIGHT', 0.7),
        }
    return _cached_weights
```

## File Extensions (Indexed)

`.py`, `.ts`, `.tsx`, `.js`, `.jsx`, `.go`, `.rs`, `.java`, `.c`, `.h`, `.cpp`, `.hpp`, `.rb`, `.sh`, `.yaml`, `.yml`, `.json`, `.toml`, `.sql`

## Skip Lists (Excluded)

- `node_modules/`, `.venv/`, `__pycache__/`
- `build/`, `dist/`, `out/`
- `.git/`, `.env*`
- `tooltips.js`, vendor directories
- Files > `INDEX_MAX_FILE_SIZE_MB` (default 10MB)
