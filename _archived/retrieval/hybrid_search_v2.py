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
EMBEDDING_TYPE = _cfg.get_str('EMBEDDING_TYPE', 'local').lower()

# Search weights
BM25_WEIGHT = 0.4  # Increase BM25 weight for small codebases
VECTOR_WEIGHT = 0.6

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


def get_embedding(text: str) -> List[float]:
    """Get embedding for query text."""
    if EMBEDDING_TYPE == 'local':
        from sentence_transformers import SentenceTransformer
        # Cache model
        if not hasattr(get_embedding, '_model'):
            get_embedding._model = SentenceTransformer('BAAI/bge-small-en-v1.5')
        return get_embedding._model.encode([text], normalize_embeddings=True)[0].tolist()
    
    elif EMBEDDING_TYPE == 'voyage':
        import voyageai
        if not hasattr(get_embedding, '_client'):
            get_embedding._client = voyageai.Client(api_key=os.getenv('VOYAGE_API_KEY'))
        r = get_embedding._client.embed([text], model='voyage-code-3', input_type='query', output_dimension=512)
        return r.embeddings[0]
    
    else:  # openai
        from openai import OpenAI
        if not hasattr(get_embedding, '_client'):
            get_embedding._client = OpenAI(api_key=os.getenv('OPENAI_API_KEY'))
        r = get_embedding._client.embeddings.create(input=text, model='text-embedding-3-small')
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
    
    # Load tokenizer with vocab - config-driven
    tokenizer_type = _cfg.get_str('BM25_TOKENIZER', 'stemmer').lower()
    stemmer_lang = _cfg.get_str('BM25_STEMMER_LANG', 'english')
    stopwords_lang = _cfg.get_str('BM25_STOPWORDS_LANG', 'en')

    if tokenizer_type == 'whitespace':
        tokenizer = Tokenizer(stemmer=None, stopwords=[], splitter=r"\s+")
    else:
        stemmer = Stemmer(stemmer_lang)
        tokenizer = Tokenizer(stemmer=stemmer, stopwords=stopwords_lang)

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


def rrf_fusion(results_list: List[List[tuple]], k: int = 60) -> List[str]:
    """Reciprocal Rank Fusion of multiple result lists.
    
    Args:
        results_list: List of [(id, score), ...] lists
        k: RRF constant (higher = more weight to top ranks)
    
    Returns:
        Fused list of IDs, sorted by combined score
    """
    scores = defaultdict(float)
    
    for results in results_list:
        for rank, (doc_id, _) in enumerate(results, start=1):
            scores[doc_id] += 1.0 / (k + rank)
    
    # Sort by score descending
    ranked = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    return [doc_id for doc_id, _ in ranked]


def rerank(query: str, docs: List[Dict], k: int = 10) -> List[Dict]:
    """Cross-encoder reranking."""
    if not docs:
        return []
    
    try:
        from rerankers import Reranker
        
        # Get reranker model from config
        model = _cfg.get_str('RERANKER_MODEL', 'cross-encoder/ms-marco-MiniLM-L-12-v2')
        
        # Check for local trained model
        local_model = Path(__file__).parent.parent / 'models' / 'cross-encoder-agro'
        if local_model.exists():
            model = str(local_model)
        
        # Cache reranker
        if not hasattr(rerank, '_reranker') or rerank._model_name != model:
            rerank._reranker = Reranker(model, model_type='cross-encoder')
            rerank._model_name = model
        
        # Prepare docs for reranking
        texts = []
        for d in docs:
            code = d.get('code', '')[:600]  # Truncate for speed
            fp = d.get('file_path', '')
            texts.append(f"{fp}\n{code}")
        
        # Rerank
        ranked = rerank._reranker.rank(query=query, docs=texts, doc_ids=list(range(len(docs))))
        
        # Apply scores and reorder
        for res in ranked.results:
            idx = res.document.doc_id
            if idx < len(docs):
                docs[idx]['rerank_score'] = float(res.score)
        
        docs.sort(key=lambda x: x.get('rerank_score', 0), reverse=True)
        return docs[:k]
    
    except Exception as e:
        print(f"[rerank] Failed: {e}, returning unranked")
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

