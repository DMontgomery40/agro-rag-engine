# AGRO GUI Tab Reorganization Mapping
## Phase 1 Analysis - Content Mapping & Implementation Plan

**Generated:** 2025-10-18
**Status:** READY FOR REVIEW - Do NOT implement until approved

---

## Overview

This document maps the NEW tab structure (as defined in REDESIGN_SPEC.md) to EXISTING content divs in gui/index.html. It identifies what needs to be created, wrapped, moved, or consolidated.

---

## Current State Inventory

### Existing Tab Content Divs (24 total)
```
id="tab-analytics-cost"
id="tab-analytics-performance"
id="tab-analytics-tracing"
id="tab-analytics-usage"
id="tab-chat"
id="tab-config-infra"
id="tab-config-models"
id="tab-config-repos"
id="tab-config-retrieval"
id="tab-dashboard"
id="tab-data-indexing"
id="tab-devtools-debug"
id="tab-devtools-editor"
id="tab-devtools-integrations"
id="tab-devtools-reranker"
id="tab-devtools-testing"
id="tab-metrics"
id="tab-onboarding"
id="tab-reranker"
id="tab-settings-docker"
id="tab-settings-general"
id="tab-settings-integrations"
id="tab-settings-profiles"
id="tab-settings-secrets"
```

### New Tab Buttons (9 tabs in tab-bar, lines 2207-2216)
```html
<button data-tab="start">🚀 Get Started</button>
<button data-tab="dashboard">📊 Dashboard</button>
<button data-tab="chat">💬 Chat</button>
<button data-tab="vscode">📝 VS Code</button>      <!-- NEW/PROMOTED -->
<button data-tab="grafana">📈 Grafana</button>      <!-- NEW/PROMOTED -->
<button data-tab="rag">🧠 RAG</button>              <!-- NEW MEGA-TAB -->
<button data-tab="profiles">💾 Profiles</button>    <!-- NEW -->
<button data-tab="infrastructure">🔧 Infrastructure</button> <!-- NEW -->
<button data-tab="admin">⚙️ Admin</button>          <!-- NEW -->
```

### RAG Subtabs (line 2220-2227)
```html
<div id="rag-subtabs" class="subtab-bar" style="display: none;">
    <button data-subtab="data-quality">Data Quality</button>
    <button data-subtab="retrieval">Retrieval</button>
    <button data-subtab="external-rerankers">External Rerankers</button>
    <button data-subtab="learning-ranker">Learning Ranker</button>
    <button data-subtab="indexing">Indexing</button>
    <button data-subtab="evaluate">Evaluate</button>
</div>
```

---

## NEW TAB MAPPINGS

### 1. Get Started (tab-start)
**Status:** ✅ RENAME ONLY
**Old ID:** `tab-onboarding`
**New ID:** `tab-start`
**Action:** Rename div ID from `tab-onboarding` → `tab-start`
**Location:** Lines ~2502-2782
**Content:** Complete onboarding wizard (unchanged)
**Dependencies:** onboarding.js module

---

### 2. Dashboard (tab-dashboard)
**Status:** ✅ KEEP AS-IS
**ID:** `tab-dashboard` (no change)
**Action:** None - already correct
**Location:** Lines 2229-2501
**Content:** System status, quick actions, cost calculator (read-only)
**Dependencies:** health.js, cost_logic.js

---

### 3. Chat (tab-chat)
**Status:** ✅ KEEP AS-IS
**ID:** `tab-chat` (no change)
**Action:** None - already correct
**Location:** Lines 2783-3151
**Content:** Chat interface, routing trace, feedback buttons
**Dependencies:** chat.js, trace.js

---

### 4. VS Code (tab-vscode) - PROMOTED
**Status:** ⚠️ NEEDS CONTENT DIV
**Old ID:** `tab-devtools-editor`
**New ID:** `tab-vscode`
**Action:**
1. Create new top-level div `<div id="tab-vscode" class="tab-content">`
2. Move content from `tab-devtools-editor` (lines ~3436-3490)
3. Remove old subtab navigation from content
4. Add VS Code specific controls (port, bind, open in window)

**Current Content Location:** Lines 3436-3490
**Content Includes:**
- Embedded editor iframe
- Port/bind settings
- Health status display

**Dependencies:** editor.js, vscode.js (new module per spec)

**Missing from Current HTML:**
- "Open in New Window" button (add this)
- Clear health status badge (enhance existing)

---

### 5. Grafana (tab-grafana) - PROMOTED
**Status:** ⚠️ NEEDS CONTENT DIV
**Old ID:** `tab-metrics`
**New ID:** `tab-grafana`
**Action:**
1. Create new top-level div `<div id="tab-grafana" class="tab-content">`
2. Move content from `tab-metrics` (lines ~5487-5699)
3. Remove old tab structure
4. Add Grafana config controls (base URL, UID, auth)

**Current Content Location:** Lines 5487-5699
**Content Includes:**
- Embedded Grafana dashboard iframe
- Preview/Open buttons
- Live metrics panel

**Dependencies:** grafana.js

**Missing from Current HTML:**
- Configuration form (base URL, dashboard UID, auth settings) - ADD THIS
- Better embed controls

---

### 6. RAG (tab-rag) - NEW MEGA-TAB with 6 Subtabs
**Status:** 🔴 COMPLEX - NEEDS WRAPPER + 6 SUBTABS
**New ID:** `tab-rag`
**Action:** Create wrapper div + 6 subtab content divs

---

#### 6.1 RAG → Data Quality (tab-rag-data-quality)
**Status:** 🔴 NEEDS CREATION + CONSOLIDATION
**Sources to Consolidate:**
- `tab-config-repos` (lines 4100-4112) - Repository configuration
- Cards builder content (lines 4857-4976) - Currently in devtools-integrations
- Keywords features (referenced via keywords.js, line 5784)
- Path boosts (need to search for this content)
- Synonyms editor (semantic_synonyms.json - lines 3640)

**Action:**
1. Create `<div id="tab-rag-data-quality" class="tab-content">`
2. Add subtab bar with "Data Quality" active
3. Sections to include:
   - **Keywords Manager** (chips UI) - NEW or move from existing
   - **Path Boosts** (chips UI) - NEW (not found in current HTML)
   - **Synonyms Editor** - Reference to semantic_synonyms.json config
   - **Semantic Cards Builder** - Move from devtools-integrations (lines 4857-4976)
   - **Repository Config** - Move from tab-config-repos (lines 4100-4112)

**Content Locations:**
- Cards: Lines 4857-4976
- Repos: Lines 4100-4112
- Synonyms: Referenced in config-retrieval (line 3640)

**Dependencies:** cards.js, cards_builder.js, keywords.js, config.js

**TO CREATE:**
- Keywords chip interface (may exist but not found in HTML)
- Path boosts chip interface (NOT FOUND - create new)

---

#### 6.2 RAG → Retrieval (tab-rag-retrieval)
**Status:** ⚠️ NEEDS CONSOLIDATION
**Sources to Consolidate:**
- `tab-config-models` (lines 3491-3587)
- `tab-config-retrieval` (lines 3588-3999)

**Action:**
1. Create `<div id="tab-rag-retrieval" class="tab-content">`
2. Add subtab bar with "Retrieval" active
3. Merge content from both sources:
   - Model settings (primary, temperature) from config-models
   - Retrieval params (MQ, Final-K, Top-K Dense/Sparse) from config-retrieval
   - Hydration settings from config-retrieval
   - Advanced tuning (RRF, boosts) from config-retrieval (lines 3817-3999)

**Content Locations:**
- Models: Lines 3491-3587
- Retrieval: Lines 3588-3999

**Dependencies:** config.js, model_flows.js

**Keep:**
- All form controls from both tabs
- All tooltip explanations
- Advanced tuning section (lines 3817-3999)

---

#### 6.3 RAG → External Rerankers (tab-rag-external-rerankers)
**Status:** ⚠️ NEEDS EXTRACTION
**Source:** Embedded in `tab-config-retrieval` (lines 3756-3815)

**Action:**
1. Create `<div id="tab-rag-external-rerankers" class="tab-content">`
2. Add subtab bar with "External Rerankers" active
3. Extract reranking section from config-retrieval:
   - Provider selection (none/local/hf/cohere)
   - Model selection for each provider
   - API keys (Cohere)
   - Input snippet chars setting
   - HF trust remote code toggle

**Content Location:** Lines 3756-3815 (Reranking section in config-retrieval)

**Current Providers Found:**
- none
- local (BAAI/bge-reranker-v2-m3)
- hf (HuggingFace)
- cohere (rerank-3.5, rerank-english-v3.0, etc.)

**Missing Providers (per spec):**
- Voyage AI (found references at lines 2401, 4207, 5602)
- Jina (found reference at line 5618)

**Dependencies:** config.js

**TO ADD:**
- Voyage AI provider configuration
- Jina provider configuration

---

#### 6.4 RAG → Learning Ranker (tab-rag-learning-ranker)
**Status:** ⚠️ NEEDS CONSOLIDATION
**Sources to Consolidate:**
- `tab-reranker` (lines 3227-3435) - Main reranker tab
- `tab-devtools-reranker` (lines 4627-4981) - Reranker training tools

**Action:**
1. Create `<div id="tab-rag-learning-ranker" class="tab-content">`
2. Add subtab bar with "Learning Ranker" active
3. Consolidate content from both sources:
   - Status + telemetry path
   - Mine → Train → Evaluate workflow
   - Config (blend alpha, batch sizes, epochs)
   - Automation + cron scheduling
   - Logs viewer
   - Metrics display
   - Baseline comparison

**Content Locations:**
- Main reranker: Lines 3227-3435
- DevTools reranker: Lines 4627-4981

**Dependencies:** reranker.js

**Keep ALL content from both tabs** - they have different controls:
- tab-reranker: Quick 3-step workflow (Mine, Train, Evaluate)
- tab-devtools-reranker: Full training config, automation, logs

---

#### 6.5 RAG → Indexing (tab-rag-indexing)
**Status:** ✅ MOSTLY EXISTS - RENAME
**Old ID:** `tab-data-indexing`
**New ID:** `tab-rag-indexing`
**Action:**
1. Create `<div id="tab-rag-indexing" class="tab-content">`
2. Add subtab bar with "Indexing" active
3. Move content from `tab-data-indexing` (lines 4114-4319)
   - Simple index button
   - Repository selector
   - Dense embeddings checkbox
   - Progress display
   - Index profiles (shared/full/dev)
   - Advanced settings

**Content Location:** Lines 4114-4319

**Dependencies:** indexing.js, simple_index.js, index_profiles.js

---

#### 6.6 RAG → Evaluate (tab-rag-evaluate)
**Status:** ⚠️ NEEDS CONSOLIDATION
**Source:** `tab-devtools-testing` (lines 4457-4624)

**Action:**
1. Create `<div id="tab-rag-evaluate" class="tab-content">`
2. Add subtab bar with "Evaluate" active
3. Move content from tab-devtools-testing:
   - **Golden Questions Manager** (lines 4466-4522)
     - Add/edit/test questions
     - Repository selection
     - Expected paths
     - Load recommended questions
     - Run all tests
     - Export JSON
   - **Evaluation Runner** (lines 4524-4623)
     - Multi-query toggle
     - Final-K setting
     - Run button
     - Progress bar
     - Results (Top-1/Top-K accuracy, duration)
     - Per-question details
     - Baseline save/compare
     - Export results

**Content Location:** Lines 4457-4624

**Dependencies:** golden_questions.js, eval_runner.js

---

### 7. Profiles (tab-profiles)
**Status:** ⚠️ NEEDS CONSOLIDATION
**Sources to Consolidate:**
- `tab-analytics-cost` (lines 3152-3226) - Budget calculator, cost tracking
- `tab-settings-profiles` (lines 5455-5470) - Profile save/load/apply

**Action:**
1. Create `<div id="tab-profiles" class="tab-content">`
2. Consolidate content:
   - Budget calculator (from analytics-cost)
   - Cost displays (24h, monthly)
   - Profile save/load/apply controls (from settings-profiles)
   - Channel overrides (HTTP/CLI/MCP)
   - Profile import/export

**Content Locations:**
- Cost: Lines 3152-3226
- Profiles: Lines 5455-5470

**Dependencies:** profile_logic.js, autoprofile_v2.js, cost_logic.js, storage-calculator.js

**Note:** Settings-profiles appears minimal (lines 5455-5470), main profile logic likely in JS

---

### 8. Infrastructure (tab-infrastructure)
**Status:** 🔴 COMPLEX - NEEDS CONSOLIDATION
**Sources to Consolidate:**
- `tab-config-infra` (lines 3999-4099) - Paths, endpoints, services
- `tab-devtools-integrations` (lines 4982-5063) - MCP servers control
- `tab-settings-docker` (lines 5285-5454) - Docker services
- `tab-analytics-performance` (lines 5064-5105) - Performance metrics
- `tab-analytics-usage` (lines 5149-5185) - Usage metrics
- `tab-analytics-tracing` (lines 5106-5148) - Tracing/observability

**Action:**
1. Create `<div id="tab-infrastructure" class="tab-content">`
2. Sections to include:
   - **Services** (from settings-docker + config-infra)
     - Qdrant status/control
     - Redis status/control
     - Prometheus status/control
     - Grafana service control
   - **MCP Servers** (from devtools-integrations)
     - stdio MCP status/control
     - HTTP MCP status/control
     - Test buttons
   - **Editor Daemon** (from devtools-editor if not in vscode tab)
     - Port/bind settings
     - Status
   - **Paths** (from config-infra)
     - OUT_DIR_BASE
     - Repository paths
     - Collection names
   - **Endpoints** (from config-infra)
     - Service URLs
   - **Performance Metrics** (from analytics-performance)
     - Query latency
     - Throughput
   - **Usage Stats** (from analytics-usage)
     - API calls
     - Cache hits
   - **Tracing** (from analytics-tracing)
     - Trace viewer
     - Debug logs

**Content Locations:**
- Config-infra: Lines 3999-4099
- DevTools-integrations: Lines 4982-5063
- Settings-docker: Lines 5285-5454
- Analytics-performance: Lines 5064-5105
- Analytics-usage: Lines 5149-5185
- Analytics-tracing: Lines 5106-5148

**Dependencies:** docker.js, mcp_server.js, config.js, trace.js, alerts.js

---

### 9. Admin (tab-admin)
**Status:** ⚠️ NEEDS CONSOLIDATION
**Sources to Consolidate:**
- `tab-settings-general` (lines 4320-4456) - Theme, server settings
- `tab-devtools-debug` (lines 4626) - Debug tools (minimal content found)
- `tab-settings-integrations` (lines 5186-5284) - LangSmith, alerts
- `tab-settings-secrets` (lines 5471-5486) - Secrets management (minimal)
- Git hooks content (git-hooks.js, line 5782)

**Action:**
1. Create `<div id="tab-admin" class="tab-content">`
2. Sections to include:
   - **Theme & Appearance** (from settings-general)
     - Theme mode selector
     - UI preferences
   - **Server Settings** (from settings-general)
     - Server configuration
   - **Integrations** (from settings-integrations)
     - LangSmith configuration
     - Alert thresholds
   - **Git Hooks** (likely in JS, add UI)
     - Pre-commit hooks
     - Commit message templates
   - **Secrets Management** (from settings-secrets + sidepanel)
     - Secrets import/upload
     - .env file handling
   - **Config Export** (add button)
     - Export all settings
     - Backup configuration

**Content Locations:**
- Settings-general: Lines 4320-4456
- Settings-integrations: Lines 5186-5284
- Settings-secrets: Lines 5471-5486 (+ sidepanel lines 5702-5716)
- Debug: Line 4626 (appears to be just a comment/marker)

**Dependencies:** theme.js, secrets.js, git-hooks.js, config.js, langsmith.js, alerts.js

**Secrets Note:** Sidepanel (lines 5702-5716) has secrets ingest dropzone - keep in sidepanel or duplicate?

---

## CONTENT DIVS TO REMOVE

After consolidation, these old div IDs will no longer be needed:

```
✗ tab-onboarding → renamed to tab-start
✗ tab-analytics-cost → moved to tab-profiles
✗ tab-analytics-performance → moved to tab-infrastructure
✗ tab-analytics-tracing → moved to tab-infrastructure
✗ tab-analytics-usage → moved to tab-infrastructure
✗ tab-config-infra → moved to tab-infrastructure
✗ tab-config-models → moved to tab-rag-retrieval
✗ tab-config-repos → moved to tab-rag-data-quality
✗ tab-config-retrieval → split between tab-rag-retrieval + tab-rag-external-rerankers
✗ tab-data-indexing → moved to tab-rag-indexing
✗ tab-devtools-debug → moved to tab-admin
✗ tab-devtools-editor → moved to tab-vscode
✗ tab-devtools-integrations → split to tab-infrastructure + tab-rag-data-quality (cards)
✗ tab-devtools-reranker → moved to tab-rag-learning-ranker
✗ tab-devtools-testing → moved to tab-rag-evaluate
✗ tab-metrics → moved to tab-grafana
✗ tab-reranker → moved to tab-rag-learning-ranker
✗ tab-settings-docker → moved to tab-infrastructure
✗ tab-settings-general → moved to tab-admin
✗ tab-settings-integrations → moved to tab-admin
✗ tab-settings-profiles → moved to tab-profiles
✗ tab-settings-secrets → moved to tab-admin
```

**Total to remove:** 23 old divs
**Total to create:** 9 new top-level divs + 6 RAG subtab divs = 15 divs

---

## MISSING CONTENT TO CREATE

### 1. Keywords Manager (Data Quality)
**Location:** Should be in tab-rag-data-quality
**Status:** Keywords.js exists (line 5784), but no UI found in HTML
**Action:** Create chips-based keyword manager interface

### 2. Path Boosts (Data Quality)
**Location:** Should be in tab-rag-data-quality
**Status:** NOT FOUND in HTML
**Action:** Create chips-based path boost interface (NEW)

### 3. Voyage AI Reranker Config (External Rerankers)
**Location:** Should be in tab-rag-external-rerankers
**Status:** References found (lines 2401, 4207, 5602) but no config form
**Action:** Add Voyage AI provider configuration

### 4. Jina Reranker Config (External Rerankers)
**Location:** Should be in tab-rag-external-rerankers
**Status:** Reference found (line 5618) but no config form
**Action:** Add Jina provider configuration

---

## IMPLEMENTATION ORDER (Recommended)

### Phase 1: Simple Renames & Keeps (Low Risk)
1. ✅ Rename `tab-onboarding` → `tab-start`
2. ✅ Keep `tab-dashboard` as-is
3. ✅ Keep `tab-chat` as-is

### Phase 2: Promotions (Medium Risk)
4. 📝 Create `tab-vscode`, move from `tab-devtools-editor`
5. 📈 Create `tab-grafana`, move from `tab-metrics`

### Phase 3: Simple Consolidations (Medium Risk)
6. 💾 Create `tab-profiles`, consolidate analytics-cost + settings-profiles
7. ⚙️ Create `tab-admin`, consolidate settings-general + settings-integrations + settings-secrets

### Phase 4: Complex Consolidation (High Risk)
8. 🔧 Create `tab-infrastructure`, consolidate 6 sources

### Phase 5: RAG Mega-Tab (Highest Risk)
9. 🧠 Create `tab-rag` wrapper
10. Create `tab-rag-data-quality` (consolidate 3 sources + add missing UI)
11. Create `tab-rag-retrieval` (consolidate 2 sources)
12. Create `tab-rag-external-rerankers` (extract + add providers)
13. Create `tab-rag-learning-ranker` (consolidate 2 sources)
14. Create `tab-rag-indexing` (rename + move)
15. Create `tab-rag-evaluate` (move from devtools-testing)

### Phase 6: Cleanup
16. Remove all old tab divs
17. Update window.Navigation aliases
18. Test all features
19. Remove dead code

---

## JAVASCRIPT MODULE UPDATES NEEDED

Per REDESIGN_SPEC.md Module Ownership (lines 163-184):

```javascript
// These modules need to update their tab references:

"chat.js": ["chat"],                                    // ✅ No change
"config.js": ["rag-retrieval", "profiles"],            // ⚠️ Update: now serves 2 tabs
"indexing.js": ["rag-indexing"],                       // ⚠️ Update tab ID
"reranker.js": ["rag-learning-ranker"],                // ⚠️ Update tab ID
"editor.js": ["vscode"],                               // ⚠️ Update tab ID
"grafana.js": ["grafana"],                             // ⚠️ Update tab ID
"cards.js": ["rag-data-quality"],                      // ⚠️ Update tab ID
"cards_builder.js": ["rag-data-quality"],              // ⚠️ Update tab ID
"keywords.js": ["rag-data-quality"],                   // ⚠️ Update tab ID
"golden_questions.js": ["rag-evaluate"],               // ⚠️ Update tab ID
"eval_runner.js": ["rag-evaluate"],                    // ⚠️ Update tab ID
"profile_logic.js": ["profiles"],                      // ⚠️ Update tab ID
"autoprofile_v2.js": ["profiles"],                     // ⚠️ Update tab ID
"mcp_server.js": ["infrastructure"],                   // ⚠️ Update tab ID
"docker.js": ["infrastructure"],                       // ⚠️ Update tab ID
"secrets.js": ["admin"],                               // ⚠️ Update tab ID
"git-hooks.js": ["admin"],                             // ⚠️ Update tab ID
"theme.js": ["admin"]                                  // ⚠️ Update tab ID
```

---

## NAVIGATION.JS ALIASES NEEDED

To maintain backward compatibility during transition:

```javascript
// In window.Navigation, add these aliases:

Navigation.aliasTab('tab-onboarding', 'tab-start');
Navigation.aliasTab('tab-metrics', 'tab-grafana');
Navigation.aliasTab('tab-devtools-editor', 'tab-vscode');
Navigation.aliasTab('tab-devtools-testing', 'tab-rag-evaluate');
Navigation.aliasTab('tab-data-indexing', 'tab-rag-indexing');
Navigation.aliasTab('tab-reranker', 'tab-rag-learning-ranker');
Navigation.aliasTab('tab-devtools-reranker', 'tab-rag-learning-ranker');
Navigation.aliasTab('tab-config-models', 'tab-rag-retrieval');
Navigation.aliasTab('tab-config-retrieval', 'tab-rag-retrieval');
Navigation.aliasTab('tab-config-repos', 'tab-rag-data-quality');
Navigation.aliasTab('tab-analytics-cost', 'tab-profiles');
Navigation.aliasTab('tab-settings-profiles', 'tab-profiles');
Navigation.aliasTab('tab-config-infra', 'tab-infrastructure');
Navigation.aliasTab('tab-settings-docker', 'tab-infrastructure');
Navigation.aliasTab('tab-devtools-integrations', 'tab-infrastructure');
Navigation.aliasTab('tab-analytics-performance', 'tab-infrastructure');
Navigation.aliasTab('tab-analytics-usage', 'tab-infrastructure');
Navigation.aliasTab('tab-analytics-tracing', 'tab-infrastructure');
Navigation.aliasTab('tab-settings-general', 'tab-admin');
Navigation.aliasTab('tab-settings-integrations', 'tab-admin');
Navigation.aliasTab('tab-settings-secrets', 'tab-admin');
Navigation.aliasTab('tab-devtools-debug', 'tab-admin');
```

---

## RISK ASSESSMENT

### Low Risk ✅
- Get Started (rename only)
- Dashboard (no change)
- Chat (no change)

### Medium Risk ⚠️
- VS Code (simple move + enhance)
- Grafana (simple move + enhance)
- Profiles (2 sources, clear separation)
- Admin (4 sources, mostly settings)

### High Risk 🔴
- Infrastructure (6 sources, complex dependencies)
- RAG Data Quality (3 sources + missing UI to create)
- RAG External Rerankers (extraction + new providers)
- RAG Learning Ranker (2 sources, lots of state)

### Critical Risk ⚠️⚠️
- RAG Retrieval (2 sources, LOTS of settings, core functionality)
- RAG Evaluate (complex state management)

---

## TESTING CHECKLIST

After each phase, test:

- [ ] Tab navigation works (buttons switch tabs)
- [ ] Subtab navigation works (RAG mega-tab)
- [ ] All form controls are functional
- [ ] Settings save/load correctly
- [ ] No console errors
- [ ] Mobile navigation works
- [ ] Theme switching works
- [ ] Search (Ctrl+K) finds settings
- [ ] Module JavaScript loads without errors
- [ ] window.Navigation aliases work
- [ ] Backward compatibility (old tab IDs resolve)

---

## NEXT STEPS

1. **REVIEW THIS DOCUMENT** - Get approval before proceeding
2. **Create backup branch** - `git checkout -b backup-before-reorganization`
3. **Implement Phase 1** - Simple renames/keeps
4. **Test Phase 1** - Verify nothing broke
5. **Implement Phase 2** - Promotions
6. **Test Phase 2** - Verify VS Code and Grafana work
7. **Continue incrementally** - One phase at a time
8. **Full integration test** - After all phases complete

---

## QUESTIONS FOR REVIEW

1. **Path Boosts:** No UI found in current HTML. Should this be created from scratch, or does it exist somewhere I missed?

2. **Keywords Manager:** keywords.js exists but no UI found. Should we create a new chip-based interface, or is there existing UI I missed?

3. **Secrets in Admin vs Sidepanel:** Secrets dropzone exists in sidepanel (lines 5702-5716). Should this be duplicated in Admin tab, or keep only in sidepanel?

4. **Debug Tab:** tab-devtools-debug appears to be just a comment (line 4626). Is there content elsewhere, or should we create debug tools for Admin tab?

5. **External Rerankers - Voyage/Jina:** References found but no config forms. Should these be added, or are they configured elsewhere?

6. **Config.js Dual Ownership:** config.js will serve both "rag-retrieval" and "profiles". Is this acceptable, or should it be split into two modules?

---

**END OF MAPPING DOCUMENT**
