# HANDOFF: RetrievalSubtab.tsx React/Zustand Refactor

## Status: INCOMPLETE - BROKEN - Needs Full Refactor

## Problem
`RetrievalSubtab.tsx` was **destructively refactored** and is **broken**:

1. **Stuck on "Loading configuration..."** - The `useConfig()` hook's `loading` state never resolves properly
2. **~333 LINES ERASED** - Original was 1394 lines, current is 1061 lines
3. **All agentspec docstrings removed** - The detailed documentation for each function was erased
4. **Not following proper React patterns** - Component needs controlled inputs with proper state sync
5. **No error handling** - Backend failures leave component stuck

## What Was ERASED (must be restored from backup)

The `.bak` file at `RetrievalSubtab.tsx.bak` contains:
- Full agentspec docstrings for `loadConfig()` function (lines ~114-168)
- Full agentspec docstrings for `updateConfig()` function (lines ~256-306)
- Detailed comments explaining security considerations for API keys
- onBlur handlers for proper save timing (not hammering backend on every keystroke)
- Proper error handling with `alert()` for failed config updates

## What Was Done (WRONG approach)
- Replaced 60+ `useState` with direct `get(key, default)` / `set(key, value)` calls
- Removed manual `loadConfig()` and `updateConfig()` functions
- Removed duplicate fetch logic
- **BUT: Removed onBlur handlers, now calls set() on every onChange = hammers backend**
- **BUT: Removed agentspec docstrings = lost documentation**
- **BUT: set() on onChange causes infinite re-renders / performance issues**

## RESTORE FROM BACKUP FIRST

```bash
cp web/src/components/RAG/RetrievalSubtab.tsx.bak web/src/components/RAG/RetrievalSubtab.tsx
```

Then refactor PROPERLY using the pattern below.

## What Still Needs To Be Done

### 0. RESTORE THE ORIGINAL FILE
The current file is broken. Restore from `.bak` and refactor correctly.

### 1. Fix the Loading State Issue
The `useConfig()` hook returns `loading: true` but the config store may not be setting it to `false` properly after load fails.

Check `web/src/hooks/useConfig.ts` lines 47-51:
```tsx
useEffect(() => {
  if (!config && !loading) {
    loadConfig();
  }
}, [config, loading, loadConfig]);
```

The store's `loadConfig()` in `web/src/stores/useConfigStore.ts` needs to handle errors and still set `loading: false`.

### 2. Proper Controlled Input Pattern

**THE ORIGINAL HAD THE RIGHT PATTERN** - using `onBlur` for saves:

```tsx
// ORIGINAL CORRECT PATTERN (from .bak file):
<input
  type="number"
  value={genTemperature}
  onChange={(e) => setGenTemperature(parseFloat(e.target.value) || 0.0)}
  onBlur={() => updateConfig('GEN_TEMPERATURE', genTemperature)}
  min={0}
  max={2}
  step={0.01}
/>
```

**MY BROKEN PATTERN** - hammers backend on every keystroke:
```tsx
// WRONG - calls set() on every keystroke = 100s of API calls
<input
  type="number"
  value={get('GEN_TEMPERATURE', 0.0)}
  onChange={(e) => set('GEN_TEMPERATURE', parseFloat(e.target.value) || 0.0)}
/>
```

**CORRECT ZUSTAND PATTERN** - local state + onBlur OR debounce:
```tsx
// Option A: Keep local state, save onBlur
const [localTemp, setLocalTemp] = useState(get('GEN_TEMPERATURE', 0.0));

useEffect(() => {
  setLocalTemp(get('GEN_TEMPERATURE', 0.0));
}, [config]);

<input
  value={localTemp}
  onChange={(e) => setLocalTemp(parseFloat(e.target.value) || 0.0)}
  onBlur={() => set('GEN_TEMPERATURE', localTemp)}
/>

// Option B: Use useConfigField hook (if available)
const [temp, setTemp] = useConfigField('GEN_TEMPERATURE', 0.0);
```

### 3. Reference Implementation
Look at how `IndexingSubtab.tsx` handles this - it uses `useRepoStore` for repos and local state for form values that get synced on user action.

### 4. The useConfig Hook API
From `web/src/hooks/useConfig.ts`:
```tsx
const { get, set, loading, error, config } = useConfig();

// Read: get('KEY', defaultValue) - returns typed value
// Write: set('KEY', value) OR set({ KEY1: val1, KEY2: val2 })
// set() is debounced (300ms) and auto-saves to backend
```

## Files To Modify

1. **`web/src/components/RAG/RetrievalSubtab.tsx`** - Main component, needs full refactor
2. **`web/src/hooks/useConfig.ts`** - May need error handling fixes
3. **`web/src/stores/useConfigStore.ts`** - May need loading state fixes

## Key Requirements (from CLAUDE.md)

1. **NO local useState for config values** - use Zustand store via `useConfig()`
2. **All settings must persist to backend** via Pydantic config
3. **Must pass Playwright smoke test** before reporting done
4. **No stubs/placeholders/TODOs**

## Current Component Structure

The RetrievalSubtab has 4 sections:
1. **Generation Models** - GEN_MODEL, API keys, temperature, etc.
2. **Retrieval Parameters** - FINAL_K, TOPK_DENSE, BM25 weights, etc.
3. **Advanced RAG Tuning** - RRF_K_DIV, layer bonuses, filename boosts
4. **Routing Trace** - LangSmith/LangTrace integration

Each section has 10-20 config fields that need proper controlled input handling.

## Testing

1. Start backend: `./scripts/dev_up.sh`
2. Start frontend: `cd web && npm run dev`
3. Navigate to http://localhost:5173/web/rag → Retrieval tab
4. Verify all form fields load with correct values
5. Verify changes persist after page reload

## Priority

HIGH - This is a core configuration component for the RAG engine.

