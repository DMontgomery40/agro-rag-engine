# RAG Subtabs Audit Index

**Generated:** November 21, 2024  
**Status:** Complete - All 6 subtabs analyzed

## Documents in This Audit

### 1. **rag_subtabs_quick_reference.md** (3.6 KB)
**Start here for quick overview**
- At-a-glance summary table
- Key findings
- Recommended conversion order
- Effort estimates
- Critical issues flagged

**Use when:** You need a quick status check or overview for decision-making

### 2. **rag_subtabs_detailed_audit.md** (44 KB)
**Complete analysis of all 6 subtabs**
- Detailed breakdown for each subtab
- Complete button inventory with IDs
- Complete input field inventory
- Expected backend endpoints
- Event handler requirements
- Priority matrix & conversion roadmap
- Backend API requirements summary

**Use when:** You're working on conversion, need implementation details, or planning sprints

---

## Subtabs Analyzed

### ✓ ExternalRerankersSubtab.tsx
- **Status:** Complete
- **Complexity:** 5/10 (Easiest)
- **Lines:** 100
- **Buttons:** 0
- **Inputs:** 6
- **Key Feature:** Reranker configuration
- **Recommendation:** Convert first (Phase 1 - Warmup)

### ✓ DataQualitySubtab.tsx
- **Status:** Complete
- **Complexity:** 6/10
- **Lines:** 200
- **Buttons:** 7
- **Inputs:** 6
- **Key Feature:** Code cards builder & viewer
- **Recommendation:** Phase 2

### ✓ IndexingSubtab.tsx
- **Status:** Complete
- **Complexity:** 8/10
- **Lines:** 570
- **Buttons:** 12
- **Inputs:** 40+
- **Key Feature:** Index building with progress tracking
- **Recommendation:** Phase 2, may need splitting

### ✓ RetrievalSubtab.tsx
- **Status:** Complete
- **Complexity:** 9/10 (Very Complex)
- **Lines:** 950 (Largest)
- **Buttons:** 4
- **Inputs:** 55+
- **Key Feature:** Retrieval parameter tuning
- **Recommendation:** Phase 2, **recommend splitting into multiple tabs**

### ✓ LearningRankerSubtab.tsx
- **Status:** Complete
- **Complexity:** 9/10 (Very Complex)
- **Lines:** 380
- **Buttons:** 15+
- **Inputs:** 30+
- **Key Feature:** Self-improving reranker via ML
- **Recommendation:** Phase 3 (depends on Retrieval & solid backend)

### ⚠️ EvaluateSubtab.tsx
- **Status:** **INCOMPLETE** - File ends abruptly at line 326
- **Complexity:** 8/10
- **Lines:** 325 (incomplete)
- **Buttons:** 14
- **Inputs:** 15+
- **Key Feature:** Golden questions evaluation
- **Issue:** Profiles tab content missing/cut off
- **Action Required:** Fix/restore file before conversion
- **Recommendation:** Phase 4 (after file restoration)

---

## Critical Issues Found

### 🔴 EvaluateSubtab.tsx is Broken
**Problem:** File ends abruptly in the middle of HTML content at line 326. The Profiles tab section is partially present but incomplete.

**Impact:** Cannot properly convert this subtab until file is complete.

**Action:**
1. Check git history for complete version
2. Either restore from previous commit or complete the missing sections
3. Validate HTML structure before conversion

### ⚠️ RetrievalSubtab Dominates Scope
**Problem:** Single subtab is 950 lines with 55+ input fields. This is the largest configuration interface.

**Recommendation:** Consider splitting into 2-3 separate tabs:
- Generation Models (GEN_MODEL, OPENAI_KEY, etc.)
- Retrieval Parameters (FINAL_K, TOPK_DENSE, HYDRATION_MODE, etc.)
- Advanced Tuning (RRF_K_DIV, CARD_BONUS, VENDOR_PENALTY, etc.)
- Routing & Tracing (separate tab)

This would significantly improve UX and make conversion easier.

---

## Key Insights

### 1. All 6 Use dangerouslySetInnerHTML
- 100% need conversion to proper React components
- No existing event handlers in HTML
- All form handling is JavaScript-based
- Total: ~2,525 lines of HTML to convert

### 2. Recurring Patterns Identified
**Should be standardized as reusable components:**

- **ModelPicker:** 6 different model selectors (mostly in Retrieval)
- **ProgressBar + Terminal:** 3 locations with live updates
- **SettingsSection:** Used throughout for grouping settings
- **StatusDisplay:** Read-only displays showing server state
- **TooltipHelp:** Extensive help system with detailed explanations

### 3. Backend Requirements
**~50 endpoints needed** across:
- Config management (4)
- Model APIs (2)
- Cards building (6)
- Reranker workflows (19)
- Indexing (6)
- Evaluation (12)
- Health checks (5)

Most of these likely already exist but should be verified.

### 4. Streaming/WebSocket Requirements
**3 subtabs need streaming support for:**
- DataQualitySubtab: Card building progress
- IndexingSubtab: Indexing progress
- LearningRankerSubtab: Training/eval progress

Need SSE or WebSocket for real-time terminal output.

---

## Recommended Work Plan

### Preparation (Before coding)
1. ✅ **Audit complete** - You are here
2. Fix EvaluateSubtab file
3. Verify all backend endpoints exist/are functional
4. Create component library mockups

### Phase 1: Warmup (2 hours)
- **ExternalRerankersSubtab**
- Build confidence, establish patterns
- Simple form, good learning opportunity

### Phase 2: Core (14 hours)
- **DataQualitySubtab** (2-3 hrs)
- **RetrievalSubtab** (4-5 hrs) - possibly split
- **IndexingSubtab** (3-4 hrs)
- Can work on Retrieval + Indexing in parallel

### Phase 3: Advanced (9 hours)
- **LearningRankerSubtab** (4-5 hrs)
- Depends on solid Retrieval implementation
- Requires streaming backend in place

### Phase 4: Evaluation (3-4 hours)
- **EvaluateSubtab** (after file fix)
- Depends on working evaluation endpoints

### Phase 5: Refactor & Test (8-10 hours)
- Extract reusable components
- Comprehensive testing with backend
- Documentation updates

**Total Estimated Effort: 35-40 hours**

---

## File Locations

All source files are in:
```
/Users/davidmontgomery/agro-rag-engine/web/src/components/RAG/
```

Audit files are in:
```
/Users/davidmontgomery/agro-rag-engine/agent_docs/audit/
├── RAG_SUBTABS_INDEX.md (this file)
├── rag_subtabs_quick_reference.md
└── rag_subtabs_detailed_audit.md
```

---

## Navigation

- **For quick overview:** Start with `rag_subtabs_quick_reference.md`
- **For detailed breakdown:** See `rag_subtabs_detailed_audit.md`
- **For specific subtab details:** Search the detailed audit by subtab name
- **For button/input inventory:** Detailed audit has complete tables for each

---

## Status Summary

| Item | Status |
|------|--------|
| Subtabs analyzed | 6/6 ✓ |
| Buttons documented | 40+ ✓ |
| Inputs documented | 250+ ✓ |
| API endpoints mapped | ~50 ✓ |
| Critical issues found | 1 ⚠️ (EvaluateSubtab incomplete) |
| Conversion plan ready | ✓ |
| Ready to start Phase 1 | ✓ |

---

**Last Updated:** November 21, 2024  
**Next Review:** Before starting Phase 2 conversion

