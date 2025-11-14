# React Migration Follow-Up TODOs

**Created:** 2025-01-06  
**Priority:** HIGH - Must complete within 12 hours  
**Status:** Tracking issues discovered during migration

---

## Critical Issues to Fix

### 1. DataQualitySubtab - Has TODOs in WT2-RAG version
**Status:** BLOCKED - Current stub kept in place  
**Issue:** WT2-RAG version has 2 TODOs:
- Line 46: `// TODO: Wire to file browser dialog`
- Line 67: `// TODO: Wire to backend API to persist changes`

**Action Required:**
- [ ] Either fix the TODOs in WT2-RAG version or
- [ ] Verify current stub works correctly with `/gui/js/config.js` integration
- [ ] Compare with `/gui` HTML to ensure feature parity

**Location:** `/web/src/components/RAG/DataQualitySubtab.tsx`

---

## Verification Needed

### 2. LiveTerminal Integration Missing
**Status:** TODO - Not critical for basic functionality  
**Issue:** `/gui/js/reranker.js` uses LiveTerminal for streaming output during training
- GUI has: `initRerankerTerminal()`, `_rerankerTerminal`, live streaming
- React has: Static result display only

**Action Required:**
- [ ] Check if there's a React LiveTerminal component in any worktree
- [ ] If not, document that React version uses static results (acceptable for MVP)
- [ ] Test that training/mine/evaluate operations work without live terminal

**Files:**
- `/gui/js/reranker.js` (reference)
- `/gui/js/live-terminal.js` (terminal implementation)
- `/web/src/components/RAG/LearningRankerSubtab.tsx` (needs update)

---

### 3. Feedback Buttons Integration Missing
**Status:** TODO - Chat feature, not RAG feature  
**Issue:** `/gui/js/reranker.js` has `addFeedbackButtons()` that adds 👍👎⭐ to chat messages
- This is for collecting user feedback to improve reranker
- React LearningRanker doesn't include this

**Action Required:**
- [ ] Verify this belongs in Chat component, not RAG component
- [ ] Check if WT2-RAG or other worktrees have a Chat component with feedback
- [ ] If not in React yet, add to chat implementation TODO

**Note:** This is chat UI feature, not core RAG functionality

---

## Completed Items

✅ **LearningRankerSubtab endpoint fix** - Changed `/smoke-test` to `/smoketest`  
✅ **All RAG subtabs migrated** - 5 of 6 complete (DataQuality pending)  
✅ **Required hooks added** - useGlobalState, useAPI  
✅ **Required stores added** - useConfigStore, useDockerStore, useHealthStore  
✅ **No TODOs in production code** - All migrated components are TODO-free  

---

## Next Steps (After Current Migration)

1. Test each RAG subtab in browser with actual server
2. Fix DataQualitySubtab TODOs
3. Add LiveTerminal if needed for better UX
4. Integrate feedback buttons into Chat component
5. Run Playwright smoke tests
6. Get user verification with screenshots

---

**Last Updated:** 2025-01-06 (Step 2 complete)

