# Broken Pipe Investigation (2025-10-21)

## Issue
Chat endpoint returns `[Errno 32] Broken pipe` error instead of generating answers.

## What Was Fixed
1. ✅ **OLLAMA_URL**: `127.0.0.1` → `host.docker.internal:11434/api` (Docker networking)
2. ✅ **REDIS_URL**: `127.0.0.1` → `host.docker.internal:6379` (Docker networking)
3. ✅ **QDRANT_URL**: `127.0.0.1` → `host.docker.internal:6333` (Docker networking)
4. ✅ **GEN_MODEL**: `qwen3-coder:14b` (non-existent) → `gpt-4o-mini` (OpenAI)
5. ✅ **TRACING_MODE**: `langsmith` → `local` (disable external tracing)
6. ✅ **LANGCHAIN_TRACING_V2**: `1` → `0` (disable LangSmith HTTP calls)

## What Works
- ✅ Direct Python invocation of LangGraph inside container
- ✅ All services accessible (Redis, Qdrant, Ollama, OpenAI)
- ✅ Health endpoint returns OK
- ✅ Direct OpenAI API calls work
- ✅ Direct Ollama generation works

## What Doesn't Work
- ❌ `/answer?q=test&repo=agro` returns broken pipe
- ❌ `/api/chat` POST returns broken pipe
- ❌ Even with OpenAI (no Ollama involved)!

## The Mystery
The **exact same code path** works when called directly in Python but fails when invoked via FastAPI HTTP endpoint. This suggests:
- NOT a RAG/LangGraph issue
- NOT an Ollama issue
- NOT a service connectivity issue
- Likely a FastAPI/gunicorn/uvicorn async handling issue

## Current Configuration
```bash
# .env (2025-10-21)
GEN_MODEL=gpt-4o-mini
OLLAMA_URL=http://host.docker.internal:11434/api
REDIS_URL=redis://host.docker.internal:6379/0
QDRANT_URL=http://host.docker.internal:6333
LANGCHAIN_TRACING_V2=0
TRACING_MODE=local
```

## Next Steps (for future debugging)
1. Add detailed logging to FastAPI middleware
2. Test with single uvicorn worker (not gunicorn)
3. Check for async/await issues in graph invocation
4. Examine gunicorn worker timeout/restart behavior
5. Consider switching to different ASGI server (hypercorn, daphne)

## Workaround
For now, recommend using the RAG system via:
- Direct Python API (`from retrieval.hybrid_search import search_routed_multi`)
- MCP server (if working)
- Fix the underlying FastAPI issue (time-intensive)

## Files Modified
- `.env` - Updated all service URLs
- `server/app.py:279` - Added full traceback to error response (but traceback never appears)
