---
paths: web/src/hooks/**/*.ts
---

# Custom Hook Conventions

Complete list of React hooks in `/web/src/hooks/`.

## Complete Hook List (27 hooks)

### App Lifecycle Hooks

**useAppInit**
App initialization sequence - loads config, repos, keywords, models, profiles.
```typescript
const { initialized, loading, error } = useAppInit();
```

**useModuleLoader**
Legacy JS module loading for backward compatibility.
```typescript
const { loaded, error } = useModuleLoader('moduleName');
```

**useEventBus**
Event communication between components.
```typescript
const { emit, on, off } = useEventBus();
```

**useGlobalState**
Global app state management.
```typescript
const { state, setState } = useGlobalState();
```

**useApplyButton**
Global save changes handler for Apply button.
```typescript
const { hasChanges, apply, discard } = useApplyButton();
```

**useNotification**
Toast notification system.
```typescript
const { notify, notifications, dismiss } = useNotification();
notify({ message: 'Saved!', type: 'success' });
```

**useErrorHandler**
Centralized error handling.
```typescript
const { handleError, lastError, clearError } = useErrorHandler();
```

### Core Utility Hooks

**useAPI**
Base API utilities and request helpers.
```typescript
const { get, post, put, del, loading, error } = useAPI();
```

**useTheme**
Theme management (dark/light mode).
```typescript
const { theme, setTheme, toggleTheme } = useTheme();
```

**useUIHelpers**
UI utility functions.
```typescript
const { scrollToTop, copyToClipboard, formatDate } = useUIHelpers();
```

**useTooltips**
Tooltip content by setting key.
```typescript
const { tooltips, getTooltip } = useTooltips();
```

**useGlobalSearch**
Global search functionality.
```typescript
const { query, results, search, clear } = useGlobalSearch();
```

### Navigation Hooks

**useNavigation**
Route navigation helpers.
```typescript
const { navigate, goBack, currentPath } = useNavigation();
```

**useTabs**
Tab state management.
```typescript
const { activeTab, setActiveTab, tabs } = useTabs();
```

**useVSCodeEmbed**
VS Code integration for embedded editor.
```typescript
const { isReady, sendMessage, onMessage } = useVSCodeEmbed();
```

### Config Management Hooks

**useConfig**
Full config management with debounced saves (300ms).
```typescript
const { config, get, set, saveNow, reload, loading, error, clearError } = useConfig();

const value = get('RRF_K_DIV', 60);  // Read with default
set('RRF_K_DIV', 80);                // Write (debounced)
await saveNow();                      // Immediate save
```

**useConfigField**
Single-field access (simplified API).
```typescript
const [value, setValue, { loading, error }] = useConfigField('KEY', defaultValue);
```

### Feature Hooks

**useDashboard**
Dashboard data and stats.
```typescript
const { stats, loading, refresh } = useDashboard();
```

**useIndexing**
Indexing status and control.
```typescript
// Type: IndexStatus
const { status, startIndex, stopIndex, loading } = useIndexing();
```

**useModels**
Model lists from backend (embedding, generation, rerank).
```typescript
// Type: Model
// Also exports: getRecommendedChunkSize
const { models, loading, error, refresh } = useModels();
```

**useReranker**
Reranker configuration and status.
```typescript
const { mode, provider, model, getInfo, setMode } = useReranker();
```

**useKeywords**
Keyword management for search boosting.
```typescript
const { keywords, addKeyword, deleteKeyword, loading } = useKeywords();
```

**useMCPRag**
MCP server integration for RAG operations.
```typescript
const { servers, status, query } = useMCPRag();
```

**useCards**
Cards/knowledge card management.
```typescript
const { cards, buildCards, deleteCard, loading } = useCards();
```

**useOnboarding**
Onboarding wizard state and progress.
```typescript
const { step, nextStep, prevStep, complete, skip } = useOnboarding();
```

**useStorageCalculator**
Storage estimation and optimization.
```typescript
const { estimate, calculate, loading } = useStorageCalculator();
```

**useEmbeddingStatus**
Critical embedding mismatch detection.
```typescript
// Type: EmbeddingStatus
const { status, mismatch, warning } = useEmbeddingStatus();
```

**useEvalHistory**
Evaluation history and results.
```typescript
const { history, latest, loading, refresh } = useEvalHistory();
```

## API Key Status Pattern (Gold Standard)

API keys are NEVER exposed to frontend. Check existence only:

```typescript
function useApiKeyStatus(provider: string) {
  const [configured, setConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const keyName = `${provider.toUpperCase()}_API_KEY`;
    fetch(`/api/secrets/check?keys=${keyName}`)
      .then(r => r.json())
      .then(data => setConfigured(data[keyName] === true))
      .catch(() => setConfigured(null));
  }, [provider]);

  return configured;  // true/false/null only, NEVER the key value
}
```

Reference: `RerankerConfigSubtab.tsx` lines 79-100

## Hook Return Pattern

Always include loading/error states:
```typescript
return {
  data,
  loading,
  error,
  refresh,    // Re-fetch data
  mutate,     // Modify data
  clearError, // Clear error state
};
```

## All Hook Files (29 files)

- `web/src/hooks/index.ts` - Main barrel export
- `web/src/hooks/hooks_index.ts` - Alternate barrel export
- `web/src/hooks/useAPI.ts` - API utilities
- `web/src/hooks/useAppInit.ts` - App initialization
- `web/src/hooks/useApplyButton.ts` - Apply button handler
- `web/src/hooks/useCards.ts` - Cards management
- `web/src/hooks/useConfig.ts` - Config management (critical)
- `web/src/hooks/useDashboard.ts` - Dashboard data
- `web/src/hooks/useEmbeddingStatus.ts` - Embedding mismatch detection
- `web/src/hooks/useErrorHandler.ts` - Error handling
- `web/src/hooks/useEvalHistory.ts` - Evaluation history
- `web/src/hooks/useEventBus.ts` - Event communication
- `web/src/hooks/useGlobalSearch.ts` - Global search
- `web/src/hooks/useGlobalState.ts` - Global state
- `web/src/hooks/useIndexing.ts` - Indexing status
- `web/src/hooks/useKeywords.ts` - Keywords management
- `web/src/hooks/useMCPRag.ts` - MCP integration
- `web/src/hooks/useModels.ts` - Model lists
- `web/src/hooks/useModuleLoader.ts` - Legacy module loading
- `web/src/hooks/useNavigation.ts` - Navigation helpers
- `web/src/hooks/useNotification.ts` - Toast notifications
- `web/src/hooks/useOnboarding.ts` - Onboarding wizard
- `web/src/hooks/useReranker.ts` - Reranker config
- `web/src/hooks/useStorageCalculator.ts` - Storage estimation
- `web/src/hooks/useTabs.ts` - Tab management
- `web/src/hooks/useTheme.ts` - Theme management
- `web/src/hooks/useTooltips.ts` - Tooltip content
- `web/src/hooks/useUIHelpers.ts` - UI utilities
- `web/src/hooks/useVSCodeEmbed.ts` - VS Code integration
