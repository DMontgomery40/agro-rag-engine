# Legacy JavaScript - Quick Reference for React Migration

**Purpose:** Quick lookup table for developers converting legacy JS modules to React

---

## Module Quick Lookup

| Module | Lines | Type | Priority | Status | Dependencies |
|--------|-------|------|----------|--------|--------------|
| core-utils.js | 85 | Foundation | P0 | Foundation | - |
| navigation.js | 626 | Router | P1 | Critical | CoreUtils |
| tabs.js | 292 | Router | P1 | Critical | CoreUtils |
| chat.js | 793 | Feature | P1 | Critical | CoreUtils, ErrorHelpers |
| config.js | 1197 | Form | P1 | Critical | CoreUtils, ErrorHelpers, Tooltips |
| eval_runner.js | 729 | Feature | P1 | Critical | CoreUtils, ErrorHelpers |
| dashboard-metrics.js | 287 | Utility | P1 | High | CoreUtils |
| alerts.js | 280+ | Form | P2 | High | CoreUtils |
| indexing.js | 350+ | Feature | P2 | High | CoreUtils |
| evaluation_dataset.js | 250+ | Feature | P2 | High | CoreUtils |
| editor.js | 400+ | Feature | P2 | High | CoreUtils |
| cost_logic.js | 350+ | Logic | P2 | High | CoreUtils |
| profile_logic.js | 300+ | Logic | P2 | High | CoreUtils |
| error-helpers.js | 200+ | Utility | P2 | High | - |
| ux-feedback.js | 200+ | Utility | P2 | High | - |

---

## Critical Element IDs by Module

### chat.js (30+ IDs)
```
#chat-input, #chat-send, #chat-messages
#chat-model, #chat-temperature, #chat-max-tokens
#chat-multi-query, #chat-final-k, #chat-confidence
#chat-show-* (8 toggles)
#chat-save-settings, #chat-reset-settings
#history-dropdown, #chat-storage-display
```

### config.js (50+ IDs)
```
[name="*"] - All env fields
#repos-section
[name="repo_path_*"], [name="repo_keywords_*"]
[name="repo_excludepaths_*"], [name="repo_pathboosts_*"]
[name="repo_layerbonuses_*"]
#kw-filter-*, #kw-all-*, #kw-repo-*
#exclude-path-input-*, #exclude-path-add-*
```

### eval_runner.js (20+ IDs)
```
#eval-golden-path, #eval-baseline-path
#eval-use-multi, #eval-final-k, #eval-sample-size
#btn-eval-run, #btn-eval-save-settings
#btn-eval-save-baseline, #btn-eval-compare, #btn-eval-export
#eval-progress, #eval-progress-bar, #eval-status
#eval-results, #eval-details, #eval-comparison
#eval-*-acc (3 accuracy metrics)
```

### tabs.js & navigation.js (40+ IDs)
```
.tab-content, .tab-bar button
[data-tab], [data-subtab]
#tab-*, #tab-rag-*, #tab-profiles-*, etc.
.subtab-btn, .section-subtab
#rag-subtabs, #profiles-subtabs, etc.
#nav-breadcrumb
```

---

## Critical Global State

| Variable | Module | Type | Solution |
|----------|--------|------|----------|
| window.chatMessages | chat.js | Array | Zustand store |
| window.chatSettings | chat.js | Object | Zustand store |
| window.lastChatEventId | chat.js | String | useRef |
| window.evalResults | eval_runner.js | Object | Zustand store |
| window._evalWarning | eval_runner.js | String | useState |
| window.CoreUtils | core-utils.js | Object | Custom hooks + Context |
| window.Navigation | navigation.js | Object | useNavigation() hook |
| window.Tabs | tabs.js | Object | Remove (use React Router) |
| window.NavigationViews | navigation.js | Object | Context |
| window.ErrorHelpers | error-helpers.js | Object | Error boundary hook |
| window.UXFeedback | ux-feedback.js | Object | Toast context |
| window.Theme | theme.js | Object | Theme context |

---

## API Endpoints by Module

### chat.js
- `POST /api/chat` - Send message
- `GET /api/prices` - Get models

### config.js
- `GET /api/config` - Load
- `POST /api/config` - Save
- `POST /api/env/reload` - Reload
- `POST /api/keywords/add` - Add keyword
- `POST /api/repos/{name}/validate-path` - Validate
- `GET /api/prices` - Get pricing

### eval_runner.js
- `POST /api/eval/run` - Start
- `GET /api/eval/status` - Poll (1000ms)
- `GET /api/eval/results` - Results
- `POST /api/eval/baseline/save` - Save
- `GET /api/eval/baseline/compare` - Compare

### dashboard-metrics.js
- `GET /api/tracking` - Tracking
- `GET /api/index/stats` - Stats
- `GET /api/reranker/logs` - Logs

### alerts.js
- `GET /monitoring/alert-thresholds` - Load
- `POST /monitoring/alert-thresholds` - Save

---

## Event Listener Patterns

### Pattern 1: Button Clicks
```javascript
// Legacy
document.getElementById('btn-eval-run').addEventListener('click', runEvaluation);

// React
<button onClick={runEvaluation}>Run Evaluation</button>
// or
const ref = useRef<HTMLButtonElement>(null);
useEffect(() => {
  ref.current?.addEventListener('click', runEvaluation);
}, []);
```

### Pattern 2: Form Input Changes
```javascript
// Legacy
field.addEventListener('change', saveChatSettings);

// React
const [settings, setSettings] = useState({});
const handleChange = (e) => {
  setSettings({ ...settings, [e.target.name]: e.target.value });
};
<input onChange={handleChange} />
```

### Pattern 3: Keyboard Handlers
```javascript
// Legacy
input.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && e.ctrlKey) sendMessage();
});

// React
const handleKeyDown = (e) => {
  if (e.key === 'Enter' && e.ctrlKey) sendMessage();
};
<input onKeyDown={handleKeyDown} />
```

### Pattern 4: Polling Intervals
```javascript
// Legacy
evalPollingInterval = setInterval(checkStatus, 1000);
// cleanup: clearInterval(evalPollingInterval);

// React
useEffect(() => {
  const interval = setInterval(checkStatus, 1000);
  return () => clearInterval(interval);
}, []);
```

### Pattern 5: Window/Document Listeners
```javascript
// Legacy
document.addEventListener('click', closeDropdown);

// React
useEffect(() => {
  const handleClick = (e) => {
    if (!e.target.closest('#dropdown')) {
      // close
    }
  };
  document.addEventListener('click', handleClick);
  return () => document.removeEventListener('click', handleClick);
}, []);
```

---

## Known Bugs to Fix

### 1. Boolean Environment Variables
**Found in:** config.js, any module reading booleans

**Problem:**
```javascript
if (env.SOME_FLAG) { ... } // WRONG - string "False" is truthy!
```

**Fix:**
```javascript
if (String(env.SOME_FLAG) === '1') { ... } // CORRECT
```

### 2. Subtab Navigation ID Mismatch
**Found in:** tabs.js, navigation.js

**Problem:**
```html
<!-- data-subtab doesn't always match ID pattern -->
<button data-subtab="some-id">Tab</button>
<!-- Creates: #tab-rag-some-id ? -->
<!-- But maybe it's #tab-rag-someid or #someid ? -->
```

**Solution:**
```javascript
// Ensure pattern consistency:
// <button data-subtab="data-quality"> → #tab-rag-data-quality
// <button data-subtab="retrieval"> → #tab-rag-retrieval
```

### 3. Absolute Paths
**Found in:** config.js, indexing.js, docker.js

**Problem:**
```javascript
const path = '/Users/davidmontgomery/agro-rag-engine/...';
```

**Fix:**
```javascript
const path = process.env.REPO_ROOT || './';
```

---

## Conversion Checklist Template

Use this for each module conversion:

```markdown
### [ ] ModuleName.js Conversion

**File:** `/gui/js/modulename.js` (XXX lines)

**Phase:** [Phase 1/2/3/4]

**Prerequisites:**
- [ ] Dependencies converted
- [ ] Element IDs identified
- [ ] API endpoints mapped
- [ ] Global state identified

**Conversion:**
- [ ] Extract component structure
- [ ] Create useHooks for logic
- [ ] Convert DOM refs (getElementById → useRef)
- [ ] Convert event listeners (addEventListener → onClick/onChange)
- [ ] Convert API calls (fetch → useApi hook)
- [ ] Convert global state (window.* → Context/Zustand)
- [ ] Convert localStorage (→ custom hook)
- [ ] Remove intervals/timers (→ useEffect cleanup)
- [ ] Remove innerHTML assignments (→ JSX)
- [ ] Add TypeScript types

**Testing:**
- [ ] All UI elements render
- [ ] All buttons/forms work
- [ ] API calls succeed
- [ ] No console errors
- [ ] Smoke test passed
- [ ] Playwright tests pass

**Integration:**
- [ ] Component placed in correct folder
- [ ] Exports properly
- [ ] No import cycles
- [ ] Documentation updated

**Sign-off:**
- Developer: _____
- Reviewer: _____
- QA: _____
```

---

## Tools & Utilities Summary

### For State Management
- **Simple:** React Context + useState
- **Medium:** Zustand (global state)
- **Complex:** Redux Toolkit

### For API Calls
- **Simple:** fetch + custom useApi hook
- **Better:** TanStack Query (React Query)
- **Complex:** GraphQL + Apollo

### For Forms
- **Simple:** Controlled components
- **Better:** react-hook-form + Zod
- **Complex:** Formik

### For Routing
- **Simple:** React Router v6
- **Custom:** Context-based routing

### For Testing
- **Unit:** Vitest + React Testing Library
- **E2E:** Playwright (already using)
- **Coverage:** c8 or nyc

---

## File Structure for React Version

```
/web/src/
├── components/
│   ├── Chat/
│   │   ├── ChatInterface.tsx
│   │   ├── ChatHistory.tsx
│   │   └── ChatSettings.tsx
│   ├── Config/
│   │   ├── ConfigForm.tsx
│   │   ├── KeywordManager.tsx
│   │   └── RepoSettings.tsx
│   ├── Evaluation/
│   │   ├── EvaluationRunner.tsx
│   │   └── EvaluationResults.tsx
│   └── ...
├── hooks/
│   ├── useApi.ts
│   ├── useGlobalState.ts
│   ├── useNavigation.ts
│   ├── useChat.ts
│   └── ...
├── stores/
│   ├── chatStore.ts
│   ├── configStore.ts
│   └── ...
├── contexts/
│   ├── NavigationContext.tsx
│   ├── ErrorContext.tsx
│   └── ...
└── types/
    ├── chat.ts
    ├── config.ts
    └── ...
```

---

## Conversion Timeline Estimate

| Phase | Modules | Timeline | Owner |
|-------|---------|----------|-------|
| Foundation | CoreUtils, ErrorHelpers | Week 1 | Frontend lead |
| Navigation | tabs.js, navigation.js | Week 1-2 | Frontend lead |
| Core Features | chat.js, config.js, eval_runner.js | Week 2-3 | Full team |
| Supporting | alerts, indexing, etc. | Week 3-4 | Full team (parallel) |
| Integration | Remaining + Cleanup | Week 4-5 | Full team |
| Testing & QA | Smoke + E2E tests | Week 5 | QA |

**Total Estimated Effort:** 5 weeks (with parallel work)

---

## Critical Success Factors

1. **DO NOT** run legacy JS + React simultaneously (too many conflicts)
2. **DO** convert dependencies first (CoreUtils → All others)
3. **DO** test after each phase before moving to next
4. **DO** keep feature parity (every legacy module must work in React)
5. **DO** document as you go (helps future maintenance)

6. **DON'T** hardcode absolute paths
7. **DON'T** use `innerHTML` in React
8. **DON'T** attach event listeners after React render
9. **DON'T** mix localStorage with React state carelessly
10. **DON'T** forget cleanup functions in useEffect

---

## Quick Commands

```bash
# Find all modules depending on a specific module
grep -r "CoreUtils\|ErrorHelpers\|UXFeedback" /gui/js/*.js

# Count total lines of legacy code
find /gui/js -name "*.js" -exec wc -l {} + | tail -1

# Find all element ID patterns
grep -h "getElementById\|querySelector" /gui/js/*.js | head -50

# Check for global window assignments
grep -r "window\." /gui/js/*.js | grep -v "window\.addEventListener"

# List all API endpoints called
grep -rh "fetch\|\.api\(" /gui/js/*.js | grep -o "'/[^']*'" | sort -u
```

---

## Common Mistakes to Avoid

### ❌ DON'T: Use refs like this
```typescript
// Bad - ref persists across renders
const inputEl = document.getElementById('chat-input');

// Good - use useRef
const inputRef = useRef<HTMLInputElement>(null);
<input ref={inputRef} />
inputRef.current?.focus();
```

### ❌ DON'T: Mix window globals with React state
```typescript
// Bad
window.chatMessages = [...messages];

// Good
const [messages, setMessages] = useState([]);
// or use Zustand store
```

### ❌ DON'T: Forget to clean up effects
```typescript
// Bad - memory leak!
useEffect(() => {
  const interval = setInterval(checkStatus, 1000);
  // No cleanup!
}, []);

// Good
useEffect(() => {
  const interval = setInterval(checkStatus, 1000);
  return () => clearInterval(interval);
}, []);
```

### ❌ DON'T: Create elements in components
```typescript
// Bad - lost between renders
const container = document.createElement('div');
container.innerHTML = '<div>Hello</div>';

// Good - use JSX
<div>Hello</div>
```

---

## Resources

- React Docs: https://react.dev
- React Hook Rules: https://react.dev/reference/rules/rules-of-hooks
- Testing Library: https://testing-library.com/docs/react-testing-library/intro/
- Zustand: https://github.com/pmndrs/zustand
- react-hook-form: https://react-hook-form.com/

