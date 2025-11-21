# MASTER GUI AUDIT REPORT
## 100 RAG Parameters - Complete Integration Analysis

**Audit Date:** 2025-11-20
**Audit Scope:** All 100 configuration parameters across 11 categories
**Backend Commit:** 18055b3 (feat(config): 100 RAG params - backend complete, GUI integration pending)
**Branch:** development

---

## EXECUTIVE SUMMARY

### Backend Status: ✅ 100% COMPLETE

- **Pydantic Models:** All 100 parameters with full validation
- **Config Registry:** Thread-safe singleton with multi-source precedence
- **API Endpoints:** GET/POST /api/config fully functional
- **Persistence:** agro_config.json with 13 organized sections
- **Module Caching:** 15+ files with reload capability
- **Tests:** 101/101 passing

### Frontend Status: ❌ 15% COMPLETE (CRITICAL ADA VIOLATION)

- **Working Perfectly:** 15 parameters (15%)
- **Missing from GUI:** 70 parameters (70%)
- **In GUI But Not Wired:** 13 parameters (13%)
- **Wrong Type/Other Issues:** 2 parameters (2%)

### Critical Findings

1. **ADA Compliance Failure:** 85% of parameters inaccessible via GUI
2. **Parameter Name Mismatches:** Several controls use wrong backend keys
3. **Schema Conflicts:** 6 scoring parameters have 10x value mismatches
4. **Broken Controls:** Multiple inputs rendered but non-functional
5. **API Integration:** Backend complete, but GUI wiring incomplete

---

## AUDIT RESULTS BY CATEGORY

### 1. Retrieval & Scoring (23 params)

**Status:**
- ✅ Working: 2 (9%)
- ❌ Missing: 19 (83%)
- ⚠️ Issues: 2 (9%)

**Critical Issues:**
- MAX_QUERY_REWRITES: Wrong name in GUI (MQ_REWRITES vs MAX_QUERY_REWRITES)
- Scoring params: 6 parameters have schema conflicts (backend vs spec mismatch)
- BM25_WEIGHT, VECTOR_WEIGHT: Missing from GUI entirely

**Files Affected:**
- `web/src/components/RAG/RetrievalSubtab.tsx`

**Estimated Fix Effort:** 24-32 hours

---

### 2. Embedding, Chunking & Indexing (27 params)

**Status:**
- ✅ Working: 2 (7%)
- ❌ Missing: 20 (74%)
- ⚠️ Not Wired: 5 (19%)

**Critical Issues:**
- CHUNK_SIZE, CHUNK_OVERLAP: Exist but no onChange handlers
- INDEXING_WORKERS: Wrong param name (INDEX_MAX_WORKERS vs INDEXING_WORKERS)
- EMBEDDING_DIM: GUI reads wrong key (EMBEDDING_DIMENSIONS vs EMBEDDING_DIM)
- COLLECTION_NAME: Duplicate controls in 2 locations

**Files Affected:**
- `web/src/components/RAG/IndexingSubtab.tsx`
- `web/src/components/Infrastructure/PathsSubtab.tsx`
- `web/src/components/Dashboard/EmbeddingConfigPanel.tsx`

**Estimated Fix Effort:** 20-24 hours

---

### 3. Reranking, Generation & Enrichment (28 params)

**Status:**
- ✅ Working: 6 (21%)
- ❌ Missing: 17 (61%)
- ⚠️ Not Wired: 3 (11%)
- ❌ Wrong Type: 2 (7%)

**Critical Issues:**
- AGRO reranker params: 5 controls exist but don't persist to backend
- RERANKER_BACKEND: Missing "agro" option from enum
- CARDS_MAX: Wrong range, not wired
- Generation params: Only 2 of 10 exposed in GUI

**Files Affected:**
- `web/src/components/RAG/LearningRankerSubtab.tsx`
- `web/src/components/RAG/ExternalRerankersSubtab.tsx`
- `web/src/components/RAG/DataQualitySubtab.tsx`
- `web/src/components/RAG/RetrievalSubtab.tsx`

**Estimated Fix Effort:** 17.5 hours

---

### 4. Keywords, Tracing, Training & UI (22 params)

**Status:**
- ✅ Working: 2 (9%)
- ❌ Missing: 18 (82%)
- ⚠️ Not Wired: 2 (9%)

**Critical Issues:**
- Keywords: All 5 params missing from GUI
- Tracing: All 7 params missing from GUI
- Training: 2 params exist but don't persist
- TRIPLETS_MINE_MODE: Backend/spec enum mismatch

**Files Affected:**
- `web/src/components/RAG/LearningRankerSubtab.tsx`
- `web/src/components/Infrastructure/MonitoringSubtab.tsx`
- `web/src/components/Chat/ChatSettings.tsx`
- `web/src/components/Grafana/GrafanaConfig.tsx`

**Estimated Fix Effort:** 14-16 hours

---

### 5. API & Integration (Cross-Cutting)

**Status:** ✅ Backend COMPLETE, Frontend PARTIAL

**Backend Analysis:**
- ✅ GET /api/config: Returns all 100 params
- ✅ POST /api/config: Accepts all 100 params, routes correctly
- ✅ ConfigRegistry: Merges agro_config.json + .env properly
- ⚠️ config_schema(): Only includes ~20 params, needs all 100

**Frontend Issues:**
- No unified updateConfig() utility
- Inconsistent patterns (legacy JS + React + component-local)
- Boolean conversion bugs ('1'/'0' vs 'true'/'false')
- State polling inefficiency (500ms intervals)

**Estimated Fix Effort:** 30 hours (infrastructure + all controls)

---

## COMPREHENSIVE STATISTICS

### Overall Coverage

| Metric | Count | Percentage |
|--------|-------|------------|
| **Total Parameters** | 100 | 100% |
| **Backend Complete** | 100 | 100% ✅ |
| **GUI Working** | 15 | 15% ❌ |
| **GUI Missing** | 70 | 70% ❌ |
| **GUI Not Wired** | 13 | 13% ⚠️ |
| **GUI Wrong Type** | 2 | 2% ⚠️ |

### By Category

| Category | Total | Working | Missing | Not Wired | Issues |
|----------|-------|---------|---------|-----------|--------|
| Retrieval | 15 | 2 (13%) | 12 (80%) | 0 | 1 (7%) |
| Scoring | 8 | 0 (0%) | 7 (88%) | 0 | 1 (13%) |
| Embedding | 10 | 1 (10%) | 8 (80%) | 1 (10%) | 0 |
| Chunking | 8 | 0 (0%) | 6 (75%) | 2 (25%) | 0 |
| Indexing | 9 | 2 (22%) | 5 (56%) | 2 (22%) | 0 |
| Reranking | 12 | 3 (25%) | 4 (33%) | 4 (33%) | 1 (8%) |
| Generation | 10 | 3 (30%) | 6 (60%) | 0 | 1 (10%) |
| Enrichment | 6 | 0 (0%) | 5 (83%) | 1 (17%) | 0 |
| Keywords | 5 | 0 (0%) | 5 (100%) | 0 | 0 |
| Tracing | 7 | 0 (0%) | 7 (100%) | 0 | 0 |
| Training | 6 | 1 (17%) | 3 (50%) | 2 (33%) | 0 |
| UI | 4 | 3 (75%) | 1 (25%) | 0 | 0 |

### Top Issues by Priority

**P0: Schema Conflicts (6 params)**
- CARD_BONUS, LAYER_BONUS_*, VENDOR_PENALTY, FRESHNESS_BONUS
- Backend vs spec: 10x value differences
- **Must resolve before GUI implementation**

**P1: Critical Broken Controls (8 params)**
- Exist in GUI but completely non-functional
- Users think they work but changes vanish on reload
- **Immediate data integrity risk**

**P2: Name Mismatches (4 params)**
- GUI uses wrong backend keys
- Silently failing, no error messages
- **Immediate fix required**

**P3: Missing Categories (29 params)**
- Keywords (5), Tracing (7), Chunking (6), Embedding (8), Enrichment (3)
- **Essential for ADA compliance**

---

## PRIORITY MATRIX

### Priority 0: Schema Resolution (BLOCKER)

**Must resolve before any GUI work:**

1. **Scoring Parameters Schema Conflict**
   - Issue: Backend uses additive bonuses (0.0-0.5), spec uses multipliers (1.0-3.0)
   - Affected: CARD_BONUS, LAYER_BONUS_*, VENDOR_PENALTY, FRESHNESS_BONUS (6 params)
   - Decision needed: Which is correct?
   - Effort: 2-4 hours (analysis + fix)

2. **TRIPLETS_MINE_MODE Enum Mismatch**
   - Backend: ["replace", "append"]
   - Spec: ["hard", "semi-hard", "easy"]
   - Decision needed: Which is correct?
   - Effort: 1 hour

**Total P0 Effort:** 3-5 hours

---

### Priority 1: Fix Existing Broken Controls (8 params)

**Data integrity issues - fix immediately:**

1. CHUNK_SIZE, CHUNK_OVERLAP (IndexingSubtab)
   - Inputs exist, no onChange
   - File: `web/src/components/RAG/IndexingSubtab.tsx:509-528`
   - Effort: 1 hour

2. MAX_QUERY_REWRITES (RetrievalSubtab)
   - Wrong name: MQ_REWRITES vs MAX_QUERY_REWRITES
   - File: `web/src/components/RAG/RetrievalSubtab.tsx:243-265`
   - Effort: 30 min

3. INDEXING_WORKERS (IndexingSubtab)
   - Wrong name: INDEX_MAX_WORKERS vs INDEXING_WORKERS
   - File: `web/src/components/RAG/IndexingSubtab.tsx:534`
   - Effort: 30 min

4. AGRO Reranker Params (5 params in LearningRankerSubtab)
   - AGRO_RERANKER_ENABLED, ALPHA, BATCH, MAXLEN, all read but don't persist
   - File: `web/src/components/RAG/LearningRankerSubtab.tsx:480-601`
   - Effort: 2 hours

5. CARDS_MAX (DataQualitySubtab)
   - Wrong range + not wired
   - File: `web/src/components/RAG/DataQualitySubtab.tsx:230-242`
   - Effort: 30 min

6. RERANKER_TRAIN_EPOCHS, RERANKER_TRAIN_BATCH
   - Exist but don't persist to config
   - File: `web/src/components/RAG/LearningRankerSubtab.tsx:37-38`
   - Effort: 1 hour

**Total P1 Effort:** 6-7 hours

---

### Priority 2: Critical Missing Infrastructure

**Required before adding new controls:**

1. **Fix config_schema()**
   - Include all 100 params, not just 20
   - Generate from Pydantic models
   - File: `server/services/config_store.py:435-599`
   - Effort: 2 hours

2. **Create Unified updateConfig() Utility**
   - Eliminate pattern inconsistencies
   - File: `web/src/utils/configHelpers.ts` (new)
   - Effort: 2 hours

3. **Fix Key Mismatches**
   - EMBEDDING_DIM: GUI reads EMBEDDING_DIMENSIONS
   - COLLECTION_NAME: Duplicate controls
   - VECTOR_BACKEND: Should be SelectInput not TextInput
   - Effort: 2 hours

**Total P2 Effort:** 6 hours

---

### Priority 3: Add Missing Controls (70 params)

**Organized by category for efficient implementation:**

| Category | Missing | Location | Effort |
|----------|---------|----------|--------|
| **Retrieval** | 12 params | RetrievalSubtab.tsx | 6 hours |
| **Scoring** | 7 params | RetrievalSubtab.tsx | 4 hours |
| **Embedding** | 8 params | New EmbeddingSubtab.tsx | 4 hours |
| **Chunking** | 6 params | IndexingSubtab.tsx | 3 hours |
| **Indexing** | 5 params | IndexingSubtab.tsx | 3 hours |
| **Reranking** | 4 params | ExternalRerankersSubtab.tsx | 2 hours |
| **Generation** | 6 params | RetrievalSubtab.tsx | 3 hours |
| **Enrichment** | 5 params | DataQualitySubtab.tsx | 3 hours |
| **Keywords** | 5 params | New KeywordsSubtab.tsx | 3 hours |
| **Tracing** | 7 params | MonitoringSubtab.tsx | 4 hours |
| **Training** | 3 params | LearningRankerSubtab.tsx | 2 hours |

**Total P3 Effort:** 37 hours

---

### Priority 4: Polish & Testing

1. Add tooltips (from Pydantic descriptions): 3 hours
2. Playwright tests for all categories: 4 hours
3. Fix boolean conversion bugs: 1 hour
4. Remove legacy module dependencies: 2 hours
5. Replace polling with event-driven updates: 2 hours

**Total P4 Effort:** 12 hours

---

## TOTAL ESTIMATED EFFORT

| Priority | Description | Effort |
|----------|-------------|--------|
| **P0** | Schema Resolution | 3-5 hours |
| **P1** | Fix Broken Controls | 6-7 hours |
| **P2** | Infrastructure | 6 hours |
| **P3** | Missing Controls | 37 hours |
| **P4** | Polish & Testing | 12 hours |
| **TOTAL** | | **64-67 hours** |

**Timeline:** ~8-9 days of focused work, or 2-3 weeks with other tasks

---

## DEPENDENCY GRAPH

```
START
  ↓
P0: Resolve Schema Conflicts (3-5 hrs)
  ↓
P1: Fix Broken Controls (6-7 hrs) ←── Can parallelize with P2
P2: Infrastructure (6 hrs)           ←── Can parallelize with P1
  ↓
P3: Add Missing Controls (37 hrs)
  ├─→ Retrieval + Scoring (10 hrs) ←┐
  ├─→ Embedding + Chunking (7 hrs) ←┤ Can parallelize
  ├─→ Indexing + Reranking (5 hrs) ←┤ within P3
  ├─→ Generation + Enrichment (6 hrs) ←┤
  └─→ Keywords + Tracing + Training (9 hrs) ←┘
  ↓
P4: Polish & Testing (12 hrs)
  ↓
COMPLETE: 100% GUI Coverage + ADA Compliance
```

---

## RECOMMENDED IMPLEMENTATION PHASES

### Phase 1: Foundation (2 days, 15-18 hours)

**Goals:** Resolve blockers, fix broken controls, establish patterns

**Tasks:**
1. Resolve 6 schema conflicts with backend team
2. Fix TRIPLETS_MINE_MODE enum mismatch
3. Wire 8 existing broken controls
4. Fix 4 parameter name mismatches
5. Create unified updateConfig() utility
6. Fix config_schema() to include all 100 params

**Deliverable:** All existing controls work correctly, patterns established

---

### Phase 2: Core Parameters (3 days, 24 hours)

**Goals:** Add most impactful missing controls

**Tasks:**
1. Add Retrieval controls (12 params): RRF_K_DIV, confidence thresholds, etc.
2. Add Scoring controls (7 params): Bonuses, boosts, penalties
3. Add Embedding controls (8 params): Models, batching, timeouts
4. Add Chunking controls (6 params): Strategies, sizes, overlaps
5. Add Indexing controls (5 params): Workers, tokenizers, exclusions

**Deliverable:** 38 new controls, 53% GUI coverage achieved

---

### Phase 3: Specialized Parameters (3 days, 24 hours)

**Goals:** Complete category coverage

**Tasks:**
1. Add Reranking controls (4 params): Timeouts, models
2. Add Generation controls (6 params): Tokens, top-p, retries
3. Add Enrichment controls (5 params): Thresholds, defaults
4. Add Keywords controls (5 params): All keyword tuning
5. Add Tracing controls (7 params): Monitoring, sampling
6. Add Training controls (3 params): LR, warmup, triplets

**Deliverable:** All 100 params in GUI, 100% coverage

---

### Phase 4: Polish & Verification (2 days, 12 hours)

**Goals:** Production readiness, ADA compliance verification

**Tasks:**
1. Add tooltips from Pydantic descriptions
2. Create Playwright tests for each category
3. Fix boolean conversion bugs
4. Remove legacy module dependencies
5. Replace polling with event-driven updates
6. Full E2E testing
7. Documentation updates

**Deliverable:** Production-ready, ADA-compliant, fully tested

---

## ADA COMPLIANCE STATUS

### Current State: ❌ MAJOR VIOLATION

**Inaccessible Parameters:** 85% (85 of 100)

**Impact:**
- Users with dyslexia cannot edit config files easily
- Motor impairments make CLI editing difficult
- Cognitive disabilities need visual GUI feedback
- **Legal Risk:** Contract violation per CLAUDE.md

### Path to Compliance

| Phase | Completion | GUI Coverage | Compliance Level |
|-------|------------|--------------|------------------|
| Current | - | 15% | ❌ Non-compliant |
| Phase 1 | 15-18 hrs | 23% | ❌ Still non-compliant |
| Phase 2 | +24 hrs | 53% | ⚠️ Partial |
| Phase 3 | +24 hrs | 100% | ✅ **FULLY COMPLIANT** |
| Phase 4 | +12 hrs | 100% | ✅ Verified + tested |

**Recommendation:** Complete Phases 1-3 minimum for ADA compliance

---

## KEY FINDINGS & RECOMMENDATIONS

### What Went Right (Backend)

✅ **Excellent Architecture:**
- Clean Pydantic models with full validation
- Thread-safe ConfigRegistry with proper precedence
- Multi-source config (agro_config.json + .env)
- Comprehensive test coverage (101 tests passing)
- Module-level caching with hot-reload

✅ **API Design:**
- RESTful endpoints work correctly
- Proper routing (AGRO keys → JSON, others → .env)
- Config source metadata for debugging
- Atomic writes prevent corruption

### What Needs Improvement (Frontend)

❌ **Pattern Inconsistency:**
- 3 different update patterns (legacy JS, React, component-local)
- No unified utility function
- Boolean conversion bugs
- State polling inefficiency

❌ **Incomplete Integration:**
- 70 params have no GUI controls
- 13 params have controls but don't persist
- 4 params use wrong backend keys
- 6 params have schema conflicts

### Critical Recommendations

1. **IMMEDIATE (P0):** Resolve 6 schema conflicts before any GUI work
   - Get backend team to confirm correct values/ranges
   - Update either backend or spec to match
   - Document decision

2. **URGENT (P1):** Fix 8 broken existing controls
   - Users think they work but data doesn't persist
   - Data integrity risk
   - Simple fixes (add onChange handlers)

3. **HIGH PRIORITY (P2):** Establish infrastructure
   - Create unified updateConfig() utility
   - Fix config_schema() for auto-generation
   - Standardize patterns before scaling

4. **ESSENTIAL (P3):** Add remaining 70 controls
   - Work category by category
   - Test each category before moving on
   - Use Playwright for regression prevention

5. **POLISH (P4):** Production readiness
   - Add tooltips for accessibility
   - Comprehensive E2E testing
   - Remove technical debt

### Success Metrics

**Definition of Done:**
- [ ] All 100 parameters have GUI controls
- [ ] All controls load current values from backend
- [ ] All controls persist changes via API
- [ ] All controls have descriptive tooltips
- [ ] Playwright tests pass for all categories
- [ ] No parameter name mismatches
- [ ] No schema conflicts
- [ ] Boolean values always use '1'/'0'
- [ ] 100% ADA compliance achieved

---

## FILES REQUIRING CHANGES

### Backend (Minimal Changes)

1. **`server/services/config_store.py`**
   - Fix config_schema() to include all 100 params
   - Effort: 2 hours

2. **`server/models/agro_config_model.py`** (if needed)
   - Fix TRIPLETS_MINE_MODE enum
   - Fix scoring parameter ranges (if spec is wrong)
   - Effort: 1 hour

### Frontend (Major Changes)

**Existing Components to Modify:**

1. **`web/src/components/RAG/RetrievalSubtab.tsx`**
   - Add: 12 retrieval params + 7 scoring params + 6 generation params
   - Fix: MAX_QUERY_REWRITES name
   - Effort: 10 hours

2. **`web/src/components/RAG/IndexingSubtab.tsx`**
   - Wire: CHUNK_SIZE, CHUNK_OVERLAP
   - Fix: INDEXING_WORKERS name
   - Add: 6 chunking params + 5 indexing params
   - Effort: 6 hours

3. **`web/src/components/RAG/LearningRankerSubtab.tsx`**
   - Wire: 5 AGRO reranker params + 2 training params
   - Add: 3 training params
   - Effort: 4 hours

4. **`web/src/components/RAG/ExternalRerankersSubtab.tsx`**
   - Wire: RERANKER_MODEL, COHERE_RERANK_MODEL
   - Fix: RERANKER_BACKEND enum (add "agro")
   - Add: 4 reranking params
   - Effort: 3 hours

5. **`web/src/components/RAG/DataQualitySubtab.tsx`**
   - Fix: CARDS_MAX range + wiring
   - Add: 5 enrichment params
   - Effort: 3 hours

6. **`web/src/components/Dashboard/EmbeddingConfigPanel.tsx`**
   - Fix: EMBEDDING_DIM key name
   - Add: 8 embedding params
   - Effort: 4 hours

7. **`web/src/components/Infrastructure/PathsSubtab.tsx`**
   - Fix: COLLECTION_NAME duplication
   - Effort: 30 min

8. **`web/src/components/Infrastructure/MonitoringSubtab.tsx`**
   - Add: All 7 tracing params
   - Effort: 4 hours

**New Components to Create:**

9. **`web/src/utils/configHelpers.ts`** (new)
   - Create unified updateConfig() utility
   - Effort: 2 hours

10. **`web/src/components/Admin/KeywordsSubtab.tsx`** (optional, could add to existing)
    - Add: All 5 keywords params
    - Effort: 3 hours

**Testing:**

11. **`tests/playwright/test_config_persistence.spec.ts`**
    - Test all 100 parameters
    - Effort: 4 hours

---

## NEXT STEPS

### For This Session (Audit Complete)

✅ **Completed:**
1. All 5 subagent audits complete
2. Master audit compiled
3. Statistics generated
4. Priority matrix created
5. Fix manifest organized

📝 **Deliverables:**
- `agent_docs/gui_audit/AUDIT_RETRIEVAL_SCORING.md`
- `agent_docs/gui_audit/AUDIT_EMBEDDING_CHUNKING_INDEXING.md`
- `agent_docs/gui_audit/AUDIT_RERANKING_GENERATION_ENRICHMENT.md`
- `agent_docs/gui_audit/AUDIT_KEYWORDS_TRACING_TRAINING_UI.md`
- `agent_docs/gui_audit/AUDIT_API_INTEGRATION.md`
- `agent_docs/gui_audit/MASTER_AUDIT.md` (this file)
- `agent_docs/gui_audit/FIX_MANIFEST.md` (next)

### For Next Session (Implementation)

**Before Starting:**
1. Review and approve this audit with user
2. Get backend team to resolve 6 schema conflicts
3. Decide on TRIPLETS_MINE_MODE correct enum

**Session Plan:**
1. Start with Phase 1 (Foundation)
2. Fix all P0 + P1 issues first
3. Establish infrastructure (P2)
4. Then proceed with P3 in category batches

**Success Criteria:**
- Each fix verified with Playwright before moving on
- No regressions in existing working controls
- All changes documented in bug-resolution.md after user confirms

---

## APPENDIX: DETAILED FINDINGS

Full detailed findings with file locations, line numbers, code snippets, and exact fix instructions are available in the individual category audit reports:

1. **Retrieval & Scoring:** See `AUDIT_RETRIEVAL_SCORING.md`
2. **Embedding, Chunking & Indexing:** See `AUDIT_EMBEDDING_CHUNKING_INDEXING.md`
3. **Reranking, Generation & Enrichment:** See `AUDIT_RERANKING_GENERATION_ENRICHMENT.md`
4. **Keywords, Tracing, Training & UI:** See `AUDIT_KEYWORDS_TRACING_TRAINING_UI.md`
5. **API & Integration:** See `AUDIT_API_INTEGRATION.md`

Each category report includes:
- 6-point checklist for every parameter
- Exact file locations and line numbers
- Code snippets showing current implementation
- Detailed fix instructions
- Verification steps
- Estimated effort per parameter

---

**END OF MASTER AUDIT**

**Total Parameters Audited:** 100
**Total Issues Found:** 85
**Estimated Total Fix Effort:** 64-67 hours
**Target Completion:** 8-9 days focused work

**Audit Status:** ✅ COMPLETE - Ready for Implementation Phase
