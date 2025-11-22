# RAG Subtabs Quick Reference

## At-a-Glance Summary

| Subtab | Lines | Complexity | Effort | Buttons | Inputs | Status |
|--------|-------|-----------|--------|---------|--------|--------|
| ExternalRerankers | 100 | 5/10 | Simple-Med | 0 | 6 | ✓ Complete |
| DataQuality | 200 | 6/10 | Medium | 7 | 6 | ✓ Complete |
| IndexingSubtab | 570 | 8/10 | Complex | 12 | 40+ | ✓ Complete |
| Retrieval | 950 | 9/10 | HARD | 4 | 55+ | ✓ Complete |
| LearningRanker | 380 | 9/10 | HARD | 15+ | 30+ | ✓ Complete |
| EvaluateSubtab | 325* | 8/10 | Complex | 14 | 15+ | ⚠️ INCOMPLETE |

*EvaluateSubtab is incomplete - file ends abruptly at line 326

## Key Findings

### All 6 Use dangerouslySetInnerHTML
- 100% of subtabs need conversion
- No existing event handlers
- No React state management
- ~250+ total form elements

### Model Pickers
Found in 5 subtabs:
- **RetrievalSubtab:** 6 different model selectors
- **DataQualitySubtab:** 1 model picker in progress display
- **IndexingSubtab:** 3 model selection dropdowns
- **ExternalRerankersSubtab:** Model selectors (predefined)
- **EvaluateSubtab:** None

### Progress Tracking (3 locations)
1. DataQualitySubtab - Card building progress
2. IndexingSubtab - Indexing progress
3. LearningRankerSubtab - Multi-step workflow progress

All need terminal/streaming support.

### Terminal Output (3 locations)
1. DataQualitySubtab: `#cards-terminal-container`
2. IndexingSubtab: `#index-status`
3. LearningRankerSubtab: `#reranker-terminal-container` + logs viewer

Need SSE/WebSocket for streaming.

## Recommended Conversion Order

### Phase 1: Warmup (Low Risk)
**ExternalRerankersSubtab** (5/10, ~1-2 hrs)
- Simplest form
- Good for learning React patterns
- No dependencies

### Phase 2: Core Features
2. **DataQualitySubtab** (6/10, ~2-3 hrs)
3. **RetrievalSubtab** (9/10, ~4-5 hrs) - Consider splitting
4. **IndexingSubtab** (8/10, ~3-4 hrs)

### Phase 3: Advanced (Wait for Phase 2 completion)
5. **LearningRankerSubtab** (9/10, ~4-5 hrs) - Most interactive
6. **EvaluateSubtab** (8/10, ~3-4 hrs) - After fixing file

## Parallelization
**Can do simultaneously:**
- ExternalRerankers + DataQuality
- Retrieval + Indexing

**Must be sequential:**
- LearningRanker depends on Retrieval (models)
- Evaluate depends on Retrieval (settings)

## Critical Issues

### 🔴 EvaluateSubtab is Broken
- File ends at line 326 (incomplete)
- Profiles tab content cut off
- Needs file restoration or completion

### Common Patterns to Standardize
1. **ModelPicker component** - 6 model selectors in Retrieval alone
2. **ProgressBar + Terminal** - 3 locations with progress tracking
3. **SettingsSection** - Used throughout, should be reusable

## Backend Endpoints Needed
~50 total endpoints across 6 subtabs:

- **Config:** 4 endpoints
- **Models:** 2 endpoints  
- **Cards:** 6 endpoints
- **Reranking:** 19 endpoints
- **Indexing:** 6 endpoints
- **Evaluation:** 12 endpoints
- **Health:** 5 endpoints

## Size Comparison
```
Retrieval:      950 lines (largest, 55+ inputs)
Indexing:       570 lines (40+ inputs)
LearningRanker: 380 lines (complex workflow)
Evaluate:       325 lines (incomplete)
DataQuality:    200 lines
External:       100 lines (smallest)
─────────────
Total:        2,525 lines of HTML to convert
```

## Estimated Total Effort
- **Phase 1:** ~2 hours
- **Phase 2:** ~12-14 hours
- **Phase 3:** ~8-10 hours
- **Component refactoring:** ~4-6 hours
- **Testing + fixes:** ~5-8 hours
- **Total:** ~35-40 hours

## Next Steps
1. Fix EvaluateSubtab file
2. Review backend endpoint status
3. Create reusable component library
4. Start Phase 1 conversion

---

See `rag_subtabs_detailed_audit.md` for complete analysis.

