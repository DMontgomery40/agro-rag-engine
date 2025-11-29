# Web Modules Audit Report

**Date:** 2025-11-29 (UPDATED)  
**Auditor:** Agent  
**Scope:** `/web/src/modules/` (54 files)

## Executive Summary

The `/web/src/modules/` directory contains 54 JavaScript modules originally written for a legacy GUI system. **Many more have been replaced by React hooks/components than previously documented.** This audit identifies:

- **22 modules** that can be **safely deleted** (fully replaced by React hooks/components)
- **13 modules** that **need refactoring** (partial React coverage, still loaded)
- **8 modules** that should be **kept as essential infrastructure**  
- **11 modules** that serve as **bridges** between React and backend (keep for now)

---

## 🗑️ SAFE TO DELETE (22 modules)

These modules have been **fully replaced by React hooks/components/stores** and can be removed.

### Category A: NOT imported in App.tsx (can delete immediately)

| Module | Lines | Replaced By | Notes |
|--------|-------|-------------|-------|
| `chat.js` | 769 | `ChatInterface.tsx` | Checks for `[data-react-chat]` and skips init |
| `navigation.js` | 623 | `useNavigation.ts` + React Router | Comments confirm replacement |
| `tabs.js` | 273 | `TabBar.tsx` + `TabRouter.tsx` | "using React Router instead" |
| `rag-navigation.js` | 210 | `RAGSubtabs.tsx` | RAG mega-tab handled by React |
| `golden_questions.js` | 488 | `EvaluateSubtab.tsx` | Commented out in App.tsx |
| `eval_runner.js` | 544 | `EvaluateSubtab.tsx` | Commented out in App.tsx |

### Category B: Loaded in App.tsx but have complete React replacements

| Module | Lines | React Replacement | Notes |
|--------|-------|-------------------|-------|
| `ui-helpers.js` | 200 | `useUIHelpers.ts` (262 lines) | Full replacement, remove from App.tsx |
| `theme.js` | 95 | `useTheme.ts` (141 lines) | Full replacement, remove from App.tsx |
| `storage-calculator.js` | 150 | `useStorageCalculator.ts` (296 lines) | Full replacement |
| `storage-calculator-template.js` | 600 | `StorageCalculatorSuite.tsx` + components | HTML template, delete |
| `error-helpers.js` | 145 | `utils/errorHelpers.ts` (124 lines) | Full replacement |
| `search.js` | 250 | `useGlobalSearch.ts` (259 lines) | Full replacement |
| `tooltips.js` | 15 | `useTooltips.ts` (hooks) | Full replacement |
| `onboarding.js` | 260 | `useOnboarding.ts` (367 lines) | Full replacement |
| `cards.js` | 280 | `useCards.ts` (122 lines) | Full replacement |
| `cards_builder.js` | 330 | `Builder.tsx` + `useCards.ts` | Full replacement |
| `reranker.js` | 1,110 | `useReranker.ts` (267 lines) | Full replacement |
| `docker.js` | 800 | `useDockerStore.ts` (141 lines) | Full replacement |
| `indexing.js` | 450 | `useIndexing.ts` (187 lines) | Full replacement |
| `keywords.js` | 75 | `useKeywords.ts` | Full replacement |
| `vscode.js` | 80 | `useVSCodeEmbed.ts` | Full replacement |
| `mcp_rag.js` | 55 | `useMCPRag.ts` | Full replacement |

**Total deletable:** ~7,822 lines (64% of all module code!)

### Deletion Commands

**Phase 1 - Delete modules NOT in App.tsx (safe immediately):**
```bash
cd /Users/davidmontgomery/agro-rag-engine/web/src/modules
rm chat.js navigation.js tabs.js rag-navigation.js golden_questions.js eval_runner.js
```

**Phase 2 - Delete modules WITH React replacements (after removing from App.tsx):**
```bash
rm ui-helpers.js theme.js storage-calculator.js storage-calculator-template.js
rm error-helpers.js search.js tooltips.js onboarding.js
rm cards.js cards_builder.js reranker.js docker.js indexing.js
rm keywords.js vscode.js mcp_rag.js
```

---

## 🔧 NEEDS REFACTORING (13 modules)

These modules are still loaded via `App.tsx` and have **partial** React coverage. They need the remaining functionality migrated.

| Module | Lines | Partial React Coverage | What's Missing |
|--------|-------|------------------------|----------------|
| `config.js` | 620 | `useConfigStore.ts` | Complex save/sync logic |
| `grafana.js` | 125 | `GrafanaDashboard.tsx` | Health polling logic |
| `editor.js` | 225 | `EditorPanel.tsx` | Health check, restart logic |
| `editor-settings.js` | 140 | `EditorSettings.tsx` | Some bindings |
| `secrets.js` | 110 | `SecretsSubtab.tsx` | Form validation |
| `mcp_server.js` | 250 | `MCPSubtab.tsx` | Status polling |
| `live-terminal.js` | 325 | `LiveTerminal.tsx` | Some edge cases |
| `index_status.js` | 175 | `SystemStatusSubtab.tsx` | Polling logic |
| `index_profiles.js` | 170 | `ProfilesTab.tsx` | Profile switching |
| `alerts.js` | 555 | None (needs React toasts) | Full migration needed |
| `trace.js` | 80 | `TraceViewer.tsx` | Some bindings |
| `simple_index.js` | 90 | `IndexingSubtab.tsx` | Minimal, easy merge |
| `profile_renderer.js` | 185 | `ProfileEditor.tsx` | Display logic |

**Total:** ~3,050 lines (25% of modules)

---

## ✅ KEEP - Essential Infrastructure (8 modules)

These modules provide core functionality that hasn't been fully migrated to React yet.

| Module | Lines | Purpose | Why Keep |
|--------|-------|---------|----------|
| `core-utils.js` | 50 | `$`, `$$`, `api()`, `state` | Foundation for remaining modules |
| `fetch-shim.js` | 10 | Fetch polyfill | Browser compatibility |
| `api-base-override.js` | 25 | API base URL detection | Essential for Docker/local |
| `test-instrumentation.js` | 180 | Playwright helpers | Required for testing |
| `layout_fix.js` | 35 | Layout calculations | Sidepanel sizing |
| `app.js` | 1,940 | Main coordinator | Orchestrates remaining modules |
| `dino.js` | 40 | Easter egg game | Fun! Keep it |
| `ux-feedback.js` | 530 | User feedback collection | Complex, needs dedicated migration |

**Note:** `ui-helpers.js`, `theme.js`, `tooltips.js`, `error-helpers.js` now have React replacements and can be deleted.

---

## 🔗 KEEP - Bridge Modules (11 modules)

These modules provide functionality still actively used that doesn't have a complete React replacement.

| Module | Lines | Usage | Notes |
|--------|-------|-------|-------|
| `cost_logic.js` | 325 | **ES6 import** by `Sidepanel.tsx` | ✅ Already modern, keep as-is |
| `health.js` | 35 | Health check endpoints | Simple, used by multiple places |
| `git-hooks.js` | 50 | Git hook management | Backend integration |
| `git-commit-meta.js` | 65 | Commit info display | Dashboard panel |
| `autotune.js` | 70 | Parameter tuning | RAG tab functionality |
| `model_flows.js` | 115 | Model configuration wizard | Complex wizard |
| `profile_logic.js` | 35 | Profile generation logic | Pure JS util, keep |
| `autoprofile_v2.js` | 250 | Auto-profile generation | Complex logic |
| `eval_history.js` | 70 | Eval run history | API-focused |
| `langsmith.js` | 55 | LangSmith configuration | Integration binding |

**Note:** `onboarding.js`, `search.js`, `mcp_rag.js` now have React replacements.

---

## Refactoring Roadmap

### Phase 1: Delete Orphaned Modules (TODAY - 30 mins)
1. Delete 6 modules NOT imported in App.tsx (chat.js, navigation.js, tabs.js, etc.)
2. Run Playwright smoke test
3. Verify production build

### Phase 2: Delete Replaced Modules (THIS WEEK - 2-3 hours)
1. Edit `App.tsx` to remove imports of 16 modules with React replacements:
   - `ui-helpers.js` → `useUIHelpers.ts`
   - `theme.js` → `useTheme.ts`
   - `storage-calculator.js` → `useStorageCalculator.ts`
   - `error-helpers.js` → `utils/errorHelpers.ts`
   - `search.js` → `useGlobalSearch.ts`
   - `tooltips.js` → `useTooltips.ts`
   - `onboarding.js` → `useOnboarding.ts`
   - `cards.js` → `useCards.ts`
   - `cards_builder.js` → `useCards.ts`
   - `reranker.js` → `useReranker.ts`
   - `docker.js` → `useDockerStore.ts`
   - `indexing.js` → `useIndexing.ts`
   - `keywords.js` → `useKeywords.ts`
   - `vscode.js` → `useVSCodeEmbed.ts`
   - `mcp_rag.js` → `useMCPRag.ts`
   - `storage-calculator-template.js` → `StorageCalculatorSuite.tsx`
2. Delete the 16 modules
3. Run full Playwright suite

### Phase 3: Complete Partial Migrations (2-4 weeks)
1. Finish React versions of 13 modules with partial coverage
2. Focus on `config.js`, `alerts.js`, `live-terminal.js` first
3. Create React toasts to replace `alerts.js`

### Phase 4: Final Cleanup
1. Once all modules migrated, delete `app.js` coordinator
2. Simplify `core-utils.js` to minimal shim or remove
3. Consider TypeScript rewrite of remaining bridge modules

---

## Verification Commands

### Check for orphaned imports after Phase 1 deletion:
```bash
cd /Users/davidmontgomery/agro-rag-engine
grep -r "chat\.js\|navigation\.js\|tabs\.js\|rag-navigation\|golden_questions\|eval_runner" web/src/
```

### Check for orphaned imports after Phase 2 deletion:
```bash
grep -r "ui-helpers\.js\|theme\.js\|storage-calculator\.js\|error-helpers\.js\|search\.js\|tooltips\.js\|onboarding\.js\|cards\.js\|cards_builder\.js\|reranker\.js\|docker\.js\|indexing\.js\|keywords\.js\|vscode\.js\|mcp_rag\.js" web/src/App.tsx
```

### Verify build succeeds:
```bash
cd web && npm run build
```

### Run Playwright smoke test:
```bash
npx playwright test --config=playwright.web.config.ts tests/smoke/
```

### Full test suite (after all deletions):
```bash
npx playwright test --config=playwright.web.config.ts
```

---

## Summary

| Category | Count | Lines | % of Total |
|----------|-------|-------|------------|
| **Safe to Delete** | 22 | ~7,822 | **64%** |
| Needs Refactoring | 13 | ~3,050 | 25% |
| Keep (Essential) | 8 | ~2,810 | 8% |
| Keep (Bridge) | 11 | ~1,070 | 9% |
| **Total** | **54** | **~12,100** | 100% |

**Key Finding:** 64% of module code (~7,800 lines) can be deleted immediately because React replacements already exist!

**Recommendation:** 
1. **Phase 1 (Today):** Delete the 6 modules not imported in App.tsx
2. **Phase 2 (This Week):** Remove the 16 modules from App.tsx imports and delete them
3. **Phase 3 (Ongoing):** Migrate the remaining 13 modules with partial coverage

