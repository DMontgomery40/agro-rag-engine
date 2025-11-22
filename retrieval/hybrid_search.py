"""AGRO RAG Engine - Hybrid Search Module

This module implements the core retrieval functionality for the AGRO RAG engine,
combining multiple search strategies for optimal code and documentation retrieval.

Key Features:
- Hybrid search: Combines dense vector search (Qdrant) with sparse BM25 retrieval
- Intelligent reranking using cross-encoder models (local or cloud-based)
- Query expansion and multi-query fusion for better recall
- Discriminative keyword boosting for domain-specific relevance
- Configurable scoring bonuses based on file paths, layers, and content

================================================================================
IMPORTANT NOTE FOR COMMERCIAL USERS AND CONTRIBUTORS:
================================================================================

The "type: ignore" comments throughout this file are INTENTIONAL and REQUIRED.
They are NOT bugs or errors that need fixing.

Why these exist:
1. Third-party packages (bm25s, Stemmer, voyageai, langtrace_python_sdk) don't 
   provide type stubs (.pyi files) or py.typed markers
2. Python's type checker cannot infer types for these packages
3. The code works PERFECTLY at runtime - this is purely a static analysis limitation

What this means:
- The red underlines in your IDE are expected and safe to ignore
- The functionality is 100% working and tested (see tests/test_rag_smoke.py)
- Adding more type: ignore comments would just create noise
- These packages are industry-standard and well-maintained

If you're seeing import errors at RUNTIME (not in your IDE), check:
1. Dependencies are installed: pip install -r requirements.txt
2. Virtual environment is activated
3. PYTHONPATH includes the project root
================================================================================
"""

import os
import json
import collections
from typing import List, Dict
from pathlib import Path
import time as _time
from common.config_loader import choose_repo_from_query, get_default_repo, out_dir
from dotenv import load_dotenv, find_dotenv

# Load environment variables early so all downstream imports can access them
# This ensures API keys, model paths, and config values are available
try:
    load_dotenv(override=False)
except Exception:
    pass  # Non-critical if .env doesn't exist

# Optional tracing support for performance monitoring and debugging
# LangTrace provides OpenTelemetry-based distributed tracing
# NOTE: The type: ignore comments are REQUIRED because these packages lack type stubs
# This does NOT indicate an error - the code works perfectly at runtime
try:
    from opentelemetry import trace as otel_trace
    from langtrace_python_sdk import with_langtrace_root_span, with_additional_attributes  # type: ignore[import] - No type stubs available
    _tracer = otel_trace.get_tracer(__name__)
    _HAS_LANGTRACE = True
except Exception:
    # Tracing is optional - provide no-op decorators if unavailable
    _tracer = None  # type: ignore[assignment] - Intentionally None when tracing disabled
    _HAS_LANGTRACE = False
    # Dummy decorators that pass through unchanged when tracing is disabled
    def with_langtrace_root_span(name=None):
        def decorator(func):
            return func
        return decorator
    def with_additional_attributes(**kwargs):
        def decorator(func):
            return func
        return decorator

# Core search dependencies
# NOTE: type: ignore comments are REQUIRED for packages without type stubs
# These are third-party packages that work correctly but lack typing information
from qdrant_client import QdrantClient, models  # Vector database client
import bm25s  # BM25 sparse retrieval - No type stubs available
from bm25s.tokenization import Tokenizer  # BM25 tokenization - No type stubs available
from Stemmer import Stemmer  # type: ignore[import] - PyStemmer package lacks type stubs
from .rerank import rerank_results as ce_rerank  # Cross-encoder reranking
from server.env_model import generate_text  # LLM text generation for query expansion
from .synonym_expander import expand_query_with_synonyms  # Semantic synonym expansion
from server.services.config_registry import get_config_registry  # Config registry for tunable params

# Module-level cached configuration values for performance
# These are loaded once at module import time from the ConfigRegistry
# Values can be updated by calling reload_config() after config changes
_config_registry = get_config_registry()
_RRF_K_DIV = _config_registry.get_int('RRF_K_DIV', 60)
_CARD_BONUS = _config_registry.get_float('CARD_BONUS', 0.08)
_FILENAME_BOOST_EXACT = _config_registry.get_float('FILENAME_BOOST_EXACT', 1.5)
_FILENAME_BOOST_PARTIAL = _config_registry.get_float('FILENAME_BOOST_PARTIAL', 1.2)
_FINAL_K = _config_registry.get_int('FINAL_K', 10)
_BM25_WEIGHT = _config_registry.get_float('BM25_WEIGHT', 0.3)
_VECTOR_WEIGHT = _config_registry.get_float('VECTOR_WEIGHT', 0.7)
_CARD_SEARCH_ENABLED = _config_registry.get_int('CARD_SEARCH_ENABLED', 1)
_MULTI_QUERY_M = _config_registry.get_int('MULTI_QUERY_M', 4)
_QUERY_EXPANSION_ENABLED = _config_registry.get_int('QUERY_EXPANSION_ENABLED', 1)
_LAYER_BONUS_GUI = _config_registry.get_float('LAYER_BONUS_GUI', 0.15)
_LAYER_BONUS_RETRIEVAL = _config_registry.get_float('LAYER_BONUS_RETRIEVAL', 0.15)
_LAYER_BONUS_INDEXER = _config_registry.get_float('LAYER_BONUS_INDEXER', 0.15)
_VENDOR_PENALTY = _config_registry.get_float('VENDOR_PENALTY', -0.1)
_FRESHNESS_BONUS = _config_registry.get_float('FRESHNESS_BONUS', 0.05)
_USE_SEMANTIC_SYNONYMS = _config_registry.get_int('USE_SEMANTIC_SYNONYMS', 1)
_TOPK_DENSE = _config_registry.get_int('TOPK_DENSE', 75)
_TOPK_SPARSE = _config_registry.get_int('TOPK_SPARSE', 75)
_VENDOR_MODE = _config_registry.get_str('VENDOR_MODE', 'prefer_first_party')
_HYDRATION_MODE = _config_registry.get_str('HYDRATION_MODE', 'lazy')
_HYDRATION_MAX_CHARS = _config_registry.get_int('HYDRATION_MAX_CHARS', 2000)
_DISABLE_RERANK = _config_registry.get_int('DISABLE_RERANK', 0)
_PROJECT_PATH_BOOSTS = _config_registry.get_str('project_PATH_BOOSTS', 'app/,lib/,config/,scripts/,server/,api/,api/app,app/services,app/routers,api/admin_ui,app/plugins')
_QDRANT_URL = _config_registry.get_str('QDRANT_URL', 'http://127.0.0.1:6333')
_REPO = _config_registry.get_str('REPO', 'project')
_COLLECTION_NAME = _config_registry.get_str('COLLECTION_NAME', f'code_chunks_{_config_registry.get_str("REPO", "project")}')


def reload_config():
    """Reload configuration values from the registry.

    Call this function after config changes to update module-level cached values.
    This is automatically called when the config registry is reloaded via the API.
    """
    global _RRF_K_DIV, _CARD_BONUS, _FILENAME_BOOST_EXACT, _FILENAME_BOOST_PARTIAL
    global _FINAL_K, _BM25_WEIGHT, _VECTOR_WEIGHT, _CARD_SEARCH_ENABLED, _MULTI_QUERY_M
    global _QUERY_EXPANSION_ENABLED, _LAYER_BONUS_GUI, _LAYER_BONUS_RETRIEVAL
    global _LAYER_BONUS_INDEXER, _VENDOR_PENALTY, _FRESHNESS_BONUS
    global _USE_SEMANTIC_SYNONYMS, _TOPK_DENSE, _TOPK_SPARSE, _VENDOR_MODE
    global _HYDRATION_MODE, _HYDRATION_MAX_CHARS, _DISABLE_RERANK
    global _PROJECT_PATH_BOOSTS, _QDRANT_URL, _REPO, _COLLECTION_NAME
    _RRF_K_DIV = _config_registry.get_int('RRF_K_DIV', 60)
    _CARD_BONUS = _config_registry.get_float('CARD_BONUS', 0.08)
    _FILENAME_BOOST_EXACT = _config_registry.get_float('FILENAME_BOOST_EXACT', 1.5)
    _FILENAME_BOOST_PARTIAL = _config_registry.get_float('FILENAME_BOOST_PARTIAL', 1.2)
    _FINAL_K = _config_registry.get_int('FINAL_K', 10)
    _BM25_WEIGHT = _config_registry.get_float('BM25_WEIGHT', 0.3)
    _VECTOR_WEIGHT = _config_registry.get_float('VECTOR_WEIGHT', 0.7)
    _CARD_SEARCH_ENABLED = _config_registry.get_int('CARD_SEARCH_ENABLED', 1)
    _MULTI_QUERY_M = _config_registry.get_int('MULTI_QUERY_M', 4)
    _QUERY_EXPANSION_ENABLED = _config_registry.get_int('QUERY_EXPANSION_ENABLED', 1)
    _LAYER_BONUS_GUI = _config_registry.get_float('LAYER_BONUS_GUI', 0.15)
    _LAYER_BONUS_RETRIEVAL = _config_registry.get_float('LAYER_BONUS_RETRIEVAL', 0.15)
    _LAYER_BONUS_INDEXER = _config_registry.get_float('LAYER_BONUS_INDEXER', 0.15)
    _VENDOR_PENALTY = _config_registry.get_float('VENDOR_PENALTY', -0.1)
    _FRESHNESS_BONUS = _config_registry.get_float('FRESHNESS_BONUS', 0.05)
    _USE_SEMANTIC_SYNONYMS = _config_registry.get_int('USE_SEMANTIC_SYNONYMS', 1)
    _TOPK_DENSE = _config_registry.get_int('TOPK_DENSE', 75)
    _TOPK_SPARSE = _config_registry.get_int('TOPK_SPARSE', 75)
    _VENDOR_MODE = _config_registry.get_str('VENDOR_MODE', 'prefer_first_party')
    _HYDRATION_MODE = _config_registry.get_str('HYDRATION_MODE', 'lazy')
    _HYDRATION_MAX_CHARS = _config_registry.get_int('HYDRATION_MAX_CHARS', 2000)
    _DISABLE_RERANK = _config_registry.get_int('DISABLE_RERANK', 0)
    _PROJECT_PATH_BOOSTS = _config_registry.get_str('project_PATH_BOOSTS', 'app/,lib/,config/,scripts/,server/,api/,api/app,app/services,app/routers,api/admin_ui,app/plugins')
    _QDRANT_URL = _config_registry.get_str('QDRANT_URL', 'http://127.0.0.1:6333')
    _REPO = _config_registry.get_str('REPO', 'project')
    _COLLECTION_NAME = _config_registry.get_str('COLLECTION_NAME', f'code_chunks_{_config_registry.get_str("REPO", "project")}')


def _classify_query(q: str) -> str:
    """Classify query intent to optimize search strategy.
    
    This function analyzes the query to determine which part of the codebase
    is most likely to contain relevant results. The classification is used to
    apply targeted scoring bonuses to improve result relevance.
    
    Args:
        q: The user's search query
        
    Returns:
        One of: 'gui', 'retrieval', 'indexer', 'eval', 'infra', or 'server'
    """
    ql = (q or '').lower()
    
    # GUI/Frontend queries
    if any(k in ql for k in ['gui', 'ui', 'dashboard', 'button', 'component', 'frontend', 'css', 'html', 'interface']):
        return 'gui'
    
    # Retrieval/Search queries
    if any(k in ql for k in ['search', 'retrieval', 'bm25', 'vector', 'qdrant', 'embedding', 'rerank', 'hybrid']):
        return 'retrieval'
    
    # Indexing queries
    if any(k in ql for k in ['index', 'indexer', 'chunking', 'ast', 'parse', 'chunk']):
        return 'indexer'
    
    # Evaluation/Testing queries
    if any(k in ql for k in ['eval', 'test', 'golden', 'evaluation', 'metric', 'performance']):
        return 'eval'
    
    # Infrastructure/Docker queries  
    if any(k in ql for k in ['docker', 'compose', 'infra', 'prometheus', 'grafana', 'redis']):
        return 'infra'
    
    # Default to server (FastAPI, LangGraph, etc.)
    return 'server'


# Cache for layer bonuses to avoid repeated file I/O
_LAYER_BONUSES_CACHE = None

def _project_layer_bonus(layer: str, intent: str) -> float:
    """Apply scoring bonus based on code layer and query intent.
    
    Layer bonuses are configurable via repos.json and can be modified through
    the GUI. This allows customization of search relevance for different
    repository structures.
    
    Args:
        layer: The code layer (e.g., 'gui', 'server', 'retrieval')
        intent: The classified query intent
        
    Returns:
        Bonus score to add (0.0 to 0.15 typically)
    """
    global _LAYER_BONUSES_CACHE
    
    # Load bonuses from repos.json (cached for performance)
    if _LAYER_BONUSES_CACHE is None:
        try:
            from common.config_loader import layer_bonuses
            # type: ignore needed because return type varies by config
            _LAYER_BONUSES_CACHE = layer_bonuses(REPO)  # type: ignore[assignment] - Dynamic config type
        except Exception:
            # Fallback to project-accurate defaults if config loading fails
            _LAYER_BONUSES_CACHE = {
                'gui':       {'gui': 0.15, 'server': 0.05},
                'retrieval': {'retrieval': 0.15, 'server': 0.05},
                'indexer':   {'indexer': 0.15, 'retrieval': 0.08, 'common': 0.05},
                'eval':      {'eval': 0.15, 'tests': 0.10, 'retrieval': 0.05},
                'infra':     {'infra': 0.15, 'scripts': 0.08},
                'server':    {'server': 0.15, 'retrieval': 0.05, 'common': 0.05},
            }
    
    layer_lower = (layer or '').lower()
    intent_lower = (intent or 'server').lower()
    return _LAYER_BONUSES_CACHE.get(intent_lower, {}).get(layer_lower, 0.0)


def _provider_plugin_hint(fp: str, code: str) -> float:
    fp = (fp or '').lower()
    code = (code or '').lower()
    keys = ['provider', 'providers', 'integration', 'adapter', 'webhook', 'pushover', 'apprise', 'hubspot']
    return 0.06 if any(k in fp or k in code for k in keys) else 0.0


def _origin_bonus(origin: str, mode: str) -> float:
    origin = (origin or '').lower()
    mode = (mode or 'prefer_first_party').lower()
    if mode == 'prefer_first_party':
        return 0.06 if origin == 'first_party' else (-0.08 if origin == 'vendor' else 0.0)
    if mode == 'prefer_vendor':
        return 0.06 if origin == 'vendor' else 0.0
    return 0.0


# Cache for discriminative keywords to avoid repeated file I/O
_DISCRIMINATIVE_KEYWORDS = None

def _load_discriminative_keywords(repo: str) -> List[str]:
    """Load discriminative keywords for intelligent result boosting.
    
    Discriminative keywords are domain-specific terms that indicate
    high relevance for particular files. These are generated by analyzing
    the repository and identifying terms that distinguish important files.
    
    Args:
        repo: Repository name to load keywords for
        
    Returns:
        List of discriminative keyword strings
    """
    global _DISCRIMINATIVE_KEYWORDS
    if _DISCRIMINATIVE_KEYWORDS is not None:
        return _DISCRIMINATIVE_KEYWORDS
    
    try:
        # Try root directory first (where generate_smart_keywords.py saves them)
        from pathlib import Path
        root_file = Path(__file__).parent.parent / "discriminative_keywords.json"
        if root_file.exists():
            kw_file = root_file
        else:
            # Fallback to data directory
            from common.paths import data_dir
            kw_file = data_dir() / f"discriminative_keywords_{repo}.json"
            if not kw_file.exists():
                kw_file = data_dir() / "discriminative_keywords.json"
        
        if kw_file.exists():
            data = json.loads(kw_file.read_text())
            # Extract keywords from JSON (handle different formats)
            if isinstance(data, list):
                _DISCRIMINATIVE_KEYWORDS = [k['term'] if isinstance(k, dict) else str(k) for k in data]
            elif isinstance(data, dict):
                # Try repo-specific bucket
                if repo in data:
                    _DISCRIMINATIVE_KEYWORDS = [k['term'] if isinstance(k, dict) else str(k) for k in data[repo]]
                else:
                    # Flatten all keywords
                    _DISCRIMINATIVE_KEYWORDS = []
                    for v in data.values():
                        if isinstance(v, list):
                            _DISCRIMINATIVE_KEYWORDS.extend([k['term'] if isinstance(k, dict) else str(k) for k in v])
            else:
                _DISCRIMINATIVE_KEYWORDS = []
        else:
            _DISCRIMINATIVE_KEYWORDS = []
    except Exception:
        _DISCRIMINATIVE_KEYWORDS = []
    
    return _DISCRIMINATIVE_KEYWORDS

def _feature_bonus(query: str, fp: str, code: str) -> float:
    """Apply intelligent feature-based scoring bonuses.
    
    This is where discriminative keyword boosting happens! Files containing
    keywords that match the query get significant score boosts, helping
    surface the most relevant results.
    
    Args:
        query: The search query
        fp: File path being scored
        code: Code content (first 2000 chars for performance)
        
    Returns:
        Cumulative bonus score (typically 0.0 to 0.24)
    """
    ql = (query or '').lower()
    fp = (fp or '').lower()
    code = (code or '').lower()
    bumps = 0.0
    
    # Discriminative keyword boosting
    keywords = _load_discriminative_keywords(REPO)
    if keywords:
        # Check how many discriminative keywords match
        matches_in_query = sum(1 for kw in keywords if kw in ql)
        matches_in_path = sum(1 for kw in keywords if kw in fp)
        matches_in_code = sum(1 for kw in keywords[:20] if kw in code)  # Only check top 20 in code for performance
        
        # Apply graduated boosts based on match quality
        if matches_in_query > 0:
            # Keywords in query are highly relevant
            if matches_in_path > 0:
                bumps += 0.08 * min(matches_in_path, 3)  # Path + query match is very strong
            if matches_in_code > 0:
                bumps += 0.06 * min(matches_in_code, 2)  # Code + query match is strong
        elif matches_in_path > 0:
            # Keywords in path even without query match are still useful
            bumps += 0.04 * min(matches_in_path, 2)
    
    # Legacy hardcoded boosts (keep for backward compat)
    if any(k in ql for k in ['diagnostic', 'health', 'event log', 'phi', 'hipaa']):
        if ('diagnostic' in fp) or ('diagnostic' in code) or ('event' in fp and 'log' in fp):
            bumps += 0.06
    
    return bumps


def _card_bonus(chunk_id: str, card_chunk_ids: set) -> float:
    """Boost chunks that matched via card-based retrieval.

    Card matches indicate semantic relevance beyond keyword matching,
    so they get a scoring bonus.

    Args:
        chunk_id: ID of chunk to check
        card_chunk_ids: Set of chunk IDs that matched via cards

    Returns:
        Bonus score (_CARD_BONUS if matched, 0.0 otherwise)
    """
    return _CARD_BONUS if str(chunk_id) in card_chunk_ids else 0.0


def _path_bonus(fp: str, repo: str | None = None) -> float:
    fp = (fp or '').lower()
    bonus = 0.0
    
    # Use repos.json path_boosts if available
    if repo:
        try:
            from common.config_loader import path_boosts
            repo_boosts = path_boosts(repo)
            for boost_path in repo_boosts:
                if boost_path and boost_path.lower() in fp:
                    bonus += 0.06  # Same boost as _project_path_boost
        except Exception:
            pass
    
    # Fallback to hardcoded boosts if no repo-specific boosts found
    if bonus == 0.0:
        for sfx, b in [
            ('/identity/', 0.12),
            ('/auth/', 0.12),
            ('/server', 0.10),
            ('/backend', 0.10),
            ('/api/', 0.08),
        ]:
            if sfx in fp:
                bonus += b
    
    return min(bonus, 0.18)  # Cap at 0.18 like _project_path_boost


def _project_path_boost(fp: str, repo_tag: str) -> float:
    if (repo_tag or '').lower() != 'project':
        return 0.0
    cfg = _PROJECT_PATH_BOOSTS
    tokens = [t.strip().lower() for t in cfg.split(',') if t.strip()]
    s = (fp or '').lower()
    bonus = 0.0
    for tok in tokens:
        if tok and tok in s:
            bonus += 0.06
    return min(bonus, 0.18)


try:
    load_dotenv(override=False)
    repo_root = Path(__file__).resolve().parent
    env_path = repo_root / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=False)
    else:
        alt = find_dotenv(usecwd=True)
        if alt:
            load_dotenv(dotenv_path=alt, override=False)
except Exception:
    pass

# Use cached config values instead of os.getenv()
QDRANT_URL = _QDRANT_URL
REPO = _REPO
VENDOR_MODE = _VENDOR_MODE
COLLECTION = _COLLECTION_NAME


def _lazy_import_openai():
    """Lazy import OpenAI to avoid loading if not needed.
    
    This reduces startup time and memory usage when using alternative
    embedding providers like Voyage or local models.
    """
    from openai import OpenAI
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _lazy_import_voyage():
    """Lazy import Voyage AI for code-optimized embeddings.
    
    Voyage provides specialized embeddings for code search that often
    outperform general-purpose models.
    
    NOTE: type: ignore is REQUIRED - voyageai package lacks type stubs
    """
    import voyageai  # type: ignore[import] - No type stubs for voyageai package
    return voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))


# Cache for local embedding models to avoid reloading
_local_embed_model = None
_mxbai_embed_model = None


def _get_embedding(text: str, kind: str = "query") -> list[float]:
    """Generate embeddings using configured provider.
    
    Supports multiple embedding providers:
    - OpenAI: General purpose, good quality
    - Voyage: Optimized for code search
    - Local: Privacy-preserving, no API costs
    - MXBAI: High-quality open source embeddings
    
    Args:
        text: Text to embed
        kind: 'query' or 'document' (affects Voyage encoding)
        
    Returns:
        Embedding vector as list of floats
    """
    et = _config_registry.get_str("EMBEDDING_TYPE", "openai").lower()
    if et == "mxbai":
        global _mxbai_embed_model
        if _mxbai_embed_model is None:
            from sentence_transformers import SentenceTransformer
            # MXBAI with Matryoshka representation learning (configurable dimensions)
            _mxbai_embed_model = SentenceTransformer('mixedbread-ai/mxbai-embed-large-v1')
        
        # MXBAI uses special query prefixes for better retrieval
        if kind == "query":
            prefixed_text = "Represent this sentence for searching relevant passages: " + text
        else:
            prefixed_text = text
            
        # Get configurable dimensions (MXBAI supports Matryoshka)
        dim = _config_registry.get_int("EMBEDDING_DIM", 1024)
        embedding = _mxbai_embed_model.encode([prefixed_text], normalize_embeddings=True, show_progress_bar=False)[0]
        
        # Truncate to desired dimensions if needed
        if len(embedding) > dim:
            embedding = embedding[:dim]
            
        return embedding.tolist()
    if et == "voyage":
        import time
        from server.api_tracker import track_api_call, APIProvider

        vo = _lazy_import_voyage()
        voyage_model = _config_registry.get_str('VOYAGE_MODEL', 'voyage-code-3')
        start = time.time()
        out = vo.embed([text], model=voyage_model, input_type=kind, output_dimension=512)
        duration_ms = (time.time() - start) * 1000

        # Voyage pricing: ~$0.00012 per 1k tokens for voyage-code-3
        # Estimate tokens = len(text) / 4 (rough char-to-token ratio)
        tokens_est = len(text) // 4
        cost_usd = (tokens_est / 1000) * 0.00012

        track_api_call(
            provider=APIProvider.VOYAGE,
            endpoint="https://api.voyageai.com/v1/embeddings",
            method="POST",
            duration_ms=duration_ms,
            status_code=200,
            tokens_estimated=tokens_est,
            cost_usd=cost_usd
        )

        return out.embeddings[0]
    if et == "local":
        global _local_embed_model
        if _local_embed_model is None:
            from sentence_transformers import SentenceTransformer
            # Use configurable local embedding model
            local_model = _config_registry.get_str('EMBEDDING_MODEL_LOCAL', 'BAAI/bge-small-en-v1.5')
            _local_embed_model = SentenceTransformer(local_model)
        return _local_embed_model.encode([text], normalize_embeddings=True, show_progress_bar=False)[0].tolist()
    import time
    from server.api_tracker import track_api_call, APIProvider

    client = _lazy_import_openai()
    embedding_model = _config_registry.get_str('EMBEDDING_MODEL', 'text-embedding-3-large')

    start = time.time()
    resp = client.embeddings.create(input=text, model=embedding_model)
    duration_ms = (time.time() - start) * 1000

    # OpenAI pricing varies by model - use resp.usage if available
    tokens_used = resp.usage.total_tokens if hasattr(resp, 'usage') else len(text) // 4
    # text-embedding-3-large is ~$0.00013 per 1k tokens
    cost_usd = (tokens_used / 1000) * 0.00013

    track_api_call(
        provider=APIProvider.OPENAI,
        endpoint="https://api.openai.com/v1/embeddings",
        method="POST",
        duration_ms=duration_ms,
        status_code=200,
        tokens_estimated=tokens_used,
        cost_usd=cost_usd
    )

    return resp.data[0].embedding


def rrf(dense: list, sparse: list, k: int = 10, kdiv: int | None = None) -> list:
    """Reciprocal Rank Fusion - combines multiple ranked lists.

    RRF is a simple but effective way to merge results from different
    retrieval methods (dense vectors and sparse BM25) without needing
    to normalize scores.
    
    Args:
        dense: List of document IDs from vector search
        sparse: List of document IDs from BM25 search
        k: Number of results to return
        kdiv: Constant for rank smoothing (higher = more weight to top ranks).
              If None, uses value from config registry (_RRF_K_DIV).

    Returns:
        Fused list of top-k document IDs
    """
    # Use cached config value if kdiv not explicitly provided
    if kdiv is None:
        kdiv = _RRF_K_DIV

    score: dict = collections.defaultdict(float)
    for rank, pid in enumerate(dense, start=1):
        score[pid] += 1.0 / (kdiv + rank)
    for rank, pid in enumerate(sparse, start=1):
        score[pid] += 1.0 / (kdiv + rank)
    ranked = sorted(score.items(), key=lambda x: x[1], reverse=True)
    return [pid for pid, _ in ranked[:k]]


def _load_chunks(repo: str) -> List[Dict]:
    """Load chunk metadata from indexed repository.
    
    Chunks are code segments created during indexing.
    Only metadata is loaded here - actual code is loaded
    on-demand via _hydrate_docs_inplace() for performance.
    
    Args:
        repo: Repository name
        
    Returns:
        List of chunk metadata dictionaries
    """
    p = os.path.join(out_dir(repo), 'chunks.jsonl')
    chunks: List[Dict] = []
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    o = json.loads(line)
                except Exception:
                    continue
                o.pop('code', None)
                o.pop('summary', None)
                o.pop('keywords', None)
                chunks.append(o)
    return chunks


def _load_bm25_map(idx_dir: str):
    """Load mapping from BM25 indices to chunk IDs.
    
    BM25 returns integer indices, this maps them back
    to actual chunk identifiers for retrieval.
    
    Args:
        idx_dir: BM25 index directory path
        
    Returns:
        List mapping indices to chunk IDs, or None if not found
    """
    pid_json = os.path.join(idx_dir, 'bm25_point_ids.json')
    if os.path.exists(pid_json):
        m = json.load(open(pid_json))
        return [m[str(i)] for i in range(len(m))]
    map_path = os.path.join(idx_dir, 'chunk_ids.txt')
    if os.path.exists(map_path):
        with open(map_path, 'r', encoding='utf-8') as f:
            ids = [line.strip() for line in f if line.strip()]
        return ids
    return None


def _load_cards_bm25(repo: str):
    """Load BM25 index for card-based retrieval.
    
    Cards contain AI-generated summaries of code chunks.
    Searching over these summaries often finds relevant
    code that keyword search might miss.
    
    Args:
        repo: Repository name
        
    Returns:
        BM25 retriever object or None if not available
    """
    idx_dir = os.path.join(out_dir(repo), 'bm25_cards')
    try:
        import bm25s
        retr = bm25s.BM25.load(idx_dir)
        return retr
    except Exception:
        return None


def _load_cards_map(repo: str) -> Dict:
    cards_file = os.path.join(out_dir(repo), 'cards.jsonl')
    cards_by_idx = {}
    cards_by_chunk_id = {}
    try:
        with open(cards_file, 'r', encoding='utf-8') as f:
            for idx, line in enumerate(f):
                card = json.loads(line)
                chunk_id = str(card.get('id', ''))
                if chunk_id:
                    cards_by_idx[idx] = chunk_id
                    cards_by_chunk_id[chunk_id] = card
        return {'by_idx': cards_by_idx, 'by_chunk_id': cards_by_chunk_id}
    except Exception:
        return {'by_idx': {}, 'by_chunk_id': {}}


@with_langtrace_root_span()
def search(query: str, repo: str, topk_dense: int = 75, topk_sparse: int = 75, final_k: int = 10, trace: object | None = None) -> List[Dict]:
    """Core hybrid search implementation.
    
    Combines multiple retrieval strategies:
    1. Dense vector search using embeddings (semantic similarity)
    2. Sparse BM25 search (keyword matching)
    3. Card-based retrieval (searches over AI-generated summaries)
    4. Cross-encoder reranking for precision
    5. Multiple scoring bonuses for domain-specific relevance
    
    Args:
        query: Search query text
        repo: Repository to search in
        topk_dense: Number of results from vector search
        topk_sparse: Number of results from BM25 search
        final_k: Final number of results to return
        trace: Optional tracing object for debugging
        
    Returns:
        List of document dictionaries with scores and metadata
    """
    return _search_impl(query, repo, topk_dense, topk_sparse, final_k, trace)

def _search_impl(query: str, repo: str, topk_dense: int, topk_sparse: int, final_k: int, trace: object | None) -> List[Dict]:
    chunks = _load_chunks(repo)
    if not chunks:
        return []
    
    # Apply synonym expansion if enabled
    use_synonyms = bool(_USE_SEMANTIC_SYNONYMS)
    expanded_query = expand_query_with_synonyms(query, repo, max_expansions=3) if use_synonyms else query
    
    # SPAN: Vector Search (Qdrant)
    dense_pairs = []
    _vs_start = _time.time()
    backend = _config_registry.get_str('VECTOR_BACKEND','qdrant').lower()
    if _tracer:
        with _tracer.start_as_current_span("agro.vector_search", attributes={"query": expanded_query, "topk": topk_dense}) as span:
            qc = QdrantClient(url=QDRANT_URL)
            coll = _config_registry.get_str('COLLECTION_NAME', f'code_chunks_{repo}')
            try:
                e = _get_embedding(expanded_query, kind="query")
                if backend != 'faiss':
                    dres = qc.query_points(
                        collection_name=coll,
                        query=e,
                        using='dense',
                        limit=topk_dense,
                        with_payload=models.PayloadSelectorInclude(include=['file_path', 'start_line', 'end_line', 'language', 'layer', 'repo', 'hash', 'id'])
                    )
                    # Extract points from Qdrant response (format varies by version)
                    points = getattr(dres, 'points', dres)
                    # type: ignore needed - Qdrant response type varies
                    dense_pairs = [(str(p.id), dict(p.payload)) for p in points]  # type: ignore[union-attr] - Dynamic response type
                    span.set_attribute("results_count", len(dense_pairs))
            except Exception as ex:
                span.set_attribute("error", str(ex))
                dense_pairs = []
    else:
        # No tracing
        qc = QdrantClient(url=QDRANT_URL)
        coll = _config_registry.get_str('COLLECTION_NAME', f'code_chunks_{repo}')
        try:
            e = _get_embedding(expanded_query, kind="query")
        except Exception as ex:
            print(f"[hybrid_search] WARNING: Failed to get embedding for query: {ex}")
            e = []
        try:
            if backend == 'faiss':
                dense_pairs = []
            else:
                dres = qc.query_points(
                    collection_name=coll,
                    query=e,
                    using='dense',
                    limit=topk_dense,
                    with_payload=models.PayloadSelectorInclude(include=['file_path', 'start_line', 'end_line', 'language', 'layer', 'repo', 'hash', 'id'])
                )
                # Extract points from Qdrant response (format varies by version)
                points = getattr(dres, 'points', dres)
                # type: ignore needed - Qdrant response type varies
                dense_pairs = [(str(p.id), dict(p.payload)) for p in points]  # type: ignore[union-attr] - Dynamic response type
        except Exception as ex:
            print(f"[hybrid_search] ERROR: Vector search (Qdrant) failed: {ex}")
            print(f"[hybrid_search] Qdrant URL: {QDRANT_URL}, Collection: {coll}")
            dense_pairs = []
    # Track vector search (Qdrant) duration via trace log
    try:
        from server.api_tracker import track_trace, track_api_call, APIProvider
        vs_ms = (_time.time() - _vs_start) * 1000
        track_trace(step="vector_search", provider="qdrant", model=_config_registry.get_str('COLLECTION_NAME', f'code_chunks_{repo}'),
                    duration_ms=vs_ms, extra={"results": len(dense_pairs), "repo": repo})
        # Mirror as API call metric (no cost/tokens for DB query)
        track_api_call(provider=APIProvider.QDRANT, endpoint="/query_points", method="POST",
                       duration_ms=vs_ms, status_code=200, tokens_estimated=0, cost_usd=0.0)
    except Exception:
        pass
    # Emit trace event for vector search
    try:
        if trace is not None and hasattr(trace, 'add'):
            trace.add('vector_search', {
                'duration_ms': (_time.time() - _vs_start) * 1000,
                'results': len(dense_pairs),
                'repo': repo,
                'backend': backend
            })
    except Exception:
        pass

    # SPAN: BM25 Sparse Retrieval
    _bm_start = _time.time()
    if _tracer:
        with _tracer.start_as_current_span("agro.bm25_search", attributes={"query": expanded_query, "topk": topk_sparse}) as span:
            idx_dir = os.path.join(out_dir(repo), 'bm25_index')
            retriever = bm25s.BM25.load(idx_dir)
            tokenizer = Tokenizer(stemmer=Stemmer('english'), stopwords='en')
            tokens = tokenizer.tokenize([expanded_query])
            ids, _ = retriever.retrieve(tokens, k=topk_sparse)
            ids = ids.tolist()[0] if hasattr(ids, 'tolist') else list(ids[0])
            id_map = _load_bm25_map(idx_dir)
            by_chunk_id = {str(c['id']): c for c in chunks}
            sparse_pairs = []
            for i in ids:
                if id_map is not None:
                    if 0 <= i < len(id_map):
                        pid_or_cid = id_map[i]
                        key = str(pid_or_cid)
                        if key in by_chunk_id:
                            sparse_pairs.append((key, by_chunk_id[key]))
                        else:
                            if 0 <= i < len(chunks):
                                sparse_pairs.append((str(chunks[i]['id']), chunks[i]))
                else:
                    if 0 <= i < len(chunks):
                        sparse_pairs.append((str(chunks[i]['id']), chunks[i]))
            span.set_attribute("results_count", len(sparse_pairs))
    else:
        idx_dir = os.path.join(out_dir(repo), 'bm25_index')
        retriever = bm25s.BM25.load(idx_dir)
        tokenizer = Tokenizer(stemmer=Stemmer('english'), stopwords='en')
        tokens = tokenizer.tokenize([expanded_query])
        ids, _ = retriever.retrieve(tokens, k=topk_sparse)
        ids = ids.tolist()[0] if hasattr(ids, 'tolist') else list(ids[0])
        id_map = _load_bm25_map(idx_dir)
        by_chunk_id = {str(c['id']): c for c in chunks}
        sparse_pairs = []
        for i in ids:
            if id_map is not None:
                if 0 <= i < len(id_map):
                    pid_or_cid = id_map[i]
                    key = str(pid_or_cid)
                    if key in by_chunk_id:
                        sparse_pairs.append((key, by_chunk_id[key]))
                    else:
                        if 0 <= i < len(chunks):
                            sparse_pairs.append((str(chunks[i]['id']), chunks[i]))
            else:
                if 0 <= i < len(chunks):
                    sparse_pairs.append((str(chunks[i]['id']), chunks[i]))

    # Record BM25 duration in trace logs
    try:
        from server.api_tracker import track_trace
        bm_ms = (_time.time() - _bm_start) * 1000
        track_trace(step="bm25_search", provider="local", model="bm25s", duration_ms=bm_ms,
                    extra={"results": len(sparse_pairs), "repo": repo})
    except Exception:
        pass
    try:
        if trace is not None and hasattr(trace, 'add'):
            trace.add('bm25_search', {
                'duration_ms': (_time.time() - _bm_start) * 1000,
                'results': len(sparse_pairs),
                'repo': repo
            })
    except Exception:
        pass

    card_chunk_ids: set = set()
    cards_retr = _load_cards_bm25(repo)
    if cards_retr is not None:
        try:
            cards_map = _load_cards_map(repo)
            # Use expanded query for card retrieval too
            tokens = tokenizer.tokenize([expanded_query])
            c_ids, _ = cards_retr.retrieve(tokens, k=min(topk_sparse, 30))
            c_ids_flat = c_ids[0] if hasattr(c_ids, '__getitem__') else c_ids
            for card_idx in c_ids_flat:
                chunk_id = cards_map['by_idx'].get(int(card_idx))
                if chunk_id:
                    card_chunk_ids.add(str(chunk_id))
        except Exception as ex:
            # Card retrieval is optional - log and continue
            import sys
            print(f"[hybrid_search] DEBUG: Card retrieval failed (optional feature): {ex}", file=sys.stderr)

    # SPAN: RRF Fusion
    dense_ids = [pid for pid, _ in dense_pairs]
    sparse_ids = [pid for pid, _ in sparse_pairs]
    _rrf0 = _time.time()
    if _tracer:
        with _tracer.start_as_current_span("agro.rrf_fusion", attributes={
            "dense_count": len(dense_ids),
            "sparse_count": len(sparse_ids),
            "final_k": final_k
        }) as span:
            fused = rrf(dense_ids, sparse_ids, k=max(final_k, 2 * final_k)) if dense_pairs else sparse_ids[:final_k]
            span.set_attribute("fused_count", len(fused))
    else:
        fused = rrf(dense_ids, sparse_ids, k=max(final_k, 2 * final_k)) if dense_pairs else sparse_ids[:final_k]
    try:
        from server.api_tracker import track_trace
        track_trace(step="rrf_fusion", provider="local", model="rrf", duration_ms=((_time.time()-_rrf0)*1000),
                    extra={"dense": len(dense_ids), "sparse": len(sparse_ids), "repo": repo})
    except Exception:
        pass
    try:
        if trace is not None and hasattr(trace, 'add'):
            trace.add('rrf_fusion', {
                'duration_ms': (_time.time() - _rrf0) * 1000,
                'dense': len(dense_ids),
                'sparse': len(sparse_ids),
                'repo': repo
            })
    except Exception:
        pass
    
    by_id = {pid: p for pid, p in (dense_pairs + sparse_pairs)}
    docs = [by_id[pid] for pid in fused if pid in by_id]
    if _HYDRATION_MODE.lower() != 'none':
        _h0 = _time.time()
        _hydrate_docs_inplace(repo, docs)
        try:
            from server.api_tracker import track_trace
            track_trace(step="hydrate", provider="local", model="chunks.jsonl", duration_ms=((_time.time()-_h0)*1000),
                        extra={"hydrated": sum(1 for d in docs if d.get('code')), "candidates": len(docs), "repo": repo})
        except Exception:
            pass
        try:
            if trace is not None and hasattr(trace, 'add'):
                trace.add('hydrate', {
                    'duration_ms': (_time.time() - _h0) * 1000,
                    'hydrated': sum(1 for d in docs if d.get('code')),
                    'candidates': len(docs),
                    'repo': repo
                })
        except Exception:
            pass
    # tracing: pre-rerank candidate snapshot
    try:
        if trace is not None and hasattr(trace, 'add'):
            cands = []
            seen_pre = set()
            # Use union of bm25+dense by earliest rank observed
            rank_map_dense = {pid: i+1 for i, pid in enumerate(dense_ids[:max(final_k, 50)])}
            rank_map_sparse = {pid: i+1 for i, pid in enumerate(sparse_ids[:max(final_k, 50)])}
            for pid in list(rank_map_dense.keys()) + list(rank_map_sparse.keys()):
                if pid in seen_pre:
                    continue
                seen_pre.add(pid)
                meta = by_id.get(pid, {})
                cands.append({
                    'path': meta.get('file_path'),
                    'start': meta.get('start_line'),
                    'end': meta.get('end_line'),
                    'card_hit': str(meta.get('id','')) in card_chunk_ids,
                    'bm25_rank': rank_map_sparse.get(pid),
                    'dense_rank': rank_map_dense.get(pid),
                })
            trace.add('retriever.retrieve', {
                'k_sparse': int(topk_sparse),
                'k_dense': int(topk_dense),
                'candidates': cands[:max(final_k, 50)],
            })
    except Exception as ex:
        # Tracing is optional - log and continue
        import sys
        print(f"[hybrid_search] DEBUG: Tracing failed (optional feature): {ex}", file=sys.stderr)

    # DEBUG: What does RRF return? (removed for production - enable via DEBUG env var)
    # print(f"  [DEBUG] After RRF, top 5:")
    # for i, d in enumerate(docs[:5], 1):
    #     print(f"    {i}. {d['file_path'].split('/')[-1]} ({d.get('language')})")
    
    # CRITICAL: Detect implementation queries to prioritize code over docs
    # This is essential for developer productivity - they usually want code, not documentation
    q_lower = query.lower()
    wants_code = any(k in q_lower for k in ['implementation', 'where is', 'how does', 'function', 'class', 'method', 'api', 'code'])
    
    # DISABLED: This reordering is causing problems - code files in wrong order
    # if wants_code:
    #     code_docs = [d for d in docs if d.get('language', '').lower() in ('python', 'javascript', 'typescript', 'go', 'rust', 'java', 'cpp', 'c', 'php', 'ruby')]
    #     other_docs = [d for d in docs if d not in code_docs]
    #     docs = code_docs[:min(50, len(code_docs))] + other_docs[:max(25, final_k)]
    
    # SPAN: Cross-Encoder Reranking
    # Skip local reranking if Cohere will be used in search_routed_multi()
    rerank_backend = _config_registry.get_str('RERANKER_BACKEND', 'local').lower()
    skip_local_rerank = (rerank_backend == 'cohere')  # Cohere will rerank later
    
    if not skip_local_rerank:
        # Apply local cross-encoder reranking
        if _tracer:
            with _tracer.start_as_current_span("agro.cross_encoder_rerank", attributes={
                "candidates_count": len(docs),
                "top_k": final_k
            }) as span:
                _t0 = _time.time()
                docs = ce_rerank(query, docs, top_k=final_k, trace=trace)
                span.set_attribute("reranked_count", len(docs))
                try:
                    from server.api_tracker import track_trace
                    track_trace(step="cross_encoder_rerank", provider=_config_registry.get_str('RERANKER_BACKEND','local'),
                                model=_config_registry.get_str('RERANKER_MODEL', ''), duration_ms=((_time.time()-_t0)*1000),
                                extra={"candidates": len(docs), "top_k": final_k, "repo": repo})
                except Exception:
                    pass
        else:
            _t0 = _time.time()
            docs = ce_rerank(query, docs, top_k=final_k, trace=trace)
            try:
                from server.api_tracker import track_trace
                track_trace(step="cross_encoder_rerank", provider=_config_registry.get_str('RERANKER_BACKEND','local'),
                            model=_config_registry.get_str('RERANKER_MODEL', ''), duration_ms=((_time.time()-_t0)*1000),
                            extra={"candidates": len(docs), "top_k": final_k, "repo": repo})
            except Exception:
                pass
        try:
            if trace is not None and hasattr(trace, 'add'):
                trace.add('rerank', {
                    'duration_ms': (_time.time() - _t0) * 1000,
                    'candidates': len(docs),
                    'top_k': final_k,
                    'repo': repo
                })
        except Exception:
            pass

    # Apply all scoring bonuses (CRITICAL: Must happen regardless of reranker backend)
    intent = _classify_query(query)
    
    for d in docs:
        fp = d.get('file_path', '')
        layer = (d.get('layer') or '').lower()
        lang = (d.get('language') or '').lower()
        score = float(d.get('rerank_score', 0.0) or 0.0)
        
        # CRITICAL SCORING: Prioritize code files for implementation queries
        # Without this, documentation often outranks actual code, frustrating developers
        if wants_code:
            if lang in ('python', 'javascript', 'typescript', 'go', 'rust', 'java', 'cpp', 'c'):
                score += 0.50  # Huge boost ensures code appears first
            elif lang in ('markdown', 'md', 'rst', 'txt'):
                score -= 0.50  # Heavy penalty pushes docs down
        
        # Card hit bonus (semantic cards retrieval via BM25 over summaries)
        try:
            cid = str(d.get('id', '') or '')
            if cid and cid in card_chunk_ids:
                d['card_hit'] = True
                score += _card_bonus(cid, card_chunk_ids)
        except Exception:
            pass
        score += _path_bonus(fp, repo)
        score += _project_layer_bonus(layer, intent)
        score += _provider_plugin_hint(fp, d.get('code', '') or '')
        score += _origin_bonus(d.get('origin', ''), _VENDOR_MODE)
        score += _feature_bonus(query, fp, d.get('code', '') or '')
        d['rerank_score'] = score
    
    # Re-sort after applying all bonuses
    docs.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)
    
    # NOW return top-k (bonuses have been applied)
    return docs[:final_k]


def _hydrate_docs_inplace(repo: str, docs: list[dict]) -> None:
    """Load full code content for search results.
    
    Search initially returns only metadata for performance.
    This function loads the actual code content when needed.
    
    Args:
        repo: Repository name
        docs: List of document dicts to hydrate in-place
    """
    needed_ids: set[str] = set()
    needed_hashes: set[str] = set()
    for d in docs:
        if d.get('code'):
            continue
        cid = str(d.get('id', '') or '')
        h = d.get('hash')
        if cid:
            needed_ids.add(cid)
        if h:
            needed_hashes.add(h)
    if not needed_ids and not needed_hashes:
        return
    jl = os.path.join(out_dir(repo), 'chunks.jsonl')
    max_chars = _HYDRATION_MAX_CHARS
    found_by_id: dict[str, str] = {}
    found_by_hash: dict[str, str] = {}
    try:
        with open(jl, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    o = json.loads(line)
                except Exception:
                    continue
                cid = str(o.get('id', '') or '')
                h = o.get('hash')
                code = (o.get('code') or '')
                if max_chars > 0 and code:
                    code = code[:max_chars]
                if cid and cid in needed_ids and cid not in found_by_id:
                    found_by_id[cid] = code
                if h and h in needed_hashes and h not in found_by_hash:
                    found_by_hash[h] = code
                if len(found_by_id) >= len(needed_ids) and len(found_by_hash) >= len(needed_hashes):
                    break
    except FileNotFoundError:
        return
    for d in docs:
        if not d.get('code'):
            cid = str(d.get('id', '') or '')
            h = d.get('hash')
            d['code'] = found_by_id.get(cid) or (found_by_hash.get(h) if h else '') or ''


def _apply_filename_boosts(docs: list[dict], question: str) -> None:
    """Apply smart filename and extension-based scoring.

    Boosts results where:
    - Filename matches query terms (_FILENAME_BOOST_EXACT, default 1.5x)
    - Path components match query terms (_FILENAME_BOOST_PARTIAL, default 1.2x)
    - Code files over documentation (1.3x for .py, 0.3x for .md)

    This significantly improves relevance for queries like
    'hybrid_search.py implementation' or 'index.html styling'.

    Args:
        docs: Documents to score (modified in-place)
        question: User's search query
    """
    terms = set((question or '').lower().replace('/', ' ').replace('-', ' ').split())
    for d in docs:
        fp = (d.get('file_path') or '').lower()
        fn = os.path.basename(fp)
        parts = fp.split('/')
        score = float(d.get('rerank_score', 0.0) or 0.0)

        # Apply boosts for filename/path matches (use cached config values)
        if any(t and t in fn for t in terms):
            score *= _FILENAME_BOOST_EXACT
        if any(t and t in p for t in terms for p in parts):
            score *= _FILENAME_BOOST_PARTIAL
        
        # Apply boosts for high-value code files
        if fp.endswith('.py'):
            score *= 1.3  # Boost Python files
        elif fp.endswith('index.html') or fp.endswith('/index.html'):
            score *= 1.25  # Boost index.html files
        elif fp.endswith(('.ts', '.tsx', '.js', '.jsx')):
            score *= 1.2  # Boost TypeScript/JavaScript files
        elif fp.endswith(('.go', '.rs', '.java', '.cpp', '.c')):
            score *= 1.15  # Boost other code files
        
        # Apply penalties for documentation files (prefer code over docs)
        if fp.endswith('.md'):
            score *= 0.3  # Heavy penalty for markdown files
        elif fp.endswith('.txt') or fp.endswith('.rst'):
            score *= 0.5  # Medium penalty for text/rst files
        
        d['rerank_score'] = score
    docs.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)


def route_repo(query: str, default_repo: str | None = None) -> str:
    """Intelligently route query to appropriate repository.
    
    Supports explicit routing with 'repo:query' syntax or
    automatic detection based on query content.
    
    Args:
        query: User's search query
        default_repo: Fallback repo if auto-detection fails
        
    Returns:
        Repository name to search
    """
    try:
        return choose_repo_from_query(query, default=(default_repo or get_default_repo()))
    except Exception:
        q = (query or '').lower().strip()
        if ':' in q:
            cand, _ = q.split(':', 1)
            cand = cand.strip()
            if cand:
                return cand
        return (default_repo or _REPO or 'project').strip()


def search_routed(query: str, repo_override: str | None = None, final_k: int = 10, trace: object | None = None):
    """Simple single-query search with repo routing.
    
    Use this for:
    - Fast, simple searches
    - When you don't need query expansion
    - Testing and debugging
    
    For production use, prefer search_routed_multi() which
    provides better recall through query expansion.
    
    Args:
        query: Search query
        repo_override: Force specific repo
        final_k: Number of results
        trace: Optional tracing
        
    Returns:
        Search results
    """
    repo = (repo_override or route_repo(query, default_repo=_REPO) or _REPO).strip()
    return search(query, repo=repo, final_k=final_k, trace=trace)


def expand_queries(query: str, m: int = 4) -> list[str]:
    """Use LLM to generate query variants for better recall.
    
    Different phrasings of the same question can match different
    documents. This improves search coverage significantly.
    
    Example:
        'fix search bug' might expand to:
        - 'debug search issue'
        - 'resolve retrieval problem'
        - 'search function error'
    
    Args:
        query: Original query
        m: Number of variants to generate
        
    Returns:
        List of query variants (includes original)
    """
    if m <= 1:
        return [query]
    try:
        sys = "Rewrite a developer query into multiple search-friendly variants without changing meaning."
        user = f"Count: {m}\nQuery: {query}\nOutput one variant per line, no numbering."
        text, _ = generate_text(user_input=user, system_instructions=sys, reasoning_effort=None)
        lines = [ln.strip('- ').strip() for ln in (text or '').splitlines() if ln.strip()]
        uniq = []
        for ln in lines:
            if ln and ln not in uniq:
                uniq.append(ln)
        return (uniq or [query])[:m]
    except Exception:
        return [query]


@with_langtrace_root_span()
def search_routed_multi(query: str, repo_override: str | None = None, m: int = 4, final_k: int = 10, trace: object | None = None):
    """Advanced multi-query search with query expansion.
    
    This is the RECOMMENDED entry point for search! It:
    1. Expands the query into multiple variants using LLM
    2. Searches with each variant for better recall
    3. Deduplicates and reranks combined results
    4. Applies intelligent boosting for code vs documentation
    
    Args:
        query: Original search query
        repo_override: Force specific repo (None = auto-detect)
        m: Number of query variants to generate
        final_k: Number of final results
        trace: Optional tracing object
        
    Returns:
        Top-k ranked search results
    """
    repo = (repo_override or route_repo(query) or _REPO).strip()
    variants = expand_queries(query, m=m)
    try:
        if trace is not None and hasattr(trace, 'add'):
            trace.add('router.decide', {
                'policy': 'code',  # heuristic profile
                'intent': _classify_query(query),
                'query_original': query,
                'query_rewrites': variants[1:] if len(variants) > 1 else [],
                'knobs': {
                    'topk_sparse': _TOPK_SPARSE,
                    'topk_dense': _TOPK_DENSE,
                    'final_k': int(final_k),
                    'hydration_mode': _HYDRATION_MODE,
                },
            })
    except Exception:
        pass
    all_docs = []
    for qv in variants:
        docs = search(qv, repo=repo, final_k=final_k, trace=trace)
        all_docs.extend(docs)
    seen = set()
    uniq = []
    for d in all_docs:
        key = (d.get('file_path'), d.get('start_line'), d.get('end_line'))
        if key in seen:
            continue
        seen.add(key)
        uniq.append(d)
    
    # CRITICAL: Prioritize code files for implementation queries BEFORE final rerank
    q_lower = query.lower()
    wants_code = any(k in q_lower for k in ['implementation', 'where is', 'how does', 'function', 'class', 'method', 'api', 'code'])
    if wants_code:
        code_docs = [d for d in uniq if d.get('language', '').lower() in ('python', 'javascript', 'typescript', 'go', 'rust', 'java', 'cpp', 'c')]
        other_docs = [d for d in uniq if d not in code_docs]
        uniq = code_docs + other_docs  # Code first
    
    try:
        # Allow callers to disable reranking for fast smoke paths
        if bool(_DISABLE_RERANK):
            return uniq[:final_k]
        from .rerank import rerank_results as _rr
        reranked = _rr(query, uniq, top_k=final_k)
        _apply_filename_boosts(reranked, query)
        return reranked
    except Exception:
        return uniq[:final_k]
