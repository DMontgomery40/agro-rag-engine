# os.getenv() Migration Analysis

## Executive Summary

**Total os.getenv() calls found:** 258
**Analysis Date:** 2025-11-21
**Status:** Analysis Complete - Ready for Migration

## Migration Strategy

### What to Keep as os.getenv()
1. **Infrastructure URLs** - QDRANT_URL, OLLAMA_URL, REDIS_URL, LOKI_URL
2. **API Keys** - OPENAI_API_KEY, COHERE_API_KEY, VOYAGE_API_KEY, LANGCHAIN_API_KEY, NETLIFY_API_KEY
3. **Repository Paths** - REPO, REPO_PATH, FILES_ROOT, REPO_ROOT
4. **LangChain/LangSmith Config** - LANGCHAIN_TRACING_V2, LANGCHAIN_PROJECT, LANGSMITH_PROJECT, LANGCHAIN_ENDPOINT
5. **Git Info** - GIT_BRANCH

### What to Migrate to config_registry
All tunable parameters that are ALREADY in AGRO_CONFIG_KEYS:
- Retrieval params (RRF_K_DIV, FINAL_K, EVAL_FINAL_K, EVAL_MULTI, etc.)
- Reranking params (AGRO_RERANKER_ENABLED, AGRO_RERANKER_ALPHA, etc.)
- Generation params (GEN_MODEL, GEN_TEMPERATURE, GEN_MAX_TOKENS, etc.)
- Embedding params (EMBEDDING_TYPE, EMBEDDING_DIM, VOYAGE_MODEL, etc.)
- Tracing params (AGRO_LOG_PATH, TRACE_RETENTION, TRACING_MODE, etc.)
- Enrichment params (ENRICH_CODE_CHUNKS, ENRICH_MODEL, ENRICH_BACKEND, etc.)
- Training params (AGRO_RERANKER_MODEL_PATH, AGRO_TRIPLETS_PATH, etc.)

## Files Requiring Migration

### High Priority (Core Application Files)

#### server/routers/pipeline.py
- **Lines:** 34-69
- **Parameters to migrate:**
  - SKIP_DENSE → indexing.skip_dense
  - FINAL_K, LANGGRAPH_FINAL_K → retrieval.final_k, retrieval.langgraph_final_k
  - AGRO_RERANKER_ENABLED → reranking.agro_reranker_enabled
  - RERANK_BACKEND → reranking.reranker_backend
  - COHERE_RERANK_MODEL, VOYAGE_RERANK_MODEL → reranking.cohere_rerank_model, reranking.voyage_rerank_model
  - RERANK_MODEL, BAAI_RERANK_MODEL → reranking.reranker_model
  - AGRO_LEARNING_RERANKER_MODEL → training.agro_reranker_model_path
  - ENRICH_CODE_CHUNKS → enrichment.enrich_code_chunks
  - ENRICH_BACKEND → generation.enrich_backend
  - ENRICH_MODEL, ENRICH_MODEL_OLLAMA → generation.enrich_model
  - GEN_MODEL → generation.gen_model
- **Keep as os.getenv():**
  - REPO (infrastructure)
  - GIT_BRANCH (infrastructure)
  - QDRANT_URL (infrastructure)
  - REDIS_URL (infrastructure)
  - OLLAMA_URL (infrastructure)

#### server/asgi.py
- **Lines:** 62-95
- **Same parameters as pipeline.py** (duplicate logic for /pipeline endpoint)

#### server/learning_reranker.py
- **Lines:** 20-36
- **Parameters to migrate:**
  - AGRO_RERANKER_BATCH → reranking.agro_reranker_batch
  - AGRO_RERANKER_MAXLEN → reranking.agro_reranker_maxlen
  - AGRO_RERANKER_MODEL_PATH → training.agro_reranker_model_path
  - AGRO_RERANKER_RELOAD_ON_CHANGE → reranking.agro_reranker_reload_on_change
  - AGRO_RERANKER_RELOAD_PERIOD_SEC → reranking.agro_reranker_reload_period_sec
  - AGRO_RERANKER_ALPHA → reranking.agro_reranker_alpha
  - AGRO_RERANKER_TOPN → reranking.agro_reranker_topn
  - AGRO_RERANKER_ENABLED → reranking.agro_reranker_enabled

#### server/env_model.py
- **Lines:** 15-30
- **Parameters to migrate:**
  - GEN_MODEL → generation.gen_model
  - GEN_TEMPERATURE → generation.gen_temperature
  - GEN_MAX_TOKENS → generation.gen_max_tokens
  - GEN_TOP_P → generation.gen_top_p
  - GEN_TIMEOUT → generation.gen_timeout
  - GEN_RETRY_MAX → generation.gen_retry_max
  - ENRICH_MODEL → generation.enrich_model
  - ENRICH_BACKEND → generation.enrich_backend
  - ENRICH_DISABLED → generation.enrich_disabled
  - OLLAMA_NUM_CTX → generation.ollama_num_ctx
- **Keep as os.getenv():**
  - OLLAMA_URL (infrastructure)

#### server/cards_builder.py
- **Lines:** 21-29, 44-55
- **Parameters to migrate:**
  - CARDS_ENRICH_DEFAULT → enrichment.cards_enrich_default
  - CARDS_MAX → enrichment.cards_max
  - ENRICH_CODE_CHUNKS → enrichment.enrich_code_chunks
  - ENRICH_TIMEOUT → enrichment.enrich_timeout
  - EMBEDDING_TYPE → embedding.embedding_type
  - ENRICH_MODEL, GEN_MODEL → generation.enrich_model, generation.gen_model
  - RERANK_BACKEND → reranking.reranker_backend
  - COHERE_RERANK_MODEL → reranking.cohere_rerank_model
  - RERANKER_MODEL → reranking.reranker_model
- **Keep as os.getenv():**
  - OUT_DIR_BASE (infrastructure path)

#### server/routers/reranker_ops.py
- **Lines:** 20-44
- **Parameters to migrate:**
  - AGRO_LOG_PATH → tracing.agro_log_path (multiple uses)
  - AGRO_RERANKER_MODEL_PATH → training.agro_reranker_model_path (multiple uses)

#### server/alerts.py
- **Lines:** 9-13, 63
- **Parameters to migrate:**
  - AGRO_LOG_PATH → tracing.agro_log_path
- **Keep as os.getenv():**
  - ALERT_TITLE_PREFIX (infrastructure)
  - ALERT_WEBHOOK_URLS (secret)
  - ALERT_WEBHOOK_HEADERS (secret)

#### server/telemetry.py
- **Line:** 19
- **Parameters to migrate:**
  - AGRO_LOG_PATH → tracing.agro_log_path

#### server/tracing.py
- **Lines:** 24-29, 74-77
- **Parameters to migrate:**
  - TRACING_MODE → tracing.tracing_mode
  - TRACE_RETENTION → tracing.trace_retention
- **Keep as os.getenv():**
  - REPO (infrastructure)
  - LANGCHAIN_TRACING_V2 (external service config)
  - LANGCHAIN_PROJECT, LANGSMITH_PROJECT (external service config)

#### server/index_stats.py
- **Lines:** 17-18, 24-27
- **Parameters to migrate:**
  - EMBEDDING_TYPE → embedding.embedding_type
  - EMBEDDING_DIM → embedding.embedding_dim
- **Keep as os.getenv():**
  - REPO (infrastructure)
  - GIT_BRANCH (infrastructure)

#### common/metadata.py
- **Lines:** 16-19
- **Parameters to migrate:**
  - ENRICH_DISABLED → generation.enrich_disabled
  - ENRICH_MIN_CHARS → enrichment.enrich_min_chars
  - ENRICH_MAX_CHARS → enrichment.enrich_max_chars

### Medium Priority (CLI and Scripts)

#### cli/commands/reranker.py
- **Parameters to migrate:**
  - RERANKER_TRAIN_EPOCHS → training.reranker_train_epochs
  - RERANKER_TRAIN_BATCH → training.reranker_train_batch
  - RERANKER_TRAIN_MAXLEN (not in config yet, skip for now)
  - AGRO_TRIPLETS_PATH → training.agro_triplets_path
  - AGRO_RERANKER_MODEL_PATH → training.agro_reranker_model_path
  - AGRO_LOG_PATH → tracing.agro_log_path
  - AGRO_RERANKER_MINE_MODE → training.agro_reranker_mine_mode
  - AGRO_RERANKER_MINE_RESET → training.agro_reranker_mine_reset

#### cli/commands/config.py
- **Parameters to migrate:**
  - GEN_MODEL → generation.gen_model
  - FINAL_K → retrieval.final_k
  - AGRO_RERANKER_ENABLED → reranking.agro_reranker_enabled
- **Keep as os.getenv():**
  - OPENAI_API_KEY (secret)

#### eval/eval_rag.py
- **Parameters to migrate:**
  - EVAL_MULTI → retrieval.eval_multi
  - EVAL_FINAL_K → retrieval.eval_final_k
  - EVAL_MULTI_M → evaluation.eval_multi_m
- **Keep as os.getenv():**
  - GOLDEN_PATH → evaluation.golden_path (already in config)
  - REPO (infrastructure)

#### eval/eval_loop.py
- **Keep as os.getenv():**
  - BASELINE_PATH → evaluation.baseline_path (already in config)
  - REPO (infrastructure)

#### indexer/build_cards.py
- **Parameters to migrate:**
  - CARDS_MAX → enrichment.cards_max
- **Keep as os.getenv():**
  - REPO (infrastructure)

### Low Priority (Keep as-is - Infrastructure/Secrets Only)

#### server/routers/mcp_ops.py
- **Keep all:** MCP_HTTP_HOST, MCP_HTTP_PORT, MCP_HTTP_PATH, NODE_MCP_HOST, NODE_MCP_PORT (infrastructure)

#### server/routers/cards.py
- **Keep all:** REPO (infrastructure - appears 4 times)

#### server/routers/golden.py
- **Migrate:**
  - GOLDEN_PATH → evaluation.golden_path (line 13)
- **Keep:**
  - REPO (infrastructure)

#### server/routers/eval.py
- **Migrate:**
  - BASELINE_PATH → evaluation.baseline_path (lines 12, 41)

#### server/routers/observability.py
- **Keep all:** LANGCHAIN_TRACING_V2, LANGCHAIN_PROJECT, LANGSMITH_PROJECT, LANGCHAIN_ENDPOINT, LANGCHAIN_API_KEY, LANGSMITH_API_KEY, REPO (all external service or infrastructure)

#### server/routers/docker.py
- **Keep all:** LOKI_URL (infrastructure)

#### server/routers/hardware.py
- **Keep all:** OLLAMA_URL (infrastructure)

#### server/routers/search.py
- **Keep all:** REPO (infrastructure)

#### server/mcp/server.py & server/mcp/http.py
- **Keep all:** NETLIFY_API_KEY (secret), MCP_HTTP_HOST, MCP_HTTP_PORT, MCP_HTTP_PATH (infrastructure)

#### server/reranker_info.py
- **Migrate:**
  - AGRO_RERANKER_ENABLED → reranking.agro_reranker_enabled
  - AGRO_RERANKER_MODEL_PATH (actually AGRO_MODEL_PATH in code) → training.agro_reranker_model_path
  - COHERE_RERANK_MODEL → reranking.cohere_rerank_model
- **Keep:**
  - COHERE_API_KEY (secret)

#### server/langgraph_app.py
- **Keep all:** REPO (infrastructure), VECTOR_BACKEND (infrastructure), REDIS_URL (infrastructure)

#### server/services/keywords.py
- **Keep all:** REPO (infrastructure)

#### server/services/config_store.py
- **Keep all:** COHERE_API_KEY (secret)

#### common/config_loader.py
- **Keep all:** REPOS_FILE, REPO, REPO_PATH (all infrastructure)

#### common/paths.py
- **Keep all:** REPO_ROOT, FILES_ROOT, GUI_DIR, DOCS_DIR, DATA_DIR (all infrastructure paths)

### Not Application Code (Skip)
- cli/chat_cli.py - REPO, THREAD_ID, PORT (infrastructure)
- cli/commands/chat.py - REPO (infrastructure)
- cli/commands/index.py - REPO (infrastructure)
- cli/commands/utils.py - PORT (infrastructure)
- scripts/* - Various infrastructure and test scripts
- indexer/index_repo.py - Already uses config_registry (verified by smoke tests)
- retrieval/hybrid_search.py - Already uses config_registry
- retrieval/rerank.py - Needs verification
- retrieval/synonym_expander.py - Needs verification

## Migration Priority Order

1. **Phase 1: Core Server Files**
   - server/learning_reranker.py
   - server/env_model.py
   - server/telemetry.py
   - server/alerts.py
   - common/metadata.py

2. **Phase 2: Routers**
   - server/routers/pipeline.py
   - server/routers/reranker_ops.py
   - server/routers/golden.py
   - server/routers/eval.py

3. **Phase 3: ASGI (duplicate pipeline logic)**
   - server/asgi.py

4. **Phase 4: Cards and Stats**
   - server/cards_builder.py
   - server/index_stats.py
   - server/tracing.py
   - server/reranker_info.py

5. **Phase 5: CLI Commands**
   - cli/commands/reranker.py
   - cli/commands/config.py

6. **Phase 6: Eval Scripts**
   - eval/eval_rag.py
   - eval/eval_loop.py
   - indexer/build_cards.py

## Expected Outcome

**Before:** ~258 total os.getenv() calls
**After:** ~180 os.getenv() calls (78 migrated to config_registry)
**Remaining:** Infrastructure URLs, API keys, repository paths, external service configs

All tunable RAG parameters will be managed through config_registry, providing:
- Centralized configuration in agro_config.json
- GUI-editable settings
- Type safety via Pydantic
- Consistent defaults
- Hot-reload capability
