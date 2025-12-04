# HANDOFF: Enterprise-Grade Indexing System Overhaul

**Date:** 2025-11-28
**Priority:** CRITICAL
**Status:** ⚠️ SUPERSEDED BY IMPLEMENTATION PLAN

---

## ⚠️ CRITICAL: USE THE CORRECTED PLAN

**This document has been research-validated and corrected.**

**👉 SEE: `ENTERPRISE_INDEXING_IMPLEMENTATION_PLAN.md` for the corrected implementation plan.**

Key corrections from research:
- Overlap should be 10-20% (NOT 6.7%)
- tiktoken ONLY works for OpenAI (use provider-specific tokenizers)
- Voyage limit is 32,000 (NOT 16,000)
- Cohere/mxbai/bge limits are 512 (NOT 8,192)
- Qdrant has NO rollback (points persist on failure)
- Both BM25 AND Qdrant should index sub-chunks

---

## Executive Summary (Original - See Corrected Plan)

The current indexing system fails when any code chunk exceeds OpenAI's 8192 token limit. This happened during a real indexing run with error:

```
openai.BadRequestError: Error code: 400 - This model's maximum context length is 8192 tokens, 
however you requested 11282 tokens
```

A quick truncation fix was rejected by the user as it loses data. The system needs proper enterprise-grade handling for 1M+ document codebases with:
- Token-aware chunk splitting
- Checkpointed batch processing
- Resume capability after failure
- Pre-flight cost estimation using models.json
- Progress reporting via SSE

---

## BEFORE YOU START: Research & Validation Required

The next agent MUST:

1. **Verify tiktoken compatibility** with the embedding models in models.json
2. **Check if tree-sitter chunking already has size limits** that should be adjusted
3. **Review the SSE streaming pattern** used by eval runner for progress reporting
4. **Confirm Qdrant transaction semantics** - can we rollback partial batch inserts?
5. **Check rate limit headers** returned by OpenAI embeddings API
6. **Review if local embeddings (mxbai, bge) have different token limits**
7. **Validate the overlap strategy** - is 500 tokens enough for code context?

---

## What Already Exists (DO NOT RECREATE)

| Component | Location | Purpose |
|-----------|----------|---------|
| `models.json` | `web/public/models.json` | Has `embed_per_1k` for ALL providers |
| `/api/cost/estimate` | `server/routers/cost.py` | Backend cost calculation using models.json |
| `_find_price_kind()` | `server/routers/cost.py:8` | Finds embed pricing from models.json |
| `CostLogic.estimate()` | `web/src/modules/cost_logic.js` | Frontend cost API |
| `last_index.json` | `out/{repo}/` | Stores embedding_type, dim, chunk_count |
| Sidepanel calculator | `web/src/components/Sidepanel.tsx` | Live cost widget (DON'T add new confirmation dialogs) |
| BM25 batching | `indexer/index_repo.py` | Local, fast, no cost - no changes needed |
| Qdrant batch upsert | `indexer/index_repo.py:381` | Already batches 64 at a time |
| tiktoken | `requirements.txt:12` | Already installed (v0.12.0) |
| SSE streaming | `server/routers/indexing.py` | Pattern for streaming progress |
| `get_embedding_func()` | `indexer/index_repo.py:140-183` | Returns (embed_func, dim) for provider |

---

## Current Indexing Flow (What's Broken)

```python
# indexer/index_repo.py - Current problematic flow:

# Step 1-2: Collect files, AST chunk → chunks[]
# Step 3: BM25 index (local, fast) ✓ NO CHANGES NEEDED
# Step 4: Save chunks.jsonl ✓ NO CHANGES NEEDED

# Step 5: THIS IS THE PROBLEM - Line 337:
texts = [c['code'] for c in chunks]
embeddings = embed_func(texts)  # ← Sends ALL texts at once, fails if ANY > 8192 tokens

# Step 6: Qdrant upsert in batches of 64 ✓ Already batched
# Step 7: Save last_index.json ✓ NO CHANGES NEEDED
```

**Three bugs:**
1. No token limit check before embedding
2. `embed_func()` called with ALL texts (can't checkpoint mid-way)
3. No pre-flight cost estimate shown to user

---

## Fixed Flow (To Implement)

```
┌─────────────────────────────────────────────────────────────────────────┐
│ 1. Collect files                                                        │
│ 2. AST chunk → chunks[]                                                 │
│                                                                         │
│ 3. NEW: TOKEN PROCESSING                                                │
│    - Count tokens for each chunk using tiktoken                         │
│    - Split chunks > 7500 tokens with 500-token overlap                  │
│    - Track parent→child relationships                                   │
│    - Calculate total_tokens                                             │
│                                                                         │
│ 4. NEW: PRE-FLIGHT (but NO user confirmation popup - sidepanel shows it)│
│    - Call /api/cost/estimate with embed_tokens=total_tokens             │
│    - Log: "Estimated cost: $X.XX for Y tokens (via models.json)"        │
│    - Return estimate in SSE stream for GUI to display                   │
│                                                                         │
│ 5. BM25 index (no changes)                                              │
│ 6. Save chunks.jsonl (no changes)                                       │
│                                                                         │
│ 7. NEW: CHECKPOINTED EMBEDDING LOOP                                     │
│    checkpoint = load_checkpoint(repo)                                   │
│    start_idx = checkpoint.completed if checkpoint else 0                │
│                                                                         │
│    for batch_start in range(start_idx, len(chunks), BATCH_SIZE):        │
│      batch = chunks[batch_start:batch_start+BATCH_SIZE]                 │
│      texts = [c['code'] for c in batch]                                 │
│                                                                         │
│      # Embed with retry on rate limit                                   │
│      embeddings = embed_with_retry(embed_func, texts)                   │
│                                                                         │
│      # Qdrant upsert (already batched)                                  │
│      upsert_batch(qc, collection, batch, embeddings)                    │
│                                                                         │
│      # Save checkpoint                                                  │
│      save_checkpoint(repo, completed=batch_start+len(batch))            │
│                                                                         │
│      # SSE progress for GUI                                             │
│      print(f"PROGRESS:embedding:{batch_num}/{total_batches}")           │
│                                                                         │
│ 8. Clear checkpoint on success                                          │
│ 9. Save last_index.json (add token_count field)                         │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## Files to Create

### 1. `indexer/token_utils.py`

```python
"""
Token counting and chunk splitting for enterprise-scale indexing.
Uses tiktoken for accurate token counts matching OpenAI's tokenizer.
"""
import tiktoken
import hashlib
from typing import List, Dict, Tuple

# OpenAI's text-embedding-3-large uses cl100k_base
EMBEDDING_ENCODING = "cl100k_base"
MAX_TOKENS = 7500  # Leave buffer below 8192 limit
OVERLAP_TOKENS = 500  # Context continuity at boundaries

def get_encoder():
    """Get tiktoken encoder (cached)."""
    return tiktoken.get_encoding(EMBEDDING_ENCODING)

def count_tokens(text: str) -> int:
    """Count tokens in text."""
    enc = get_encoder()
    return len(enc.encode(text))

def split_chunk_by_tokens(
    chunk: Dict, 
    max_tokens: int = MAX_TOKENS, 
    overlap: int = OVERLAP_TOKENS
) -> List[Dict]:
    """
    Split an oversized chunk into sub-chunks with overlap.
    
    Maintains parent_id reference so retrieval can return full context.
    """
    enc = get_encoder()
    tokens = enc.encode(chunk['code'])
    
    if len(tokens) <= max_tokens:
        chunk['token_count'] = len(tokens)
        return [chunk]
    
    sub_chunks = []
    start = 0
    idx = 0
    
    while start < len(tokens):
        end = min(start + max_tokens, len(tokens))
        sub_text = enc.decode(tokens[start:end])
        
        # Generate deterministic sub-chunk ID
        sub_id = hashlib.md5(f"{chunk['id']}_sub{idx}".encode()).hexdigest()[:12]
        
        sub_chunks.append({
            **chunk,
            'id': sub_id,
            'code': sub_text,
            'token_count': end - start,
            'parent_id': chunk['id'],
            'parent_start_line': chunk.get('start_line'),
            'sub_index': idx,
            'is_split': True,
        })
        
        idx += 1
        start = end - overlap
        
        # Avoid tiny trailing chunks
        if len(tokens) - start <= overlap:
            break
    
    return sub_chunks

def prepare_chunks_for_embedding(
    chunks: List[Dict], 
    max_tokens: int = MAX_TOKENS
) -> Tuple[List[Dict], int, int]:
    """
    Process all chunks, splitting oversized ones.
    
    Returns: (processed_chunks, total_tokens, split_count)
    """
    result = []
    total_tokens = 0
    split_count = 0
    
    for chunk in chunks:
        token_count = count_tokens(chunk['code'])
        
        if token_count <= max_tokens:
            chunk['token_count'] = token_count
            result.append(chunk)
            total_tokens += token_count
        else:
            sub_chunks = split_chunk_by_tokens(chunk, max_tokens)
            result.extend(sub_chunks)
            split_count += 1
            total_tokens += sum(c['token_count'] for c in sub_chunks)
    
    return result, total_tokens, split_count
```

### 2. `indexer/embedding_checkpoint.py`

```python
"""
Checkpoint management for resumable embedding.
Stores progress in out/{repo}/embedding_checkpoint.json
"""
import json
import os
from pathlib import Path
from datetime import datetime
from typing import Optional, Dict, List
from common.paths import out_dir

def _checkpoint_path(repo: str) -> Path:
    return Path(out_dir(repo)) / "embedding_checkpoint.json"

def load_checkpoint(repo: str) -> Optional[Dict]:
    """Load existing checkpoint or None if not found/invalid."""
    path = _checkpoint_path(repo)
    if not path.exists():
        return None
    try:
        with open(path) as f:
            data = json.load(f)
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
    failed_indices: Optional[List[int]] = None,
    embedding_type: str = None,
    collection: str = None,
):
    """Save checkpoint after successful batch."""
    path = _checkpoint_path(repo)
    os.makedirs(path.parent, exist_ok=True)
    
    data = {
        'completed_chunks': completed_chunks,
        'total_chunks': total_chunks,
        'progress_pct': round(100 * completed_chunks / max(1, total_chunks), 1),
        'failed_indices': failed_indices or [],
        'embedding_type': embedding_type,
        'collection': collection,
        'updated_at': datetime.utcnow().isoformat() + 'Z',
    }
    
    with open(path, 'w') as f:
        json.dump(data, f, indent=2)

def clear_checkpoint(repo: str):
    """Remove checkpoint after successful completion."""
    path = _checkpoint_path(repo)
    if path.exists():
        path.unlink()

def get_resume_info(repo: str) -> Optional[Dict]:
    """Get info for resume UI - returns None if no valid checkpoint."""
    cp = load_checkpoint(repo)
    if not cp:
        return None
    
    return {
        'can_resume': cp['completed_chunks'] < cp['total_chunks'],
        'completed': cp['completed_chunks'],
        'total': cp['total_chunks'],
        'progress_pct': cp['progress_pct'],
        'failed_count': len(cp.get('failed_indices', [])),
        'updated_at': cp.get('updated_at'),
    }
```

### 3. `indexer/embed_with_retry.py`

```python
"""
Embedding with exponential backoff for rate limits.
"""
import time
from typing import List, Callable

MAX_RETRIES = 5
BASE_DELAY = 1.0  # seconds

def embed_with_retry(
    embed_func: Callable[[List[str]], List[List[float]]],
    texts: List[str],
    max_retries: int = MAX_RETRIES,
) -> List[List[float]]:
    """
    Call embed_func with exponential backoff on rate limit errors.
    """
    last_error = None
    
    for attempt in range(max_retries):
        try:
            return embed_func(texts)
        except Exception as e:
            error_str = str(e).lower()
            
            # Check if rate limit error
            if 'rate' in error_str or '429' in error_str or 'limit' in error_str:
                delay = BASE_DELAY * (2 ** attempt)
                print(f"   Rate limited, waiting {delay:.1f}s (attempt {attempt + 1}/{max_retries})")
                time.sleep(delay)
                last_error = e
            else:
                # Not a rate limit error, re-raise immediately
                raise
    
    # Exhausted retries
    raise RuntimeError(f"Embedding failed after {max_retries} retries: {last_error}")
```

---

## Files to Modify

### 1. `indexer/index_repo.py`

**Import additions at top:**
```python
from indexer.token_utils import prepare_chunks_for_embedding, count_tokens
from indexer.embedding_checkpoint import load_checkpoint, save_checkpoint, clear_checkpoint
from indexer.embed_with_retry import embed_with_retry
```

**After chunking (around line 273), add token processing:**
```python
    print(f"   Created {len(chunks)} unique chunks")
    
    # NEW: Token processing - split oversized chunks
    print(f"\n2b. Processing tokens...")
    original_count = len(chunks)
    chunks, total_tokens, split_count = prepare_chunks_for_embedding(chunks, max_tokens=7500)
    print(f"   Total tokens: {total_tokens:,}")
    if split_count > 0:
        print(f"   Split {split_count} oversized chunks into {len(chunks) - (original_count - split_count)} sub-chunks")
    
    # NEW: Pre-flight cost estimate (for GUI display)
    # Cost is calculated by GUI using models.json - just emit token count
    print(f"COST_ESTIMATE:{total_tokens}")
```

**Replace the embedding section (lines 327-388) with checkpointed version:**
```python
    # 4. Embedding with checkpoints
    print(f"\n4. Embedding and storing in Qdrant...")
    
    embed_func, embed_dim = get_embedding_func()
    
    # Check for resume
    checkpoint = load_checkpoint(REPO)
    start_idx = 0
    if checkpoint and checkpoint.get('embedding_type') == EMBEDDING_TYPE:
        start_idx = checkpoint.get('completed_chunks', 0)
        if start_idx > 0:
            print(f"   Resuming from chunk {start_idx}/{len(chunks)}")
    
    # Connect to Qdrant
    qc = QdrantClient(url=QDRANT_URL)
    
    # Only recreate collection if starting fresh
    if start_idx == 0:
        try:
            qc.delete_collection(COLLECTION)
            print(f"   Deleted existing collection '{COLLECTION}'")
        except:
            pass
        
        qc.create_collection(
            collection_name=COLLECTION,
            vectors_config={'dense': models.VectorParams(size=embed_dim, distance=models.Distance.COSINE)}
        )
        print(f"   Created collection '{COLLECTION}'")
    
    # Batch embedding with checkpoints
    BATCH_SIZE = 64
    total_batches = (len(chunks) + BATCH_SIZE - 1) // BATCH_SIZE
    failed_indices = []
    
    for batch_start in range(start_idx, len(chunks), BATCH_SIZE):
        batch_end = min(batch_start + BATCH_SIZE, len(chunks))
        batch = chunks[batch_start:batch_end]
        batch_num = batch_start // BATCH_SIZE + 1
        
        texts = [c['code'] for c in batch]
        
        try:
            # Embed with retry on rate limits
            embeddings = embed_with_retry(embed_func, texts)
            
            # Upsert to Qdrant
            points = []
            for c, emb in zip(batch, embeddings):
                pid = str(uuid.uuid5(uuid.NAMESPACE_DNS, c['id']))
                payload = {
                    'id': c['id'],
                    'file_path': c.get('file_path'),
                    'start_line': c.get('start_line'),
                    'end_line': c.get('end_line'),
                    'language': c.get('language'),
                    'repo': c.get('repo'),
                    'hash': c.get('hash'),
                    'parent_id': c.get('parent_id'),  # For split chunks
                    'token_count': c.get('token_count'),
                }
                points.append(models.PointStruct(
                    id=pid,
                    vector={'dense': emb},
                    payload={k: v for k, v in payload.items() if v is not None}
                ))
            
            qc.upsert(COLLECTION, points=points)
            
            # Save checkpoint
            save_checkpoint(
                REPO, 
                completed_chunks=batch_end,
                total_chunks=len(chunks),
                embedding_type=EMBEDDING_TYPE,
                collection=COLLECTION,
            )
            
            # Progress output for SSE parsing
            print(f"PROGRESS:embedding:{batch_num}/{total_batches}:{batch_end}/{len(chunks)}")
            
        except Exception as e:
            print(f"   ⚠ Batch {batch_num} failed: {e}")
            failed_indices.extend(range(batch_start, batch_end))
            # Save checkpoint with failed indices
            save_checkpoint(
                REPO,
                completed_chunks=batch_start,  # Don't advance past failed batch
                total_chunks=len(chunks),
                failed_indices=failed_indices,
                embedding_type=EMBEDDING_TYPE,
                collection=COLLECTION,
            )
            raise  # Re-raise to stop indexing
    
    # Success - clear checkpoint
    clear_checkpoint(REPO)
    print(f"   Indexed {len(chunks)} points to Qdrant")
```

### 2. `server/routers/indexing.py`

**Add new endpoints:**
```python
from indexer.embedding_checkpoint import get_resume_info, load_checkpoint

@router.get("/api/index/checkpoint/{repo}")
def get_index_checkpoint(repo: str) -> Dict[str, Any]:
    """Get checkpoint status for resume UI."""
    info = get_resume_info(repo)
    if info:
        return {"has_checkpoint": True, **info}
    return {"has_checkpoint": False}

@router.post("/api/index/estimate")
def estimate_index_cost(payload: Dict[str, Any]) -> Dict[str, Any]:
    """
    Pre-flight cost estimate for indexing.
    Payload: { repo: str, embedding_provider: str, embedding_model: str }
    """
    # This would need to do a quick file scan and token count
    # For now, return placeholder - full implementation needs research
    return {
        "estimated_chunks": 0,
        "estimated_tokens": 0,
        "estimated_cost": 0.0,
        "note": "Full implementation pending"
    }
```

### 3. `web/src/components/RAG/IndexingSubtab.tsx`

**Add checkpoint detection and resume UI** (exact implementation depends on existing patterns):
- On mount, call `/api/index/checkpoint/{repo}`
- If checkpoint exists, show "Resume" button instead of "INDEX NOW"
- During indexing, parse SSE for `PROGRESS:embedding:X/Y:A/B` pattern
- Show progress bar: "Embedding batch X/Y (A/B chunks)"

---

## API Response Format for SSE Progress

The indexer prints structured lines that the SSE handler parses:

```
PROGRESS:embedding:15/42:750/2060
         ^^^^^^^^^ ^^^^^ ^^^^^^^^^
         stage     batch chunks
```

Frontend should parse this into:
```json
{
  "stage": "embedding",
  "batch_current": 15,
  "batch_total": 42,
  "chunks_done": 750,
  "chunks_total": 2060,
  "percent": 36.4
}
```

---

## Questions for Next Agent to Research

1. **Voyage AI token limits** - Different from OpenAI? Check their docs.
2. **Local embeddings (mxbai, bge)** - What are their token limits?
3. **Qdrant partial failure** - If upsert fails mid-batch, are some points saved?
4. **Parent chunk retrieval** - When a sub-chunk matches, should we return the parent?
5. **BM25 for split chunks** - Should BM25 index sub-chunks or original chunks?
6. **Overlap amount** - 500 tokens enough for code? Research suggests 10-20% overlap.

---

## Testing Requirements

After implementation:

1. **Unit test**: `token_utils.py` - split a 10K token chunk, verify overlap
2. **Unit test**: `embedding_checkpoint.py` - save/load/clear cycle
3. **Integration test**: Kill indexer mid-batch, resume, verify no duplicates in Qdrant
4. **Load test**: 10K chunks with simulated rate limits
5. **GUI test**: Progress bar updates during embedding phase

---

## Pydantic Compliance

All new config values MUST go through:
- `agro_config.json`
- `server/models/agro_config_model.py`
- `server/services/config_registry.py`

New config keys needed:
- `EMBEDDING_MAX_TOKENS`: int = 7500
- `EMBEDDING_OVERLAP_TOKENS`: int = 500
- `EMBEDDING_BATCH_SIZE`: int = 64
- `EMBEDDING_MAX_RETRIES`: int = 5

---

## Fixed Earlier This Session

1. **agro_config.json** - Fixed invalid Pydantic values:
   - `layer_bonus.vendor_penalty`: 0.9 → -0.1 (must be ≤ 0)
   - `layer_bonus.freshness_bonus`: 1.05 → 0.1 (must be ≤ 0.3)

2. **Glossary subtab** - Now merges React + legacy tooltips (was showing only 69/196)

3. **Learn button** - Fixed navigation to use React Router `navigate()`

4. **Run Indexer button** - Now navigates to RAG > Indexing subtab

5. **IndexingSubtab** - Fixed to show `total_chunks` from API correctly

6. **ChatInterface** - Added "No Index Found" warning for new users

---

## Do NOT Do

- ❌ Don't add user confirmation popups - sidepanel shows costs
- ❌ Don't recreate cost calculation - use existing `/api/cost/estimate`
- ❌ Don't modify BM25 logic - it works fine
- ❌ Don't hardcode models - use `models.json`
- ❌ Don't create new UI for cost display - use sidepanel

---

## Priority Order

1. Create `indexer/token_utils.py`
2. Create `indexer/embedding_checkpoint.py`
3. Create `indexer/embed_with_retry.py`
4. Modify `indexer/index_repo.py`
5. Add Pydantic config for new settings
6. Add API endpoints for checkpoint
7. Update GUI for resume/progress
8. Write tests
9. Run full indexing test with real codebase

