# Search/RAG Endpoints Extraction Guide

**Target**: Extract `/search`, `/answer`, and `/api/chat` from the monolithic `server/app.py` (main branch) into clean routers with services.

**Complexity Level**: Medium (LangGraph integration + env overrides, but no redesign needed)

**Estimated Time**: 3-4 hours

---

## Context

These three endpoints are the **core RAG functionality**:
- `/search` - Retrieval-only (no generation)
- `/answer` - Full RAG pipeline via LangGraph
- `/api/chat` - Stateful conversation with settings overrides

They currently live in `server/app.py` (lines 272-660 approx) and need to be extracted into `server/routers/search.py` with business logic in `server/services/rag.py`.

---

## Current Implementation Analysis

### `/search` Endpoint (Line ~568)
```python
@app.get("/search")
def search(q: str, repo: Optional[str], top_k: int = 10) -> Dict[str, Any]:
    # Wraps retrieval.hybrid_search.search_routed_multi
    # Simple: just calls search and formats results
```

**Complexity**: LOW
- No generation, just retrieval
- Returns list of code chunks with scores
- Uses tracing if enabled

### `/answer` Endpoint (Line ~272)
```python
@app.get("/answer")
def answer(q: str, repo: Optional[str]) -> Dict[str, Any]:
    # 1. Builds LangGraph state
    # 2. Calls graph.invoke()
    # 3. Wraps exception handling + tracing
    # 4. Returns generation + event_id
```

**Complexity**: MEDIUM
- Uses LangGraph but doesn't modify it (just invokes)
- Has trace management (start_trace, end_trace)
- Fallback to retrieval-only if generation fails
- Some stdout/stderr suppression logic (broken pipe handling)

### `/api/chat` Endpoint (Line ~396)
```python
@app.post("/api/chat")
def chat(req: ChatRequest) -> Dict[str, Any]:
    # 1. Saves current env state
    # 2. Applies request settings to os.environ temporarily
    # 3. Calls graph.invoke()
    # 4. Restores original env
    # 5. Returns answer + headers
```

**Complexity**: MEDIUM-HIGH
- Environment override scoping (save → apply → restore pattern)
- Pydantic request model with many optional fields
- Response headers for provider/model tracking
- Telemetry/metrics integration

---

## Extraction Strategy

### Phase 1: Create Service Layer First (Bottom-Up)

**File**: `server/services/rag.py`

This service will:
1. Wrap `retrieval.hybrid_search.search_routed_multi` for search
2. Wrap LangGraph invocation for answer/chat
3. Handle trace management
4. Provide env override scoping helper

**Why service-first?** Routers will be thin if we extract logic properly.

#### Service Functions Needed:

```python
# server/services/rag.py

from typing import Dict, Any, List, Optional
import os
import logging
from contextlib import contextmanager
from server.langgraph_app import build_graph
from server.tracing import start_trace, end_trace, Trace
from retrieval.hybrid_search import search_routed_multi

logger = logging.getLogger("agro.api")

_graph = None

def get_graph():
    """Lazy-load LangGraph (singleton)."""
    global _graph
    if _graph is None:
        _graph = build_graph()
    return _graph


def search_only(
    question: str,
    repo: Optional[str] = None,
    top_k: int = 10,
    trace: Optional[Trace] = None
) -> List[Dict[str, Any]]:
    """Retrieval-only search (no generation).
    
    Returns list of code chunks with scores and metadata.
    """
    results = search_routed_multi(
        question,
        repo_override=repo,
        final_k=top_k,
        trace=trace
    )
    return results


def answer_question(
    question: str,
    repo: Optional[str] = None,
    trace: Optional[Trace] = None
) -> Dict[str, Any]:
    """Full RAG answer using LangGraph pipeline.
    
    Returns:
        {
            "generation": str,
            "confidence": float,
            "repo": str,
            "documents": List[Dict]
        }
    """
    g = get_graph()
    state = {
        "question": question,
        "documents": [],
        "generation": "",
        "iteration": 0,
        "confidence": 0.0,
        "repo": (repo.strip() if repo else None)
    }
    
    cfg = {"configurable": {"thread_id": "http"}}
    
    try:
        # Suppress stdout/stderr to prevent broken pipe during graph execution
        import sys, io, contextlib
        with contextlib.redirect_stdout(io.StringIO()), contextlib.redirect_stderr(io.StringIO()):
            result = g.invoke(state, cfg)
        return result
    except Exception as e:
        logger.exception("Graph invocation failed | question=%s", question[:50])
        # Fallback: retrieval-only
        try:
            docs = search_only(question, repo, top_k=10)
            lines = [
                f"- {d.get('file_path','')}:{d.get('start_line',0)}-{d.get('end_line',0)} "
                f"score={float(d.get('rerank_score',0) or 0.0):.3f}"
                for d in docs[:5]
            ]
            fallback_text = "Retrieval-only (generation backend unavailable)\n" + "\n".join(lines)
            return {"generation": fallback_text, "confidence": 0.0, "documents": docs}
        except Exception:
            raise e


@contextmanager
def scoped_env_override(overrides: Dict[str, Optional[str]]):
    """Temporarily apply env overrides, then restore original values.
    
    Usage:
        with scoped_env_override({"GEN_MODEL": "gpt-4o", "GEN_TEMPERATURE": "0.5"}):
            # Code here sees overridden env
            result = answer_question(...)
        # Original env restored here
    """
    old_env = {}
    for key in overrides.keys():
        old_env[key] = os.environ.get(key)
    
    try:
        # Apply overrides
        for key, value in overrides.items():
            if value is not None:
                os.environ[key] = str(value)
        yield
    finally:
        # Restore
        for key, old_value in old_env.items():
            if old_value is None:
                os.environ.pop(key, None)
            else:
                os.environ[key] = old_value


def chat_with_settings(
    question: str,
    repo: Optional[str] = None,
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
    multi_query: Optional[int] = None,
    final_k: Optional[int] = None,
    confidence: Optional[float] = None,
    system_prompt: Optional[str] = None,
    trace: Optional[Trace] = None
) -> Dict[str, Any]:
    """Chat with full settings control.
    
    Applies settings as env overrides for the duration of the call.
    """
    overrides = {}
    if model:
        overrides['GEN_MODEL'] = model
    if temperature is not None:
        overrides['GEN_TEMPERATURE'] = str(temperature)
    if max_tokens is not None:
        overrides['GEN_MAX_TOKENS'] = str(max_tokens)
    if multi_query is not None:
        overrides['MQ_REWRITES'] = str(multi_query)
    if final_k is not None:
        overrides['LANGGRAPH_FINAL_K'] = str(final_k)
    if confidence is not None:
        # Map to thresholds (simplistic)
        overrides['CONF_TOP1'] = str(confidence)
        overrides['CONF_AVG5'] = str(confidence)
        overrides['CONF_ANY'] = str(confidence)
    if system_prompt:
        overrides['SYSTEM_PROMPT'] = system_prompt
    
    with scoped_env_override(overrides):
        result = answer_question(question, repo, trace)
    
    return result
```

**Key Design Decisions**:
1. **Don't modify LangGraph** - just wrap `build_graph()` and `invoke()`
2. **Env override scoping** - context manager ensures cleanup
3. **Fallback handling** - graceful degradation if generation unavailable
4. **Trace integration** - accepts optional trace object from router

---

### Phase 2: Create Router

**File**: `server/routers/search.py`

This router is THIN - just request/response handling.

```python
import logging
import time
import uuid
from typing import Optional, Dict, Any
from fastapi import APIRouter, Query, Request
from pydantic import BaseModel, Field

from server.services import rag
from server.tracing import start_trace, end_trace, Trace
from server.telemetry import log_query_event
from server.metrics import stage, record_tokens, record_cost

logger = logging.getLogger("agro.api")

router = APIRouter()


@router.get("/search")
def search(
    q: str = Query(..., description="Search query"),
    repo: Optional[str] = Query(None, description="Repository override"),
    top_k: int = Query(10, ge=1, le=100, description="Number of results")
) -> Dict[str, Any]:
    """Retrieval-only search (no generation)."""
    start_time = time.time()
    
    # Start trace if enabled
    tr = start_trace(repo=(repo or "default"), question=q) if Trace.enabled() else None
    
    try:
        results = rag.search_only(q, repo=repo, top_k=top_k, trace=tr)
        
        # End trace
        if tr:
            end_trace(tr)
        
        # Telemetry
        log_query_event(
            query=q,
            repo=(repo or "default"),
            mode="search",
            duration=time.time() - start_time
        )
        
        return {
            "results": results,
            "query": q,
            "repo": repo or "default",
            "count": len(results)
        }
    except Exception as e:
        logger.exception("Search failed | query=%s", q[:50])
        if tr:
            end_trace(tr, error=str(e))
        raise


@router.get("/answer")
def answer(
    q: str = Query(..., description="Question"),
    repo: Optional[str] = Query(None, description="Repository override"),
    request: Request = None
) -> Dict[str, Any]:
    """Full RAG answer with LangGraph pipeline."""
    start_time = time.time()
    req_id = str(uuid.uuid4())[:8]
    
    # Start trace
    tr = start_trace(repo=(repo or "default"), question=q) if Trace.enabled() else None
    
    try:
        result = rag.answer_question(q, repo=repo, trace=tr)
        
        # Extract answer
        answer_text = result.get("generation", "")
        docs = result.get("documents", [])[:5]
        
        # End trace with event_id
        event_id = None
        if tr:
            event_id = end_trace(tr)
        
        # Telemetry
        log_query_event(
            query=q,
            repo=(repo or result.get("repo", "default")),
            mode="answer",
            duration=time.time() - start_time
        )
        
        # Metrics (if answer has token/cost info)
        if "tokens" in result:
            record_tokens(result["tokens"])
        
        return {
            "answer": answer_text,
            "event_id": event_id,
            "repo": result.get("repo"),
            "confidence": result.get("confidence", 0.0)
        }
    except Exception as e:
        logger.exception("Answer failed | req_id=%s query=%s", req_id, q[:50])
        if tr:
            end_trace(tr, error=str(e))
        raise


class ChatRequest(BaseModel):
    """Chat request with full settings control."""
    question: str = Field(..., description="User question")
    repo: Optional[str] = Field(None, description="Repository override")
    model: Optional[str] = Field(None, description="Model override (e.g., gpt-4o)")
    temperature: Optional[float] = Field(None, ge=0.0, le=2.0, description="Temperature")
    max_tokens: Optional[int] = Field(None, ge=1, description="Max tokens")
    multi_query: Optional[int] = Field(None, ge=1, le=6, description="Multi-query rewrites")
    final_k: Optional[int] = Field(None, ge=5, le=50, description="Top-K retrieval")
    confidence: Optional[float] = Field(None, ge=0.3, le=0.9, description="Confidence threshold")
    system_prompt: Optional[str] = Field(None, description="Custom system prompt")


@router.post("/api/chat")
def chat(req: ChatRequest, request: Request) -> Dict[str, Any]:
    """Chat with full settings control and env overrides."""
    start_time = time.time()
    req_id = str(uuid.uuid4())[:8]
    
    # Start trace
    tr = start_trace(repo=(req.repo or "default"), question=req.question) if Trace.enabled() else None
    
    try:
        result = rag.chat_with_settings(
            question=req.question,
            repo=req.repo,
            model=req.model,
            temperature=req.temperature,
            max_tokens=req.max_tokens,
            multi_query=req.multi_query,
            final_k=req.final_k,
            confidence=req.confidence,
            system_prompt=req.system_prompt,
            trace=tr
        )
        
        answer_text = result.get("generation", "")
        
        # End trace
        event_id = None
        if tr:
            event_id = end_trace(tr)
        
        # Determine provider/model for headers
        model_used = req.model or result.get("model") or "gpt-4o-mini"
        provider_used = "openai" if "gpt" in model_used.lower() else "unknown"
        
        # Telemetry
        log_query_event(
            query=req.question,
            repo=(req.repo or "default"),
            mode="chat",
            duration=time.time() - start_time,
            model=model_used
        )
        
        # Return with headers
        return {
            "answer": answer_text,
            "event_id": event_id,
            "repo": result.get("repo"),
            "confidence": result.get("confidence", 0.0),
            "headers": {
                "X-Model-Provider": provider_used,
                "X-Model-Name": model_used
            }
        }
    except Exception as e:
        logger.exception("Chat failed | req_id=%s question=%s", req_id, req.question[:50])
        if tr:
            end_trace(tr, error=str(e))
        raise
```

---

### Phase 3: Wire Router into asgi.py

In `.worktrees/feature-backend-modularization/server/asgi.py`:

```python
from server.routers.search import router as search_router

# ... in create_app():
app.include_router(search_router)
```

---

### Phase 4: Remove from Main Branch app.py

**AFTER** confirming tests pass in the worktree:
1. Delete lines 272-660 (approx) from `server/app.py` 
2. Keep the shim: `app = create_app()`
3. Verify no import errors

---

## Testing Strategy

### Unit Tests (Direct Import)

**File**: `tests/routers/test_search_direct.py`

```python
from fastapi.testclient import TestClient
from server.app import app


def test_search_endpoint_returns_results():
    client = TestClient(app)
    r = client.get('/search?q=hybrid+search&repo=agro&top_k=5')
    assert r.status_code == 200
    data = r.json()
    assert 'results' in data
    assert 'query' in data
    assert isinstance(data['results'], list)


def test_answer_endpoint_returns_generation():
    client = TestClient(app)
    r = client.get('/answer?q=how+does+reranker+work&repo=agro')
    assert r.status_code == 200
    data = r.json()
    assert 'answer' in data
    assert isinstance(data['answer'], str)
    # event_id may be None if tracing disabled
    assert 'event_id' in data


def test_chat_endpoint_with_settings():
    client = TestClient(app)
    payload = {
        "question": "What is hybrid search?",
        "repo": "agro",
        "model": "gpt-4o-mini",
        "temperature": 0.3,
        "final_k": 10
    }
    r = client.post('/api/chat', json=payload)
    assert r.status_code == 200
    data = r.json()
    assert 'answer' in data
    assert 'headers' in data
    assert data['headers']['X-Model-Name'] == 'gpt-4o-mini'
```

### Integration Tests (Optional, Heavier)

Only if you want to verify actual LangGraph execution:
- Requires Qdrant running
- Requires indexed data
- Slower (15-30s per test)

**Skip for initial extraction** - just verify endpoints respond correctly.

---

## Known Issues to Handle

### 1. Broken Pipe Error (stdout/stderr)
**Current Fix**: Redirect stdout/stderr during `graph.invoke()`
**Location**: Already in service layer via `contextlib.redirect_stdout`

### 2. Env Override Race Conditions
**Risk**: Multiple concurrent `/api/chat` calls could interfere
**Mitigation**: Context manager ensures cleanup; env changes are process-wide (accept as limitation for now)
**Future**: Thread-local config or per-request config object (not in this extraction)

### 3. LangGraph Singleton
**Current**: `_graph` is module-level global
**Future**: Could move to app state, but leave as-is for parity

### 4. Trace Object Lifecycle
**Current**: Start trace → pass to service → end trace in router
**Works fine**: Service doesn't own trace lifetime

---

## Success Criteria

Before merge:
- ✅ All three endpoints (`/search`, `/answer`, `/api/chat`) extracted
- ✅ Service layer created (`server/services/rag.py`)
- ✅ Router created (`server/routers/search.py`)
- ✅ Tests passing (direct-import)
- ✅ No regressions in existing tests
- ✅ Router wired into `asgi.py`
- ✅ Original endpoints deleted from `app.py`
- ✅ No absolute paths in new code
- ✅ Logging uses `logger.info()` with context

---

## Estimated Time

- Service layer (`rag.py`): 1.5 hours
- Router (`search.py`): 1 hour
- Tests: 30 minutes
- Cleanup + verification: 1 hour

**Total: ~4 hours**

---

## What to Report Back

After completing:
1. ✅ Endpoints extracted (list them)
2. ✅ Test results (pytest output)
3. ⚠️ Any deviations from plan (if applicable)
4. 🚀 Ready for merge to development?

---

## Questions? Edge Cases?

**Q: What if LangGraph build fails?**
A: Service will raise exception; router catches and returns 500 with request_id

**Q: What if Qdrant is down?**
A: `search_routed_multi` will fail; router catches and returns error JSON

**Q: Should I refactor LangGraph itself?**
A: **NO**. Just wrap it. Refactoring LangGraph is out of scope.

**Q: Should I add new features (streaming, etc)?**
A: **NO**. Extraction preserves existing behavior only.

---

**Start with service layer, then router, then tests. Small commits!**

