# GUI Variable Classification - Audit Results

**Date:** 2025-10-21
**Total GUI Variables:** 99
**Audit Scope:** Checked if each variable is referenced in backend Python code

---

## Category 1: API Keys & External Service Credentials (PASS)

These are NOT referenced explicitly in backend code because they're passed to external libraries automatically. This is **CORRECT behavior** - the libraries (LangChain, OpenAI SDK, etc.) read these from `os.environ` directly.

- OPENAI_API_KEY ✅
- ANTHROPIC_API_KEY ✅
- GOOGLE_API_KEY ✅
- COHERE_API_KEY ✅
- VOYAGE_API_KEY ✅
- LANGSMITH_API_KEY ✅
- HUGGINGFACE_API_KEY ✅
- TOGETHER_API_KEY ✅
- GROQ_API_KEY ✅
- MISTRAL_API_KEY ✅
- LANGCHAIN_API_KEY ✅
- NETLIFY_API_KEY ✅
- GRAFANA_AUTH_TOKEN ✅

**Status:** These work correctly - no changes needed

---

## Category 2: Frontend-Only Settings (PASS)

These variables are used by the GUI/JavaScript but don't need backend involvement. This is correct.

- THEME_MODE - Frontend uses this to set CSS theme
- EDITOR_EMBED_ENABLED - Frontend uses this to show/hide editor panel
- GRAFANA_EMBED_ENABLED - Frontend uses this to show/hide Grafana panel
- GRAFANA_KIOSK - Frontend uses this for Grafana display mode
- AUTO_COLIMA - Frontend uses this for container management UI hints

**Status:** These work correctly - no changes needed

---

## Category 3: Runtime Configuration NOT Used at Initialization (CRITICAL BUGS)

These are read from environment BUT at initialization time, not at request time. Changing them in GUI doesn't take effect until server restart.

### 3a: Tracing Settings (Read Once at Trace Initialization)
- LANGCHAIN_TRACING_V2 ❌ BUG - Read at Trace.__init__, not re-evaluated per request
- TRACING_MODE ❌ BUG - Read at Trace.__init__, not re-evaluated per request
- TRACE_AUTO_LS ❌ BUG - Same issue
- TRACE_RETENTION - Read at trace save time (less critical)

### 3b: Other Initialization-Time Settings
- VECTOR_BACKEND - Likely read at server startup
- EMBEDDING_TYPE - Likely read at server startup
- RERANK_BACKEND - Likely read at server startup
- GEN_MODEL - Read at request time ✅ (works correctly)
- ENRICH_BACKEND - Read at request time ✅ (works correctly)

**Status:** Tracing settings are BROKEN - they need runtime hot-reload

---

## Category 4: Genuinely Unused Configuration (CRITICAL ISSUE)

These settings appear in the GUI but are never read or used by backend code. Changing them has no effect.

### 4a: Index/Search Parameters That Should Be Used
```
CHUNK_SIZE                - Should control document chunking size
CHUNK_OVERLAP            - Should control overlap between chunks
TOPK_DENSE              - Should control dense search results count
TOPK_SPARSE             - Should control sparse search results count
RRF_K_DIV               - Should control reciprocal rank fusion parameter
FINAL_K                 - Used in some code (check more carefully)
FALLBACK_CONFIDENCE     - Should control confidence thresholds
```

### 4b: Filename Boosting (Never Used)
```
FILENAME_BOOST_EXACT    - Should boost exact filename matches
FILENAME_BOOST_PARTIAL  - Should boost partial filename matches
```

### 4c: Query Rewriting (Never Used)
```
MAX_QUERY_REWRITES      - Should control number of rewrites
MQ_REWRITES             - Used? Need to check more carefully
```

### 4d: Reranker Configuration (Partially Used)
```
RERANK_INPUT_SNIPPET_CHARS   - Should control snippet length for reranking
AGRO_RERANKER_MAXLEN        - Should control max length
AGRO_RERANKER_BATCH         - Should control batch size
AGRO_RERANKER_ALPHA         - Should control weighting
AGRO_RERANKER_ENABLED       - Should enable/disable reranking
```

### 4e: Editor Settings (Never Used)
```
EDITOR_ENABLED          - Backend never checks this
EDITOR_PORT             - Backend never checks this
EDITOR_EMBED_ENABLED    - Backend never checks this
EDITOR_BIND             - Backend never checks this
```

### 4f: Grafana Settings (Never Used by Backend)
```
GRAFANA_BASE_URL        - Frontend has this, backend unused
GRAFANA_ORG_ID          - Frontend has this, backend unused
GRAFANA_DASHBOARD_UID   - Frontend has this, backend unused
GRAFANA_DASHBOARD_SLUG  - Frontend has this, backend unused
GRAFANA_AUTH_MODE       - Frontend has this, backend unused
GRAFANA_REFRESH         - Frontend has this, backend unused
```

### 4g: Path Settings (Partially Used)
```
DATA_DIR                - Should control data directory
DOCS_DIR                - Should control docs directory
FILES_ROOT              - Should control files root
RAG_OUT_BASE            - Should control output directory
REPO_PATH               - Should control repo path
REPO_ROOT               - Should control repo root
REPOS_FILE              - Should control repos.json path
```

### 4h: Other Unused
```
AGRO_EDITION            - Edition information (unused)
AGRO_TRIPLETS_PATH      - Triplets path (unused)
AGRO_RERANKER_MINE_MODE - Mining mode (unused)
AGRO_RERANKER_MINE_RESET - Reset mining (unused)
COLLECTION_NAME         - Collection name (unused)
COLLECTION_SUFFIX       - Collection suffix (unused)
COLIMA_PROFILE          - Colima profile (unused)
GEN_MODEL_CLI           - CLI model selection (unused - only GEN_MODEL is used)
GEN_MODEL_HTTP          - HTTP model selection (unused - only GEN_MODEL is used)
GEN_MODEL_MCP           - MCP model selection (unused - only GEN_MODEL is used)
ENRICH_MODEL_OLLAMA     - Ollama model override (unused)
HYDRATION_MAX_CHARS     - Max hydration chars (unused)
INDEX_MAX_WORKERS       - Index workers (unused)
LANGTRACE_API_HOST      - LangTrace host (unused)
LANGTRACE_PROJECT_ID    - LangTrace project (unused)
NETLIFY_DOMAINS         - Netlify domains (unused)
OPENAI_BASE_URL         - OpenAI base URL (used only in comments)
OPEN_BROWSER            - Open browser flag (unused)
THREAD_ID               - Thread ID (unused)
TRANSFORMERS_TRUST_REMOTE_CODE - Trust remote code (unused)
USE_SEMANTIC_SYNONYMS   - Semantic synonyms toggle (unused)
VENDOR_MODE             - Vendor mode (unused)
```

**Status:** These 40+ variables are BROKEN - they appear functional but do nothing

---

## SUMMARY TABLE

| Category | Count | Status | Action |
|----------|-------|--------|--------|
| API Keys (auto-passed) | 13 | ✅ WORKING | None |
| Frontend-only settings | 5 | ✅ WORKING | None |
| Runtime init-time issues | 5 | ❌ BROKEN | Implement hot-reload |
| Never used in backend | 40+ | ❌ BROKEN | Remove from GUI OR implement |
| **TOTAL** | **99** | | |

---

## RECOMMENDATIONS

### Priority 1: Critical Functionality Issues
1. Fix LANGCHAIN_TRACING_V2 runtime hot-reload
2. Fix TRACING_MODE runtime hot-reload
3. Fix /api/env/reload endpoint to actually reload

### Priority 2: Remove Fake Settings
For each unused variable, decide:
- **Option A:** Remove from GUI (if not needed)
- **Option B:** Implement backend logic to use it
- **Option C:** Document as "requires server restart"

### Priority 3: Audit Deep
Check more carefully:
- Does FINAL_K actually work? (partially used)
- Does MQ_REWRITES actually work? (partially used)
- Are path variables (REPO_PATH, etc.) used correctly?

---

## Test Plan

Create a Playwright test that:
1. Changes each setting in GUI
2. Calls API to verify it was saved
3. Makes a request that should use the setting
4. Verifies behavior actually changed

This will definitively identify which settings are broken.

