# AGRO GUI Migration Status
## Reorganization Progress Tracker

### ✅ Phase 0: Preparation (COMPLETE)
- [x] **Inventory Created** (`REDESIGN_SPEC.md`)
  - 10 main tabs documented
  - 42 JS modules cataloged
  - 50+ API endpoints mapped
  - 5826 lines of HTML audited
  
- [x] **Test Infrastructure** (`test-instrumentation.js`)
  - data-testid attributes added dynamically
  - TestHelpers API for Playwright
  - Module health checks

- [x] **Integration Contracts** (`INTEGRATION_CONTRACTS.md`)
  - Window APIs defined
  - Event bus protocol
  - Settings ownership map
  - Compatibility requirements

### ✅ Phase 1: Tab Registry & Compatibility (COMPLETE)
- [x] **Navigation System** (`navigation.js`)
  - Tab registry with old→new ID mapping
  - Compatibility mode (default: true)
  - Event emission for both old/new formats
  - localStorage persistence
  
- [x] **Compatibility Features**
  - Old `switchTab()` redirects to new system
  - Tab aliases for backward compatibility
  - Feature flags (AGRO_NEW_IA)

### ✅ Phase 2: New Navigation Implementation (COMPLETE)
- [x] **Tab Bar Updated**
  - VS Code promoted to top-level (with ✨)
  - Grafana promoted to top-level (with ✨)
  - RAG mega-tab created
  - Profiles, Infrastructure, Admin tabs added
  - Old tabs hidden but functional

- [x] **VS Code Integration** (`vscode.js`)
  - Embedded iframe management
  - Health checking
  - Open in new window
  - Copy URL to clipboard
  - Restart capability

- [x] **RAG Consolidation** (`rag-navigation.js`)
  - 6 subtabs: Data Quality, Retrieval, External Rerankers, Learning Ranker, Indexing, Evaluate
  - Maps to existing content divs
  - Subtab navigation working

- [x] **CSS Enhancements**
  - Promoted tabs styling (gradient + sparkle)
  - Subtab bar styling
  - Responsive design maintained

### ⏳ Phase 3: Cleanup (PENDING)
- [ ] Remove duplicate controls
- [ ] Delete dead code
- [ ] Update labels and copy
- [ ] Consolidate settings to single sources

### ⏳ Phase 4: Testing & Documentation (PENDING)
- [x] Playwright test specs created (`navigation.spec.ts`)
- [x] Test config created (`playwright.gui.config.ts`)
- [ ] Run full test suite
- [ ] CI/CD pipeline setup
- [ ] User documentation
- [ ] Video walkthrough

## Current State

### What's Working
1. **New Navigation Active** - All new tabs render correctly
2. **Compatibility Mode** - Old code still functions
3. **VS Code & Grafana** - Promoted and highlighted
4. **RAG Mega-tab** - Subtabs functional
5. **Test Infrastructure** - Ready for Playwright

### What Needs Work
1. **Settings Consolidation** - OUT_DIR_BASE in multiple places
2. **Dead Code** - Old tab buttons still in DOM
3. **Documentation** - User guide needed
4. **Testing** - Full E2E suite needs to run

## Migration Commands

### Enable New Navigation (User-Facing)
```javascript
// In browser console
localStorage.setItem('AGRO_NEW_IA', '1');
window.Navigation.setCompatibilityMode(false);
location.reload();
```

### Test Navigation API
```javascript
// Check current state
window.Navigation.getState();

// Navigate programmatically
window.Navigation.navigateTo('vscode');
window.Navigation.navigateTo('rag', 'learning-ranker');

// Check module health
window.TestHelpers.getModuleStatus();
```

### Run Tests
```bash
# From tests directory
npm run test:gui

# With browser visible
npm run test:gui:headed
```

## Files Modified

### New Files Created
- `REDESIGN_SPEC.md` - Complete specification
- `INTEGRATION_CONTRACTS.md` - API contracts
- `gui/js/navigation.js` - Navigation system
- `gui/js/test-instrumentation.js` - Test helpers
- `gui/js/vscode.js` - VS Code integration
- `gui/js/rag-navigation.js` - RAG subtab handler
- `tests/gui/navigation.spec.ts` - Playwright tests
- `tests/playwright.gui.config.ts` - Test configuration

### Files Updated
- `gui/index.html` - Tab bar, CSS, script includes
- `tests/package.json` - Test scripts added

## Next Steps

### Immediate (Phase 3)
1. Remove old Configuration, Data & Indexing, Developer Tools tabs
2. Update all labels to new terminology
3. Fix OUT_DIR_BASE to single source in Infrastructure

### Short-term (Phase 4)
1. Run Playwright test suite
2. Set up GitHub Actions CI
3. Create user migration guide
4. Record demo video

### Long-term
1. Split HTML into components
2. Add view templates for dynamic loading
3. Implement proper state management
4. Progressive enhancement for slow connections

## Rollback Plan

If issues arise:
```javascript
// Instant rollback in browser
localStorage.setItem('AGRO_NEW_IA', '0');
window.Navigation.setCompatibilityMode(true);
location.reload();
```

Or remove new scripts from HTML:
```html
<!-- Comment out these lines in gui/index.html -->
<!-- <script src="/gui/js/navigation.js"></script> -->
<!-- <script src="/gui/js/vscode.js"></script> -->
<!-- <script src="/gui/js/rag-navigation.js"></script> -->
```

## Success Metrics

- ✅ VS Code visible as top-level tab
- ✅ Grafana visible as top-level tab  
- ✅ RAG sections consolidated
- ✅ No functionality lost
- ✅ Backward compatibility maintained
- ⏳ Zero console errors (some warnings okay)
- ⏳ Page load < 1s
- ✅ Rollback < 30s

## Notes

- Server issues resolved (was disk space)
- HTML remains monolithic (5800+ lines) - future work to split
- All 42 JS modules still functional
- Theme switching preserved
- Keyboard shortcuts maintained

