# RAG Subtabs Zustand Migration - Handoff Document

## Session Summary (Nov 30, 2025)

### What Was Done

**Config values migrated to Zustand get()/set() in LearningRankerSubtab.tsx:**
1. `AGRO_LOG_PATH` (logPath)
2. `AGRO_TRIPLETS_PATH` (tripletsPath)
3. `AGRO_RERANKER_ALPHA` (blendAlpha)
4. `AGRO_RERANKER_MAXLEN` (maxSeqLength)
5. `AGRO_RERANKER_BATCH` (batchSize)
6. `AGRO_RERANKER_TOPN` (rerankerTopN)

**Config values migrated in DataQualitySubtab.tsx:**
1. `CARDS_MAX` (cardsMax)

**Bug fix attempted in RepositoryConfig.tsx:**
- Added `setLoading(false)` to fix infinite loading spinner
- **STATUS: INCOMPLETE** - `useConfig` is imported but never used
- Component still uses useState for repo data instead of proper patterns

### What Still Needs To Be Done

#### RepositoryConfig.tsx - NOT PROPERLY FIXED
The component imports `useConfig` but never uses it:
```tsx
import { useConfig } from '@/hooks';  // Line 6 - IMPORTED BUT NEVER USED
```

useState declarations that may need review:
- `repoData`, `repoPath`, `excludePaths`, `keywords`, `pathBoosts`, `layerBonuses`
- These load from `repos.json` via `/api/repos/{repo}` - NOT from agro_config.json
- **Question for user**: Should repos.json data be migrated to Pydantic/agro_config.json?

#### LearningRankerSubtab.tsx - 7 Remaining useState violations
Run test to see current state:
```bash
python -m pytest tests/test_react_config_migration.py::test_no_usestate_for_config_values -v
```

Remaining config values to migrate:
1. `voyageRerankerModel` -> `VOYAGE_RERANK_MODEL`
2. `trainEpochs` -> `RERANKER_TRAIN_EPOCHS`
3. `trainBatchSize` -> `RERANKER_TRAIN_BATCH`
4. `trainMaxLength` -> `RERANKER_TRAIN_MAX_LENGTH`
5. `trainLearningRate` -> `RERANKER_TRAIN_LR`
6. `warmupRatio` -> `RERANKER_WARMUP_RATIO`
7. `tripletsMinCount` -> `TRIPLETS_MIN_COUNT`

#### ExternalRerankersSubtab.tsx - 2 Remaining useState violations
1. `cloudModel` -> `RERANKER_CLOUD_MODEL`
2. `snippetChars` -> `RERANK_INPUT_SNIPPET_CHARS`

### Pattern to Follow

**WRONG (current broken pattern):**
```tsx
const [configValue, setConfigValue] = useState(defaultValue);

useEffect(() => {
  if (!loading) {
    setConfigValue(get('CONFIG_KEY', defaultValue));
  }
}, [loading, get]);

// In onChange:
onChange={handleConfigValueChange}
onBlur={handleConfigValueBlur}
```

**CORRECT (per CLAUDE.md):**
```tsx
// NO useState for config values

// In JSX:
value={get('CONFIG_KEY', defaultValue)}
onChange={(e) => set('CONFIG_KEY', parseType(e.target.value))}
```

### Files Modified This Session

1. `web/src/components/RAG/DataQualitySubtab.tsx`
   - Removed useState for cardsMax
   - Uses get()/set() directly

2. `web/src/components/RAG/RepositoryConfig.tsx`
   - Added setLoading(false) in useEffect
   - **INCOMPLETE**: Still has unused useConfig import, repos.json data not migrated

3. `web/src/components/RAG/LearningRankerSubtab.tsx`
   - Migrated 6 config values to Zustand
   - 7 more remaining

4. `tests/test_react_config_migration.py`
   - Updated test to catch useState for config values

### Test Commands

```bash
# Check useState violations
python -m pytest tests/test_react_config_migration.py::test_no_usestate_for_config_values -v

# Run all config migration tests
python -m pytest tests/test_react_config_migration.py -v

# Playwright smoke test
npx playwright test --config=playwright.web.config.ts --reporter=list
```

### Git Commits Made

```
4be47e9 fix: CARDS_MAX uses Zustand get()/set() directly, fix RepositoryConfig loading bug
4e5936c fix: AGRO_LOG_PATH uses Zustand get()/set() directly in LearningRankerSubtab
2b6b13d fix: AGRO_TRIPLETS_PATH uses Zustand get()/set() directly
e6a9883 fix: AGRO_RERANKER_ALPHA uses Zustand get()/set() directly
e63c00f fix: AGRO_RERANKER_MAXLEN uses Zustand get()/set() directly
40502a2 fix: AGRO_RERANKER_BATCH uses Zustand get()/set() directly
2b0d58f fix: AGRO_RERANKER_TOPN uses Zustand get()/set() directly
```

### Critical Rules from CLAUDE.md

1. **NO useState for config values** - use get()/set() from Zustand store directly
2. **All config must be Pydantic-backed** in agro_config.json
3. **No stubs, placeholders, TODOs**
4. **Run Playwright smoke tests before reporting success**
5. **Ask user before committing**

### Open Questions

1. **repos.json vs agro_config.json**: RepositoryConfig.tsx loads data from repos.json which is explicitly NOT Pydantic-backed (see comment in `server/routers/repos.py` line 29). Should this be migrated?

2. **UI-only state vs config state**: Some useState in components is for UI state (loading, saving, showModal) which is appropriate. Only CONFIG values need Zustand.

### Next Steps

1. Clarify RepositoryConfig.tsx situation with user
2. Continue migrating remaining 7 config values in LearningRankerSubtab.tsx
3. Migrate 2 config values in ExternalRerankersSubtab.tsx
4. Run full test suite
5. Review other RAG subtabs for similar issues

