"""Clean Hybrid Search - v2 Rewrite

Simple, working search that:
1. BM25 sparse search
2. Qdrant vector search  
3. RRF fusion
4. Cross-encoder reranking
5. Returns results

No bells and whistles - just working search.
"""

import os
import json
from pathlib import Path
from typing import List, Dict, Optional
from collections import defaultdict

# BM25
import bm25s
from bm25s.tokenization import Tokenizer
from Stemmer import Stemmer

# Qdrant
from qdrant_client import QdrantClient, models

# Local imports
import sys
sys.path.insert(0, str(Path(__file__).parent.parent))
from common.config_loader import out_dir
from server.services.config_registry import get_config_registry

# Config
_cfg = get_config_registry()
REPO = _cfg.get_str('REPO', 'agro')
QDRANT_URL = _cfg.get_str('QDRANT_URL', 'http://127.0.0.1:6333')
COLLECTION = _cfg.get_str('COLLECTION_NAME', f'code_chunks_{REPO}')
EMBEDDING_TYPE = _cfg.get_str('EMBEDDING_TYPE', 'openai').lower()
EMBEDDING_MODEL = _cfg.get_str('EMBEDDING_MODEL', 'text-embedding-3-large')
EMBEDDING_MODEL_LOCAL = _cfg.get_str('EMBEDDING_MODEL_LOCAL', 'BAAI/bge-small-en-v1.5')
VOYAGE_MODEL = _cfg.get_str('VOYAGE_MODEL', 'voyage-code-3')

# Search weights (from config)
BM25_WEIGHT = _cfg.get_float('BM25_WEIGHT', 0.3)
VECTOR_WEIGHT = _cfg.get_float('VECTOR_WEIGHT', 0.7)

# Scoring bonuses (all multiplicative - value > 1.0 is a boost)
CARD_BONUS = _cfg.get_float('CARD_BONUS', 1.08)  # 8% multiplicative boost
FILENAME_BOOST_EXACT = _cfg.get_float('FILENAME_BOOST_EXACT', 1.5)
FILENAME_BOOST_PARTIAL = _cfg.get_float('FILENAME_BOOST_PARTIAL', 1.2)
LAYER_BONUS_GUI = _cfg.get_float('LAYER_BONUS_GUI', 1.15)  # 15% boost
LAYER_BONUS_RETRIEVAL = _cfg.get_float('LAYER_BONUS_RETRIEVAL', 1.15)
LAYER_BONUS_INDEXER = _cfg.get_float('LAYER_BONUS_INDEXER', 1.15)
FRESHNESS_BONUS = _cfg.get_float('FRESHNESS_BONUS', 1.05)  # 5% boost
VENDOR_PENALTY = _cfg.get_float('VENDOR_PENALTY', 0.9)  # 10% penalty (multiplicative)
KEYWORDS_BOOST = _cfg.get_float('KEYWORDS_BOOST', 1.3)  # 30% boost for keyword matches
PATH_BOOSTS = _cfg.get_str('PATH_BOOSTS', '/server,/retrieval,/indexer,/web')

# Caches
_LAYER_BONUSES_CACHE = None
_DISCRIMINATIVE_KEYWORDS = None

# Stopwords for query preprocessing (question words that hurt BM25)
QUERY_STOPWORDS = {
    'where', 'what', 'how', 'when', 'which', 'who', 'why', 'is', 'are',
    'the', 'a', 'an', 'in', 'on', 'at', 'to', 'for', 'of', 'with',
    'does', 'do', 'can', 'could', 'would', 'should', 'please', 'help',
}


def preprocess_query(query: str) -> str:
    """Remove stopwords from query for better BM25 matching."""
    words = query.lower().split()
    filtered = [w for w in words if w not in QUERY_STOPWORDS and len(w) > 1]
    return ' '.join(filtered) if filtered else query


# ============================================================================
# Query Classification & Scoring Functions
# All boosts are MULTIPLICATIVE (> 1.0 is a boost, < 1.0 is a penalty)
# ============================================================================

def classify_query(query: str) -> str:
    """Classify query intent to optimize scoring.
    
    Returns one of: 'gui', 'retrieval', 'indexer', 'eval', 'infra', or 'server'
    """
    ql = (query or '').lower()
    
    # GUI/Frontend queries
    if any(k in ql for k in ['gui', 'ui', 'dashboard', 'button', 'component', 'frontend', 'css', 'html', 'interface', 'react']):
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


def get_layer_bonus(layer: str, intent: str) -> float:
    """Get MULTIPLICATIVE layer bonus based on query intent.
    
    Returns multiplier (1.0 = no change, > 1.0 = boost)
    """
    global _LAYER_BONUSES_CACHE
    
    # Load from repos.json (cached)
    if _LAYER_BONUSES_CACHE is None:
        try:
            from common.config_loader import layer_bonuses
            _LAYER_BONUSES_CACHE = layer_bonuses(REPO)
        except Exception:
            # Fallback to defaults (values are additive in config, convert to multiplicative)
            _LAYER_BONUSES_CACHE = {
                'gui':       {'gui': 1.15, 'web': 1.10, 'server': 1.05},
                'retrieval': {'retrieval': 1.15, 'server': 1.05, 'common': 1.05},
                'indexer':   {'indexer': 1.15, 'retrieval': 1.08, 'common': 1.05},
                'eval':      {'eval': 1.15, 'tests': 1.10, 'retrieval': 1.05},
                'infra':     {'infra': 1.15, 'scripts': 1.08},
                'server':    {'server': 1.15, 'retrieval': 1.05, 'common': 1.05},
            }
    
    layer_lower = (layer or '').lower()
    intent_lower = (intent or 'server').lower()
    
    # Get from cache, default to 1.0 (no change)
    intent_bonuses = _LAYER_BONUSES_CACHE.get(intent_lower, {})
    bonus = intent_bonuses.get(layer_lower, 1.0)
    
    # If bonus is additive-style (< 1.0), convert to multiplicative
    if bonus < 1.0:
        bonus = 1.0 + bonus  # 0.15 becomes 1.15
    
    return bonus


def get_path_boost(file_path: str, repo: str = None) -> float:
    """Get MULTIPLICATIVE path boost.
    
    Returns multiplier (1.0 = no change, > 1.0 = boost)
    """
    fp = (file_path or '').lower()
    boost = 1.0
    
    # Try repos.json path_boosts
    if repo:
        try:
            from common.config_loader import path_boosts
            repo_boosts = path_boosts(repo)
            for boost_path in repo_boosts:
                if boost_path and boost_path.lower() in fp:
                    boost *= 1.06  # 6% multiplicative boost per match
        except Exception:
            pass
    
    # Fallback: use config PATH_BOOSTS
    if boost == 1.0:
        tokens = [t.strip().lower() for t in PATH_BOOSTS.split(',') if t.strip()]
        for tok in tokens:
            if tok and tok in fp:
                boost *= 1.06  # 6% multiplicative boost per match
    
    # Cap at 1.18 (18% max boost)
    return min(boost, 1.18)


def load_discriminative_keywords(repo: str) -> List[str]:
    """Load discriminative keywords for the repo."""
    global _DISCRIMINATIVE_KEYWORDS
    
    if _DISCRIMINATIVE_KEYWORDS is not None:
        return _DISCRIMINATIVE_KEYWORDS
    
    try:
        # Try repos.json keywords first
        from common.config_loader import get_repo_keywords
        keywords = get_repo_keywords(repo)
        if keywords:
            _DISCRIMINATIVE_KEYWORDS = keywords
            return _DISCRIMINATIVE_KEYWORDS
    except Exception:
        pass
    
    # Try discriminative_keywords.json
    try:
        kw_file = Path(__file__).parent.parent / 'discriminative_keywords.json'
        if kw_file.exists():
            data = json.loads(kw_file.read_text())
            if isinstance(data, list):
                _DISCRIMINATIVE_KEYWORDS = [k['term'] if isinstance(k, dict) else str(k) for k in data]
            elif isinstance(data, dict) and repo in data:
                _DISCRIMINATIVE_KEYWORDS = [k['term'] if isinstance(k, dict) else str(k) for k in data[repo]]
            else:
                _DISCRIMINATIVE_KEYWORDS = []
        else:
            _DISCRIMINATIVE_KEYWORDS = []
    except Exception:
        _DISCRIMINATIVE_KEYWORDS = []
    
    return _DISCRIMINATIVE_KEYWORDS


def get_keyword_boost(query: str, file_path: str, code: str, repo: str) -> float:
    """Get MULTIPLICATIVE keyword boost.
    
    Returns multiplier (1.0 = no change, > 1.0 = boost)
    """
    keywords = load_discriminative_keywords(repo)
    if not keywords:
        return 1.0
    
    ql = (query or '').lower()
    fp = (file_path or '').lower()
    code_sample = (code or '')[:2000].lower()  # Sample for performance
    
    boost = 1.0
    
    # Check keyword matches
    matches_in_query = sum(1 for kw in keywords if kw.lower() in ql)
    matches_in_path = sum(1 for kw in keywords if kw.lower() in fp)
    matches_in_code = sum(1 for kw in keywords[:20] if kw.lower() in code_sample)
    
    if matches_in_query > 0:
        # Query + path match is very strong
        if matches_in_path > 0:
            boost *= KEYWORDS_BOOST ** min(matches_in_path, 2)  # Up to 1.69x
        # Query + code match is strong
        if matches_in_code > 0:
            boost *= (KEYWORDS_BOOST ** 0.5) ** min(matches_in_code, 2)  # Up to ~1.5x
    elif matches_in_path > 0:
        # Path match without query match is still useful
        boost *= (KEYWORDS_BOOST ** 0.3) ** min(matches_in_path, 2)  # Smaller boost
    
    return boost


def get_filename_boost(file_path: str, query: str) -> float:
    """Get MULTIPLICATIVE filename boost.
    
    Returns multiplier (1.0 = no change, > 1.0 = boost)
    """
    fp = (file_path or '').lower()
    fn = os.path.basename(fp)
    parts = fp.split('/')
    
    # Extract query terms
    terms = set((query or '').lower().replace('/', ' ').replace('-', ' ').replace('_', ' ').split())
    terms = {t for t in terms if len(t) > 2 and t not in QUERY_STOPWORDS}
    
    boost = 1.0
    
    # Exact filename match (highest boost)
    if any(t and t in fn for t in terms):
        boost *= FILENAME_BOOST_EXACT
    
    # Partial path match
    if any(t and t in p for t in terms for p in parts):
        boost *= FILENAME_BOOST_PARTIAL
    
    # Boost code files over documentation
    if fp.endswith('.py'):
        boost *= 1.3
    elif fp.endswith(('.ts', '.tsx', '.js', '.jsx')):
        boost *= 1.2
    elif fp.endswith(('.go', '.rs', '.java', '.cpp', '.c')):
        boost *= 1.15
    elif fp.endswith('.md'):
        boost *= 0.3  # Heavy penalty for markdown
    elif fp.endswith(('.txt', '.rst')):
        boost *= 0.5  # Medium penalty
    
    return boost


def apply_scoring_bonuses(docs: List[Dict], query: str, repo: str) -> None:
    """Apply all MULTIPLICATIVE scoring bonuses to documents.
    
    Modifies docs in-place, updating 'rerank_score' for each document.
    """
    intent = classify_query(query)
    
    for d in docs:
        fp = d.get('file_path', '')
        layer = (d.get('layer') or '').lower()
        code = d.get('code', '')
        
        # Start with current score
        score = float(d.get('rerank_score', 0.0) or d.get('hybrid_score', 0.0) or d.get('bm25_score', 0.0) or 1.0)
        
        # Ensure minimum base score for multiplicative math
        if score <= 0:
            score = 0.01
        
        # Apply all MULTIPLICATIVE bonuses
        score *= get_layer_bonus(layer, intent)
        score *= get_path_boost(fp, repo)
        score *= get_keyword_boost(query, fp, code, repo)
        score *= get_filename_boost(fp, query)
        
        # Store updated score
        d['rerank_score'] = score
    
    # Re-sort by updated scores
    docs.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)


def get_embedding(text: str) -> List[float]:
    """Get embedding for query text using config-specified model."""
    if EMBEDDING_TYPE == 'local':
        from sentence_transformers import SentenceTransformer
        # Cache model - use config value
        if not hasattr(get_embedding, '_model') or get_embedding._model_name != EMBEDDING_MODEL_LOCAL:
            get_embedding._model = SentenceTransformer(EMBEDDING_MODEL_LOCAL)
            get_embedding._model_name = EMBEDDING_MODEL_LOCAL
        return get_embedding._model.encode([text], normalize_embeddings=True)[0].tolist()
    
    elif EMBEDDING_TYPE == 'voyage':
        import voyageai
        if not hasattr(get_embedding, '_client'):
            get_embedding._client = voyageai.Client(api_key=os.getenv('VOYAGE_API_KEY'))
        r = get_embedding._client.embed([text], model=VOYAGE_MODEL, input_type='query', output_dimension=512)
        return r.embeddings[0]
    
    else:  # openai (default)
        from openai import OpenAI
        if not hasattr(get_embedding, '_client'):
            get_embedding._client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        r = get_embedding._client.embeddings.create(input=text, model=EMBEDDING_MODEL)
        return r.data[0].embedding


def load_chunks(repo: str) -> Dict[str, Dict]:
    """Load chunk metadata by ID."""
    chunks_path = os.path.join(out_dir(repo), 'chunks.jsonl')
    chunks = {}
    try:
        with open(chunks_path, 'r', encoding='utf-8') as f:
            for line in f:
                c = json.loads(line)
                chunks[c['id']] = c
    except FileNotFoundError:
        pass
    return chunks


def bm25_search(query: str, repo: str, k: int = 50) -> List[tuple]:
    """BM25 sparse search. Returns [(chunk_id, score), ...]"""
    idx_dir = os.path.join(out_dir(repo), 'bm25_index')
    
    # Load BM25 index
    try:
        retriever = bm25s.BM25.load(idx_dir)
    except Exception as e:
        print(f"[bm25] Failed to load index: {e}")
        return []
    
    # Load tokenizer with vocab
    stemmer = Stemmer('english')
    tokenizer = Tokenizer(stemmer=stemmer, stopwords='en')
    try:
        tokenizer.load_vocab(idx_dir)
    except:
        pass
    
    # Preprocess and tokenize query
    processed = preprocess_query(query)
    tokens = tokenizer.tokenize([processed])
    
    # Retrieve
    try:
        indices, scores = retriever.retrieve(tokens, k=k)
        indices = indices[0].tolist() if hasattr(indices[0], 'tolist') else list(indices[0])
        scores = scores[0].tolist() if hasattr(scores[0], 'tolist') else list(scores[0])
    except Exception as e:
        print(f"[bm25] Retrieve failed: {e}")
        return []
    
    # Load ID mapping
    id_map = {}
    map_path = os.path.join(idx_dir, 'bm25_map.json')
    try:
        with open(map_path, 'r') as f:
            id_map = json.load(f)
    except:
        pass
    
    # Map indices to chunk IDs
    results = []
    for idx, score in zip(indices, scores):
        chunk_id = id_map.get(str(idx))
        if chunk_id and score > 0:
            results.append((chunk_id, float(score)))
    
    return results


def vector_search(query: str, repo: str, k: int = 50) -> List[tuple]:
    """Qdrant vector search. Returns [(chunk_id, score), ...]"""
    try:
        embedding = get_embedding(query)
    except Exception as e:
        print(f"[vector] Embedding failed: {e}")
        return []
    
    try:
        qc = QdrantClient(url=QDRANT_URL)
        coll = _cfg.get_str('COLLECTION_NAME', f'code_chunks_{repo}')
        
        response = qc.query_points(
            collection_name=coll,
            query=embedding,
            using='dense',
            limit=k,
            with_payload=['id', 'file_path', 'start_line', 'end_line', 'language']
        )
        
        results = []
        points = getattr(response, 'points', response)
        for p in points:
            chunk_id = p.payload.get('id')
            score = getattr(p, 'score', 0.0)
            if chunk_id:
                results.append((chunk_id, float(score)))
        
        return results
    
    except Exception as e:
        print(f"[vector] Search failed: {e}")
        return []


def rrf_fusion(results_list: List[List[tuple]], k: int = 60, weights: List[float] = None) -> List[str]:
    """Weighted Reciprocal Rank Fusion of multiple result lists.
    
    Args:
        results_list: List of [(id, score), ...] lists (e.g., [bm25_results, vector_results])
        k: RRF constant (higher = more weight to top ranks)
        weights: Optional weights for each result list. If None, uses config BM25_WEIGHT/VECTOR_WEIGHT
    
    Returns:
        Fused list of IDs, sorted by combined score
    """
    # Get weights from config if not provided
    if weights is None and len(results_list) == 2:
        bm25_weight = _cfg.get_float('BM25_WEIGHT', 0.3)
        vector_weight = _cfg.get_float('VECTOR_WEIGHT', 0.7)
        weights = [bm25_weight, vector_weight]
    elif weights is None:
        weights = [1.0] * len(results_list)
    
    scores = defaultdict(float)
    
    for weight, results in zip(weights, results_list):
        for rank, (doc_id, _) in enumerate(results, start=1):
            scores[doc_id] += weight * (1.0 / (k + rank))
    
    # Sort by score descending
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [doc_id for doc_id, _ in ranked]


def rerank(query: str, docs: List[Dict], k: int = 10) -> List[Dict]:
    """Rerank documents using configured backend (cohere, voyage, or local)."""
    if not docs:
        return []
    
    backend = _cfg.get_str('RERANKER_BACKEND', 'local').lower()
    
    try:
        # Prepare texts for reranking
        texts = []
        for d in docs:
            code = d.get('code', '')[:700]  # Truncate for speed
            fp = d.get('file_path', '')
            texts.append(f"{fp}\n{code}")
        
        if backend == 'cohere':
            import cohere
            model = _cfg.get_str('COHERE_RERANK_MODEL', 'rerank-v3.5')
            
            if not hasattr(rerank, '_cohere_client'):
                rerank._cohere_client = cohere.Client(api_key=os.getenv('COHERE_API_KEY'))
            
            response = rerank._cohere_client.rerank(
                model=model,
                query=query,
                documents=texts,
                top_n=min(k, len(texts)),
                return_documents=False
            )
            
            # Apply scores based on Cohere response
            for res in response.results:
                idx = res.index
                if idx < len(docs):
                    docs[idx]['rerank_score'] = float(res.relevance_score)
            
            docs.sort(key=lambda x: x.get('rerank_score', 0), reverse=True)
            return docs[:k]
        
        elif backend == 'voyage':
            import voyageai
            model = _cfg.get_str('VOYAGE_RERANK_MODEL', 'rerank-2')
            
            if not hasattr(rerank, '_voyage_client'):
                rerank._voyage_client = voyageai.Client(api_key=os.getenv('VOYAGE_API_KEY'))
            
            response = rerank._voyage_client.rerank(
                query=query,
                documents=texts,
                model=model,
                top_k=min(k, len(texts))
            )
            
            for res in response.results:
                idx = res.index
                if idx < len(docs):
                    docs[idx]['rerank_score'] = float(res.relevance_score)
            
            docs.sort(key=lambda x: x.get('rerank_score', 0), reverse=True)
            return docs[:k]
        
        else:  # local cross-encoder
            from rerankers import Reranker
            
            model = _cfg.get_str('RERANKER_MODEL', 'cross-encoder/ms-marco-MiniLM-L-12-v2')
            
            # Check for local trained model
            local_model = Path(__file__).parent.parent / 'models' / 'cross-encoder-agro'
            if local_model.exists():
                model = str(local_model)
            
            # Cache reranker
            if not hasattr(rerank, '_reranker') or rerank._model_name != model:
                rerank._reranker = Reranker(model, model_type='cross-encoder')
                rerank._model_name = model
            
            ranked = rerank._reranker.rank(query=query, docs=texts, doc_ids=list(range(len(docs))))
            
            for res in ranked.results:
                idx = res.document.doc_id
                if idx < len(docs):
                    docs[idx]['rerank_score'] = float(res.score)
            
            docs.sort(key=lambda x: x.get('rerank_score', 0), reverse=True)
            return docs[:k]
    
    except Exception as e:
        print(f"[rerank] Failed ({backend}): {e}, returning unranked")
        return docs[:k]


def hydrate_docs(docs: List[Dict], chunks: Dict[str, Dict]) -> None:
    """Add code content to docs that don't have it."""
    for d in docs:
        if not d.get('code'):
            chunk_id = d.get('id')
            if chunk_id and chunk_id in chunks:
                d['code'] = chunks[chunk_id].get('code', '')


def search(
    query: str,
    repo: str = None,
    topk_bm25: int = 50,
    topk_vector: int = 50,
    final_k: int = 10,
) -> List[Dict]:
    """
    Main search function.
    
    Args:
        query: Search query
        repo: Repository name (defaults to config)
        topk_bm25: Number of BM25 results
        topk_vector: Number of vector results
        final_k: Final number of results to return
    
    Returns:
        List of result dicts with file_path, start_line, end_line, code, score
    """
    repo = repo or REPO
    
    # Load chunk metadata
    chunks = load_chunks(repo)
    if not chunks:
        print(f"[search] No chunks found for repo '{repo}'")
        return []
    
    # BM25 search
    bm25_results = bm25_search(query, repo, k=topk_bm25)
    
    # Vector search
    vector_results = vector_search(query, repo, k=topk_vector)
    
    # Debug: Show overlap
    bm25_ids = set(r[0] for r in bm25_results[:20])
    vector_ids = set(r[0] for r in vector_results[:20])
    overlap = len(bm25_ids & vector_ids)
    
    # RRF fusion
    fused_ids = rrf_fusion([bm25_results, vector_results], k=60)
    
    # Build result docs
    docs = []
    for chunk_id in fused_ids[:final_k * 2]:  # Get more for reranking
        if chunk_id in chunks:
            doc = chunks[chunk_id].copy()
            doc['id'] = chunk_id
            docs.append(doc)
    
    # Hydrate with code
    hydrate_docs(docs, chunks)
    
    # Rerank
    results = rerank(query, docs, k=final_k)
    
    # Apply MULTIPLICATIVE scoring bonuses (layer, path, keyword, filename)
    apply_scoring_bonuses(results, query, repo)
    
    return results


# ============================================================================
# API Compatibility Functions
# These match the old hybrid_search.py interface for drop-in replacement
# ============================================================================

def route_repo(query: str, default_repo: str = None) -> str:
    """Route query to appropriate repo (simple implementation)."""
    # Check for explicit repo prefix like "agro: query"
    if ':' in query:
        parts = query.split(':', 1)
        if len(parts[0].strip()) < 20:  # Likely a repo name
            return parts[0].strip()
    return default_repo or REPO


def search_routed(query: str, repo_override: str = None, final_k: int = 10, trace=None) -> List[Dict]:
    """Simple search with repo routing."""
    repo = repo_override or route_repo(query)
    return search(query, repo=repo, final_k=final_k)


def search_routed_multi(query: str, repo_override: str = None, m: int = 4, final_k: int = 10, trace=None) -> List[Dict]:
    """
    Multi-query search (compatible with old API).
    
    For now, just calls single search. Multi-query expansion can be added back later.
    """
    repo = repo_override or route_repo(query)
    # Could add query expansion here later
    return search(query, repo=repo, final_k=final_k)


def expand_queries(query: str, m: int = 4) -> List[str]:
    """Generate query variants (stub for compatibility)."""
    # Just return original for now - can add LLM expansion later
    return [query]


def reload_config():
    """Reload config (stub for compatibility)."""
    pass


# Simple test
if __name__ == '__main__':
    query = "Where is hybrid search implemented?"
    print(f"Query: {query}\n")
    
    results = search(query, final_k=5)
    
    print(f"Results ({len(results)}):")
    for i, r in enumerate(results):
        fp = r.get('file_path', '?')
        score = r.get('rerank_score', 0)
        print(f"  {i+1}. [{score:.3f}] {fp}")

