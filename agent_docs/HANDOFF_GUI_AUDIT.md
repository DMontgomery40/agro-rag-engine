# GUI Integration Audit - Handoff Document for Next Claude Code Session

**Date Created:** 2025-11-20
**Previous Session:** Backend implementation of 100 RAG parameters
**Your Mission:** Create detailed audit plan using 5 subagents to document ALL GUI integration failures
**Critical:** DO NOT FIX ANYTHING - Only document, map, and organize failures for the NEXT session to fix

---

## CONTEXT: What Has Been Completed

### Backend Implementation: 100% Complete ✅

The previous session successfully implemented a comprehensive configuration system with **100 tunable RAG parameters** across the entire codebase.

**Test Results:**
- ✅ 101/101 backend tests passing
- ✅ 100 configuration keys validated
- ✅ Full Pydantic type safety
- ✅ Module-level caching in 15+ files
- ✅ Backward compatibility maintained

**Implementation Details:**

1. **Pydantic Models** (`server/models/agro_config_model.py`)
   - 13 configuration classes with full validation
   - Field validators for ranges, enums, cross-field constraints
   - AGRO_CONFIG_KEYS set with all 100 parameter names
   - Bidirectional conversion: to_flat_dict() / from_flat_dict()

2. **Config Registry** (`server/services/config_registry.py`)
   - Thread-safe singleton with RLock
   - Multi-source precedence: .env > agro_config.json > Pydantic defaults
   - Type-safe accessors: get_int(), get_float(), get_bool(), get_str()
   - Hot-reload capability

3. **Configuration File** (`agro_config.json`)
   - 13 sections organized by category
   - All 100 parameters with sensible defaults
   - Nested JSON structure

4. **Module-Level Caching** (15+ files)
   - Import-time configuration loading
   - reload_config() functions for hot-reload
   - Performance optimized

**Files Modified:**
- `server/models/agro_config_model.py` - 13 config classes
- `agro_config.json` - 13 sections with 100 params
- `server/services/config_registry.py` - ConfigRegistry implementation
- `tests/test_agro_config.py` - 101 test methods
- `retrieval/hybrid_search.py` - Module-level caching
- `server/langgraph_app.py` - Module-level caching
- `retrieval/rerank.py` - Module-level caching
- `server/env_model.py` - Module-level caching
- `server/learning_reranker.py` - Module-level caching
- `common/metadata.py` - Module-level caching
- `server/cards_builder.py` - Module-level caching
- `server/services/keywords.py` - Module-level caching
- `server/tracing.py` - Module-level caching
- `server/metrics.py` - Module-level caching
- Plus 5 more files

**Commit:** `18055b3` on `development` branch
- Message: "feat(config): 100 RAG params - backend complete, GUI integration pending"
- ⚠️ "configs and env mapped and tested, gui tie ins not tested yet"

---

## Complete List of 100 Parameters

### Retrieval (15 params)
```
RRF_K_DIV, LANGGRAPH_FINAL_K, MAX_QUERY_REWRITES, FALLBACK_CONFIDENCE,
FINAL_K, EVAL_FINAL_K, CONF_TOP1, CONF_AVG5, CONF_ANY, EVAL_MULTI,
QUERY_EXPANSION_ENABLED, BM25_WEIGHT, VECTOR_WEIGHT, CARD_SEARCH_ENABLED,
MULTI_QUERY_M
```

### Scoring (8 params)
```
CARD_BONUS, FILENAME_BOOST_EXACT, FILENAME_BOOST_PARTIAL,
LAYER_BONUS_GUI, LAYER_BONUS_RETRIEVAL, LAYER_BONUS_INDEXER,
VENDOR_PENALTY, FRESHNESS_BONUS
```

### Embedding (10 params)
```
EMBEDDING_TYPE, EMBEDDING_MODEL, EMBEDDING_DIM, VOYAGE_MODEL,
EMBEDDING_MODEL_LOCAL, EMBEDDING_BATCH_SIZE, EMBEDDING_MAX_TOKENS,
EMBEDDING_CACHE_ENABLED, EMBEDDING_TIMEOUT, EMBEDDING_RETRY_MAX
```

### Reranking (12 params)
```
RERANKER_MODEL, AGRO_RERANKER_ENABLED, AGRO_RERANKER_ALPHA,
AGRO_RERANKER_TOPN, AGRO_RERANKER_BATCH, AGRO_RERANKER_MAXLEN,
AGRO_RERANKER_RELOAD_ON_CHANGE, AGRO_RERANKER_RELOAD_PERIOD_SEC,
COHERE_RERANK_MODEL, VOYAGE_RERANK_MODEL, RERANKER_BACKEND,
RERANKER_TIMEOUT
```

### Generation (10 params)
```
GEN_MODEL, GEN_TEMPERATURE, GEN_MAX_TOKENS, GEN_TOP_P, GEN_TIMEOUT,
GEN_RETRY_MAX, ENRICH_MODEL, ENRICH_BACKEND, ENRICH_DISABLED,
OLLAMA_NUM_CTX
```

### Chunking (8 params)
```
CHUNK_SIZE, CHUNK_OVERLAP, AST_OVERLAP_LINES, MAX_CHUNK_SIZE,
MIN_CHUNK_CHARS, GREEDY_FALLBACK_TARGET, CHUNKING_STRATEGY,
PRESERVE_IMPORTS
```

### Indexing (9 params)
```
QDRANT_URL, COLLECTION_NAME, VECTOR_BACKEND, INDEXING_BATCH_SIZE,
INDEXING_WORKERS, BM25_TOKENIZER, BM25_STEMMER_LANG,
INDEX_EXCLUDED_EXTS, INDEX_MAX_FILE_SIZE_MB
```

### Enrichment (6 params)
```
CARDS_ENRICH_DEFAULT, CARDS_MAX, ENRICH_CODE_CHUNKS, ENRICH_MIN_CHARS,
ENRICH_MAX_CHARS, ENRICH_TIMEOUT
```

### Keywords (5 params)
```
KEYWORDS_MAX_PER_REPO, KEYWORDS_MIN_FREQ, KEYWORDS_BOOST,
KEYWORDS_AUTO_GENERATE, KEYWORDS_REFRESH_HOURS
```

### Tracing (7 params)
```
TRACING_ENABLED, TRACE_SAMPLING_RATE, PROMETHEUS_PORT, METRICS_ENABLED,
ALERT_INCLUDE_RESOLVED, ALERT_WEBHOOK_TIMEOUT, LOG_LEVEL
```

### Training (6 params)
```
RERANKER_TRAIN_EPOCHS, RERANKER_TRAIN_BATCH, RERANKER_TRAIN_LR,
RERANKER_WARMUP_RATIO, TRIPLETS_MIN_COUNT, TRIPLETS_MINE_MODE
```

### UI (4 params)
```
CHAT_STREAMING_ENABLED, CHAT_HISTORY_MAX, EDITOR_PORT,
GRAFANA_DASHBOARD_UID
```

---

## PROBLEM: GUI Integration Incomplete

### Known Issues

**Expectation:** At least **20+ failures** will be discovered during audit

**Categories of Failures:**

1. **Parameters Missing from GUI Entirely**
   - Backend parameter exists
   - No GUI control anywhere
   - User cannot change value visually

2. **Parameters in GUI But Not Wired to Backend**
   - GUI control exists
   - Not connected to POST /api/config
   - Changes don't persist to agro_config.json

3. **Parameters in GUI With Wrong Data Type**
   - GUI shows text input for number
   - Slider for enum value
   - Toggle for float value

4. **Parameters in GUI But Reading from Wrong Source**
   - GUI reads from .env instead of config registry
   - GUI hardcodes default instead of reading from backend
   - GUI shows stale values

5. **API Endpoints Missing Parameters**
   - GET /api/config doesn't return all 100 params
   - POST /api/config doesn't accept all 100 params
   - Config source metadata missing

6. **GUI Placement Issues**
   - Parameter in wrong tab/subtab
   - No logical organization
   - Unclear which setting affects what

---

## YOUR MISSION: Create Audit Plan Using 5 Subagents

**CRITICAL RULES:**
1. ✅ **DO:** Systematically check all 100 parameters
2. ✅ **DO:** Document every failure with extreme detail
3. ✅ **DO:** Map exact files, line numbers, and required changes
4. ✅ **DO:** Organize findings by category and priority
5. ❌ **DO NOT:** Fix any failures - only document them
6. ❌ **DO NOT:** Make any code changes
7. ❌ **DO NOT:** Add placeholders or TODOs

**Why Only Document?**
- The audit phase must be comprehensive and systematic
- Fixing while auditing leads to incomplete discovery
- The NEXT session will fix all documented issues in one coordinated effort
- Proper documentation enables efficient parallel fixing

---

## Audit Strategy: 5 Specialized Subagents

### Subagent 1: Retrieval & Scoring Audit (23 params)
**Parameters:** All retrieval params + all scoring params + layer bonus params
**Responsibility:** Check if these 23 params are accessible and functional in GUI

**Tasks:**
1. Search web/src/components for existing retrieval settings
2. For each of 23 params, verify:
   - [ ] GUI control exists (NumberInput, SliderInput, etc.)
   - [ ] Control is visible in appropriate tab/subtab
   - [ ] Control reads current value from backend
   - [ ] Control updates value via POST /api/config
   - [ ] Tooltip explains what parameter does
   - [ ] Value persists across page reload
3. Document failures in `AUDIT_RETRIEVAL_SCORING.md`

**Expected Output:**
```markdown
# Retrieval & Scoring Audit Results

## Summary
- ✅ Working: X/23 params
- ❌ Failures: Y/23 params

## Detailed Findings

### FINAL_K (Default: 10, Range: 1-100)
- **Status:** ❌ MISSING FROM GUI
- **Expected Location:** RAG tab → Retrieval subtab
- **Backend Status:** ✅ Implemented in agro_config.json
- **Module Caching:** ✅ Cached in hybrid_search.py
- **Required Fix:**
  - File: `web/src/components/RAG/RetrievalSubtab.tsx`
  - Add: NumberInput component
  - Wire to: updateConfig('FINAL_K', value)
  - Tooltip: "Number of results to return from search"

### BM25_WEIGHT (Default: 0.3, Range: 0.0-1.0)
- **Status:** ❌ NOT WIRED TO BACKEND
- **Current Location:** RAG tab → Retrieval subtab → Line 245
- **Issue:** GUI control exists but onChange doesn't call API
- **Backend Status:** ✅ Implemented in agro_config.json
- **Required Fix:**
  - File: `web/src/components/RAG/RetrievalSubtab.tsx:245`
  - Change: Wire onChange to updateConfig('BM25_WEIGHT', value)
  - Missing: POST /api/config call

[... repeat for all 23 params ...]
```

---

### Subagent 2: Embedding, Chunking & Indexing Audit (27 params)
**Parameters:** All embedding + chunking + indexing params
**Responsibility:** Check if these 27 params are accessible and functional in GUI

**Tasks:**
1. Search web/src/components for existing embedding/indexing settings
2. For each of 27 params, verify all 6 checks (same as Subagent 1)
3. Document failures in `AUDIT_EMBEDDING_CHUNKING_INDEXING.md`

**Expected Output:** Same format as Subagent 1

---

### Subagent 3: Reranking, Generation & Enrichment Audit (28 params)
**Parameters:** All reranking + generation + enrichment params
**Responsibility:** Check if these 28 params are accessible and functional in GUI

**Tasks:**
1. Search web/src/components for existing reranker/generation settings
2. For each of 28 params, verify all 6 checks
3. Document failures in `AUDIT_RERANKING_GENERATION_ENRICHMENT.md`

**Expected Output:** Same format as Subagent 1

---

### Subagent 4: Keywords, Tracing, Training & UI Audit (22 params)
**Parameters:** All keywords + tracing + training + ui params
**Responsibility:** Check if these 22 params are accessible and functional in GUI

**Tasks:**
1. Search web/src/components for existing keywords/tracing settings
2. For each of 22 params, verify all 6 checks
3. Document failures in `AUDIT_KEYWORDS_TRACING_TRAINING_UI.md`

**Expected Output:** Same format as Subagent 1

---

### Subagent 5: API & Integration Audit (Cross-Cutting)
**Responsibility:** Check API endpoints, config_store.py integration, and cross-cutting issues

**Tasks:**

1. **API Endpoint Audit:**
   - Check GET /api/config returns all 100 params
   - Check POST /api/config accepts all 100 params
   - Check config sources metadata included
   - Document any missing params in API responses

2. **config_store.py Audit:**
   - Verify get_config() returns all 100 params from agro_config.json
   - Verify set_config() routes updates correctly (agro_config vs .env)
   - Check if AGRO_CONFIG_KEYS is imported and used
   - Verify registry.reload() called after updates

3. **Integration Patterns:**
   - Find existing updateConfig() pattern in GUI code
   - Document how current params wire to backend
   - Identify any broken patterns or anti-patterns
   - Map out required API changes

4. **Priority & Dependency Analysis:**
   - Which failures block others (e.g., API must work before GUI)
   - Which failures are critical vs. nice-to-have
   - Estimate effort for each category of fixes

**Expected Output:**
```markdown
# API & Integration Audit Results

## API Endpoint Analysis

### GET /api/config
- **Status:** ❌ INCOMPLETE
- **Returns:** 45/100 params (55 missing)
- **Missing Categories:** Keywords (5), Training (6), UI (4), partial Embedding (8)
- **Root Cause:** config_store.py get_config() not reading from agro_config.json
- **Required Fix:**
  - File: `server/services/config_store.py`
  - Line: ~50
  - Add: registry = get_config_registry()
  - Add: Merge registry.get_all() into response

### POST /api/config
- **Status:** ❌ INCOMPLETE
- **Accepts:** Unknown (needs testing)
- **Issue:** set_config() may not route new params to agro_config.json
- **Required Fix:** TBD after testing

## config_store.py Integration

### get_config() Function
- **Status:** ❌ NOT USING CONFIG REGISTRY
- **Current:** Only reads from .env via os.environ
- **Missing:** Merge from agro_config.json via registry
- **Required Fix:**
  - Import: from server.services.config_registry import get_config_registry
  - Add: registry = get_config_registry()
  - Add: config.update(registry.get_all())

[... detailed analysis ...]

## Priority Matrix

### Priority 1: API Blockers (Must Fix First)
1. config_store.py not reading agro_config.json
2. GET /api/config missing 55 params
3. POST /api/config routing logic incomplete

### Priority 2: GUI Controls Missing
1. Missing: Embedding params (10)
2. Missing: Chunking params (8)
3. Missing: Training params (6)
[... etc ...]

### Priority 3: GUI Wiring Issues
1. Not wired: BM25_WEIGHT control exists but broken
2. Not wired: RERANKER_ALPHA slider not calling API
[... etc ...]

## Effort Estimates
- API fixes: 2-3 hours
- Missing GUI controls: 8-10 hours
- Wiring existing controls: 3-4 hours
- Testing & verification: 2-3 hours
**Total: 15-20 hours**
```

---

## Audit Execution Plan

### Phase 1: Environment Setup (You do this first)

1. **Verify Backend Still Working:**
   ```bash
   python3 -c "from server.models.agro_config_model import AGRO_CONFIG_KEYS; print(f'Keys: {len(AGRO_CONFIG_KEYS)}')"
   # Expected: Keys: 100

   pytest tests/test_agro_config.py -v
   # Expected: 101 passed
   ```

2. **Start Web Server (if not running):**
   ```bash
   # Terminal 1: Backend
   cd server && uvicorn asgi:app --reload --port 8012

   # Terminal 2: Frontend
   cd web && npm start
   # Should open http://localhost:3000
   ```

3. **Create Audit Directory:**
   ```bash
   mkdir -p agent_docs/gui_audit
   ```

### Phase 2: Launch Subagents 1-4 in Parallel

**Use the Task tool to launch all 4 subagents simultaneously:**

Each subagent receives:
- Complete list of their parameters
- Explicit 6-point checklist per parameter
- Expected output format with examples
- File path patterns to search
- Clear instruction: DOCUMENT ONLY, DO NOT FIX

**Template for each subagent prompt:**
```markdown
# Audit Task: [Category] Parameters

## Your Parameters (X total)
[List all params with defaults and ranges]

## Your Mission
For EACH parameter, check these 6 items:
1. ✅/❌ GUI control exists?
2. ✅/❌ Control visible in correct tab/subtab?
3. ✅/❌ Control reads current value from backend?
4. ✅/❌ Control updates via POST /api/config?
5. ✅/❌ Tooltip explains parameter?
6. ✅/❌ Value persists across page reload?

## How to Check

### Step 1: Find Existing GUI Code
```bash
find web/src/components -name "*.tsx" | xargs grep -l "PARAM_NAME"
```

### Step 2: Read Component File
If found, read the file and verify all 6 checks.
If not found, mark as ❌ MISSING FROM GUI.

### Step 3: Test in Browser (if control exists)
- Navigate to http://localhost:3000
- Find the control
- Change value
- Save
- Reload page
- Verify value persists

### Step 4: Document Findings
Use the template format provided.

## CRITICAL RULES
- ❌ DO NOT fix anything
- ❌ DO NOT add code
- ❌ DO NOT make changes
- ✅ ONLY document what you find
- ✅ Include file paths and line numbers
- ✅ Describe exactly what's needed to fix

## Output File
Save to: `agent_docs/gui_audit/AUDIT_[CATEGORY].md`
```

### Phase 3: Launch Subagent 5 (API Audit)

This runs after 1-4 complete or in parallel. Focuses on API endpoints and integration points.

### Phase 4: Consolidation (You do this)

After all 5 subagents complete:

1. **Compile Master Audit Report:**
   ```bash
   cat agent_docs/gui_audit/AUDIT_*.md > agent_docs/gui_audit/MASTER_AUDIT.md
   ```

2. **Create Summary Statistics:**
   - Total params audited: 100
   - Working perfectly: X
   - Missing from GUI: Y
   - In GUI but not wired: Z
   - Other issues: W

3. **Prioritize Fixes:**
   - Priority 1 (API blockers): List
   - Priority 2 (Missing controls): List
   - Priority 3 (Wiring issues): List
   - Priority 4 (Polish): List

4. **Create Fix Manifest:**
   - Organize all required fixes by file
   - Group similar changes together
   - Estimate effort per file

---

## Expected Findings (Rough Estimates)

Based on preliminary knowledge:

### Likely Missing from GUI (15-20 params)
- Most/all Embedding params (10)
- Most/all Chunking params (8)
- Most/all Keywords params (5)
- Most/all Training params (6)
- Some UI params (2-3)

### Likely In GUI But Not Wired (10-15 params)
- Some Retrieval params exist but not wired
- Some Reranking params exist but not wired
- Some Generation params hardcoded

### Likely API Issues
- config_store.py not reading from ConfigRegistry
- GET /api/config not returning agro_config.json params
- POST /api/config not routing to agro_config.json

### Total Expected Failures: 25-35 items

---

## Success Criteria for This Session

**You have succeeded when:**

1. ✅ All 5 subagent audit reports complete
2. ✅ Master audit document compiled
3. ✅ Every failure documented with:
   - Exact file path and line number
   - Current state description
   - Expected state description
   - Specific changes required to fix
4. ✅ Priority matrix created
5. ✅ Effort estimates provided
6. ✅ Fix manifest organized by file
7. ✅ NO CODE CHANGES MADE (only documentation)

**Deliverables:**
- `agent_docs/gui_audit/AUDIT_RETRIEVAL_SCORING.md`
- `agent_docs/gui_audit/AUDIT_EMBEDDING_CHUNKING_INDEXING.md`
- `agent_docs/gui_audit/AUDIT_RERANKING_GENERATION_ENRICHMENT.md`
- `agent_docs/gui_audit/AUDIT_KEYWORDS_TRACING_TRAINING_UI.md`
- `agent_docs/gui_audit/AUDIT_API_INTEGRATION.md`
- `agent_docs/gui_audit/MASTER_AUDIT.md`
- `agent_docs/gui_audit/FIX_MANIFEST.md`

---

## What Happens Next (Session After Yours)

The next Claude Code session will:

1. Read your complete audit documentation
2. Use your fix manifest to coordinate repairs
3. Launch subagents to fix issues in parallel
4. Each subagent works on a specific file or category
5. All fixes verified with Playwright tests
6. Full ADA compliance achieved

**Your documentation is critical for their success.**

Without detailed mapping, they'll waste time rediscovering issues. With your documentation, they can fix everything efficiently in one coordinated effort.

---

## Important Notes & Constraints

### From CLAUDE.md (Project Rules)

1. **ADA Compliance Requirement:**
   - All 100 parameters MUST be in GUI
   - User is dyslexic and needs visual access
   - This is a legal/contractual requirement
   - NO command-line only parameters allowed

2. **No Stubs or Placeholders:**
   - When fixes happen, must be fully functional
   - No "coming soon" features
   - No fake controls that don't work

3. **Verification Required:**
   - When fixes happen, must verify with Playwright
   - Backend-only changes need smoke tests
   - GUI changes need visual verification

4. **Architecture Audit Updates:**
   - Update `___ARCHITECTURE_COMPLETE_AUDIT___.md` with findings
   - Document coordination between sessions

### Technical Constraints

1. **Don't Break Working Code:**
   - Backend is 100% complete and tested
   - Don't suggest changes to working backend
   - Focus only on GUI ↔ Backend integration

2. **Follow Existing Patterns:**
   - Study how current params wire to backend
   - Copy proven patterns, don't invent new ones
   - Maintain consistency across all 100 params

3. **API Design:**
   - All params go through `/api/config` endpoint
   - Updates must persist to `agro_config.json`
   - Registry must reload after updates

---

## Quick Start Guide

When you begin this session:

1. **Read this document completely** (you're doing it now ✓)

2. **Verify backend is working:**
   ```bash
   pytest tests/test_agro_config.py -v
   ```

3. **Start web server if needed:**
   ```bash
   cd server && uvicorn asgi:app --reload --port 8012 &
   cd web && npm start &
   ```

4. **Create your plan:**
   - Outline how you'll coordinate 5 subagents
   - Define exact prompts for each
   - Specify output format and location
   - Ensure comprehensive coverage of all 100 params

5. **Launch subagents in parallel:**
   - Use Task tool with multiple calls
   - Each subagent gets their param list
   - Each works independently on their category
   - All save to `agent_docs/gui_audit/`

6. **Wait for completion:**
   - Each subagent returns their full audit
   - Compile into master document
   - Create fix manifest

7. **Final reporting:**
   - Summary statistics
   - Priority matrix
   - Effort estimates
   - Ready for next session to fix

---

## Questions to Answer During Your Audit

1. **How many parameters are completely missing from GUI?**
2. **How many parameters exist in GUI but aren't wired?**
3. **What API changes are needed first before GUI work can succeed?**
4. **Which files need the most changes?**
5. **What's the estimated total effort to achieve 100% ADA compliance?**
6. **Are there any architectural blockers we didn't anticipate?**
7. **What's the best order to fix issues (dependencies)?**

---

## Final Reminder

**This session is AUDIT ONLY.**

Your job is to be a systematic, thorough detective who documents everything they find. The next session will be the repair crew who fixes everything based on your documentation.

Quality documentation = efficient fixing.
Poor documentation = wasted time rediscovering issues.

**Be thorough. Be detailed. Be specific.**

Good luck! 🔍

---

## Appendix: File Locations Reference

### Backend Files (Already Complete)
- `server/models/agro_config_model.py` - All Pydantic models
- `agro_config.json` - All 100 parameters with defaults
- `server/services/config_registry.py` - ConfigRegistry implementation
- `server/services/config_store.py` - API integration layer ⚠️ NEEDS AUDIT
- `tests/test_agro_config.py` - Backend tests (all passing)

### Frontend Files (Need Audit)
- `web/src/components/RAG/*.tsx` - RAG tab subtabs
- `web/src/components/Admin/*.tsx` - Admin tab
- `web/src/components/Chat/*.tsx` - Chat settings
- `web/src/components/Dashboard/*.tsx` - Dashboard panels
- `web/src/api/*.ts` - API client code

### API Files (Need Audit)
- `server/routers/search.py` - Search endpoints
- `server/services/config_store.py` - Config API logic ⚠️ CRITICAL
- `server/services/rag.py` - RAG service using configs

### Documentation Files
- `agent_docs/___ARCHITECTURE_COMPLETE_AUDIT___.md` - Master architecture doc
- `agent_docs/bug-resolution.md` - Common bugs and fixes
- `CLAUDE.md` - Project rules and requirements

---

**END OF HANDOFF DOCUMENT**

Copy this entire document and use it as your prompt when you start the next Claude Code session. Everything you need to know is here.
