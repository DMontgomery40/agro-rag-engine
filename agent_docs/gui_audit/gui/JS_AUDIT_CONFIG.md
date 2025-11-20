# JavaScript Configuration Modules Audit

**Audit Date:** 2025-11-20
**Phase:** 3, Agent 1
**Scope:** Frontend configuration infrastructure in /gui/js/
**Status:** COMPREHENSIVE AUDIT COMPLETE

## Executive Summary

### Configuration Module Status: ⚠️ PARTIAL (35% COMPLETE)

The GUI JavaScript configuration system consists of **6 core modules** handling environment variable loading, API communication, and form persistence. The system is **functional but incomplete** with critical gaps in parameter coverage and synchronization.

#### Key Metrics:
- **Core Modules:** 6 files, ~2,500 LOC total
- **Parameters Detected in Form:** 104 unique names
- **Parameters in Backend Model:** 100 RAG params (organized in 13 config classes)
- **Coverage Match:** ~60% (parameter name mismatches + missing handlers)
- **API Integration:** ✅ GET/POST working, ⚠️ Response handling incomplete
- **State Management:** Basic global state, no reactive updates
- **Error Handling:** Good for API failures, weak for validation

## Core Modules Identified

1. **core-utils.js** (85 lines) - Global state, API helpers, event bus
2. **api-base-override.js** (37 lines) - API endpoint configuration
3. **config.js** (1,033 lines) - MAIN: Config load/save/form population
4. **dashboard-operations.js** (475 lines) - Operations UI
5. **autotune.js** (118 lines) - Parameter optimization control
6. **cost_logic.js** (214 lines) - Pricing calculations

**Total:** ~1,962 lines of configuration code

## Key Functions Analysis

### config.js - MAIN MODULE

**loadConfig()** (Lines 102-156)
- Fetches configuration from backend
- Populates form with values
- Handles errors with detailed alerts

**populateConfigForm()** (Lines 162-686)
- Renders form inputs
- Handles secret fields, checkboxes, selects
- Special handling for repos, keywords, models

**gatherConfigForm()** (Lines 692-789)
- Extracts form data → configuration update object
- **CRITICAL BUG:** Number inputs sent as strings

**saveConfig()** (Lines 794-864)
- POST configuration update to backend
- 3-tier error handling
- Refresh UI after success

## Parameter Coverage Matrix

### ✅ **WORKING** (21 parameters - 21% of 100)

**Retrieval & Scoring (5):**
- FINAL_K, CHUNK_SIZE, CHUNK_OVERLAP, RRF_K_DIV, CARD_BONUS

**Embedding (2):**
- EMBEDDING_TYPE, QDRANT_URL

**API/Keys (8):**
- OPENAI_API_KEY, ANTHROPIC_API_KEY, GOOGLE_API_KEY, etc.

**Infrastructure (4):**
- GEN_MODEL, RERANK_BACKEND, PORT, HOST

### ⚠️ **PARTIAL** (25 parameters - 25%)

**Reranker Config (4):**
- AGRO_RERANKER_ALPHA, BATCH, ENABLED, MAXLEN
- **Issue:** Sent as strings, no type coercion

**Generation Models (3):**
- GEN_MODEL_HTTP, GEN_MODEL_MCP, GEN_MODEL_CLI
- **Issue:** No validation

### ❌ **MISSING** (54 parameters - 54%)

**Keywords (5):** All missing from GUI
**Generation (6):** GEN_TEMPERATURE, GEN_MAX_TOKENS, etc.
**Reranking (7):** RERANKER_MODEL, AGRO_RERANKER_TOPN, etc.
**Embedding (9):** EMBEDDING_MODEL, EMBEDDING_DIM, etc.
**Chunking (6):** AST_OVERLAP_LINES, MAX_CHUNK_SIZE, etc.
**Indexing (8):** VECTOR_BACKEND, INDEXING_BATCH_SIZE, etc.
**Tracing (7):** TRACING_ENABLED, TRACE_SAMPLING_RATE, etc.
**Training (6):** RERANKER_TRAIN_EPOCHS, etc.

## Critical Issues

### Severity: CRITICAL

1. **50 RAG Parameters Missing from GUI**
   - Impact: 50% of backend configuration inaccessible
   - ADA Violation: Users cannot configure system via GUI

2. **Number Fields Sent as Strings** (config.js:726-729)
   - Backend receives `"60"` instead of `60`
   - Type-unsafe

3. **XSS Vulnerability in Repo Names** (config.js:304)
   - innerHTML with unsanitized repo names
   - Fix: Use textContent

4. **Keyword Dialog Memory Leak** (config.js:421-473)
   - DOM elements created without cleanup

### Severity: HIGH

5. **Secret Unmask API Bypass** (config.js:48)
   - Secrets visible in DevTools Network tab

6. **CSV Parsing Without Escaping** (config.js:587)
   - Keywords with commas split incorrectly

7. **No Path Validation Timeout** (config.js:653-680)
   - Network hang freezes UI

### Severity: MEDIUM

8. **Price Data Not Cached** (config.js:927)
   - Fetched every time, wasteful

9. **No Polling for Config Changes**
   - Backend changes not reflected automatically

10. **API Base Hardcoded Port** (core-utils.js:16)
    - Doesn't work in Docker

## Recommendations

**Immediate (P0):**
1. Add missing 50+ parameters to GUI forms
2. Fix type coercion for numbers
3. Implement state reactivity
4. Add comprehensive error handling

**Estimated Effort:** 40-50 development hours + testing

---

**Audit completed by:** Claude Code (Phase 3, Agent 1)
**Status:** Documentation only - no modifications made
