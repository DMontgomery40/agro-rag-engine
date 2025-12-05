import json
import logging
import os
from typing import Any, Dict, List

import numpy as np
from fastapi import APIRouter, HTTPException, Query

from common.config_loader import out_dir
from server.services import indexing as svc

logger = logging.getLogger("agro.api")

router = APIRouter()


@router.get("/api/index/vocab-preview")
def get_vocab_preview(
    repo: str = Query(..., description="Repository name"),
    top_n: int = Query(100, ge=10, le=500, description="Number of top terms to return")
) -> Dict[str, Any]:
    """Get top N terms from BM25 vocabulary for inspection.

    Returns terms sorted by document frequency (most common first).
    Useful for debugging tokenization and understanding how code is indexed.
    """
    idx_dir = os.path.join(out_dir(repo), 'bm25_index')

    if not os.path.exists(idx_dir):
        raise HTTPException(status_code=404, detail=f"BM25 index not found for repo '{repo}'")

    try:
        # Load vocab from tokenizer file
        vocab_file = os.path.join(idx_dir, 'vocab.tokenizer.json')
        if not os.path.exists(vocab_file):
            raise HTTPException(status_code=404, detail="Vocabulary file not found")

        with open(vocab_file) as f:
            vocab_data = json.load(f)

        # stem_to_sid maps stemmed terms to integer IDs
        stem_to_sid = vocab_data.get('stem_to_sid', {})
        if not stem_to_sid:
            raise HTTPException(status_code=500, detail="Empty vocabulary")

        # Invert to get sid -> stem
        sid_to_stem = {v: k for k, v in stem_to_sid.items()}

        # Load doc frequencies from CSC sparse matrix indptr
        indptr_file = os.path.join(idx_dir, 'indptr.csc.index.npy')
        if not os.path.exists(indptr_file):
            # Fallback: return vocab without frequencies
            terms = [{"term": term, "doc_count": 0} for term in list(stem_to_sid.keys())[:top_n]]
            return {
                "terms": terms,
                "total_terms": len(stem_to_sid),
                "tokenizer": "stemmer",
                "repo": repo
            }

        indptr = np.load(indptr_file)
        doc_freqs = np.diff(indptr)

        # Get top N terms by doc frequency
        top_indices = np.argsort(doc_freqs)[::-1][:top_n]

        terms: List[Dict[str, Any]] = []
        for term_idx in top_indices:
            term = sid_to_stem.get(int(term_idx), f"?{term_idx}")
            freq = int(doc_freqs[term_idx])
            if freq > 0:  # Skip zero-frequency terms
                terms.append({
                    "term": term,
                    "doc_count": freq
                })

        # Detect tokenizer type from config or files
        tokenizer_type = "stemmer"  # default
        stopwords_file = os.path.join(idx_dir, 'stopwords.tokenizer.json')
        if os.path.exists(stopwords_file):
            with open(stopwords_file) as f:
                stopwords_data = json.load(f)
                # If stopwords list is empty, likely whitespace tokenizer
                if not stopwords_data:
                    tokenizer_type = "whitespace"

        return {
            "terms": terms,
            "total_terms": len(stem_to_sid),
            "tokenizer": tokenizer_type,
            "repo": repo
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.exception("Failed to load vocab preview")
        raise HTTPException(status_code=500, detail=f"Failed to load vocabulary: {str(e)}")


@router.post("/api/index/start")
def index_start(payload: Dict[str, Any] = None) -> Dict[str, Any]:
    return svc.start(payload)


@router.get("/api/index/stats")
def index_stats() -> Dict[str, Any]:
    return svc.stats()


@router.post("/api/index/run")
async def run_index(repo: str = Query(...), dense: bool = Query(True)):
    return await svc.run(repo, dense)


@router.get("/api/index/status")
def index_status() -> Dict[str, Any]:
    return svc.status()

