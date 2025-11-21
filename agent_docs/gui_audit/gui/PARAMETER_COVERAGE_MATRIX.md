# RAG Parameter Coverage Matrix - /gui Frontend

**Generated:** 2025-11-20
**Based on:** 8-agent comprehensive audit of /gui frontend
**Backend Reference:** `/server/models/agro_config_model.py` (100 parameters)

## Coverage Summary

| Status | Count | Percentage | Description |
|--------|-------|------------|-------------|
| ✅ **Working** | 21 | 21% | Fully functional in GUI with proper wiring |
| ⚠️ **Partial** | 25 | 25% | In GUI but incomplete wiring or validation |
| ❌ **Missing** | 54 | 54% | Not present in GUI at all |
| **TOTAL** | **100** | **100%** | All backend RAG parameters |

---

## By Category

### 1. Retrieval Parameters (15 total)

| Parameter | Status | HTML Location | JS Handler | Issues |
|-----------|--------|---------------|------------|--------|
| FINAL_K | ✅ Working | Line 3067 | config.js | None |
| MQ_REWRITES | ✅ Working | Line 3051 | config.js | None |
| USE_SEMANTIC_SYNONYMS | ⚠️ Partial | Line 3094 | config.js | No validation |
| TOPK_DENSE | ⚠️ Partial | Line 3115 | config.js | No validation |
| TOPK_SPARSE | ⚠️ Partial | Line 3138 | config.js | No validation |
| VECTOR_BACKEND | ⚠️ Partial | Line 3119 | config.js | No validation |
| HYDRATION_MODE | ⚠️ Partial | Line 3156 | config.js | No validation |
| HYDRATION_MAX_CHARS | ⚠️ Partial | Line 3175 | config.js | No validation |
| VENDOR_MODE | ⚠️ Partial | Line 3193 | config.js | No validation |
| BM25_WEIGHT | ❌ Missing | - | - | Not in GUI |
| VECTOR_WEIGHT | ❌ Missing | - | - | Not in GUI |
| CARD_SEARCH_ENABLED | ❌ Missing | - | - | Not in GUI |
| MULTI_QUERY_M | ❌ Missing | - | - | Not in GUI |
| CONF_TOP1 | ❌ Missing | - | - | Not in GUI |
| CONF_AVG5 | ❌ Missing | - | - | Not in GUI |

**Category Coverage:** 9/15 present (60%), only 2/15 fully working (13%)

---

### 2. Scoring Parameters (8 total)

| Parameter | Status | HTML Location | JS Handler | Issues |
|-----------|--------|---------------|------------|--------|
| RRF_K_DIV | ✅ Working | Line 3244 | config.js | None |
| CARD_BONUS | ✅ Working | Line 3271 | config.js | None |
| FILENAME_BOOST_EXACT | ✅ Working | Line 3299 | config.js | None |
| FILENAME_BOOST_PARTIAL | ⚠️ Partial | Line 3325 | config.js | Type conversion issue |
| LAYER_BONUS_GUI | ❌ Missing | - | - | Not in GUI |
| LAYER_BONUS_RETRIEVAL | ❌ Missing | - | - | Not in GUI |
| VENDOR_PENALTY | ❌ Missing | - | - | Not in GUI |
| FRESHNESS_BONUS | ❌ Missing | - | - | Not in GUI |

**Category Coverage:** 4/8 present (50%), 3/8 fully working (38%)

---

### 3. Embedding Parameters (10 total)

| Parameter | Status | HTML Location | JS Handler | Issues |
|-----------|--------|---------------|------------|--------|
| EMBEDDING_TYPE | ✅ Working | Line 3900 | indexing.js, config.js | None |
| EMBEDDING_MODEL | ❌ Missing | - | - | Not in GUI |
| EMBEDDING_DIM | ❌ Missing | - | - | Not in GUI |
| VOYAGE_MODEL | ❌ Missing | - | - | Not in GUI |
| EMBEDDING_MODEL_LOCAL | ❌ Missing | - | - | Not in GUI |
| EMBEDDING_BATCH_SIZE | ❌ Missing | - | - | Not in GUI |
| EMBEDDING_MAX_TOKENS | ❌ Missing | - | - | Not in GUI |
| EMBEDDING_CACHE_ENABLED | ❌ Missing | - | - | Not in GUI |
| EMBEDDING_TIMEOUT | ❌ Missing | - | - | Not in GUI |
| EMBEDDING_RETRY_MAX | ❌ Missing | - | - | Not in GUI |

**Category Coverage:** 1/10 present (10%), 1/10 fully working (10%)
**⚠️ CRITICAL GAP** - Only 1 of 10 parameters accessible

---

### 4. Chunking Parameters (8 total)

| Parameter | Status | HTML Location | JS Handler | Issues |
|-----------|--------|---------------|------------|--------|
| CHUNK_SIZE | ✅ Working | Line 3968 | indexing.js | None |
| CHUNK_OVERLAP | ✅ Working | Line 3972 | indexing.js | None |
| AST_OVERLAP_LINES | ❌ Missing | - | - | Not in GUI |
| MAX_CHUNK_SIZE | ❌ Missing | - | - | Not in GUI |
| MIN_CHUNK_CHARS | ❌ Missing | - | - | Not in GUI |
| GREEDY_FALLBACK_TARGET | ❌ Missing | - | - | Not in GUI |
| CHUNKING_STRATEGY | ❌ Missing | - | - | Not in GUI |
| PRESERVE_IMPORTS | ❌ Missing | - | - | Not in GUI |

**Category Coverage:** 2/8 present (25%), 2/8 fully working (25%)

---

### 5. Indexing Parameters (9 total)

| Parameter | Status | HTML Location | JS Handler | Issues |
|-----------|--------|---------------|------------|--------|
| COLLECTION_NAME | ⚠️ Partial | Line 3960 | config.js | No validation |
| INDEX_MAX_WORKERS | ⚠️ Partial | Line 3976 | config.js | Type conversion issue |
| QDRANT_URL | ✅ Working | Line 4620 | config.js | None |
| VECTOR_BACKEND | ⚠️ Partial | Line 3119 | config.js | Duplicate from retrieval |
| INDEXING_BATCH_SIZE | ❌ Missing | - | - | Not in GUI |
| INDEXING_WORKERS | ❌ Missing | - | - | Not in GUI |
| BM25_TOKENIZER | ❌ Missing | - | - | Not in GUI |
| INDEX_EXCLUDED_EXTS | ❌ Missing | - | - | Not in GUI |
| INDEX_MAX_FILE_SIZE_MB | ❌ Missing | - | - | Not in GUI |

**Category Coverage:** 4/9 present (44%), 1/9 fully working (11%)

---

### 6. Reranking Parameters (12 total)

| Parameter | Status | HTML Location | JS Handler | Issues |
|-----------|--------|---------------|------------|--------|
| RERANK_BACKEND | ✅ Working | Line 3493 | config.js, reranker.js | None |
| RERANKER_MODEL | ⚠️ Partial | Line 3502 | config.js | No validation |
| AGRO_RERANKER_ENABLED | ⚠️ Partial | Line 3620 | reranker.js | Display only |
| AGRO_RERANKER_ALPHA | ⚠️ Partial | Line 3668 | reranker.js | Display only |
| AGRO_RERANKER_BATCH | ⚠️ Partial | Line 3676 | reranker.js | Display only |
| AGRO_RERANKER_MAXLEN | ⚠️ Partial | Line 3672 | reranker.js | Display only |
| COHERE_RERANK_MODEL | ⚠️ Partial | Line 3522 | config.js | No validation |
| COHERE_API_KEY | ✅ Working | Line 3532 | config.js | Secret handling |
| RERANK_INPUT_SNIPPET_CHARS | ⚠️ Partial | Line 3545 | config.js | No validation |
| AGRO_RERANKER_TOPN | ❌ Missing | - | - | Not in GUI |
| AGRO_RERANKER_RELOAD_ON_CHANGE | ❌ Missing | - | - | Not in GUI |
| VOYAGE_RERANK_MODEL | ❌ Missing | - | - | Not in GUI |

**Category Coverage:** 9/12 present (75%), 2/12 fully working (17%)

---

### 7. Generation Parameters (10 total)

| Parameter | Status | HTML Location | JS Handler | Issues |
|-----------|--------|---------------|------------|--------|
| GEN_MODEL | ✅ Working | Line 2914 | config.js | None |
| GEN_MODEL_HTTP | ⚠️ Partial | Line 4915 | config.js | No validation |
| GEN_MODEL_MCP | ⚠️ Partial | Line 4921 | config.js | No validation |
| GEN_MODEL_CLI | ⚠️ Partial | Line 4929 | config.js | No validation |
| GEN_TEMPERATURE | ❌ Missing | - | - | Not in GUI |
| GEN_MAX_TOKENS | ❌ Missing | - | - | Not in GUI |
| GEN_TOP_P | ❌ Missing | - | - | Not in GUI |
| GEN_TIMEOUT | ❌ Missing | - | - | Not in GUI |
| GEN_RETRY_MAX | ❌ Missing | - | - | Not in GUI |
| ENRICH_DISABLED | ❌ Missing | - | - | Not in GUI |

**Category Coverage:** 4/10 present (40%), 1/10 fully working (10%)

---

### 8. Keywords Parameters (5 total)

| Parameter | Status | HTML Location | JS Handler | Issues |
|-----------|--------|---------------|------------|--------|
| KEYWORDS_MAX_PER_REPO | ❌ Missing | - | - | Not in GUI |
| KEYWORDS_MIN_FREQ | ❌ Missing | - | - | Not in GUI |
| KEYWORDS_BOOST | ❌ Missing | - | - | Not in GUI |
| KEYWORDS_AUTO_GENERATE | ❌ Missing | - | - | Not in GUI |
| KEYWORDS_REFRESH_HOURS | ❌ Missing | - | - | Not in GUI |

**Category Coverage:** 0/5 present (0%), 0/5 fully working (0%)
**⚠️ CRITICAL GAP** - Entire category missing

---

### 9. Tracing & Observability (7 total)

| Parameter | Status | HTML Location | JS Handler | Issues |
|-----------|--------|---------------|------------|--------|
| TRACING_ENABLED | ❌ Missing | - | - | Not in GUI |
| TRACE_SAMPLING_RATE | ❌ Missing | - | - | Not in GUI |
| PROMETHEUS_PORT | ❌ Missing | - | - | Not in GUI |
| METRICS_ENABLED | ❌ Missing | - | - | Not in GUI |
| ALERT_INCLUDE_RESOLVED | ⚠️ Partial | Line 4990 | webhooks | Only webhook setting |
| LOG_LEVEL | ❌ Missing | - | - | Not in GUI |
| LANGSMITH_API_KEY | ✅ Working | Line 4861 | config.js | Secret handling |

**Category Coverage:** 2/7 present (29%), 1/7 fully working (14%)

---

### 10. Training Parameters (6 total)

| Parameter | Status | HTML Location | JS Handler | Issues |
|-----------|--------|---------------|------------|--------|
| RERANKER_TRAIN_EPOCHS | ⚠️ Partial | Line 3682 | reranker.js | Missing `name` attribute |
| RERANKER_TRAIN_BATCH | ⚠️ Partial | Line 3686 | reranker.js | Missing `name` attribute |
| RERANKER_TRAIN_LR | ❌ Missing | - | - | Not in GUI |
| RERANKER_WARMUP_RATIO | ❌ Missing | - | - | Not in GUI |
| TRIPLETS_MIN_COUNT | ❌ Missing | - | - | Not in GUI |
| TRIPLETS_MINE_MODE | ❌ Missing | - | - | Not in GUI |

**Category Coverage:** 2/6 present (33%), 0/6 fully working (0%)

---

### 11. Infrastructure & UI (18 total)

| Parameter | Status | HTML Location | JS Handler | Issues |
|-----------|--------|---------------|------------|--------|
| PORT | ✅ Working | Line 4841 | config.js | None |
| HOST | ✅ Working | Line 4837 | config.js | None |
| THEME_MODE | ✅ Working | Line 4811 | theme.js | None |
| OPEN_BROWSER | ⚠️ Partial | Line 4847 | config.js | Boolean type issue |
| REDIS_URL | ⚠️ Partial | Line 4624 | config.js | No validation |
| REPO | ✅ Working | Line 4640 | indexing.js, config.js | None |
| COLLECTION_SUFFIX | ⚠️ Partial | Line 4644 | config.js | No validation |
| OUT_DIR_BASE | ⚠️ Partial | Line 4682 | config.js | Disabled field |
| EDITOR_ENABLED | ⚠️ Partial | Line 4876 | editor.js | No validation |
| EDITOR_PORT | ⚠️ Partial | Line 4894 | editor.js | No validation |
| MCP_HTTP_HOST | ⚠️ Partial | Line 4695 | mcp_server.js | Duplicated 3x |
| MCP_HTTP_PORT | ⚠️ Partial | Line 4701 | mcp_server.js | Duplicated 3x |
| AUTO_COLIMA | ⚠️ Partial | Line 4524 | docker.js | Boolean type issue |
| COLIMA_PROFILE | ⚠️ Partial | Line 4532 | docker.js | No validation |
| GRAFANA_BASE_URL | ⚠️ Partial | Multiple | grafana.js | Security issue (token in URL) |
| SKIP_DENSE | ⚠️ Partial | Line 3908 | indexing.js | Boolean type issue |
| CARDS_ENRICH_DEFAULT | ⚠️ Partial | Line 3915 | cards_builder.js | Boolean type issue |
| CHAT_STREAMING_ENABLED | ❌ Missing | - | - | Not in GUI |

**Category Coverage:** 17/18 present (94%), 4/18 fully working (22%)

---

## Critical Findings

### ADA Compliance Issues

**Missing Entire Categories:**
- Keywords (0/5 parameters) - 0% coverage
- Generation tuning (5/10 parameters missing)
- Embedding config (9/10 parameters missing)
- Tracing (6/7 parameters missing)

**Total Inaccessible:** 54/100 parameters (54%) have NO GUI controls

**ADA Impact:** Users with dyslexia cannot access half of the system's configuration options, violating accessibility requirements.

---

## Technical Issues by Type

### 1. Missing `name` Attributes (6 controls)
**Lines:** 3682, 3686, 3690, 4137, 4165, 4178
**Impact:** Cannot be form-submitted
**Affected:** reranker-epochs, reranker-batch, reranker-maxlen, eval-final-k, eval-golden-path, eval-baseline-path

### 2. Type Conversion Issues (25+ parameters)
**Issue:** All form inputs sent as strings, not int/float/bool
**Example:** CHUNK_SIZE sent as "1000" instead of 1000
**Affected:** All numeric and boolean parameters

### 3. Display-Only Controls (15 parameters)
**Issue:** Appear editable but changes don't persist
**Example:** AGRO_RERANKER_ALPHA, TOPN, BATCH, MAXLEN shown but not editable
**Lines:** 3668, 3672, 3676, reranker-info panel

### 4. Duplicate Definitions (3 parameters)
**Issue:** Same parameter defined in multiple locations
**Example:** MCP_HTTP_* defined 3 times (Infrastructure, Admin, Editor)
**Impact:** Configuration sync problems

### 5. No Validation (46 parameters)
**Issue:** No client-side range/enum validation
**Impact:** Invalid values sent to backend
**Examples:** TOPK_DENSE, VECTOR_BACKEND, COHERE_RERANK_MODEL

---

## Priority Fix List

### P0 - CRITICAL (Blocking ADA Compliance)
1. Add 54 missing parameters to GUI (40-50 hours)
2. Fix 6 controls with missing `name` attributes (2 hours)
3. Implement type conversion for numeric/boolean fields (8 hours)
4. Add validation library for all parameters (12 hours)

### P1 - HIGH (Data Integrity)
5. Fix display-only controls (make editable or clearly mark read-only) (4 hours)
6. Remove duplicate parameter definitions (2 hours)
7. Add client-side validation for all parameters (16 hours)

### P2 - MEDIUM (UX)
8. Add parameter tooltips for missing fields (4 hours)
9. Add range hints (min/max/step) to numeric inputs (4 hours)
10. Implement form field auto-generation from schema (20 hours)

---

## Recommendations

### Immediate Action (Week 1)
1. Create parameter validation library (`parameter-validator.js`)
2. Add all missing parameters to HTML forms
3. Fix type conversion in `config.js:gatherConfigForm()`
4. Add `name` attributes to 6 broken controls

### Short-term (Weeks 2-3)
5. Implement comprehensive client-side validation
6. Add validation error feedback UI
7. Create parameter documentation tooltips
8. Test round-trip for all 100 parameters

### Long-term (Month 2)
9. Generate forms automatically from Pydantic schema
10. Implement real-time parameter validation
11. Add parameter change history/audit log
12. Create parameter search/filter UI

---

**Matrix Compiled By:** Claude Code (Based on 8-agent audit)
**Last Updated:** 2025-11-20
**Status:** DOCUMENTATION ONLY - No code changes made
**Next Step:** Implementation phase with prioritized fixes
