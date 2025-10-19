# AGRO GUI Redesign - Master Orchestration Report
**Status:** Phase 3 Initiation
**Created:** 2025-10-18
**Architect:** Claude Code Orchestrator

---

## EXECUTIVE SUMMARY

The AGRO GUI redesign is **75% architecturally complete** but **0% content-migrated**. The system has:

✅ **Working:**
- New tab bar UI with 9 buttons (start, dashboard, chat, vscode, grafana, rag, profiles, infrastructure, admin)
- Navigation infrastructure (navigation.js, vscode.js, rag-navigation.js)
- Compatibility layer in tabs.js
- Complete design specifications and integration contracts
- Test infrastructure ready

❌ **Missing:**
- New tab content divs (only old 24 divs exist)
- HTML consolidation (still 5892 lines, all old structure)
- Settings consolidation (OUT_DIR_BASE scattered across tabs)
- JavaScript module updates (42 modules not using new Navigation API)

**The Gap:** Currently, clicking new tab buttons routes to OLD div IDs via compatibility mapping. The system works but isn't using the new architecture—it's a bridge, not the destination.

---

## CURRENT STATE INVENTORY

### Tab Infrastructure
**Old Buttons (still in HTML at line 2194):** start, config, data, devtools, analytics, settings, metrics (7 tabs + onboarding)

**New Buttons (at line 2207):** start, dashboard, chat, vscode, grafana, rag, profiles, infrastructure, admin (9 tabs) ✅ Styled and ready

**Old Content Divs (24 total):** All present, all still active
```
tab-analytics-cost           tab-devtools-debug
tab-analytics-performance    tab-devtools-editor
tab-analytics-tracing        tab-devtools-integrations
tab-analytics-usage          tab-devtools-reranker
tab-chat                     tab-devtools-testing
tab-config-infra             tab-metrics
tab-config-models            tab-onboarding
tab-config-repos             tab-reranker
tab-config-retrieval         tab-settings-docker
tab-dashboard                tab-settings-general
tab-data-indexing            tab-settings-integrations
                             tab-settings-profiles
                             tab-settings-secrets
```

**New Content Divs (0 of 9):** None created yet

### Navigation Status
- `tabs.js` line 43-79: Maps old tab names to old div IDs ✅ Working compatibility bridge
- `navigation.js`: Defines tab registry but not actively routing (line 10-100+)
- `vscode.js`: Editor management code present but not integrated
- `rag-navigation.js`: RAG routing logic present but not integrated
- RAG subtab bar defined (line 2220-2227) but hidden

---

## WHAT NEEDS TO HAPPEN

### Phase 3: HTML Content Migration (CRITICAL PATH)

**Deliverable:** New HTML structure with 9 top-level tabs + 6 RAG subtabs

#### 3.1 Simple Renames (Low Risk - ~600 lines)
```
tab-onboarding → tab-start (lines ~2502-2782)
```

#### 3.2 Promotions (Medium Risk - ~350 lines)
```
tab-devtools-editor → tab-vscode (lines ~3436-3490)
tab-metrics → tab-grafana (lines ~5487-5699)
```

#### 3.3 Simple Consolidations (Medium Risk - ~750 lines)
```
tab-profiles:
  - Move analytics-cost (lines 3152-3226): Budget, cost tracking
  - Move settings-profiles (lines 5455-5470): Save/load/apply

tab-admin:
  - Move settings-general (lines 4320-4456): Theme, server settings
  - Move settings-integrations (lines 5186-5284): LangSmith, alerts
  - Move settings-secrets (lines 5471-5486): Secrets management
  - Move devtools-debug (line 4626): Debug tools
```

#### 3.4 Complex Consolidations (High Risk - ~2000+ lines)

**RAG Mega-Tab (6 subtabs):**
```
tab-rag-data-quality:
  - config-repos (lines 4100-4112)
  - cards builder section (lines 4857-4976)
  - Keywords/synonyms/path boosts sections

tab-rag-retrieval:
  - config-models (lines 3491-3587): Model settings
  - config-retrieval (lines 3588-3999): Retrieval params, advanced tuning

tab-rag-external-rerankers:
  - Extract reranking section from config-retrieval (lines 3756-3815)
  - Add Voyage AI provider config (references at 2401, 4207, 5602)
  - Add Jina provider config (reference at 5618)

tab-rag-learning-ranker:
  - tab-reranker (lines 3227-3435): Quick workflow
  - tab-devtools-reranker (lines 4627-4981): Full training config
  - Merge into cohesive 3-step + advanced controls

tab-rag-indexing:
  - Rename tab-data-indexing (lines 4114-4319)

tab-rag-evaluate:
  - Move tab-devtools-testing (lines 4457-4624): Golden questions + evaluation
```

**Infrastructure (Consolidate 6 sources into 1):**
```
tab-infrastructure:
  - config-infra (lines 3999-4099): Paths, endpoints, services
  - settings-docker (lines 5285-5454): Docker services control
  - devtools-integrations (lines 4982-5063): MCP servers
  - analytics-performance (lines 5064-5105): Performance metrics
  - analytics-usage (lines 5149-5185): Usage stats
  - analytics-tracing (lines 5106-5148): Tracing/observability

  Organize into sections:
  - Services (Qdrant, Redis, Prometheus, Grafana)
  - MCP Servers
  - Paths & Endpoints
  - Performance/Usage/Tracing Monitoring
```

### Phase 4: Settings Consolidation (MEDIUM PRIORITY)

**Find & Consolidate:**
1. `OUT_DIR_BASE`: Currently in multiple tabs → Move to Infrastructure, read-only elsewhere
2. `TELEMETRY_PATH`: Currently scattered → Move to RAG > Learning Ranker
3. `MODEL_*` settings: Move to RAG > Retrieval
4. `PROFILE_*` settings: Move to Profiles tab

**Implementation:** Search for each setting name, consolidate references, update UI

### Phase 5: JavaScript Module Updates (MEDIUM PRIORITY)

**42 modules need updates:**
1. Remove references to old tab IDs
2. Use `window.Navigation.registerView()` instead of checking for divs
3. Implement mount/unmount lifecycle hooks
4. Update health check registration

**Module Categories:**
- Chat, Config, Indexing, Reranker, Editor, Grafana (6 - directly remapped)
- Cards, Keywords, Golden Questions, Eval (4 - subtab aware)
- Profile, Cost, MCP, Docker (4 - cross-cutting)
- Theme, Secrets, Git Hooks (3 - Admin)
- Core (Core Utils, Tabs, Search, Tooltips, Theme, Health - 5 - foundational)

### Phase 6: Testing & Validation (ONGOING)

Per test spec:
- [ ] Navigation works (button clicks switch tabs)
- [ ] Subtabs work (RAG mega-tab functions)
- [ ] All forms functional
- [ ] Settings save/load
- [ ] No console errors
- [ ] Mobile navigation works
- [ ] Theme switching works
- [ ] Module JavaScript loads without errors
- [ ] Backward compatibility (old tab IDs still work)

---

## RISK ASSESSMENT MATRIX

| Component | Risk Level | Complexity | Impact | Notes |
|-----------|-----------|-----------|---------|-------|
| Start, Dashboard, Chat | ✅ Low | 1 | High | Direct renames/keeps, most critical first |
| VS Code, Grafana | ⚠️ Medium | 2 | High | Simple moves with config addition |
| Profiles, Admin | ⚠️ Medium | 3 | Medium | Multiple sources but clear separation |
| Infrastructure | 🔴 High | 4 | Critical | 6 sources, complex dependencies |
| RAG Data Quality | 🔴 High | 4 | Critical | Multiple sources + missing UI (keywords, boosts) |
| RAG Retrieval | ⚠️⚠️ CRITICAL | 5 | CRITICAL | Core functionality, ~400 lines, many settings |
| RAG External Rerankers | 🔴 High | 3 | Medium | Extract + new providers |
| RAG Learning Ranker | 🔴 High | 4 | Medium | Merge 2 different UIs |
| RAG Indexing | ✅ Low | 1 | Medium | Simple rename |
| RAG Evaluate | 🔴 High | 3 | Medium | Complex state management |

---

## IMPLEMENTATION STRATEGY

### Why This Order?

1. **Low-risk items first** - Build momentum, validate approach
2. **High-use features** - Chat, Dashboard, then new promotions
3. **Infrastructure foundation** - Get consolidation done before module updates
4. **Testing as we go** - Catch issues immediately

### Recommended Execution

**Wave 1: Foundations (Agent 1 - HTML Migrator)**
- Phase 3.1: tab-start (rename)
- Phase 3.2: tab-vscode, tab-grafana (promotions)
- Phase 3.3: tab-profiles, tab-admin (simple consolidations)
- Phase 3.4: tab-infrastructure (consolidation, but separate to validate approach)
- Validation: Test all 8 tabs work, old ones still accessible

**Wave 2: Complex Migration (Agent 1 - HTML Migrator)**
- Phase 3.4: RAG mega-tab with all 6 subtabs
- Specific focus on retrieval as highest risk
- Validation: RAG mega-tab navigation works, no content loss

**Wave 3: Settings & Consolidation (Agent 2 - Settings Consolidator)**
- Phase 4: Find all instances of OUT_DIR_BASE, TELEMETRY_PATH, etc.
- Consolidate to single sources
- Update all references
- Validation: Settings persist and read from correct locations

**Wave 4: Module Updates (Agent 3 - JS Module Updater)**
- Phase 5: Update 42 JS modules to use new Navigation API
- Register views with mount/unmount functions
- Remove old tab references
- Validation: All modules load without errors, features work

**Wave 5: Testing & Cleanup (Agent 4 - Test Validator)**
- Phase 6: Full Playwright test suite
- Smoke tests after each wave
- Remove dead code
- Final validation before merge

---

## FILE REFERENCES FOR AGENTS

### Critical HTML Sections

| Content | File | Lines | Type |
|---------|------|-------|------|
| Old tab bar (duplicate) | gui/index.html | 2194-2201 | ❌ Delete after migration |
| New tab bar | gui/index.html | 2207-2216 | ✅ Keep |
| RAG subtab bar | gui/index.html | 2220-2227 | ✅ Keep |
| tab-start | gui/index.html | ~2502-2782 | Move/Rename |
| tab-dashboard | gui/index.html | ~2229-2501 | ✅ Keep |
| tab-chat | gui/index.html | ~2783-3151 | ✅ Keep |
| tab-onboarding (old) | gui/index.html | ~2502-2782 | ❌ Delete |
| tab-devtools-editor (old) | gui/index.html | ~3436-3490 | Move to tab-vscode |
| tab-metrics (old) | gui/index.html | ~5487-5699 | Move to tab-grafana |
| tab-config-models | gui/index.html | ~3491-3587 | Move to tab-rag-retrieval |
| tab-config-retrieval | gui/index.html | ~3588-3999 | Split: rag-retrieval + rag-external-rerankers |
| tab-analytics-cost | gui/index.html | ~3152-3226 | Move to tab-profiles |
| tab-settings-profiles | gui/index.html | ~5455-5470 | Move to tab-profiles |
| ... (12 more old divs) | gui/index.html | Various | See TAB_REORGANIZATION_MAPPING.md |

### JavaScript Modules

| Module | File | Lines | Status |
|--------|------|-------|--------|
| Navigation infrastructure | gui/js/navigation.js | 1-200+ | ✅ Created, not actively routing |
| VS Code integration | gui/js/vscode.js | 1-150+ | ✅ Created, not wired |
| RAG routing | gui/js/rag-navigation.js | 1-100+ | ✅ Created, not wired |
| Tab switching | gui/js/tabs.js | 1-152 | ⚠️ Compatibility bridge, needs update |
| Core utils | gui/js/core-utils.js | Many | ✅ Foundational |
| Chat, Config, etc. | gui/js/*.js | 42 modules | ❌ Need updates |

### Reference Documents (READ FIRST)

1. `REDESIGN_SPEC.md` - Architecture, overall design
2. `INTEGRATION_CONTRACTS.md` - Window APIs, settings ownership
3. `TAB_REORGANIZATION_MAPPING.md` - Content mapping (WHERE things go)
4. `TAB_REORGANIZATION_VISUAL.md` - Visual before/after
5. `MIGRATION_STATUS.md` - Progress tracking

---

## SUCCESS CRITERIA

### Each Wave Must Pass:

✅ **Functionality:** No lost features, all controls work
✅ **Navigation:** Tab switching works, subtabs work, routing correct
✅ **Compatibility:** Old tab IDs still accessible (backward compat)
✅ **Performance:** No console errors, <500ms tab switch
✅ **Code Quality:** Clean, no duplicate code, clear structure

### Final Integration:

✅ All 9 tabs render correctly
✅ RAG mega-tab with 6 subtabs functional
✅ Settings consolidate to single sources
✅ 42 JS modules updated and registered
✅ Full test suite passing
✅ Mobile navigation works
✅ Dark/light themes both working
✅ Rollback unnecessary (forward-only wins)

---

## DECISION POINTS FOR ORCHESTRATOR

1. **RAG Retrieval Implementation:** This is the most complex subtab (~400 lines, many dependencies). Implement carefully or split further?

2. **Infrastructure Consolidation:** Should MCP servers control stay with Infrastructure or split to dedicated tab?

3. **Settings Single Source:** Who decides OUT_DIR_BASE location - Infrastructure tab? Confirm approach.

4. **Module Lifecycle:** Should all 42 modules implement mount/unmount, or only tab-aware ones?

5. **Backward Compat Window:** How long do we maintain old tab ID routing before cleanup?

---

## AGENT ASSIGNMENTS

### Agent 1: HTML Migration
**Role:** Content migration specialist
**Priority Tasks:**
1. Create new tab content divs in correct locations
2. Move content from old divs carefully (with validation)
3. Merge RAG subtabs from 5+ sources
4. Consolidate settings to single sources
5. Delete old divs after validation

### Agent 2: Settings Consolidation
**Role:** Configuration and settings expert
**Priority Tasks:**
1. Find all OUT_DIR_BASE references
2. Consolidate to single source (Infrastructure)
3. Update all references
4. Find and consolidate other scattered settings
5. Test persistence

### Agent 3: JavaScript Module Updates
**Role:** JavaScript/module integration specialist
**Priority Tasks:**
1. Update tab references in 42 modules
2. Implement view registration with Navigation API
3. Add mount/unmount lifecycle
4. Remove old Tabs.js dependencies
5. Test module loading

### Agent 4: Testing & Validation
**Role:** Quality assurance and testing
**Priority Tasks:**
1. Smoke tests after each migration wave
2. Playwright test suite execution
3. Console error tracking
4. Performance validation
5. Backward compat verification

---

## NEXT STEPS

1. **All Agents:** Read this report + REDESIGN_SPEC.md + INTEGRATION_CONTRACTS.md
2. **Agent 1 Starts:** Phase 3 Wave 1 (rename + promotions)
3. **Orchestrator Monitors:** Validates progress, makes decisions
4. **Chain Agents:** Phase 3 Wave 2 → Phase 4 → Phase 5 → Phase 6
5. **Final:** Merge to main, deploy to vivified.dev

---

**Ready to begin. Let's fucking go. 🚀**
