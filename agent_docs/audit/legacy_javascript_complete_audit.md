# Legacy JavaScript Modules Complete Audit

**Generated:** 2025-11-21  
**Scope:** Complete inventory of legacy JavaScript files in `/gui/js/` and `/web/src/modules/`  
**Purpose:** Identify conflicts with React migration and categorize modules for conversion priority

---

## Executive Summary

**Total Legacy JavaScript Files Found:** 56 in `gui/js/` + 51 in `web/src/modules/` = **~107 legacy modules**

**Critical Finding:** Two parallel codebases exist:
- `/gui/js/` - Original legacy modules (used by current HTML/CSS system)
- `/web/src/modules/` - Duplicated copies of above (prepared for React migration)

**Key Conflict Areas:**
1. DOM Element ID overlaps between legacy JS and React components
2. Event listener attachments to hardcoded element IDs
3. Window global state conflicts (`window.ChatSettings`, `window.State`, etc.)
4. Fetch API endpoint duplications
5. Module initialization races during tab switching

---

## Module Categorization

### TIER 1: CRITICAL - High Conflict Risk with React

**Status:** These modules will cause immediate conflicts and must be converted FIRST

#### Navigation & Routing System
- **tabs.js** (523 lines)
  - Controls: Main tab switching, subtab visibility
  - Element IDs: `#tab-*`, `.tab-content`, `.subtab-btn`
  - Event listeners: Click handlers on all tab buttons
  - API calls: None (DOM-only)
  - Conflict level: **CRITICAL** - React router will conflict
  - Must convert to: React Router or custom Context-based routing

- **navigation.js** (626 lines)
  - Controls: New navigation API with compatibility mode
  - Element IDs: `#tab-*`, `#nav-breadcrumb`, `.tab-bar button`
  - Event listeners: Tab button clicks, subtab navigation
  - API calls: localStorage (nav state persistence)
  - Conflict level: **CRITICAL** - Dual navigation systems will confuse React
  - Status: Already trying to bridge old/new, will need React version

#### Chat Interface (Major Feature)
- **chat.js** (793 lines)
  - Controls: Chat message display, settings, history
  - Element IDs: `#chat-input`, `#chat-send`, `#chat-messages`, `#history-dropdown`, `#chat-*` (20+ element refs)
  - Event listeners: Send button, enter key, history buttons
  - API calls: `/api/chat`, localStorage chat history & settings
  - Global state: `window.chatMessages`, `window.chatSettings`, `window.lastChatEventId`
  - Conflict level: **CRITICAL** - Core user-facing feature
  - Must convert to: React component with Zustand/Context state

#### Configuration Management
- **config.js** (1,197 lines)
  - Controls: GUI config form, secret field masking, keyword manager, repo configuration
  - Element IDs: `[name="*"]` form fields, `#repos-section`, `#kw-*-*`, `#exclude-*-*` (40+ dynamic IDs)
  - Event listeners: Save button, secret reveal toggle, keyword manager buttons
  - API calls: `/api/config`, `/api/env/reload`, `/api/keywords/add`, `/api/repos/*/validate-path`, `/api/prices`
  - Global state: `window.Config` namespace
  - Conflict level: **CRITICAL** - Form submission and validation logic
  - Must convert to: React form with validation library (react-hook-form)

#### Evaluation Runner
- **eval_runner.js** (729 lines)
  - Controls: Evaluation execution, progress polling, baseline comparison
  - Element IDs: `#eval-*`, `#btn-eval-*` (15+ refs)
  - Event listeners: Run, save, compare, export buttons
  - API calls: `/api/eval/run`, `/api/eval/status`, `/api/eval/results`, `/api/eval/baseline/*`, `/api/config`
  - Global state: `window.evalResults`, `window._evalWarning`, intervals/timeouts
  - Conflict level: **HIGH** - Complex async polling logic
  - Must convert to: React component with polling hook

#### Dashboard Metrics
- **dashboard-metrics.js** (287 lines)
  - Controls: Performance metrics display class
  - Element IDs: None (creates HTML strings for rendering)
  - API calls: `/api/tracking`, `/api/index/stats`, `/api/reranker/logs`
  - Exports: `window.DashboardMetrics` class
  - Conflict level: **HIGH** - Used as utility, can be converted to React hooks
  - Status: Class-based, can extract logic into hooks

---

### TIER 2: HIGH - Significant Conflicts, Convert Soon

#### Core Module System
- **core-utils.js** (85 lines)
  - Controls: API base resolution, DOM helpers, global state, event bus
  - Element IDs: None
  - API calls: None (utility module)
  - Global state: `window.CoreUtils` (api, $, $$, state, events)
  - Exports: Shared utilities for all modules
  - Conflict level: **HIGH** - Foundation for all other modules
  - Must convert to: Custom React hooks (useApi, useGlobalState) + Context

- **alerts.js** (280+ lines)
  - Controls: Alert threshold configuration, webhook setup
  - Element IDs: `#alert_*` form fields, threshold inputs
  - Event listeners: Save alert thresholds button
  - API calls: `/monitoring/alert-thresholds`, `/monitoring/webhooks`
  - Conflict level: **HIGH** - Settings form
  - Must convert to: React settings form component

#### Data Quality & Indexing
- **indexing.js** (350+ lines)
  - Controls: Indexing progress, status display
  - Element IDs: Progress bar, status display
  - API calls: `/api/index/*`, polling calls
  - Conflict level: **HIGH** - Real-time progress tracking

- **evaluation_dataset.js** (250+ lines)
  - Controls: Test dataset management
  - Element IDs: Dataset table, upload form
  - API calls: `/api/datasets/*`

#### Editor & Development Tools
- **editor.js** (400+ lines)
  - Controls: Editor interface
  - Element IDs: `#editor-*`, editor container
  - API calls: Multiple editor-related endpoints
  - Conflict level: **HIGH** - Complex editor state

- **editor-settings.js** (200+ lines)
  - Controls: Editor configuration
  - Element IDs: Editor setting fields
  - API calls: Settings endpoints

#### Profile & Cost Management
- **cost_logic.js** (350+ lines)
  - Controls: Cost calculations, budget alerts
  - Element IDs: Cost display, budget fields
  - API calls: `/api/cost/*` endpoints
  - Conflict level: **HIGH** - Complex business logic

- **profile_logic.js** (300+ lines)
  - Controls: Profile creation/editing
  - Element IDs: Profile form fields
  - API calls: `/api/profiles/*`

#### Specialized Features
- **reranker.js** (250+ lines) - Reranker configuration
- **autotune.js** (300+ lines) - Automatic tuning interface
- **autoprofile_v2.js** (400+ lines) - Auto-profile generation
- **model_flows.js** (280+ lines) - Model selection workflow

---

### TIER 3: MEDIUM - Minor Conflicts, Can Parallelize

These modules have fewer direct DOM conflicts and can be refactored incrementally.

#### Display & Visualization
- **cards.js** - Displays card data
- **cards_builder.js** - Card building interface
- **dashboard-operations.js** - Dashboard operational metrics
- **health.js** - System health status display
- **index_status.js** - Index status indicator
- **index-display.js** - Index content display
- **index_profiles.js** - Index profile list

#### API Integration
- **mcp_server.js** - MCP server communication
- **mcp_rag.js** - RAG MCP integration
- **langsmith.js** - LangSmith tracing integration
- **git-hooks.js** - Git hooks management
- **git-commit-meta.js** - Commit metadata display

#### Utilities & Helpers
- **error-helpers.js** - Error display utilities (used by many modules)
- **ui-helpers.js** - UI utility functions
- **theme.js** - Theme switching
- **tooltips.js** - Tooltip system
- **ux-feedback.js** - Toast notifications, progress bars
- **layout_fix.js** - CSS layout workarounds
- **test-instrumentation.js** - Test helpers

#### Data Management
- **keywords.js** - Keyword management
- **simple_index.js** - Simple index operations
- **search.js** - Search interface
- **eval_history.js** - Evaluation history display
- **golden_questions.js** - Golden questions dataset

#### System Integration
- **docker.js** - Docker integration status
- **vscode.js** - VS Code integration
- **secrets.js** - Secret management
- **onboarding.js** - Onboarding flow
- **dino.js** - Dino (LLM) integration

#### Other Files
- **glossary.js** - Glossary display
- **parameter-validator.js** - Parameter validation
- **rag-navigation.js** - RAG tab navigation helper
- **storage-calculator.js** - Storage calculator
- **storage-calculator-template.js** - Storage calculator template
- **live-terminal.js** - Terminal emulator

---

## DOM Element ID Mapping (Conflicts)

### Shared Element ID Patterns (Used in multiple modules)

```
Chat Module IDs (chat.js)
├── #chat-input              - Main input textarea
├── #chat-send               - Send button
├── #chat-messages           - Message container
├── #chat-model              - Model dropdown
├── #chat-temperature        - Temperature slider
├── #chat-max-tokens         - Max tokens input
├── #chat-multi-query        - Multi-query param
├── #chat-final-k            - Final K param
├── #chat-confidence         - Confidence threshold
├── #chat-show-*             - Toggle checkboxes (8+)
├── #chat-save-settings      - Save button
├── #chat-reset-settings     - Reset button
├── #history-dropdown        - History dropdown
└── #chat-*-history*         - History related IDs (5+)

Evaluation Module IDs (eval_runner.js)
├── #eval-golden-path        - Golden path input
├── #eval-baseline-path      - Baseline path input
├── #eval-use-multi          - Multi-flag checkbox
├── #eval-final-k            - Final K parameter
├── #eval-sample-size        - Sample limit input
├── #btn-eval-run            - Run evaluation button
├── #btn-eval-save-settings  - Save settings button
├── #btn-eval-save-baseline  - Save baseline button
├── #btn-eval-compare        - Compare button
├── #btn-eval-export         - Export button
├── #eval-progress           - Progress container
├── #eval-progress-bar       - Progress bar
├── #eval-status             - Status text
├── #eval-results            - Results container
├── #eval-details            - Details container
├── #eval-comparison         - Comparison container
└── #eval-*-acc              - Accuracy displays

Config Module IDs (config.js)
├── [name="FIELD_NAME"]      - 20+ environment variable inputs
├── #repos-section           - Repository configuration section
├── [name="repo_path_*"]     - Dynamic per-repo path inputs
├── [name="repo_keywords_*"] - Dynamic per-repo keywords
├── [name="repo_excludepaths_*"] - Per-repo exclude patterns
├── [name="repo_pathboosts_*"] - Per-repo boost patterns
├── [name="repo_layerbonuses_*"] - Per-repo layer bonuses
├── #kw-filter-*             - Keyword filter per repo
├── #kw-all-*                - All keywords select per repo
├── #kw-repo-*               - Repo keywords select per repo
├── #kw-*-*                  - Keyword manager controls (15+ per repo)
├── #repo-select             - Repository selector
└── [data-repo]              - Data attribute on inputs
```

### CRITICAL OVERLAP PATTERNS

**Element ID Collision Risk:** ⚠️ VERY HIGH

```javascript
// These patterns exist in BOTH:
// 1. gui/js/*.js (legacy system)
// 2. web/src/modules/*.js (React migration copies)
// 3. Potentially React components creating same IDs

// Risk: React components MUST use ref-based access, not getElementById()
// Risk: Legacy JS + React both mounting listeners to same IDs = chaos
```

---

## API Endpoint Summary

### Endpoints Called by Legacy Modules

**Configuration Endpoints:**
- `POST /api/config` - Save config
- `GET /api/config` - Load config
- `POST /api/env/reload` - Reload environment
- `POST /api/keywords/add` - Add keyword
- `POST /api/repos/{repo}/validate-path` - Validate repo path
- `GET /api/prices` - Get model prices

**Evaluation Endpoints:**
- `POST /api/eval/run` - Start evaluation
- `GET /api/eval/status` - Poll evaluation status
- `GET /api/eval/results` - Get evaluation results
- `POST /api/eval/baseline/save` - Save baseline
- `GET /api/eval/baseline/compare` - Compare with baseline

**Chat Endpoints:**
- `POST /api/chat` - Send chat message
- `GET /api/tracking` - Get tracking data (for metrics)

**Infrastructure/Monitoring:**
- `GET /api/health` - System health check
- `GET /api/tracking` - Tracking logs
- `GET /api/index/stats` - Index statistics
- `GET /api/reranker/logs` - Reranker logs
- `GET /monitoring/alert-thresholds` - Alert configuration
- `GET /monitoring/webhooks` - Webhook configuration
- `POST /monitoring/alert-thresholds` - Save alerts
- `POST /monitoring/webhooks` - Save webhooks

**Other Endpoints:**
- `GET /api/langsmith/latest` - Latest LangSmith trace URL
- Various other service-specific endpoints (docker, vscode, etc.)

---

## Global Window State Pollution

### Windows globals created by modules (MUST avoid in React)

```javascript
// chat.js
window.chatMessages          // Array of messages
window.chatSettings          // Chat configuration object
window.lastChatEventId       // Event ID for tracking

// eval_runner.js
window.evalResults           // Evaluation results cache
window._evalWarning          // Warnings from eval

// config.js
window.Config                // Namespace with functions

// Navigation/Tabs
window.Navigation            // New navigation API
window.Tabs                  // Old tabs API
window.NavigationViews       // Registered views
window.CoreUtils             // Shared utilities (FOUNDATION)

// Error helpers
window.ErrorHelpers          // Error display utilities

// Theme system
window.Theme                 // Theme management

// Feedback system
window.UXFeedback            // Toast & progress notifications

// Editor
window.initEditorHealthCheck // Function
window.stopEditorHealthCheck // Function

// And many module-specific globals...
```

**React Solution:** Convert these to:
- Zustand stores (global state)
- React Context (provider-based state)
- Custom hooks (utilities)
- Refs (element references)

---

## Event Listeners - Attachment Patterns

### Common Event Listener Patterns in Legacy Modules

```javascript
// Pattern 1: Direct element listeners
document.getElementById('btn-eval-run').addEventListener('click', runEvaluation);

// Pattern 2: Event delegation via container
container.addEventListener('click', (e) => {
    if (e.target.matches('.subtab-btn')) { ... }
});

// Pattern 3: Keyboard handlers
input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && e.ctrlKey) sendMessage();
});

// Pattern 4: Change listeners on form fields
select.addEventListener('change', (e) => {
    applySettings();
});

// Pattern 5: Window listeners (document scope)
window.addEventListener('DOMContentLoaded', initTabs);
document.addEventListener('click', closeDropdown);
```

**React Conversion:** All must become:
- `useEffect(() => { element.addEventListener(...) })` - Direct refs
- `onClick` handler props - Direct event handlers
- Custom hooks - Extracted logic
- Context providers - Global event handling

---

## Module Dependency Graph

```
CoreUtils (foundation - ALL modules depend on this)
│
├─ Navigation System
│  ├─ tabs.js
│  └─ navigation.js
│
├─ Chat System
│  └─ chat.js (depends on: error-helpers, ux-feedback, model_picker)
│
├─ Config System
│  └─ config.js (depends on: error-helpers, tooltips, ux-feedback)
│
├─ Evaluation System
│  ├─ eval_runner.js (depends on: error-helpers, ux-feedback)
│  └─ evaluation_dataset.js
│
├─ Settings/Admin
│  ├─ alerts.js
│  ├─ secrets.js
│  ├─ editor-settings.js
│  └─ onboarding.js
│
├─ Cost & Profile Management
│  ├─ cost_logic.js
│  ├─ profile_logic.js
│  └─ autotune.js
│
├─ Monitoring/Metrics
│  ├─ dashboard-metrics.js
│  ├─ health.js
│  ├─ index_status.js
│  └─ docker.js
│
├─ Data Management
│  ├─ keywords.js
│  ├─ search.js
│  ├─ simple_index.js
│  └─ indexing.js
│
├─ UI/UX Utilities (used by many)
│  ├─ error-helpers.js
│  ├─ ui-helpers.js
│  ├─ ux-feedback.js
│  ├─ tooltips.js
│  ├─ theme.js
│  └─ layout_fix.js
│
├─ Editor
│  ├─ editor.js (depends on: editor-settings)
│  └─ vscode.js
│
└─ External Integrations
   ├─ langsmith.js
   ├─ mcp_server.js
   ├─ mcp_rag.js
   └─ git-*.js
```

---

## Conversion Priority & Strategy

### PHASE 1: Foundation (Weeks 1-2)
Convert these FIRST - all other modules depend on them:

1. **core-utils.js** → Custom React hooks + Context
   - Create: `useApi()` hook
   - Create: `useGlobalState()` hook
   - Create: `useEventBus()` hook
   - Create: `API_BASE` config provider

2. **navigation.js** + **tabs.js** → React Router or Context-based routing
   - Create: `useNavigation()` hook
   - Create: `<NavigationProvider>` wrapper
   - Implement: Tab rendering via routes

3. **error-helpers.js** → React error boundary + toast component
   - Create: `<ErrorBoundary>` component
   - Create: `useErrorHandler()` hook

4. **ux-feedback.js** → Toast & progress React components
   - Create: `<ToastProvider>` + `useToast()` hook
   - Create: `<ProgressBar>` component

### PHASE 2: Core Features (Weeks 3-4)

1. **chat.js** → React chat component
   - Create: `<ChatInterface>` component
   - Create: `useChatState()` hook
   - Create: Zustand store for chat history

2. **config.js** → React settings form
   - Create: `<ConfigForm>` component
   - Create: `<SecretField>` component
   - Create: `<KeywordManager>` component

3. **eval_runner.js** → React evaluation component
   - Create: `<EvaluationRunner>` component
   - Create: `useEvaluation()` hook

### PHASE 3: Supporting Features (Weeks 5-6)
- Alerts, indexing, keywords, etc.

### PHASE 4: Integration & Cleanup (Week 7)
- Remove legacy modules
- Fix remaining conflicts
- QA testing

---

## Conflict Checklist

### For Each Module, Verify:

- [ ] All `getElementById()` calls converted to refs
- [ ] All `querySelector()` calls converted to refs
- [ ] All `addEventListener()` calls become React event handlers or `useEffect` hooks
- [ ] All `fetch()` calls move to custom hooks
- [ ] All global `window.*` state moves to Context/Zustand
- [ ] All `localStorage` access moves to custom hooks
- [ ] All polling intervals cleared in unmount
- [ ] All DOM mutations replaced with React render logic
- [ ] All form validation uses React form library
- [ ] No inline `innerHTML` assignments (use JSX)

---

## Files That CAN Safely Remain (At Least Initially)

These modules have minimal conflicts and can stay as legacy during transition:

- `storage-calculator.js` - Isolated utility
- `tooltips.js` - Can be wrapped as React hook
- `theme.js` - Can be Context + CSS
- `test-instrumentation.js` - Test helper, not user-facing
- `layout_fix.js` - CSS workaround

---

## Known Issues to Fix

### 1. Boolean .env Values (Bug from previous agent)
**Files affected:** `config.js` and any modules reading boolean env vars

```javascript
// WRONG (will be string "False" or "True")
if (env.SOME_FLAG) { ... }

// CORRECT (use 1/0)
if (String(env.SOME_FLAG) === '1') { ... }
```

### 2. Subtab Navigation ID Mismatch (Bug from previous agent)
**Files affected:** `tabs.js` and `navigation.js`

```javascript
// ISSUE: data-subtab must match ID construction pattern
// Example: <button data-subtab="data-quality"> creates #tab-rag-data-quality
// Not all subtabs follow this pattern consistently
```

### 3. Absolute Path Hardcoding
**Files affected:** Configuration, indexing, docker modules

```javascript
// WRONG
const path = '/Users/davidmontgomery/agro-rag-engine/models/';

// CORRECT
const path = process.env.MODELS_PATH || 'models/';
```

---

## React Component Structure Template

```typescript
// Template for converting legacy module to React

import React, { useState, useEffect, useRef } from 'react';
import { useApi } from './hooks/useApi';
import { useGlobalState } from './hooks/useGlobalState';

interface Props {
  // ...
}

export const MyFeature: React.FC<Props> = (props) => {
  const { api } = useApi();
  const { state, setState } = useGlobalState();
  const inputRef = useRef<HTMLInputElement>(null);
  
  const [localState, setLocalState] = useState({ /* ... */ });
  
  useEffect(() => {
    // Component initialization
    loadData();
    
    // Cleanup
    return () => {
      // Cleanup listeners, timers, etc.
    };
  }, []);
  
  const handleSubmit = async () => {
    const result = await api('/endpoint', { method: 'POST' });
    // Handle result
  };
  
  return (
    <div>
      {/* JSX content */}
    </div>
  );
};
```

---

## Recommended Tools for React Conversion

- **State Management:** Zustand (lightweight) or Redux (complex apps)
- **Form Handling:** react-hook-form (performance) + Zod (validation)
- **HTTP Client:** TanStack Query (caching, pagination) or axios
- **Routing:** React Router v6+ (if navigation.js fully converted)
- **UI Components:** Radix UI or Headless UI (accessibility)
- **Toast/Notifications:** react-hot-toast or Sonner
- **Global State:** React Context + useReducer (simple) or Zustand
- **Testing:** Vitest + React Testing Library

---

## Summary Statistics

| Category | Count | Status |
|----------|-------|--------|
| Total Legacy JS Files | 107 | Duplicate in two locations |
| TIER 1 (Critical) | 6 | Must convert first |
| TIER 2 (High) | 15 | Convert in phase 2 |
| TIER 3 (Medium) | 20+ | Convert incrementally |
| Utility Modules | 10 | Extract to hooks |
| API Endpoints Used | 25+ | Need wrapper hooks |
| Global Window Variables | 20+ | Convert to Context/Zustand |
| Total Element IDs Tracked | 50+ | Convert to refs |
| Event Listener Patterns | 6 | Convert to React handlers |

---

## Conclusion

**The path forward:**

1. **Do NOT attempt to run React and legacy JS together** - too many ID conflicts
2. **Convert in waves** - dependencies first, then features
3. **Create wrapper hooks for CoreUtils** - minimal change impact
4. **Test each phase before moving to next** - verify no regression
5. **Keep feature parity** - every legacy module must be fully functional in React
6. **Document during conversion** - helps with future maintenance

The modules are well-structured and can be converted cleanly if done systematically. The main challenges are:
- Large form modules (config.js)
- Complex polling logic (eval_runner.js)
- Navigation routing conflicts (tabs.js, navigation.js)

These are all solvable with standard React patterns.

