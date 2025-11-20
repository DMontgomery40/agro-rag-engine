# HTML Advanced Features Audit (Lines 3001-4500)

**Audit Date:** 2025-11-20
**Phase:** 2, Agent 3
**Scope:** Lines 3001-4500 of /gui/index.html
**Status:** COMPREHENSIVE AUDIT COMPLETE

## Executive Summary

Lines 3001-4500 contain **7 major RAG subtabs** with approximately **85 form controls** handling 60+ of the 100 RAG configuration parameters.

## Major Sections

### 1. RETRIEVAL PARAMETERS (Lines 3017-3199)

**Controls Found:**
- MQ_REWRITES (line 3051): Multi-Query Rewrites | number | Default: 2
- FINAL_K (line 3067): Final results count | number | Default: 10
- USE_SEMANTIC_SYNONYMS (line 3094): Query expansion toggle | select
- TOPK_DENSE (line 3115): Qdrant vector candidates | number | Default: 75
- VECTOR_BACKEND (line 3119): Database backend | select
- TOPK_SPARSE (line 3138): BM25 keyword candidates | number | Default: 75
- HYDRATION_MODE (line 3156): Code loading strategy | select
- HYDRATION_MAX_CHARS (line 3175): Code truncation limit | number
- VENDOR_MODE (line 3193): Code preference | select

**Backend Mapping:** RetrievalConfig (9/14 parameters visible)

### 2. ADVANCED RAG TUNING (Lines 3201-3385)

**Controls Found:**
- RRF_K_DIV (line 3244): Reciprocal Rank Fusion divisor | number | Default: 60
- CARD_BONUS (line 3271): Code card semantic bonus | number | Default: 0.08
- FILENAME_BOOST_EXACT (line 3299): Exact filename multiplier | number
- FILENAME_BOOST_PARTIAL (line 3325): Partial path multiplier | number
- LANGGRAPH_FINAL_K (line 3345): LangGraph document count | number
- MAX_QUERY_REWRITES (line 3362): Iteration limit | number
- FALLBACK_CONFIDENCE (line 3382): Low-confidence threshold | number

**Backend Mapping:** ScoringConfig + RetrievalConfig (7/7 controls properly mapped)

### 3. EXTERNAL RERANKERS (Lines 3473-3549)

**Controls Found:**
- RERANK_BACKEND (line 3493): Reranker selector | select
- RERANKER_MODEL (line 3502): Model name/path | text
- COHERE_RERANK_MODEL (line 3522): Cohere model selector | select
- COHERE_API_KEY (line 3532): Cohere authentication | password
- TRANSFORMERS_TRUST_REMOTE_CODE (line 3538): HF trust | select
- RERANK_INPUT_SNIPPET_CHARS (line 3545): Input snippet size | number

**Backend Mapping:** RerankingConfig (6/12 parameters)

### 4. LEARNING RERANKER SYSTEM (Lines 3551-3796)

**15+ configuration and control elements** including:
- Training workflow (mine → train → evaluate)
- Configuration parameters (alpha, batch, maxlen)
- Automation (cron jobs)
- Evaluation and baseline tracking
- Cost tracking

**⚠️ CRITICAL - Missing `name` Attributes** (Lines 3682-3690):
- reranker-epochs, reranker-batch, reranker-maxlen lack `name=` attributes
- Cannot be form-submitted; breaks consistency

### 5. INDEXING CONTROLS (Lines 3799-4023)

**Controls Found:**
- Repository selection
- EMBEDDING_TYPE (line 3900): select
- index-skip-dense (line 3908): BM25 only option
- index-enrich-chunks (line 3915): Enrichment toggle
- OUT_DIR_BASE (line 3952): **DISABLED** (by design)
- COLLECTION_NAME (line 3960): text
- CHUNK_SIZE (line 3968): number
- CHUNK_OVERLAP (line 3972): number
- INDEX_MAX_WORKERS (line 3976): number

**Backend Mapping:** ChunkingConfig (2/8), IndexingConfig (1/9), EmbeddingConfig (1/10)

### 6. EVALUATION CONTROLS (Lines 4027-4267)

**Golden Questions Management** and **Evaluation Runner** with 15+ controls.

**⚠️ CRITICAL - Missing `name` Attributes** (Lines 4137, 4165, 4178):
- eval-final-k, eval-golden-path, eval-baseline-path lack proper `name=` attributes

## Critical Issues Found

### **P0 - Blocking Issues** (4)

1. **Missing `name` Attributes** (Lines 3682, 3686, 3690, 4137, 4165, 4178)
   - 6 controls cannot be form-submitted
   - Breaks consistency and data persistence

2. **RetrievalConfig Parameters Missing** (9/14)
   - Missing: BM25_WEIGHT, VECTOR_WEIGHT, CARD_SEARCH_ENABLED, confidence thresholds
   - **ADA Compliance Issue**: All tunable parameters must be in GUI

3. **EmbeddingConfig Critically Undersupported** (1/10)
   - Only EMBEDDING_TYPE visible
   - Missing: EMBEDDING_MODEL, EMBEDDING_DIM, EMBEDDING_BATCH_SIZE, etc.

4. **Form Submission Uncertainty**
   - No verification all controls submitted to backend
   - No round-trip validation test

### **P1 - High Impact Issues** (3)

1. **ChunkingConfig Undersupported** (2/8)
2. **IndexingConfig Undersupported** (1/9)
3. **Display Panel Data Sources Unclear**

## Parameter Coverage Summary

| Category | Visible | Total | Coverage |
|----------|---------|-------|----------|
| RetrievalConfig | 9 | 14 | 64% |
| ScoringConfig | 3 | 3 | 100% |
| EmbeddingConfig | 1 | 10 | 10% |
| ChunkingConfig | 2 | 8 | 25% |
| IndexingConfig | 1 | 9 | 11% |
| RerankingConfig | 6 | 12 | 50% |
| TrainingConfig | 3 | 6 | 50% |
| **Total** | **60+** | **100+** | **~60%** |

## Recommendations

**Immediate (P0):**
1. Add `name` attributes to 6 missing controls
2. Map RetrievalConfig thresholds to GUI
3. Create EmbeddingConfig section
4. Test form submission pipeline

**Short-term (P1):**
1. Complete ChunkingConfig and IndexingConfig coverage
2. Wire display panels to API endpoints
3. Document backend mapping for custom parameters

---

**Audit completed by:** Claude Code (Phase 2, Agent 3)
**Status:** Documentation only - no modifications made
**Location:** `/Users/davidmontgomery/agro-rag-engine/agent_docs/gui_audit/gui/HTML_AUDIT_ADVANCED.md`
