# ENTERPRISE INDEXING IMPLEMENTATION PLAN v2

**Created:** 2025-11-28  
**Updated:** 2025-11-28 (v2 - all issues fixed)  
**Priority:** CRITICAL  
**Estimated Total Effort:** 6-8 hours (3-4 hours per agent in parallel)
**Research Source:** Technical investigation of AGRO RAG codebase + NVIDIA 2024, Anthropic, Sweep AI industry research

---

## EXECUTIVE SUMMARY

The current indexer fails when any code chunk exceeds embedding model token limits. This plan implements enterprise-grade token-aware chunking, checkpointed batch processing, and resume capability for 1.5M+ document scale.

---

## 🔬 RESEARCH FINDINGS QUICK REFERENCE

| Area | Original Plan | Research Correction |
|------|---------------|---------------------|
| **Overlap %** | 6.7% (500/7500) | **10-20%** (750-1125 tokens) |
| **Tokenizer** | tiktoken for all | **Provider-specific** (tiktoken only for OpenAI) |
| **Voyage limit** | 16,000 | **32,000** |
| **Cohere embed** | 4,096 | **512** |
| **mxbai/bge** | 8,192 | **512** |
| **Qdrant rollback** | Assumed yes | **NO** - points persist on failure |
| **BM25 indexing** | Sub-chunks for both | **Original chunks only** (memory constraint) |
| **Chunk IDs** | MD5 | **SHA256** (future-proof) |
| **Cross-encoder** | - | **512 combined** (query + doc) |
| **Sub-chunk size** | max_tokens | **<400-450** (leave room for query) |
| **Qdrant batch** | 64 | **256-1000** for bulk upserts |
| **Embed batch** | 64 | **64** (correct for APIs) |

**The work is split into TWO parallel tracks:**
- **PART A (Agent 1):** Backend/Indexer — Token utilities, checkpointing, retry logic, index_repo.py modifications
- **PART B (Agent 2):** Data + API + Frontend — prices.json enhancement, checkpoint API endpoints, SSE progress parsing, GUI resume UI

---

## ⚠️ CRITICAL RESEARCH CORRECTIONS (READ FIRST!)

The original plan had several errors corrected by technical investigation:

### 1. OVERLAP PERCENTAGE WAS WRONG
- **Original plan:** 500/7500 = 6.7% overlap
- **Research recommendation:** 10-20% overlap (NVIDIA 2024, industry consensus)
- **CORRECTED:** Use 750-1125 tokens overlap (10-15% of max_tokens)

### 2. tiktoken CANNOT BE USED FOR NON-OPENAI MODELS
- **Original plan:** Used tiktoken cl100k_base for all providers
- **Reality:** Each provider uses different tokenization (BPE vs WordPiece vs proprietary)
- **CORRECTED:** Use tiktoken for OpenAI, char estimation (conservative) for others

### 3. TOKEN LIMITS WERE INCORRECT
- Voyage is **32,000** not 16,000
- Cohere embed is **512** not 4096
- mxbai, bge are **512** not 8192

### 4. QDRANT HAS NO ROLLBACK
- **Original plan:** Assumed partial batches could be rolled back
- **Reality:** Points written before failure PERSIST - no automatic rollback
- **CORRECTED:** Must implement checkpointing as compensation mechanism

### 5. BM25 MEMORY CONSTRAINT AT SCALE (CHANGED FROM v1)
- **v1 plan:** BM25 indexes sub-chunks (per Anthropic research)
- **Reality:** rank_bm25 loads entire corpus in RAM; 1.5M docs × 3-5x splits = 5-7M entries = 10-20GB+ RAM
- **CORRECTED:** BM25 indexes **original chunks only**, Qdrant indexes **sub-chunks for precision**
- **FUTURE:** Migrate to Qdrant sparse vectors or SQLite FTS5 for disk-based BM25

### 6. USE SHA256 NOT MD5 FOR CHUNK IDs
- MD5 is acceptable but SHA256 is preferred for future-proofing
- Minimal performance difference (~60% slower but still fast)

### 7. CROSS-ENCODER LIMIT AFFECTS SUB-CHUNK SIZE
- Cross-encoders have 512 token limit for query + document COMBINED
- Sub-chunks should be **under 400-450 tokens** to leave room for query

### 8. DIMENSION MISMATCH ON MODEL CHANGE (NEW)
- If user changes embedding model between runs, collection may have wrong dimensions
- **CORRECTED:** Must detect and handle dimension mismatch before resume

---

## CRITICAL PREREQUISITE: prices.json Enhancement

**WHO:** Part B agent does this FIRST (it's in their domain)  
**NOTIFY:** Part A agent can start immediately but will need updated prices.json before final testing

Add `max_tokens` AND `tokenizer_type` fields to ALL embedding and reranking models in `web/public/prices.json`.

### CORRECTED Token Limits (Research-Validated):

```json
// EMBEDDINGS - Add max_tokens AND tokenizer_type fields:
"text-embedding-3-large": { "max_tokens": 8191, "tokenizer_type": "tiktoken_cl100k" }
"text-embedding-3-small": { "max_tokens": 8191, "tokenizer_type": "tiktoken_cl100k" }
"text-embedding-ada-002": { "max_tokens": 8191, "tokenizer_type": "tiktoken_cl100k" }
"voyage-code-3": { "max_tokens": 32000, "tokenizer_type": "char_estimate" }
"voyage-3-large": { "max_tokens": 32000, "tokenizer_type": "char_estimate" }
"voyage-3.5": { "max_tokens": 32000, "tokenizer_type": "char_estimate" }
"BAAI/bge-small-en-v1.5": { "max_tokens": 512, "tokenizer_type": "char_estimate" }
"BAAI/bge-large-en-v1.5": { "max_tokens": 512, "tokenizer_type": "char_estimate" }
"BAAI/bge-m3": { "max_tokens": 8192, "tokenizer_type": "char_estimate" }
"mixedbread-ai/mxbai-embed-large-v1": { "max_tokens": 512, "tokenizer_type": "char_estimate" }
"nomic-embed-text": { "max_tokens": 8192, "tokenizer_type": "char_estimate" }
"intfloat/e5-large-v2": { "max_tokens": 512, "tokenizer_type": "char_estimate" }
"jina-embeddings-v3": { "max_tokens": 8192, "tokenizer_type": "char_estimate" }
"gemini-embedding-001": { "max_tokens": 2048, "tokenizer_type": "char_estimate" }
"embed-english-v3.0": { "max_tokens": 512, "tokenizer_type": "char_estimate" }
"embed-multilingual-v3.0": { "max_tokens": 512, "tokenizer_type": "char_estimate" }
"NV-Embed-v2": { "max_tokens": 32768, "tokenizer_type": "char_estimate" }

// RERANKERS - Add max_tokens field (query + doc combined limit):
"cross-encoder-agro": { "max_tokens": 512, "tokenizer_type": "char_estimate" }
"cross-encoder/ms-marco-MiniLM-L-12-v2": { "max_tokens": 512, "tokenizer_type": "char_estimate" }
"BAAI/bge-reranker-v2-m3": { "max_tokens": 8192, "tokenizer_type": "char_estimate" }
"jinaai/jina-reranker-v2": { "max_tokens": 1024, "tokenizer_type": "char_estimate" }
"mixedbread-ai/mxbai-rerank-large-v2": { "max_tokens": 512, "tokenizer_type": "char_estimate" }
"rerank-3.5": { "max_tokens": 4096, "tokenizer_type": "char_estimate" }
"rerank-english-v3.0": { "max_tokens": 4096, "tokenizer_type": "char_estimate" }
"voyage-rerank-2": { "max_tokens": 8000, "tokenizer_type": "char_estimate" }
```

**ALSO:** Add entry for the local learning reranker:
```json
{
  "provider": "local",
  "family": "cross-encoder-agro",
  "model": "cross-encoder-agro",
  "unit": "1k_tokens",
  "rerank_per_1k": 0.0,
  "max_tokens": 512,
  "tokenizer_type": "char_estimate",
  "notes": "AGRO Learning Reranker (trained locally, 512 token limit for query+doc)"
}
```

### Complete max_tokens Reference (CORRECTED):

| Model | max_tokens |
|-------|------------|
| text-embedding-3-large | 8191 |
| text-embedding-3-small | 8191 |
| text-embedding-ada-002 | 8191 |
| voyage-code-3 | **32000** |
| voyage-3-large | **32000** |
| voyage-3.5 | **32000** |
| BAAI/bge-small-en-v1.5 | 512 |
| BAAI/bge-large-en-v1.5 | 512 |
| BAAI/bge-m3 | 8192 |
| mixedbread-ai/mxbai-embed-large-v1 | 512 |
| nomic-embed-text | 8192 |
| intfloat/e5-large-v2 | 512 |
| jina-embeddings-v3 | 8192 |
| jina-clip-v2 | 8192 |
| gemini-embedding-001 | 2048 |
| embed-english-v3.0 | 512 |
| embed-multilingual-v3.0 | 512 |
| NV-Embed-v2 | 32768 |
| cross-encoder-agro | 512 |
| BAAI/bge-reranker-v2-m3 | 8192 |
| jinaai/jina-reranker-v3 | 8192 |
| mixedbread-ai/mxbai-rerank-large-v2 | 512 |
| rerank-3.5 | 4096 |
| rerank-english-v3.0 | 4096 |
| rerank-multilingual-v3.0 | 4096 |
| voyage-rerank-2 | 8000 |
| voyage-rerank-2-lite | 8000 |

---

# PART A: BACKEND/INDEXER

## Agent 1 Responsibilities

You are implementing the core indexing logic changes. Your work is in:
- `indexer/token_utils.py` (NEW)
- `indexer/embedding_checkpoint.py` (NEW)
- `indexer/embed_with_retry.py` (NEW)
- `indexer/index_repo.py` (MODIFY)

---

## A.1 CONTEXT: Current Indexer Architecture

### File: `indexer/index_repo.py`

Current flow (lines matter for modifications):
```
Lines 1-68: Imports and config
Lines 70-100: infer_layer_from_path() - DON'T TOUCH
Lines 103-140: should_index() - DON'T TOUCH
Lines 143-190: get_embedding_func() - HAS TRUNCATION BUG (line 179: MAX_CHARS=30000)
Lines 193-415: main() function - NEEDS MAJOR CHANGES

Main flow in main():
  213-231: Collect files
  234-273: Chunk files (AST chunking)
  275-318: Build BM25 index
  320-325: Save chunks.jsonl
  327-388: Embed and store in Qdrant ← PROBLEM AREA
  391-410: Save metadata
```

### Current Bug (Line 337):
```python
texts = [c['code'] for c in chunks]
embeddings = embed_func(texts)  # ← Sends ALL at once, fails if ANY > 8192 tokens
```

### Current Truncation (Line 179-186):
```python
MAX_CHARS = 30000  # ~7500 tokens estimate
batch = [t[:MAX_CHARS] if len(t) > MAX_CHARS else t for t in batch]
```
This LOSES DATA - user rejected this approach.

---

## A.2 ARCHITECTURE DECISION: BM25 vs Qdrant Indexing

**⚠️ CHANGED FROM v1 DUE TO MEMORY CONSTRAINTS**

### The Problem

Anthropic's research shows indexing sub-chunks in BOTH BM25 and Qdrant reduces failed retrievals by 49%. However, at 1.5M document scale:

- rank_bm25 loads entire corpus in RAM
- 1.5M docs × 3-5x chunk expansion = 5-7M BM25 entries
- Each entry stores tokenized text = **10-20GB+ RAM**

### The Solution (Pragmatic)

**Index DIFFERENTLY based on index type:**

| Index | What to Index | Why |
|-------|---------------|-----|
| **BM25** | Original chunks only | Memory constraint; keyword matching on full functions is fine |
| **Qdrant** | Split sub-chunks | Semantic similarity benefits from smaller, focused chunks |
| **chunks.jsonl** | Both (with parent_id) | Enables parent lookup during retrieval |

**Retrieval strategy:**
1. BM25 returns original chunk IDs (fast keyword matching)
2. Qdrant returns sub-chunk IDs (precise semantic matching)
3. Map sub-chunk IDs → parent_id for deduplication
4. Fuse scores using RRF
5. Hydrate from chunks.jsonl, preferring parent chunks for context

**FUTURE TODO:** Migrate to Qdrant sparse vectors (BM25-like but disk-based) for true sub-chunk BM25 at scale.

---

## A.3 FILE: indexer/token_utils.py (CREATE)

**⚠️ SIMPLIFIED: Use tiktoken for OpenAI, char estimation for everything else**

Why char estimation instead of loading model-specific tokenizers:
1. Different models use different vocabularies (bge uses xlm-roberta, not bert-base-uncased)
2. Loading HuggingFace tokenizers adds startup latency and dependencies
3. Char estimation (4 chars ≈ 1 token) is conservative and safe
4. Better to slightly over-split than fail on token limit

```python
"""
Token counting and chunk splitting for enterprise-scale indexing.

IMPORTANT: Different providers use different tokenization:
- OpenAI: tiktoken cl100k_base (accurate)
- Everything else: Conservative char estimation (4 chars ≈ 1 token)

Why char estimation for non-OpenAI:
- Each model has different vocabulary (bge uses xlm-roberta, not bert)
- Loading HuggingFace tokenizers adds latency and dependencies
- Char estimation is conservative and safe - slightly over-splits rather than failing

Token limits and tokenizer types are read from prices.json.
"""
import hashlib
import json
from pathlib import Path
from typing import List, Dict, Tuple, Optional

# Lazy imports to avoid loading unnecessary dependencies
_tiktoken_encoder = None
_prices_cache = None


def _load_prices() -> Dict:
    """Load prices.json with model metadata."""
    global _prices_cache
    if _prices_cache is not None:
        return _prices_cache
    
    # Try multiple locations
    search_paths = [
        Path(__file__).parent.parent / "web" / "public" / "prices.json",
        Path(__file__).parent.parent / "gui" / "prices.json",
        Path(__file__).parent.parent / "prices.json",
    ]
    
    for path in search_paths:
        if path.exists():
            try:
                _prices_cache = json.loads(path.read_text())
                return _prices_cache
            except Exception as e:
                print(f"[token_utils] Warning: Could not load {path}: {e}")
    
    print("[token_utils] Warning: prices.json not found, using defaults")
    _prices_cache = {"models": []}
    return _prices_cache


def _get_model_info(model_name: str) -> Optional[Dict]:
    """Get model info from prices.json using EXACT match only.
    
    IMPORTANT: No partial matching to avoid false positives.
    If model not found, returns None and caller uses provider defaults.
    """
    if not model_name:
        return None
        
    prices = _load_prices()
    model_lower = model_name.lower().strip()
    
    for model in prices.get("models", []):
        # EXACT match only - no partial matching
        if model.get("model", "").lower().strip() == model_lower:
            return model
    
    return None


def _get_tiktoken_encoder():
    """Get tiktoken encoder (lazy loaded, cached)."""
    global _tiktoken_encoder
    if _tiktoken_encoder is None:
        import tiktoken
        _tiktoken_encoder = tiktoken.get_encoding("cl100k_base")
    return _tiktoken_encoder


def get_tokenizer_type(model_name: str, provider: str = "openai") -> str:
    """Determine tokenizer type for a model.
    
    Returns one of: 'tiktoken_cl100k', 'char_estimate'
    
    Note: We only use tiktoken for OpenAI. Everything else uses conservative
    char estimation because loading model-specific tokenizers is complex
    and char estimation is safe (slightly pessimistic).
    """
    # Check prices.json first
    model_info = _get_model_info(model_name)
    if model_info:
        tokenizer_type = model_info.get("tokenizer_type", "")
        if tokenizer_type == "tiktoken_cl100k":
            return "tiktoken_cl100k"
        # All other types use char estimation
        return "char_estimate"
    
    # Fallback based on provider
    provider_lower = provider.lower() if provider else ""
    if provider_lower == "openai":
        return "tiktoken_cl100k"
    
    # Everything else: conservative char estimation
    return "char_estimate"


def count_tokens(text: str, model_name: str = None, provider: str = "openai") -> int:
    """Count tokens in text using the appropriate tokenizer.
    
    Args:
        text: Text to count tokens for
        model_name: Model name (for tokenizer selection)
        provider: Provider name for fallback
    
    Returns:
        Token count (may be conservative estimate for non-OpenAI)
    """
    if not text:
        return 0
        
    tokenizer_type = get_tokenizer_type(model_name or "", provider)
    
    if tokenizer_type == "tiktoken_cl100k":
        try:
            enc = _get_tiktoken_encoder()
            return len(enc.encode(text))
        except Exception:
            # Fallback if tiktoken fails
            return len(text) // 4
    
    # Conservative char estimation: 4 chars ≈ 1 token
    # This is slightly pessimistic but safe
    return len(text) // 4


def get_max_tokens_for_model(model_name: str, provider: str = "openai") -> int:
    """Get max token limit for a specific model.
    
    Args:
        model_name: Model identifier (e.g., 'text-embedding-3-large')
        provider: Provider name for fallback
    
    Returns:
        Token limit (with 5% safety buffer applied)
    """
    # Research-validated defaults by provider
    DEFAULT_TOKEN_LIMITS = {
        'openai': 8191,
        'voyage': 32000,  # CORRECTED from 16000
        'cohere': 512,
        'local': 512,
        'huggingface': 512,
        'google': 2048,
        'nvidia': 32768,
    }
    
    # Check prices.json first
    model_info = _get_model_info(model_name)
    if model_info and model_info.get("max_tokens"):
        # Apply 5% safety buffer
        return int(model_info["max_tokens"] * 0.95)
    
    # Fallback to provider defaults
    provider_lower = (provider or "").lower()
    if provider_lower in DEFAULT_TOKEN_LIMITS:
        return int(DEFAULT_TOKEN_LIMITS[provider_lower] * 0.95)
    
    # Ultimate fallback - very conservative for safety
    # Safe for 512-token models with query overhead
    return 450


def get_overlap_tokens(max_tokens: int, overlap_percentage: float = 0.12) -> int:
    """Calculate overlap tokens based on max tokens.
    
    Research recommends 10-20% overlap. Default is 12% (middle ground).
    
    Args:
        max_tokens: Maximum tokens per chunk
        overlap_percentage: Overlap as percentage (0.10 to 0.20 recommended)
    
    Returns:
        Number of overlap tokens
    """
    # Clamp to valid range
    overlap_percentage = max(0.10, min(0.20, overlap_percentage))
    return int(max_tokens * overlap_percentage)


def split_chunk_by_tokens(
    chunk: Dict,
    max_tokens: int,
    overlap_tokens: int,
    model_name: str = None,
    provider: str = "openai"
) -> List[Dict]:
    """
    Split an oversized chunk into sub-chunks with overlap.
    
    Uses SHA256 for deterministic, collision-resistant sub-chunk IDs.
    Maintains parent_id reference for retrieval.
    
    Args:
        chunk: Original chunk dict with 'id', 'code', etc.
        max_tokens: Maximum tokens per sub-chunk
        overlap_tokens: Token overlap between sub-chunks (10-20% recommended)
        model_name: Model name for tokenizer selection
        provider: Provider for tokenizer fallback
    
    Returns:
        List of sub-chunk dicts with parent_id references
    """
    code = chunk.get('code', '')
    if not code:
        return [chunk]
    
    tokenizer_type = get_tokenizer_type(model_name or "", provider)
    
    # For tiktoken, do token-based splitting
    if tokenizer_type == "tiktoken_cl100k":
        try:
            enc = _get_tiktoken_encoder()
            tokens = enc.encode(code)
            
            if len(tokens) <= max_tokens:
                chunk['token_count'] = len(tokens)
                chunk['is_split'] = False
                return [chunk]
            
            return _split_by_tokens_tiktoken(chunk, tokens, enc, max_tokens, overlap_tokens)
        except Exception:
            pass  # Fall through to char-based
    
    # Char-based splitting for everything else
    char_limit = max_tokens * 4  # ~4 chars per token
    overlap_chars = overlap_tokens * 4
    
    if len(code) <= char_limit:
        chunk['token_count'] = len(code) // 4
        chunk['is_split'] = False
        return [chunk]
    
    return _split_by_chars(chunk, code, char_limit, overlap_chars)


def _split_by_tokens_tiktoken(
    chunk: Dict, 
    tokens: List[int], 
    enc, 
    max_tokens: int, 
    overlap_tokens: int
) -> List[Dict]:
    """Split using tiktoken encoder."""
    sub_chunks = []
    start = 0
    idx = 0
    original_id = chunk['id']
    
    # Guard against bad overlap (must be less than half of max)
    overlap_tokens = min(overlap_tokens, max_tokens // 2)
    
    while start < len(tokens):
        end = min(start + max_tokens, len(tokens))
        sub_text = enc.decode(tokens[start:end])
        
        # SHA256 for collision resistance (16 hex chars = 64 bits)
        sub_id = hashlib.sha256(f"{original_id}_sub{idx}".encode()).hexdigest()[:16]
        
        sub_chunk = {
            **chunk,
            'id': sub_id,
            'code': sub_text,
            'token_count': end - start,
            'parent_id': original_id,
            'parent_start_line': chunk.get('start_line'),
            'sub_index': idx,
            'is_split': True,
        }
        sub_chunks.append(sub_chunk)
        
        idx += 1
        start = end - overlap_tokens
        
        # Avoid tiny trailing chunks (< 10% of max_tokens)
        remaining = len(tokens) - start
        if 0 < remaining <= max_tokens * 0.1:
            break
    
    return sub_chunks


def _split_by_chars(
    chunk: Dict, 
    code: str, 
    char_limit: int, 
    overlap_chars: int
) -> List[Dict]:
    """Fallback character-based splitting."""
    sub_chunks = []
    start = 0
    idx = 0
    original_id = chunk['id']
    
    # Guard against bad overlap
    overlap_chars = min(overlap_chars, char_limit // 2)
    
    while start < len(code):
        end = min(start + char_limit, len(code))
        
        # Try to break at a newline for cleaner splits
        if end < len(code):
            newline_pos = code.rfind('\n', start + char_limit // 2, end)
            if newline_pos > start:
                end = newline_pos + 1
        
        sub_text = code[start:end]
        
        # SHA256 for collision resistance
        sub_id = hashlib.sha256(f"{original_id}_sub{idx}".encode()).hexdigest()[:16]
        
        sub_chunk = {
            **chunk,
            'id': sub_id,
            'code': sub_text,
            'token_count': len(sub_text) // 4,
            'parent_id': original_id,
            'parent_start_line': chunk.get('start_line'),
            'sub_index': idx,
            'is_split': True,
        }
        sub_chunks.append(sub_chunk)
        
        idx += 1
        start = end - overlap_chars
        
        # Avoid tiny trailing chunks (< 10% of char_limit)
        remaining = len(code) - start
        if 0 < remaining <= char_limit * 0.1:
            break
    
    return sub_chunks


def prepare_chunks_for_embedding(
    chunks: List[Dict],
    model_name: str,
    provider: str = "openai",
    overlap_percentage: float = 0.12  # 12% default (research: 10-20%)
) -> Tuple[List[Dict], List[Dict], int, int]:
    """
    Process all chunks, splitting oversized ones.
    
    IMPORTANT: Returns TWO lists:
    - original_chunks: For BM25 indexing (memory-efficient)
    - embed_chunks: For Qdrant indexing (includes sub-chunks)
    
    Args:
        chunks: List of original chunk dicts
        model_name: Embedding model name (for token limit lookup)
        provider: Embedding provider
        overlap_percentage: Overlap as percentage (0.10 to 0.20 recommended)
    
    Returns:
        Tuple of (original_chunks, embed_chunks, total_tokens, split_count)
    """
    max_tokens = get_max_tokens_for_model(model_name, provider)
    overlap_tokens = get_overlap_tokens(max_tokens, overlap_percentage)
    
    print(f"   Token config: max={max_tokens}, overlap={overlap_tokens} ({overlap_percentage*100:.0f}%)")
    
    original_chunks = []  # For BM25 (no splits)
    embed_chunks = []     # For Qdrant (with splits)
    total_tokens = 0
    split_count = 0
    
    for chunk in chunks:
        code = chunk.get('code', '')
        token_count = count_tokens(code, model_name, provider)
        
        # Always add original to BM25 list
        chunk_with_tokens = {**chunk, 'token_count': token_count, 'is_split': False}
        original_chunks.append(chunk_with_tokens)
        
        if token_count <= max_tokens:
            # No split needed - add to embed list as-is
            embed_chunks.append(chunk_with_tokens)
            total_tokens += token_count
        else:
            # Split for embedding
            sub_chunks = split_chunk_by_tokens(
                chunk, max_tokens, overlap_tokens, model_name, provider
            )
            embed_chunks.extend(sub_chunks)
            split_count += 1
            total_tokens += sum(c['token_count'] for c in sub_chunks)
    
    return original_chunks, embed_chunks, total_tokens, split_count


def clear_cache():
    """Clear cached encoders and prices (for testing)."""
    global _tiktoken_encoder, _prices_cache
    _tiktoken_encoder = None
    _prices_cache = None
```

---

## A.4 FILE: indexer/embedding_checkpoint.py (CREATE)

**⚠️ INCLUDES cross-platform file locking (Unix + Windows fallback)**

```python
"""
Checkpoint management for resumable embedding.
Stores progress in out/{repo}/embedding_checkpoint.json

Uses file locking for concurrent safety (with Windows fallback).
"""
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List

# Cross-platform file locking
try:
    import fcntl
    _HAS_FCNTL = True
except ImportError:
    _HAS_FCNTL = False  # Windows

# Import out_dir from correct location
# NOTE: Verify this import path matches your actual codebase
try:
    from common.paths import out_dir
except ImportError:
    try:
        from common.config_loader import out_dir
    except ImportError:
        # Fallback if neither exists
        def out_dir(repo: str) -> str:
            return f"out/{repo}"


def _lock_file(f, exclusive: bool = True):
    """Acquire file lock (cross-platform)."""
    if _HAS_FCNTL:
        fcntl.flock(f.fileno(), fcntl.LOCK_EX if exclusive else fcntl.LOCK_SH)


def _unlock_file(f):
    """Release file lock (cross-platform)."""
    if _HAS_FCNTL:
        fcntl.flock(f.fileno(), fcntl.LOCK_UN)


def _checkpoint_path(repo: str) -> Path:
    """Get checkpoint file path for a repo."""
    return Path(out_dir(repo)) / "embedding_checkpoint.json"


def load_checkpoint(repo: str) -> Optional[Dict]:
    """Load existing checkpoint or None if not found/invalid.
    
    Uses shared lock for reading.
    
    Args:
        repo: Repository name
    
    Returns:
        Checkpoint dict or None
    """
    path = _checkpoint_path(repo)
    if not path.exists():
        return None
    try:
        with open(path, 'r') as f:
            _lock_file(f, exclusive=False)  # Shared lock for read
            try:
                data = json.load(f)
            finally:
                _unlock_file(f)
        
        # Validate required fields
        if 'completed_chunks' in data and 'total_chunks' in data:
            return data
    except Exception:
        pass
    return None


def save_checkpoint(
    repo: str,
    completed_chunks: int,
    total_chunks: int,
    failed_ids: Optional[List[str]] = None,
    embedding_type: str = None,
    embedding_model: str = None,
    embedding_dim: int = None,
    collection: str = None,
    batch_number: int = None,
    success_count: int = None,
    error_count: int = None,
):
    """Save checkpoint after successful batch.
    
    Uses exclusive lock for writing (concurrent safety).
    
    Args:
        repo: Repository name
        completed_chunks: Number of chunks successfully embedded
        total_chunks: Total chunks to embed
        failed_ids: List of chunk IDs that failed (for retry)
        embedding_type: Provider (openai, voyage, local)
        embedding_model: Model name
        embedding_dim: Vector dimensions (for mismatch detection)
        collection: Qdrant collection name
        batch_number: Current batch number
        success_count: Cumulative success count
        error_count: Cumulative error count
    """
    path = _checkpoint_path(repo)
    os.makedirs(path.parent, exist_ok=True)
    
    data = {
        'completed_chunks': completed_chunks,
        'total_chunks': total_chunks,
        'progress_pct': round(100 * completed_chunks / max(1, total_chunks), 1),
        'failed_ids': failed_ids or [],
        'embedding_type': embedding_type,
        'embedding_model': embedding_model,
        'embedding_dim': embedding_dim,  # NEW: for dimension mismatch detection
        'collection': collection,
        'batch_number': batch_number,
        'updated_at': datetime.utcnow().isoformat() + 'Z',
        # Processing stats for diagnostics
        'processing_stats': {
            'success_count': success_count or completed_chunks,
            'error_count': error_count or len(failed_ids or []),
            'retry_count': 0,
        }
    }
    
    with open(path, 'w') as f:
        _lock_file(f, exclusive=True)
        try:
            json.dump(data, f, indent=2)
        finally:
            _unlock_file(f)


def clear_checkpoint(repo: str):
    """Remove checkpoint after successful completion.
    
    Args:
        repo: Repository name
    """
    path = _checkpoint_path(repo)
    if path.exists():
        try:
            path.unlink()
        except Exception:
            pass  # Ignore errors on cleanup


def get_resume_info(repo: str) -> Optional[Dict]:
    """Get info for resume UI - returns None if no valid checkpoint.
    
    Args:
        repo: Repository name
    
    Returns:
        Dict with resume info or None
    """
    cp = load_checkpoint(repo)
    if not cp:
        return None
    
    return {
        'can_resume': cp['completed_chunks'] < cp['total_chunks'],
        'completed': cp['completed_chunks'],
        'total': cp['total_chunks'],
        'progress_pct': cp['progress_pct'],
        'failed_count': len(cp.get('failed_ids', [])),
        'embedding_type': cp.get('embedding_type'),
        'embedding_model': cp.get('embedding_model'),
        'embedding_dim': cp.get('embedding_dim'),
        'updated_at': cp.get('updated_at'),
        'batch_number': cp.get('batch_number'),
    }


def can_resume_with_model(repo: str, embedding_type: str, embedding_model: str, embedding_dim: int) -> bool:
    """Check if checkpoint is compatible with current embedding config.
    
    Returns False if:
    - No checkpoint exists
    - Embedding type changed
    - Embedding model changed
    - Embedding dimensions changed (critical!)
    
    Args:
        repo: Repository name
        embedding_type: Current provider
        embedding_model: Current model name
        embedding_dim: Current vector dimensions
    
    Returns:
        True if safe to resume, False otherwise
    """
    cp = load_checkpoint(repo)
    if not cp:
        return False
    
    if cp.get('embedding_type') != embedding_type:
        return False
    
    if cp.get('embedding_model') != embedding_model:
        return False
    
    # CRITICAL: Dimension mismatch would corrupt the collection
    if cp.get('embedding_dim') and cp['embedding_dim'] != embedding_dim:
        return False
    
    return True
```

---

## A.5 FILE: indexer/embed_with_retry.py (CREATE)

**⚠️ INCLUDES random jitter and max cap (60 seconds) per research recommendation**

```python
"""
Embedding with exponential backoff for rate limits.

Uses exponential backoff formula: min(MAX_DELAY, 2^attempt * base * jitter)
where jitter is random factor between 0.5 and 1.5.
"""
import time
import random
from typing import List, Callable, Optional

# Constants
MAX_DELAY_SECONDS = 60.0
BASE_DELAY_SECONDS = 1.0
JITTER_MIN = 0.5
JITTER_MAX = 1.5
DEFAULT_MAX_RETRIES = 5


def _calculate_delay(attempt: int) -> float:
    """Calculate delay with exponential backoff + jitter, capped at MAX_DELAY.
    
    Formula: min(MAX_DELAY, 2^attempt * base * jitter)
    """
    exponential = BASE_DELAY_SECONDS * (2 ** attempt)
    jitter = random.uniform(JITTER_MIN, JITTER_MAX)
    delay = exponential * jitter
    return min(delay, MAX_DELAY_SECONDS)


def _is_rate_limit_error(error: Exception) -> bool:
    """Check if error is a rate limit error."""
    error_str = str(error).lower()
    rate_limit_indicators = [
        'rate', '429', 'limit', 'quota', 
        'too many', 'throttl', 'capacity',
        'overloaded', 'busy'
    ]
    return any(ind in error_str for ind in rate_limit_indicators)


def embed_with_retry(
    embed_func: Callable[[List[str]], List[List[float]]],
    texts: List[str],
    max_retries: int = DEFAULT_MAX_RETRIES,
    on_retry: Optional[Callable[[int, float, Exception], None]] = None,
) -> List[List[float]]:
    """
    Call embed_func with exponential backoff on rate limit errors.
    
    Args:
        embed_func: Function that takes list of texts, returns list of embeddings
        texts: Texts to embed
        max_retries: Max retry attempts
        on_retry: Optional callback(attempt, delay, error) on each retry
    
    Returns:
        List of embedding vectors
    
    Raises:
        RuntimeError: If all retries exhausted
        Exception: If non-rate-limit error occurs
    """
    if not texts:
        return []
    
    last_error = None
    
    for attempt in range(max_retries):
        try:
            return embed_func(texts)
        except Exception as e:
            if _is_rate_limit_error(e):
                delay = _calculate_delay(attempt)
                
                if on_retry:
                    on_retry(attempt, delay, e)
                else:
                    print(f"   ⚠ Rate limited, waiting {delay:.1f}s (attempt {attempt + 1}/{max_retries})")
                
                time.sleep(delay)
                last_error = e
            else:
                # Not a rate limit error, re-raise immediately
                raise
    
    # Exhausted retries
    raise RuntimeError(f"Embedding failed after {max_retries} retries: {last_error}")


def embed_batch_with_retry(
    embed_func: Callable[[List[str]], List[List[float]]],
    all_texts: List[str],
    batch_size: int = 64,
    max_retries: int = DEFAULT_MAX_RETRIES,
    on_batch_complete: Optional[Callable[[int, int, int], None]] = None,
) -> List[List[float]]:
    """
    Embed texts in batches with retry logic.
    
    Args:
        embed_func: Embedding function
        all_texts: All texts to embed
        batch_size: Batch size (default 64, optimal for most APIs)
        max_retries: Max retries per batch
        on_batch_complete: Callback(batch_num, total_batches, texts_done) after each batch
    
    Returns:
        All embeddings in order
    """
    if not all_texts:
        return []
    
    all_embeddings = []
    total_batches = (len(all_texts) + batch_size - 1) // batch_size
    
    for batch_num, i in enumerate(range(0, len(all_texts), batch_size), start=1):
        batch = all_texts[i:i + batch_size]
        embeddings = embed_with_retry(embed_func, batch, max_retries)
        all_embeddings.extend(embeddings)
        
        if on_batch_complete:
            on_batch_complete(batch_num, total_batches, i + len(batch))
    
    return all_embeddings
```

---

## A.6 MODIFY: indexer/index_repo.py

### Complete Modification Guide

**1. Add imports at top (after existing imports):**
```python
from indexer.token_utils import prepare_chunks_for_embedding, count_tokens, get_max_tokens_for_model
from indexer.embedding_checkpoint import (
    load_checkpoint, save_checkpoint, clear_checkpoint, 
    can_resume_with_model, get_resume_info
)
from indexer.embed_with_retry import embed_with_retry
```

**2. Remove the MAX_CHARS truncation in get_embedding_func():**

Find and DELETE these lines (approximately 178-186):
```python
# OpenAI text-embedding-3-large has 8192 token limit
# Truncate texts to ~30000 chars (~7500 tokens) to stay safely under limit
MAX_CHARS = 30000
...
batch = [t[:MAX_CHARS] if len(t) > MAX_CHARS else t for t in batch]
```

The token limit handling is now done by `prepare_chunks_for_embedding()` BEFORE this function is called.

**3. After chunking (around line 273), add token processing:**

Find this line:
```python
print(f"   Created {len(chunks)} unique chunks")
```

Add AFTER it:
```python
    # ============================================================
    # TOKEN PROCESSING - Split oversized chunks
    # ============================================================
    # ARCHITECTURE NOTE:
    # - BM25 indexes ORIGINAL chunks only (memory constraint at 1.5M scale)
    # - Qdrant indexes SPLIT chunks (semantic precision)
    # - chunks.jsonl contains BOTH with parent_id references
    print(f"\n2b. Processing tokens for embedding...")
    
    # Determine model for token limits
    if EMBEDDING_TYPE == 'openai':
        model_name = EMBEDDING_MODEL
    elif EMBEDDING_TYPE == 'voyage':
        model_name = VOYAGE_MODEL
    else:
        model_name = EMBEDDING_MODEL_LOCAL
    
    # Split oversized chunks (12% overlap per research recommendation)
    original_chunks, embed_chunks, total_tokens, split_count = prepare_chunks_for_embedding(
        chunks,
        model_name=model_name,
        provider=EMBEDDING_TYPE,
        overlap_percentage=0.12  # 12% overlap (research: 10-20%)
    )
    
    print(f"   Total tokens: {total_tokens:,}")
    print(f"   BM25 chunks: {len(original_chunks)} (original only)")
    print(f"   Qdrant chunks: {len(embed_chunks)} (with splits)")
    if split_count > 0:
        print(f"   Split {split_count} oversized chunks → +{len(embed_chunks) - len(original_chunks)} sub-chunks")
    
    # Emit cost estimate for GUI (parsed by SSE handler)
    from indexer.token_utils import _get_model_info
    model_info = _get_model_info(model_name)
    embed_price = float(model_info.get('embed_per_1k', 0.13) if model_info else 0.13)
    estimated_cost = (total_tokens / 1000) * embed_price
    print(f"COST_ESTIMATE:{total_tokens}:{estimated_cost:.4f}")
```

**4. Update BM25 section to use original_chunks:**

Find the BM25 indexing section (around line 275-318). Update it to use `original_chunks`:

```python
    # ============================================================
    # 3. BUILD BM25 INDEX (original chunks only - memory efficient)
    # ============================================================
    print(f"\n3. Building BM25 index ({len(original_chunks)} chunks)...")
    
    # Create corpus for BM25 (code + metadata)
    corpus = []
    for c in original_chunks:  # ← Use original_chunks, NOT embed_chunks
        parts = []
        if c.get('name'):
            parts.append(c['name'])
        parts.append(c.get('file_path', ''))
        parts.append(c['code'])
        corpus.append(' '.join(parts))
    
    # ... rest of BM25 indexing unchanged ...
```

**5. Update chunks.jsonl saving to include BOTH original and sub-chunks:**

Find the chunks.jsonl saving section. Update to save all chunks with parent references:

```python
    # ============================================================
    # 3b. SAVE ALL CHUNKS (original + splits with parent_id)
    # ============================================================
    print(f"\n3b. Saving chunks.jsonl...")
    
    # Build a set of original chunk IDs for reference
    original_ids = {c['id'] for c in original_chunks}
    
    # Combine: original chunks + sub-chunks (avoiding duplicates)
    all_chunks_for_save = list(original_chunks)
    for c in embed_chunks:
        if c['id'] not in original_ids:
            all_chunks_for_save.append(c)
    
    chunks_file = Path(out_dir(REPO)) / "chunks.jsonl"
    with open(chunks_file, 'w') as f:
        for chunk in all_chunks_for_save:
            f.write(json.dumps(chunk) + '\n')
    
    print(f"   Saved {len(all_chunks_for_save)} chunks ({len(original_chunks)} original, {len(all_chunks_for_save) - len(original_chunks)} sub-chunks)")
```

**6. Replace embedding section with checkpointed version:**

Find and REPLACE the entire embedding section (approximately lines 327-388):

```python
    # ============================================================
    # 4. EMBEDDING WITH CHECKPOINTS
    # ============================================================
    print(f"\n4. Embedding and storing in Qdrant (checkpointed)...")
    
    embed_func, embed_dim = get_embedding_func()
    
    # Determine model name for checkpoint matching
    if EMBEDDING_TYPE == 'openai':
        model_name = EMBEDDING_MODEL
    elif EMBEDDING_TYPE == 'voyage':
        model_name = VOYAGE_MODEL
    else:
        model_name = EMBEDDING_MODEL_LOCAL
    
    # Check for compatible resume checkpoint
    start_idx = 0
    if can_resume_with_model(REPO, EMBEDDING_TYPE, model_name, embed_dim):
        checkpoint = load_checkpoint(REPO)
        start_idx = checkpoint.get('completed_chunks', 0)
        if start_idx > 0 and start_idx < len(embed_chunks):
            print(f"   📍 Resuming from chunk {start_idx}/{len(embed_chunks)}")
        elif start_idx >= len(embed_chunks):
            print(f"   ✓ Checkpoint shows complete, verifying...")
            start_idx = 0  # Re-run to verify
    
    # Connect to Qdrant
    qc = QdrantClient(url=QDRANT_URL)
    
    # Handle collection creation/validation
    if start_idx == 0:
        # Check for existing collection with mismatched dimensions
        try:
            existing_info = qc.get_collection(COLLECTION)
            existing_config = existing_info.config.params.vectors
            # Handle both dict and VectorParams formats
            if isinstance(existing_config, dict):
                existing_dim = existing_config.get('dense', {}).get('size')
            else:
                existing_dim = getattr(existing_config.get('dense'), 'size', None)
            
            if existing_dim and existing_dim != embed_dim:
                print(f"   ⚠ Dimension mismatch: existing={existing_dim}, new={embed_dim}")
                print(f"   Deleting collection for fresh start...")
                qc.delete_collection(COLLECTION)
            else:
                qc.delete_collection(COLLECTION)
                print(f"   Deleted existing collection '{COLLECTION}'")
        except Exception:
            pass  # Collection doesn't exist
        
        # Create fresh collection
        qc.create_collection(
            collection_name=COLLECTION,
            vectors_config={'dense': models.VectorParams(size=embed_dim, distance=models.Distance.COSINE)}
        )
        print(f"   Created collection '{COLLECTION}' (dim={embed_dim})")
    
    # Batch sizes (research-validated)
    EMBED_BATCH_SIZE = 64        # Optimal for embedding APIs
    QDRANT_BATCH_SIZE = 256      # Larger for bulk upserts (256-1000)
    
    total_embed_batches = (len(embed_chunks) - start_idx + EMBED_BATCH_SIZE - 1) // EMBED_BATCH_SIZE
    failed_ids = []
    pending_embeddings = []
    pending_chunks = []
    
    print(f"   Embedding {len(embed_chunks) - start_idx} chunks in {total_embed_batches} batches...")
    
    for batch_start in range(start_idx, len(embed_chunks), EMBED_BATCH_SIZE):
        batch_end = min(batch_start + EMBED_BATCH_SIZE, len(embed_chunks))
        batch = embed_chunks[batch_start:batch_end]
        batch_num = (batch_start - start_idx) // EMBED_BATCH_SIZE + 1
        
        texts = [c['code'] for c in batch]
        
        try:
            # Embed with retry on rate limits
            embeddings = embed_with_retry(embed_func, texts)
            
            # Accumulate for larger Qdrant batches
            pending_embeddings.extend(embeddings)
            pending_chunks.extend(batch)
            
            # Upsert to Qdrant when we have enough or at the end
            if len(pending_chunks) >= QDRANT_BATCH_SIZE or batch_end == len(embed_chunks):
                points = []
                for c, emb in zip(pending_chunks, pending_embeddings):
                    pid = str(uuid.uuid5(uuid.NAMESPACE_DNS, c['id']))
                    payload = {
                        'id': c['id'],
                        'file_path': c.get('file_path'),
                        'start_line': c.get('start_line'),
                        'end_line': c.get('end_line'),
                        'language': c.get('language'),
                        'repo': c.get('repo'),
                        'hash': c.get('hash'),
                        'layer': c.get('layer'),
                        # Split chunk metadata (for retrieval deduplication)
                        'parent_id': c.get('parent_id'),
                        'is_split': c.get('is_split', False),
                        'sub_index': c.get('sub_index'),
                        'token_count': c.get('token_count'),
                    }
                    points.append(models.PointStruct(
                        id=pid,
                        vector={'dense': emb},
                        payload={k: v for k, v in payload.items() if v is not None}
                    ))
                
                # NOTE: Qdrant has NO rollback - points persist on partial failure
                # Checkpointing is our compensation mechanism
                qc.upsert(COLLECTION, points=points)
                
                # Clear pending after successful upsert
                pending_chunks = []
                pending_embeddings = []
            
            # Save checkpoint after each embedding batch
            save_checkpoint(
                REPO,
                completed_chunks=batch_end,
                total_chunks=len(embed_chunks),
                embedding_type=EMBEDDING_TYPE,
                embedding_model=model_name,
                embedding_dim=embed_dim,
                collection=COLLECTION,
                batch_number=batch_num,
            )
            
            # Progress output for SSE (parsed by frontend)
            progress_pct = round(100 * batch_end / len(embed_chunks), 1)
            print(f"PROGRESS:{progress_pct}:Embedding batch {batch_num}/{total_embed_batches} ({batch_end}/{len(embed_chunks)} chunks)")
            
        except Exception as e:
            print(f"   ⚠ Batch {batch_num} failed: {e}")
            failed_ids.extend([c['id'] for c in batch])
            
            # Save checkpoint with failed IDs for potential retry
            save_checkpoint(
                REPO,
                completed_chunks=batch_start,  # Don't advance past failed batch
                total_chunks=len(embed_chunks),
                failed_ids=failed_ids,
                embedding_type=EMBEDDING_TYPE,
                embedding_model=model_name,
                embedding_dim=embed_dim,
                collection=COLLECTION,
                batch_number=batch_num,
            )
            raise  # Re-raise to stop indexing
    
    # Success - clear checkpoint
    clear_checkpoint(REPO)
    print(f"   ✓ Indexed {len(embed_chunks)} vectors to Qdrant")
    if split_count > 0:
        print(f"   ✓ ({len(original_chunks)} original, {len(embed_chunks) - len(original_chunks)} from splits)")
```

**7. Update metadata save:**

Update the final metadata save section:

```python
    # ============================================================
    # 5. SAVE METADATA
    # ============================================================
    meta = {
        'repo': REPO,
        'timestamp': datetime.utcnow().isoformat() + 'Z',
        'bm25_chunk_count': len(original_chunks),   # BM25 uses original only
        'vector_count': len(embed_chunks),           # Qdrant includes splits
        'total_tokens': total_tokens,
        'split_count': split_count,
        'embedding_type': EMBEDDING_TYPE,
        'embedding_model': model_name,
        'embedding_dim': embed_dim,
        'collection': COLLECTION,
        'overlap_percentage': 0.12,
        # ... rest of existing metadata ...
    }
```

---

## A.7 PART A TODO LIST

```
□ A1. Create indexer/token_utils.py
   - _load_prices() with multiple search paths
   - _get_model_info() with EXACT match only
   - count_tokens() with tiktoken/char fallback
   - get_max_tokens_for_model() with provider defaults
   - split_chunk_by_tokens() with SHA256 IDs
   - prepare_chunks_for_embedding() returning (original, embed, tokens, splits)

□ A2. Create indexer/embedding_checkpoint.py
   - Cross-platform file locking (fcntl + Windows fallback)
   - save_checkpoint() with embedding_dim field
   - can_resume_with_model() for dimension mismatch detection
   - Verify out_dir import path

□ A3. Create indexer/embed_with_retry.py
   - Exponential backoff with jitter
   - 60 second max delay cap
   - Rate limit detection for multiple providers

□ A4. Modify indexer/index_repo.py
   - Add imports
   - Remove MAX_CHARS truncation
   - Add token processing after chunking
   - Update BM25 to use original_chunks only
   - Update chunks.jsonl to save both original and splits
   - Replace embedding section with checkpointed version
   - Add dimension mismatch detection
   - Update metadata save

□ A5. Write unit tests
   - tests/test_token_utils.py
   - tests/test_embedding_checkpoint.py
   - tests/test_embed_with_retry.py

□ A6. Integration test
   - Index small repo, verify checkpoint created
   - Kill mid-run, verify resume works
   - Change embedding model, verify collection recreated
   - Verify no duplicate vectors in Qdrant
```

---

# PART B: DATA + API + FRONTEND

## Agent 2 Responsibilities

You are implementing data enhancement, API endpoints, and frontend changes. Your work is in:
- `web/public/prices.json` (MODIFY)
- `gui/prices.json` (MODIFY) - Keep in sync
- `server/models/price_model.py` (NEW) - Pydantic validation
- `server/routers/indexing.py` (MODIFY)
- `server/routers/stream_logs.py` (MODIFY)
- `web/src/components/RAG/IndexingSubtab.tsx` (MODIFY)
- `retrieval/hybrid_search.py` (MODIFY)

---

## B.1 FILE: server/models/price_model.py (NEW)

**Add Pydantic validation for prices.json entries:**

```python
"""
Pydantic models for prices.json validation.
Ensures type safety for token limits and tokenizer types.
"""
from typing import Optional, Literal, List
from pydantic import BaseModel, Field, validator


class PriceEntry(BaseModel):
    """Single entry in prices.json models array."""
    
    provider: str
    family: str
    model: str
    unit: str
    
    # Pricing (at least one should be set)
    embed_per_1k: Optional[float] = None
    rerank_per_1k: Optional[float] = None
    input_per_1k: Optional[float] = None
    output_per_1k: Optional[float] = None
    
    # Token configuration
    max_tokens: int = Field(..., gt=0, description="Maximum token limit for this model")
    tokenizer_type: Literal[
        "tiktoken_cl100k",
        "char_estimate",
        "bert_wordpiece",  # Kept for documentation, treated as char_estimate
        "voyage_api",      # Kept for documentation, treated as char_estimate
        "cohere_api",      # Kept for documentation, treated as char_estimate
        "google_api",      # Kept for documentation, treated as char_estimate
    ] = "char_estimate"
    
    # Optional metadata
    dimensions: Optional[int] = None
    notes: Optional[str] = None
    
    @validator('max_tokens')
    def validate_max_tokens(cls, v):
        if v <= 0:
            raise ValueError('max_tokens must be positive')
        if v > 200000:
            raise ValueError('max_tokens seems unreasonably large')
        return v


class PricesConfig(BaseModel):
    """Root schema for prices.json."""
    
    models: List[PriceEntry]
    
    def get_embedding_models(self) -> List[PriceEntry]:
        """Return only embedding models."""
        return [m for m in self.models if m.embed_per_1k is not None]
    
    def get_reranker_models(self) -> List[PriceEntry]:
        """Return only reranker models."""
        return [m for m in self.models if m.rerank_per_1k is not None]
    
    def find_model(self, model_name: str) -> Optional[PriceEntry]:
        """Find model by exact name match."""
        model_lower = model_name.lower().strip()
        for m in self.models:
            if m.model.lower().strip() == model_lower:
                return m
        return None


def validate_prices_json(prices_data: dict) -> PricesConfig:
    """Validate prices.json data and return typed config.
    
    Raises:
        pydantic.ValidationError: If validation fails
    """
    return PricesConfig(**prices_data)
```

---

## B.2 FILE: web/public/prices.json (MODIFY)

**Add `max_tokens` and `tokenizer_type` fields to ALL models.**

Here's the structure for each model type. You need to add these fields to EVERY existing entry:

```json
{
  "models": [
    // ===== EMBEDDING MODELS =====
    {
      "provider": "openai",
      "family": "text-embedding-3-small",
      "model": "text-embedding-3-small",
      "unit": "1k_tokens",
      "embed_per_1k": 0.02,
      "dimensions": 1536,
      "max_tokens": 8191,
      "tokenizer_type": "tiktoken_cl100k",
      "notes": "Small embeddings model"
    },
    {
      "provider": "openai",
      "family": "text-embedding-3-large",
      "model": "text-embedding-3-large",
      "unit": "1k_tokens",
      "embed_per_1k": 0.13,
      "dimensions": 3072,
      "max_tokens": 8191,
      "tokenizer_type": "tiktoken_cl100k",
      "notes": "Large embeddings model"
    },
    {
      "provider": "openai",
      "family": "text-embedding-ada-002",
      "model": "text-embedding-ada-002",
      "unit": "1k_tokens",
      "embed_per_1k": 0.10,
      "dimensions": 1536,
      "max_tokens": 8191,
      "tokenizer_type": "tiktoken_cl100k",
      "notes": "Legacy embeddings model"
    },
    {
      "provider": "voyage",
      "family": "voyage-3",
      "model": "voyage-code-3",
      "unit": "1k_tokens",
      "embed_per_1k": 0.06,
      "dimensions": 1024,
      "max_tokens": 32000,
      "tokenizer_type": "char_estimate",
      "notes": "Code-optimized embeddings"
    },
    {
      "provider": "voyage",
      "family": "voyage-3",
      "model": "voyage-3-large",
      "unit": "1k_tokens",
      "embed_per_1k": 0.06,
      "dimensions": 1024,
      "max_tokens": 32000,
      "tokenizer_type": "char_estimate",
      "notes": "Large general embeddings"
    },
    {
      "provider": "voyage",
      "family": "voyage-3",
      "model": "voyage-3.5",
      "unit": "1k_tokens",
      "embed_per_1k": 0.06,
      "dimensions": 1024,
      "max_tokens": 32000,
      "tokenizer_type": "char_estimate",
      "notes": "Latest Voyage embeddings"
    },
    {
      "provider": "cohere",
      "family": "embed-v3",
      "model": "embed-english-v3.0",
      "unit": "1k_tokens",
      "embed_per_1k": 0.10,
      "dimensions": 1024,
      "max_tokens": 512,
      "tokenizer_type": "char_estimate",
      "notes": "English embeddings (512 token limit)"
    },
    {
      "provider": "cohere",
      "family": "embed-v3",
      "model": "embed-multilingual-v3.0",
      "unit": "1k_tokens",
      "embed_per_1k": 0.10,
      "dimensions": 1024,
      "max_tokens": 512,
      "tokenizer_type": "char_estimate",
      "notes": "Multilingual embeddings (512 token limit)"
    },
    {
      "provider": "local",
      "family": "bge",
      "model": "BAAI/bge-small-en-v1.5",
      "unit": "1k_tokens",
      "embed_per_1k": 0.0,
      "dimensions": 384,
      "max_tokens": 512,
      "tokenizer_type": "char_estimate",
      "notes": "Small local embeddings"
    },
    {
      "provider": "local",
      "family": "bge",
      "model": "BAAI/bge-large-en-v1.5",
      "unit": "1k_tokens",
      "embed_per_1k": 0.0,
      "dimensions": 1024,
      "max_tokens": 512,
      "tokenizer_type": "char_estimate",
      "notes": "Large local embeddings"
    },
    {
      "provider": "local",
      "family": "bge",
      "model": "BAAI/bge-m3",
      "unit": "1k_tokens",
      "embed_per_1k": 0.0,
      "dimensions": 1024,
      "max_tokens": 8192,
      "tokenizer_type": "char_estimate",
      "notes": "Multilingual local embeddings"
    },
    {
      "provider": "local",
      "family": "mxbai",
      "model": "mixedbread-ai/mxbai-embed-large-v1",
      "unit": "1k_tokens",
      "embed_per_1k": 0.0,
      "dimensions": 1024,
      "max_tokens": 512,
      "tokenizer_type": "char_estimate",
      "notes": "High-quality local embeddings"
    },
    {
      "provider": "local",
      "family": "nomic",
      "model": "nomic-embed-text",
      "unit": "1k_tokens",
      "embed_per_1k": 0.0,
      "dimensions": 768,
      "max_tokens": 8192,
      "tokenizer_type": "char_estimate",
      "notes": "Open-source embeddings"
    },
    {
      "provider": "local",
      "family": "e5",
      "model": "intfloat/e5-large-v2",
      "unit": "1k_tokens",
      "embed_per_1k": 0.0,
      "dimensions": 1024,
      "max_tokens": 512,
      "tokenizer_type": "char_estimate",
      "notes": "E5 embeddings"
    },
    {
      "provider": "jina",
      "family": "jina-v3",
      "model": "jina-embeddings-v3",
      "unit": "1k_tokens",
      "embed_per_1k": 0.02,
      "dimensions": 1024,
      "max_tokens": 8192,
      "tokenizer_type": "char_estimate",
      "notes": "Jina embeddings v3"
    },
    {
      "provider": "google",
      "family": "gemini",
      "model": "gemini-embedding-001",
      "unit": "1k_tokens",
      "embed_per_1k": 0.0,
      "dimensions": 768,
      "max_tokens": 2048,
      "tokenizer_type": "char_estimate",
      "notes": "Google Gemini embeddings"
    },
    {
      "provider": "nvidia",
      "family": "nv-embed",
      "model": "NV-Embed-v2",
      "unit": "1k_tokens",
      "embed_per_1k": 0.0,
      "dimensions": 4096,
      "max_tokens": 32768,
      "tokenizer_type": "char_estimate",
      "notes": "NVIDIA large context embeddings"
    },
    
    // ===== RERANKER MODELS =====
    {
      "provider": "local",
      "family": "cross-encoder-agro",
      "model": "cross-encoder-agro",
      "unit": "1k_tokens",
      "rerank_per_1k": 0.0,
      "max_tokens": 512,
      "tokenizer_type": "char_estimate",
      "notes": "AGRO Learning Reranker (query+doc combined limit)"
    },
    {
      "provider": "local",
      "family": "cross-encoder",
      "model": "cross-encoder/ms-marco-MiniLM-L-12-v2",
      "unit": "1k_tokens",
      "rerank_per_1k": 0.0,
      "max_tokens": 512,
      "tokenizer_type": "char_estimate",
      "notes": "MS-MARCO cross-encoder"
    },
    {
      "provider": "local",
      "family": "bge-reranker",
      "model": "BAAI/bge-reranker-v2-m3",
      "unit": "1k_tokens",
      "rerank_per_1k": 0.0,
      "max_tokens": 8192,
      "tokenizer_type": "char_estimate",
      "notes": "BGE reranker (long context)"
    },
    {
      "provider": "jina",
      "family": "jina-reranker",
      "model": "jinaai/jina-reranker-v2",
      "unit": "1k_tokens",
      "rerank_per_1k": 0.02,
      "max_tokens": 1024,
      "tokenizer_type": "char_estimate",
      "notes": "Jina reranker v2"
    },
    {
      "provider": "local",
      "family": "mxbai-rerank",
      "model": "mixedbread-ai/mxbai-rerank-large-v2",
      "unit": "1k_tokens",
      "rerank_per_1k": 0.0,
      "max_tokens": 512,
      "tokenizer_type": "char_estimate",
      "notes": "Mixedbread reranker"
    },
    {
      "provider": "cohere",
      "family": "rerank-3",
      "model": "rerank-3.5",
      "unit": "1k_tokens",
      "rerank_per_1k": 2.0,
      "max_tokens": 4096,
      "tokenizer_type": "char_estimate",
      "notes": "Cohere reranker 3.5"
    },
    {
      "provider": "cohere",
      "family": "rerank-3",
      "model": "rerank-english-v3.0",
      "unit": "1k_tokens",
      "rerank_per_1k": 2.0,
      "max_tokens": 4096,
      "tokenizer_type": "char_estimate",
      "notes": "Cohere English reranker"
    },
    {
      "provider": "cohere",
      "family": "rerank-3",
      "model": "rerank-multilingual-v3.0",
      "unit": "1k_tokens",
      "rerank_per_1k": 2.0,
      "max_tokens": 4096,
      "tokenizer_type": "char_estimate",
      "notes": "Cohere multilingual reranker"
    },
    {
      "provider": "voyage",
      "family": "voyage-rerank",
      "model": "voyage-rerank-2",
      "unit": "1k_tokens",
      "rerank_per_1k": 0.05,
      "max_tokens": 8000,
      "tokenizer_type": "char_estimate",
      "notes": "Voyage reranker"
    },
    {
      "provider": "voyage",
      "family": "voyage-rerank",
      "model": "voyage-rerank-2-lite",
      "unit": "1k_tokens",
      "rerank_per_1k": 0.02,
      "max_tokens": 8000,
      "tokenizer_type": "char_estimate",
      "notes": "Voyage lite reranker"
    }
  ]
}
```

**IMPORTANT:** Sync changes to `gui/prices.json` after updating!

---

## B.3 FILE: server/routers/indexing.py (MODIFY)

**Add checkpoint endpoints:**

```python
# Add import at top
from indexer.embedding_checkpoint import get_resume_info, load_checkpoint, clear_checkpoint
from typing import Dict, Any

# Add new endpoints:

@router.get("/api/index/checkpoint/{repo}")
def get_index_checkpoint(repo: str) -> Dict[str, Any]:
    """Get checkpoint status for resume UI.
    
    Returns:
        - has_checkpoint: bool
        - can_resume: bool (if checkpoint exists and not complete)
        - completed: int (chunks completed)
        - total: int (total chunks)
        - progress_pct: float
        - failed_count: int
        - embedding_type: str
        - embedding_model: str
        - embedding_dim: int
        - updated_at: str (ISO timestamp)
    """
    info = get_resume_info(repo)
    if info:
        return {"has_checkpoint": True, **info}
    return {"has_checkpoint": False}


@router.delete("/api/index/checkpoint/{repo}")
def delete_index_checkpoint(repo: str) -> Dict[str, Any]:
    """Delete checkpoint to force fresh start.
    
    Use when user wants to re-index from scratch or
    when changing embedding models.
    """
    try:
        clear_checkpoint(repo)
        return {"ok": True, "message": f"Checkpoint cleared for {repo}"}
    except Exception as e:
        return {"ok": False, "error": str(e)}
```

---

## B.4 FILE: server/routers/stream_logs.py (MODIFY)

**Update `stream_index_run()` to parse progress events:**

Find the SSE streaming section and update:

```python
async def stream_index_run(request: Request, repo: str):
    """Stream indexer output as SSE events."""
    # ... existing setup code ...
    
    for line in iter(process.stdout.readline, ''):
        if await request.is_disconnected():
            process.terminate()
            break
        
        line_stripped = line.strip()
        
        # Parse PROGRESS format: PROGRESS:percent:message
        if line_stripped.startswith('PROGRESS:'):
            parts = line_stripped.split(':', 2)
            if len(parts) >= 2:
                try:
                    percent = float(parts[1])
                    message = parts[2] if len(parts) > 2 else f'{percent:.1f}%'
                    yield f"data: {json.dumps({'type': 'progress', 'percent': percent, 'message': message})}\n\n"
                    continue
                except ValueError:
                    pass
        
        # Parse COST_ESTIMATE format: COST_ESTIMATE:tokens:cost
        if line_stripped.startswith('COST_ESTIMATE:'):
            parts = line_stripped.split(':')
            if len(parts) >= 3:
                try:
                    tokens = int(parts[1])
                    cost = float(parts[2])
                    yield f"data: {json.dumps({'type': 'cost_estimate', 'tokens': tokens, 'cost': cost})}\n\n"
                    continue
                except ValueError:
                    pass
        
        # Default: send as log line
        yield f"data: {json.dumps({'type': 'log', 'message': line_stripped})}\n\n"
        await asyncio.sleep(0.01)
```

---

## B.5 FILE: web/src/components/RAG/IndexingSubtab.tsx (MODIFY)

**Add checkpoint detection and resume UI.**

### Add state and types:
```typescript
// Add near other state declarations
interface CheckpointInfo {
  has_checkpoint: boolean;
  can_resume?: boolean;
  completed?: number;
  total?: number;
  progress_pct?: number;
  failed_count?: number;
  embedding_type?: string;
  embedding_model?: string;
  embedding_dim?: number;
  updated_at?: string;
}

interface CostEstimate {
  tokens: number;
  cost: number;
}

const [checkpointInfo, setCheckpointInfo] = useState<CheckpointInfo | null>(null);
const [costEstimate, setCostEstimate] = useState<CostEstimate | null>(null);
```

### Add checkpoint functions:
```typescript
const loadCheckpoint = async () => {
  if (!currentRepo) return;
  try {
    const response = await fetch(`/api/index/checkpoint/${encodeURIComponent(currentRepo)}`);
    const data = await response.json();
    setCheckpointInfo(data);
  } catch (error) {
    console.error('Failed to load checkpoint:', error);
    setCheckpointInfo(null);
  }
};

const handleClearCheckpoint = async () => {
  if (!currentRepo) return;
  if (!confirm('Clear checkpoint and start fresh? This cannot be undone.')) return;
  
  try {
    const response = await fetch(
      `/api/index/checkpoint/${encodeURIComponent(currentRepo)}`,
      { method: 'DELETE' }
    );
    const data = await response.json();
    if (data.ok) {
      setCheckpointInfo(null);
      setCostEstimate(null);
    } else {
      alert(`Failed: ${data.error}`);
    }
  } catch (error) {
    alert(`Failed: ${error}`);
  }
};
```

### Add useEffect to load checkpoint:
```typescript
useEffect(() => {
  loadCheckpoint();
}, [currentRepo]);

// Reload after indexing completes
useEffect(() => {
  if (!simpleRunning && !isIndexing) {
    loadCheckpoint();
  }
}, [simpleRunning, isIndexing]);
```

### Add cost estimate parsing to SSE handler:
```typescript
// In your SSE message handler, add:
if (data.type === 'cost_estimate') {
  setCostEstimate({
    tokens: data.tokens,
    cost: data.cost
  });
}
```

### Add Resume UI component:
```tsx
{/* Checkpoint Resume UI - show before INDEX NOW button */}
{checkpointInfo?.can_resume && (
  <div className="checkpoint-banner" style={{
    marginBottom: '16px',
    padding: '16px',
    background: 'var(--bg-elev2, #1a1a2e)',
    border: '2px solid var(--warn, #ffa500)',
    borderRadius: '8px'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
      <div>
        <strong style={{ color: 'var(--warn, #ffa500)', fontSize: '14px' }}>
          📍 Checkpoint Found
        </strong>
        <p style={{ margin: '8px 0 0 0', fontSize: '13px', color: 'var(--fg-muted, #888)' }}>
          {checkpointInfo.completed?.toLocaleString()} / {checkpointInfo.total?.toLocaleString()} chunks
          ({checkpointInfo.progress_pct}%)
        </p>
        <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--fg-muted, #666)' }}>
          {checkpointInfo.embedding_type} / {checkpointInfo.embedding_model}
          {checkpointInfo.embedding_dim && ` (${checkpointInfo.embedding_dim}d)`}
          {checkpointInfo.updated_at && (
            <> • {new Date(checkpointInfo.updated_at).toLocaleString()}</>
          )}
        </p>
        {(checkpointInfo.failed_count ?? 0) > 0 && (
          <p style={{ margin: '4px 0 0 0', fontSize: '11px', color: 'var(--err, #ff4444)' }}>
            ⚠ {checkpointInfo.failed_count} failed chunks
          </p>
        )}
      </div>
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          onClick={handleSimpleIndex}
          disabled={simpleRunning}
          style={{
            padding: '10px 20px',
            fontWeight: '600',
            background: 'var(--ok, #00cc66)',
            color: '#000',
            border: 'none',
            borderRadius: '6px',
            cursor: simpleRunning ? 'not-allowed' : 'pointer',
            opacity: simpleRunning ? 0.6 : 1
          }}
        >
          ▶ Resume
        </button>
        <button
          onClick={handleClearCheckpoint}
          disabled={simpleRunning}
          style={{
            padding: '10px 16px',
            fontWeight: '600',
            background: 'transparent',
            color: 'var(--err, #ff4444)',
            border: '1px solid var(--err, #ff4444)',
            borderRadius: '6px',
            cursor: simpleRunning ? 'not-allowed' : 'pointer',
            opacity: simpleRunning ? 0.6 : 1
          }}
        >
          ✕ Clear
        </button>
      </div>
    </div>
  </div>
)}

{/* Cost Estimate Display */}
{costEstimate && (
  <div style={{
    marginBottom: '12px',
    padding: '12px',
    background: 'var(--bg-elev1, #0d0d1a)',
    borderRadius: '6px',
    fontSize: '13px'
  }}>
    <span style={{ color: 'var(--fg-muted, #888)' }}>Estimated cost: </span>
    <strong style={{ color: 'var(--fg, #fff)' }}>
      ${costEstimate.cost.toFixed(4)}
    </strong>
    <span style={{ color: 'var(--fg-muted, #888)' }}>
      {' '}({costEstimate.tokens.toLocaleString()} tokens)
    </span>
  </div>
)}
```

---

## B.6 FILE: retrieval/hybrid_search.py (MODIFY)

**Add parent chunk deduplication for split chunks.**

```python
from collections import defaultdict
from typing import List, Dict, Any, Optional
import json
from pathlib import Path


def deduplicate_by_parent(
    results: List[Dict[str, Any]], 
    max_per_parent: int = 1
) -> List[Dict[str, Any]]:
    """
    Deduplicate search results by parent_id.
    
    When chunks are split for embedding, multiple sub-chunks from the same
    parent may match a query. This function keeps only the highest-scoring
    sub-chunk per parent to avoid redundant results.
    
    Args:
        results: Search results with 'score' and optional 'parent_id' in metadata
        max_per_parent: Max chunks to keep per parent (default 1)
    
    Returns:
        Deduplicated results sorted by score descending
    """
    if not results:
        return results
    
    parent_to_chunks = defaultdict(list)
    
    for result in results:
        # Get parent_id from metadata, or use own id if not split
        if isinstance(result, dict):
            meta = result.get('metadata', result.get('payload', {}))
            parent_id = meta.get('parent_id') or meta.get('id') or result.get('id')
            score = result.get('score', 0)
        else:
            # Handle Qdrant ScoredPoint objects
            meta = getattr(result, 'payload', {})
            parent_id = meta.get('parent_id') or meta.get('id')
            score = getattr(result, 'score', 0)
        
        parent_to_chunks[parent_id].append((score, result))
    
    # Keep top max_per_parent per parent
    deduplicated = []
    for parent_id, chunks in parent_to_chunks.items():
        # Sort by score descending
        sorted_chunks = sorted(chunks, key=lambda x: x[0], reverse=True)
        deduplicated.extend([c[1] for c in sorted_chunks[:max_per_parent]])
    
    # Sort final results by score
    def get_score(r):
        if isinstance(r, dict):
            return r.get('score', 0)
        return getattr(r, 'score', 0)
    
    return sorted(deduplicated, key=get_score, reverse=True)


def hydrate_docs_with_parents(
    doc_ids: List[str], 
    repo: str,
    chunks_by_id: Optional[Dict[str, Dict]] = None
) -> List[Dict[str, Any]]:
    """
    Load full chunk data from chunks.jsonl, with parent chunk lookup.
    
    For split sub-chunks, returns the PARENT chunk's full code for better context,
    while preserving which sub-chunk actually matched.
    
    Args:
        doc_ids: List of chunk IDs to hydrate
        repo: Repository name
        chunks_by_id: Optional pre-loaded chunk lookup dict
    
    Returns:
        List of hydrated chunk dicts
    """
    # Load chunks if not provided
    if chunks_by_id is None:
        chunks_by_id = {}
        
        # Try to find chunks.jsonl
        try:
            from common.paths import out_dir
        except ImportError:
            from common.config_loader import out_dir
        
        chunks_file = Path(out_dir(repo)) / "chunks.jsonl"
        
        if chunks_file.exists():
            with open(chunks_file) as f:
                for line in f:
                    if line.strip():
                        chunk = json.loads(line)
                        chunks_by_id[chunk['id']] = chunk
    
    # Hydrate with parent lookup
    results = []
    seen_parents = set()  # Track seen parents to avoid duplicates
    
    for doc_id in doc_ids:
        chunk = chunks_by_id.get(doc_id)
        if not chunk:
            continue
        
        # Check if this is a split sub-chunk
        if chunk.get('is_split') and chunk.get('parent_id'):
            parent_id = chunk['parent_id']
            
            # Skip if we've already returned this parent
            if parent_id in seen_parents:
                continue
            seen_parents.add(parent_id)
            
            # Try to get parent chunk
            parent = chunks_by_id.get(parent_id)
            if parent:
                # Return parent's full code with sub-chunk match info
                result = {
                    **parent,
                    'matched_sub_id': doc_id,
                    'matched_sub_index': chunk.get('sub_index'),
                    'used_parent': True,
                }
                results.append(result)
            else:
                # Parent not found, return sub-chunk as-is
                results.append(chunk)
        else:
            # Not a split chunk, or is itself the parent
            if chunk['id'] not in seen_parents:
                seen_parents.add(chunk['id'])
                results.append(chunk)
    
    return results
```

### Update hybrid_search function to use deduplication:

Find your main `hybrid_search()` function and add deduplication before returning:

```python
def hybrid_search(query: str, repo: str, top_k: int = 10, ...) -> List[Dict]:
    """Hybrid BM25 + vector search with RRF fusion."""
    
    # ... existing search logic ...
    
    # After RRF fusion, before returning:
    
    # Deduplicate by parent_id (handles split chunks)
    deduplicated = deduplicate_by_parent(fused_results, max_per_parent=1)
    
    # Return top_k after deduplication
    return deduplicated[:top_k]
```

---

## B.7 PART B TODO LIST

```
□ B1. Create server/models/price_model.py
   - PriceEntry with max_tokens validation
   - PricesConfig with helper methods
   - validate_prices_json() function

□ B2. Update web/public/prices.json
   - Add max_tokens to ALL embedding models (correct values!)
   - Add max_tokens to ALL reranker models
   - Add tokenizer_type to ALL models
   - Add cross-encoder-agro entry
   - Voyage = 32000 (NOT 16000)
   - Cohere embed = 512 (NOT 4096)

□ B3. Sync gui/prices.json
   - Copy all changes from web/public/prices.json

□ B4. Modify server/routers/indexing.py
   - Add get_index_checkpoint() endpoint
   - Add delete_index_checkpoint() endpoint

□ B5. Modify server/routers/stream_logs.py
   - Parse PROGRESS: format
   - Parse COST_ESTIMATE: format
   - Emit proper SSE JSON events

□ B6. Modify web/src/components/RAG/IndexingSubtab.tsx
   - Add CheckpointInfo and CostEstimate types
   - Add loadCheckpoint() and handleClearCheckpoint()
   - Add useEffect for checkpoint loading
   - Add cost estimate SSE parsing
   - Add Resume UI component

□ B7. Modify retrieval/hybrid_search.py
   - Add deduplicate_by_parent() function
   - Add hydrate_docs_with_parents() function
   - Call deduplication in hybrid_search()

□ B8. Add tooltips (useTooltips.ts)
   - INDEX_CHECKPOINT tooltip
   - INDEX_COST_ESTIMATE tooltip

□ B9. Write tests
   - tests/test_price_model.py: Pydantic validation
   - tests/test_checkpoint_api.py: API endpoints
   - tests/test_hybrid_dedup.py: Deduplication logic
```

---

# COORDINATION & TESTING

## Integration Points

| Part A Emits | Part B Parses |
|--------------|---------------|
| `PROGRESS:percent:message` | SSE → `{type: 'progress', ...}` |
| `COST_ESTIMATE:tokens:cost` | SSE → `{type: 'cost_estimate', ...}` |
| `out/{repo}/embedding_checkpoint.json` | API → `/api/index/checkpoint/{repo}` |
| chunks with `parent_id`, `is_split` | `deduplicate_by_parent()` |

## Testing Order

1. **Part B completes prices.json first** (Part A needs it for token limits)
2. Part A can start immediately with hardcoded defaults
3. Both proceed in parallel
4. Integration test after both complete

## Full System Test

```bash
# 1. Verify prices.json loads
python -c "from indexer.token_utils import _load_prices; print(_load_prices())"

# 2. Test token counting
python -c "from indexer.token_utils import count_tokens; print(count_tokens('hello world', 'text-embedding-3-large', 'openai'))"

# 3. Test checkpoint API
curl http://localhost:8000/api/index/checkpoint/test-repo

# 4. Run indexer on small repo
python -m indexer.index_repo --repo test-repo

# 5. Kill mid-run (Ctrl+C), verify checkpoint created
ls out/test-repo/embedding_checkpoint.json

# 6. Resume and verify completion
python -m indexer.index_repo --repo test-repo

# 7. Verify Qdrant has correct vector count
python -c "from qdrant_client import QdrantClient; qc = QdrantClient('http://localhost:6333'); print(qc.get_collection('test-repo').points_count)"

# 8. Test hybrid search with split chunks
python -c "from retrieval.hybrid_search import hybrid_search; print(hybrid_search('test query', 'test-repo'))"
```

---

# VERIFICATION CHECKLIST

After both parts complete:

```
□ prices.json has max_tokens AND tokenizer_type for all models
□ Voyage limit is 32000 (not 16000)
□ Cohere embed limit is 512 (not 4096)
□ Token limit lookup works for all providers
□ Overlap is 10-15% (NOT fixed 500 tokens)
□ Oversized chunks are split correctly with SHA256 IDs
□ BM25 indexes original chunks only (memory efficient)
□ Qdrant indexes split chunks (precision)
□ chunks.jsonl contains both original and splits
□ Checkpoint saves after each batch with embedding_dim
□ Resume works after interrupted run
□ Resume fails gracefully if embedding model changed
□ Dimension mismatch is detected and collection recreated
□ Progress bar updates in GUI
□ Cost estimate shows in GUI
□ Resume button appears when checkpoint exists
□ Clear checkpoint works
□ Full indexing completes without errors
□ Hybrid search deduplicates by parent_id
□ Sub-chunk retrieval returns parent chunks
□ No duplicate vectors in Qdrant after resume
□ Cross-encoder doesn't fail (chunks < 400 tokens)
□ File locking works (Unix) / degrades gracefully (Windows)
```

---

**END OF PLAN v2**