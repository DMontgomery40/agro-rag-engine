# Legacy JavaScript Module Inventory - Complete Details

**Date:** 2025-11-21  
**Total Modules:** 56 in gui/js/ + 51 copies in web/src/modules/ = 107 total

---

## TIER 1: CRITICAL (Convert First)

### 1. tabs.js - Main Tab Navigation
- **Location:** `/gui/js/tabs.js` and `/web/src/modules/tabs.js`
- **Lines:** 292
- **Purpose:** Handles main tab switching, subtab visibility, lazy loading
- **Element IDs Used:**
  - `.tab-content` - Tab containers
  - `.tab-bar button[data-nav="desktop"]` - Tab buttons
  - `[data-tab]` - Tab identifiers
  - `#storage-calculator-container` - Lazy load storage calc
  - `.section-subtab` - Subtab sections
  - `#tab-rag-*` - RAG subtabs
  - `.rag-subtab-content` - RAG content areas
- **Event Listeners:**
  - Click handlers on tab buttons
  - Click handlers on subtab buttons
  - DOMContentLoaded initialization
- **API Calls:** None (DOM-only module)
- **Global State:** None
- **Dependencies:** CoreUtils.$$, CoreUtils.$
- **Conflict Level:** CRITICAL - Will conflict with React routing
- **Notes:** Uses CSS classes for show/hide, not compatible with React virtual DOM

### 2. navigation.js - Navigation API
- **Location:** `/gui/js/navigation.js` and `/web/src/modules/navigation.js`
- **Lines:** 626
- **Purpose:** New navigation system with compatibility mode, tab registry, breadcrumbs
- **Element IDs Used:**
  - `#tab-*` - All tab divs
  - `.tab-content` - Tab containers
  - `.subtab-bar` - Subtab bars
  - `#nav-breadcrumb` - Breadcrumb display
  - `#*-subtabs` - Specific subtab bars (rag, profiles, etc.)
  - `.subtab-btn` - Subtab buttons
- **Event Listeners:**
  - Bar click handlers for subtab switching
  - Window event listeners for view mounting
- **API Calls:** localStorage (nav_current_tab, nav_current_subtab)
- **Global State:** `window.Navigation`, `window.NavigationViews`, `navState` (internal)
- **Dependencies:** CoreUtils.$, CoreUtils.$$, CoreUtils.events
- **Conflict Level:** CRITICAL - Dual navigation systems will confuse React
- **Notes:** Already in hybrid mode (old+new), needs full React conversion

### 3. chat.js - Chat Interface
- **Location:** `/gui/js/chat.js` and `/web/src/modules/chat.js`
- **Lines:** 793
- **Purpose:** Chat message display, settings, history, feedback tracking
- **Element IDs Used (30+):**
  - `#chat-input` - Message input textarea
  - `#chat-send` - Send button
  - `#chat-messages` - Message container
  - `#chat-model`, `#chat-temperature`, `#chat-max-tokens` - Settings
  - `#chat-multi-query`, `#chat-final-k`, `#chat-confidence` - RAG params
  - `#chat-show-citations`, `#chat-show-confidence` - Toggle checkboxes
  - `#chat-auto-scroll`, `#chat-syntax-highlight` - UI toggles
  - `#chat-system-prompt` - System prompt input
  - `#chat-history-enabled`, `#chat-history-limit` - History settings
  - `#chat-show-history-on-load` - History loading
  - `#chat-clear`, `#chat-history` - Action buttons
  - `#chat-save-settings`, `#chat-reset-settings` - Settings buttons
  - `#history-dropdown` - History dropdown menu
  - `#chat-storage-display` - Storage usage display
  - `#chat-export-history`, `#chat-clear-history` - History actions
- **Event Listeners (8+):**
  - Send button click
  - Enter+Ctrl keyboard handler
  - Input auto-resize
  - History button toggle
  - Export/clear history buttons
  - Settings save/reset buttons
  - Outside-click dropdown close
- **API Calls:**
  - `POST /api/chat` - Send message
  - `GET /api/prices` - Get available models
- **Global State (4):**
  - `window.chatMessages[]` - Message array
  - `window.chatSettings{}` - User settings
  - `window.lastChatEventId` - Event tracking
  - localStorage: `agro_chat_settings`, `agro_chat_history`
- **Dependencies:** CoreUtils, ErrorHelpers, UXFeedback, ModelPicker
- **Conflict Level:** CRITICAL - Core user-facing feature
- **Notes:** Heavy DOM manipulation, localStorage intensive, complex initialization

### 4. config.js - Configuration Management
- **Location:** `/gui/js/config.js` and `/web/src/modules/config.js`
- **Lines:** 1,197 (LARGEST MODULE)
- **Purpose:** GUI configuration form, secret masking, keyword manager, repo setup
- **Element IDs Used (50+):**
  - `[name="*"]` - All env var form fields (20+)
  - `#repos-section` - Repository section container
  - `#repo-select` - Repository dropdown
  - `[name="repo_path_*"]` - Per-repo path inputs (dynamic)
  - `[name="repo_keywords_*"]` - Per-repo keywords (dynamic)
  - `[name="repo_excludepaths_*"]` - Exclude patterns (dynamic)
  - `[name="repo_pathboosts_*"]` - Path boosts (dynamic)
  - `[name="repo_layerbonuses_*"]` - Layer bonuses (dynamic)
  - `#kw-filter-*` - Keyword filters (per-repo)
  - `#kw-src-*` - Keyword source selector (per-repo)
  - `#kw-new-*` - Add keyword button (per-repo)
  - `#kw-all-*` - All keywords select (per-repo)
  - `#kw-add-*`, `#kw-rem-*` - Keyword transfer buttons (per-repo)
  - `#kw-repo-*` - Repo keywords select (per-repo)
  - `#exclude-path-input-*` - Exclude input (per-repo)
  - `#exclude-path-add-*` - Add exclude button (per-repo)
  - `#path-status-*`, `#path-resolved-*` - Path validation (per-repo)
  - `.input-group` - Input containers
  - `#cards-enrich-default` - Card enrichment setting
  - `#cost-provider`, `#cost-model` - Cost panel
  - `#cost-embed-provider`, `#cost-embed-model` - Embedding config
  - `#cost-rerank-provider`, `#cost-rerank-model` - Reranker config
  - Multiple dynamic dialog elements
- **Event Listeners (15+):**
  - Save button click
  - Secret reveal toggle button clicks
  - Keyword manager buttons (add, remove, new, filter)
  - Keyword source change
  - Path validation blur
  - Exclude path add/remove
  - Dialog buttons (cancel, add)
  - Repository metadata updates
- **API Calls (6):**
  - `GET /api/config` - Load configuration
  - `POST /api/config` - Save configuration
  - `POST /api/env/reload` - Reload environment
  - `POST /api/keywords/add` - Add new keyword
  - `POST /api/repos/{name}/validate-path` - Validate repo path
  - `GET /api/prices` - Get model pricing
- **Global State:**
  - `window.Config` - Module namespace
  - `window.state.config` - Config cache
  - `window.state.keywordsCatalog` - Keywords
  - `window.state.prices` - Pricing data
- **Dependencies:** CoreUtils, ErrorHelpers, Tooltips, UXFeedback, Theme
- **Conflict Level:** CRITICAL - Massive form with complex state
- **Notes:** Dynamic element creation, lots of callbacks, keyword manager is complex

### 5. eval_runner.js - Evaluation System
- **Location:** `/gui/js/eval_runner.js` and `/web/src/modules/eval_runner.js`
- **Lines:** 729
- **Purpose:** Run evaluations, poll progress, display results, baseline comparison
- **Element IDs Used (20+):**
  - `#eval-golden-path` - Golden path input
  - `#eval-baseline-path` - Baseline path input
  - `#eval-use-multi` - Multi-flag checkbox
  - `#eval-final-k` - Final K parameter
  - `#eval-sample-size` - Sample size input
  - `#btn-eval-run` - Run button
  - `#btn-eval-save-settings` - Save settings button
  - `#btn-eval-save-baseline` - Save baseline button
  - `#btn-eval-compare` - Compare button
  - `#btn-eval-export` - Export button
  - `#eval-progress` - Progress container
  - `#eval-progress-bar` - Progress bar element
  - `#eval-status` - Status text
  - `#eval-results` - Results container
  - `#eval-details` - Result details
  - `#eval-comparison` - Comparison container
  - `#eval-top1-acc`, `#eval-topk-acc`, `#eval-duration` - Metrics
  - `#eval-warning-banner` - Warning display (dynamic creation)
- **Event Listeners (5):**
  - Run button click
  - Save settings click
  - Save baseline click
  - Compare click
  - Export click
- **API Calls (5):**
  - `POST /api/eval/run` - Start evaluation
  - `GET /api/eval/status` - Poll progress (1000ms interval)
  - `GET /api/eval/results` - Get results
  - `POST /api/eval/baseline/save` - Save baseline
  - `GET /api/eval/baseline/compare` - Compare baselines
- **Global State:**
  - `window.evalResults` - Results cache
  - `window._evalWarning` - Warning message
  - `evalPollingInterval` - Polling interval reference
- **Dependencies:** CoreUtils, ErrorHelpers, UXFeedback
- **Conflict Level:** CRITICAL - Complex async/polling logic
- **Notes:** Polling must be cleaned up properly, interval-based architecture

### 6. dashboard-metrics.js - Metrics Display
- **Location:** `/gui/js/dashboard-metrics.js` and `/web/src/modules/dashboard-metrics.js`
- **Lines:** 287
- **Purpose:** Fetch and display dashboard metrics (API perf, index health, top folders)
- **Element IDs Used:** None (generates HTML strings)
- **API Calls (3+):**
  - `GET /api/tracking` - Tracking data
  - `GET /api/index/stats` - Index statistics
  - `GET /api/reranker/logs` - Reranker logs
- **Exports:** `window.DashboardMetrics` - Class-based utility
- **Dependencies:** CoreUtils.api
- **Conflict Level:** HIGH - Can be converted to hooks, used by dashboard
- **Notes:** Class-based, no DOM manipulation, pure logic

---

## TIER 2: HIGH PRIORITY (Convert in Phase 2)

### 7. core-utils.js - Foundation Module
- **Lines:** 85
- **Purpose:** API base resolution, DOM helpers, global state, event bus
- **Exports (5):**
  - `window.CoreUtils.api()` - API URL resolver
  - `window.CoreUtils.$()` - querySelector
  - `window.CoreUtils.$$()` - querySelectorAll
  - `window.CoreUtils.state` - Global state object
  - `window.CoreUtils.events` - Event bus
- **Conflict Level:** HIGH - FOUNDATION for ALL modules
- **Notes:** MUST convert first, all other modules depend on this

### 8. alerts.js - Alert Configuration
- **Lines:** 280+
- **Purpose:** Alert thresholds, webhook configuration
- **Element IDs (20+):** `#alert_*` form fields
- **API Calls (2):**
  - `GET /monitoring/alert-thresholds`
  - `POST /monitoring/alert-thresholds`
- **Conflict Level:** HIGH

### 9. indexing.js - Indexing System
- **Lines:** 350+
- **Purpose:** Manage indexing, show progress
- **Conflict Level:** HIGH

### 10. evaluation_dataset.js - Dataset Management
- **Lines:** 250+
- **Purpose:** Manage test datasets
- **Conflict Level:** HIGH

### 11. editor.js - Editor Interface
- **Lines:** 400+
- **Purpose:** Code editor integration
- **Conflict Level:** HIGH

### 12. editor-settings.js - Editor Configuration
- **Lines:** 200+
- **Purpose:** Editor settings
- **Conflict Level:** HIGH

### 13. cost_logic.js - Cost Calculations
- **Lines:** 350+
- **Purpose:** Budget, cost tracking, alerts
- **Conflict Level:** HIGH

### 14. profile_logic.js - Profile Management
- **Lines:** 300+
- **Purpose:** Create/edit profiles
- **Conflict Level:** HIGH

### 15-19. Specialized Feature Modules
- `reranker.js` (250 lines) - Reranker config
- `autotune.js` (300 lines) - Auto-tuning
- `autoprofile_v2.js` (400 lines) - Profile generation
- `model_flows.js` (280 lines) - Model workflow
- `rag-navigation.js` - RAG tab helper

---

## TIER 3: MEDIUM PRIORITY (20+ modules)

Can be parallelized, fewer direct conflicts:

### Display & Visualization
- `cards.js` - Card display
- `cards_builder.js` - Card builder
- `dashboard-operations.js` - Operational metrics
- `health.js` - System health
- `index_status.js` - Index status
- `index-display.js` - Index content
- `index_profiles.js` - Profile list

### API Integration
- `mcp_server.js` - MCP communication
- `mcp_rag.js` - RAG MCP
- `langsmith.js` - LangSmith tracing
- `git-hooks.js` - Git hooks
- `git-commit-meta.js` - Commit metadata

### Utilities (Used by multiple modules)
- `error-helpers.js` - Error display (used by ~10 modules)
- `ui-helpers.js` - UI utilities
- `theme.js` - Theme switching
- `tooltips.js` - Tooltips
- `ux-feedback.js` - Toast/progress (used by ~5 modules)
- `layout_fix.js` - CSS workaround
- `test-instrumentation.js` - Test helper

### Data Management
- `keywords.js` - Keyword management
- `simple_index.js` - Index operations
- `search.js` - Search interface
- `eval_history.js` - Evaluation history
- `golden_questions.js` - Golden dataset

### System Integration
- `docker.js` - Docker status
- `vscode.js` - VS Code integration
- `secrets.js` - Secret management
- `onboarding.js` - Onboarding flow
- `dino.js` - Dino integration

### Miscellaneous
- `glossary.js` - Glossary display
- `parameter-validator.js` - Parameter validation
- `storage-calculator.js` - Storage calculator
- `storage-calculator-template.js` - Calculator template
- `live-terminal.js` - Terminal emulator

---

## Summary

| Priority | Count | Action |
|----------|-------|--------|
| TIER 1 - CRITICAL | 6 | Convert immediately |
| TIER 2 - HIGH | 14 | Convert in phase 2 |
| TIER 3 - MEDIUM | 30+ | Parallelize, convert phase 3-4 |

**Total Impact:**
- 107 files (56 + 51 duplicates)
- 50+ unique element IDs to handle
- 25+ API endpoints
- 20+ global window variables
- 6+ event listener patterns

