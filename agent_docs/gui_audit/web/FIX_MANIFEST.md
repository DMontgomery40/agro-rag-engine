# GUI FIX MANIFEST
## Organized Implementation Plan for 100 RAG Parameters

**Based On:** MASTER_AUDIT.md
**Date:** 2025-11-20
**Total Fixes Required:** 85 issues across 12 files

---

## IMPLEMENTATION ORDER

### Phase 0: Schema Resolution (BEFORE ANY CODE)
### Phase 1: Backend Fixes (1 file)
### Phase 2: Fix Broken Controls (5 files)
### Phase 3: Add Missing Controls (7 files)
### Phase 4: New Components (2 files)
### Phase 5: Testing (1 file)

---

# PHASE 0: SCHEMA RESOLUTION (Required First)

## Decision Points (No Code Until Resolved)

### Decision 1: Scoring Parameter Schema

**Issue:** Backend and spec have 10x value differences

| Parameter | Spec Says | Backend Has | Which is Correct? |
|-----------|-----------|-------------|-------------------|
| CARD_BONUS | 1.5 (1.0-3.0) | 0.08 (0.0-1.0) | ❓ DECIDE |
| LAYER_BONUS_GUI | 1.2 (1.0-3.0) | 0.15 (0.0-0.5) | ❓ DECIDE |
| LAYER_BONUS_RETRIEVAL | 1.15 (1.0-3.0) | 0.15 (0.0-0.5) | ❓ DECIDE |
| LAYER_BONUS_INDEXER | 1.1 (1.0-3.0) | 0.15 (0.0-0.5) | ❓ DECIDE |
| VENDOR_PENALTY | 0.8 (0.0-1.0) | -0.1 (-0.5-0.0) | ❓ DECIDE |
| FRESHNESS_BONUS | 1.1 (1.0-2.0) | 0.05 (0.0-0.3) | ❓ DECIDE |

**Resolution Required:**
- [ ] Check `common/metadata.py` to see how these are actually used
- [ ] Determine if they're multipliers (1.0-3.0) or additive bonuses (0.0-0.5)
- [ ] Update either backend or spec to match reality
- [ ] Document decision in this file

### Decision 2: TRIPLETS_MINE_MODE Enum

**Issue:** Backend and spec have different enums

- Backend (`agro_config_model.py:710`): `["replace", "append"]`
- Spec: `["hard", "semi-hard", "easy"]`

**Resolution Required:**
- [ ] Check actual usage in training pipeline
- [ ] Decide which enum is correct
- [ ] Update backend OR spec
- [ ] Document decision

**⛔ DO NOT PROCEED WITH IMPLEMENTATION UNTIL DECISIONS MADE ⛔**

---

# PHASE 1: BACKEND FIXES

## File: `server/services/config_store.py`

### Fix 1: Expand config_schema() to Include All 100 Params

**Location:** Lines 435-599
**Current:** Only ~20 params defined manually
**Needed:** Generate from Pydantic models

**Implementation:**

```python
def config_schema() -> Dict[str, Any]:
    """Generate config schema from Pydantic models."""
    from server.models.agro_config_model import AgroConfigRoot

    # Get full Pydantic schema
    pydantic_schema = AgroConfigRoot.model_json_schema()

    # Convert to GUI-friendly format
    gui_schema = {"properties": {}}

    # Map Pydantic structure to flat GUI format
    for category_name, category_schema in pydantic_schema['$defs'].items():
        if 'properties' in category_schema:
            for field_name, field_schema in category_schema['properties'].items():
                # Extract type, range, description from Pydantic schema
                gui_schema['properties'][field_name.upper()] = {
                    "type": field_schema.get("type"),
                    "default": field_schema.get("default"),
                    "minimum": field_schema.get("minimum"),
                    "maximum": field_schema.get("maximum"),
                    "enum": field_schema.get("enum") or field_schema.get("pattern"),
                    "description": field_schema.get("description")
                }

    return gui_schema
```

**Verification:**
```bash
curl http://localhost:8012/api/config-schema | jq 'keys | length'
# Expected: 100+ (all AGRO_CONFIG_KEYS)
```

**Effort:** 2 hours

---

## File: `server/models/agro_config_model.py` (if needed)

### Fix 2: Update TRIPLETS_MINE_MODE Enum (After Decision)

**Location:** Lines 710-714
**Current:** `pattern="^(replace|append)$"`
**Change To:** Match decision from Phase 0

**Implementation (if spec is correct):**
```python
triplets_mine_mode: str = Field(
    default="hard",
    pattern="^(hard|semi-hard|easy)$",
    description="Triplet mining difficulty"
)
```

**Verification:**
```bash
python3 -c "from server.models.agro_config_model import TrainingConfig; print(TrainingConfig().triplets_mine_mode)"
```

**Effort:** 30 min

---

# PHASE 2: FIX BROKEN CONTROLS

## File 1: `web/src/components/RAG/IndexingSubtab.tsx`

### Fix 1: Wire CHUNK_SIZE (Lines 509-517)

**Issue:** Input exists, no onChange handler

**Current Code:**
```tsx
<input
  type="number"
  name="CHUNK_SIZE"
  defaultValue="1000"
  min="128"
  max="2048"
/>
```

**Required Changes:**
```tsx
const [chunkSize, setChunkSize] = useState(512);

// In useEffect:
useEffect(() => {
  if (config?.env) {
    setChunkSize(Number(config.env.CHUNK_SIZE) || 512);
  }
}, [config]);

// In JSX:
<input
  type="number"
  name="CHUNK_SIZE"
  value={chunkSize}
  min="128"
  max="2048"
  onChange={(e) => {
    const val = Number(e.target.value);
    setChunkSize(val);
    updateEnv('CHUNK_SIZE', val);
  }}
  data-tooltip="Target chunk size in non-whitespace characters"
/>
```

**Effort:** 20 min

### Fix 2: Wire CHUNK_OVERLAP (Lines 520-528)

**Issue:** Same as CHUNK_SIZE

**Implementation:** Same pattern as Fix 1

**Effort:** 15 min

### Fix 3: Fix INDEXING_WORKERS Name (Line 534)

**Issue:** GUI uses `INDEX_MAX_WORKERS`, backend expects `INDEXING_WORKERS`

**Current:**
```tsx
<input name="INDEX_MAX_WORKERS" defaultValue="4" />
```

**Change To:**
```tsx
const [indexingWorkers, setIndexingWorkers] = useState(4);

useEffect(() => {
  if (config?.env) {
    setIndexingWorkers(Number(config.env.INDEXING_WORKERS) || 4);
  }
}, [config]);

<input
  type="number"
  name="INDEXING_WORKERS"  // CHANGED
  value={indexingWorkers}
  min="1"
  max="16"
  onChange={(e) => {
    const val = Number(e.target.value);
    setIndexingWorkers(val);
    updateEnv('INDEXING_WORKERS', val);  // CHANGED
  }}
/>
```

**Verification:**
```bash
# After fix, change value in GUI, check backend:
cat agro_config.json | jq '.indexing.indexing_workers'
```

**Effort:** 20 min

**Total File Effort:** 55 min

---

## File 2: `web/src/components/RAG/RetrievalSubtab.tsx`

### Fix 1: Rename MAX_QUERY_REWRITES (Lines 243-265)

**Issue:** GUI uses `MQ_REWRITES`, backend expects `MAX_QUERY_REWRITES`

**Current:**
```tsx
const [mqRewrites, setMqRewrites] = useState(3);

// Later:
updateEnv('MQ_REWRITES', value);  // WRONG KEY
```

**Change To:**
```tsx
const [maxQueryRewrites, setMaxQueryRewrites] = useState(3);  // RENAME

// Load from correct key:
useEffect(() => {
  if (config?.env) {
    setMaxQueryRewrites(Number(config.env.MAX_QUERY_REWRITES) || 3);  // CHANGED
  }
}, [config]);

// Update with correct key:
<input
  value={maxQueryRewrites}
  onChange={(e) => {
    const val = Number(e.target.value);
    setMaxQueryRewrites(val);
    updateEnv('MAX_QUERY_REWRITES', val);  // CHANGED
  }}
/>
```

**Verification:**
```bash
# Check backend uses correct key:
cat agro_config.json | jq '.retrieval.max_query_rewrites'
```

**Effort:** 30 min

**Total File Effort:** 30 min

---

## File 3: `web/src/components/RAG/LearningRankerSubtab.tsx`

### Fix 1: Wire AGRO_RERANKER_ENABLED (Lines 480-483)

**Issue:** Reads config, updates local state, but doesn't persist

**Current:**
```tsx
<select value={enabled} onChange={(e) => setEnabled(Number(e.target.value))}>
  <option value={0}>Disabled</option>
  <option value={1}>Enabled</option>
</select>
```

**Add:**
```tsx
<select
  value={enabled}
  onChange={async (e) => {
    const val = Number(e.target.value);
    setEnabled(val);
    // ADD THIS:
    await fetch(api('/api/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ env: { AGRO_RERANKER_ENABLED: val } })
    });
  }}
>
```

**Effort:** 15 min

### Fix 2-5: Wire ALPHA, BATCH, MAXLEN (Lines 568-601)

**Issue:** Same pattern - all read but don't persist

**Implementation:** Add API call to each onChange handler

**Parameters:**
- AGRO_RERANKER_ALPHA (line 576)
- AGRO_RERANKER_MAXLEN (line 588)
- AGRO_RERANKER_BATCH (line 600)

**Pattern:**
```tsx
onChange={async (e) => {
  const val = Number(e.target.value);
  setLocalState(val);
  await fetch(api('/api/config'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ env: { PARAM_NAME: val } })
  });
}}
```

**Effort:** 45 min (15 min × 3)

### Fix 6-7: Wire Training Params (Lines 37-38)

**Issue:** RERANKER_TRAIN_EPOCHS, RERANKER_TRAIN_BATCH exist but only sent to training endpoint

**Add:** Load from config on mount + save to config on change

```tsx
// Add state loading:
useEffect(() => {
  if (config?.env) {
    setEpochs(Number(config.env.RERANKER_TRAIN_EPOCHS) || 2);
    setTrainBatch(Number(config.env.RERANKER_TRAIN_BATCH) || 16);
  }
}, [config]);

// Add save handlers:
const handleEpochsChange = async (val) => {
  setEpochs(val);
  await fetch(api('/api/config'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ env: { RERANKER_TRAIN_EPOCHS: val } })
  });
};

// Same for RERANKER_TRAIN_BATCH
```

**Effort:** 30 min

**Total File Effort:** 1.5 hours

---

## File 4: `web/src/components/RAG/ExternalRerankersSubtab.tsx`

### Fix 1: Wire RERANKER_MODEL (Lines 144-150)

**Issue:** Reads config, no onChange API call

**Add:**
```tsx
<input
  value={localModel || ''}
  onChange={async (e) => {
    const val = e.target.value;
    setLocalModel(val);
    await fetch(api('/api/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ env: { RERANKER_MODEL: val } })
    });
  }}
/>
```

**Effort:** 15 min

### Fix 2: Wire COHERE_RERANK_MODEL (Lines 204-216)

**Issue:** Same as RERANKER_MODEL

**Implementation:** Add API call to onChange

**Effort:** 15 min

### Fix 3: Fix RERANKER_BACKEND Enum (Lines 130-141)

**Issue:** Missing "agro" option, no API call

**Current:**
```tsx
<select value={rerankBackend}>
  <option value="none">None</option>
  <option value="local">Local (HuggingFace)</option>
  <option value="hf">HuggingFace</option>
  <option value="cohere">Cohere</option>
</select>
```

**Change To:**
```tsx
<select
  value={rerankBackend}
  onChange={async (e) => {
    const val = e.target.value;
    setRerankBackend(val);
    await fetch(api('/api/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ env: { RERANKER_BACKEND: val } })
    });
  }}
>
  <option value="local">Local</option>
  <option value="cohere">Cohere</option>
  <option value="voyage">Voyage</option>
  <option value="agro">AGRO (Trained)</option>  {/* ADDED */}
</select>
```

**Effort:** 20 min

**Total File Effort:** 50 min

---

## File 5: `web/src/components/RAG/DataQualitySubtab.tsx`

### Fix 1: Wire CARDS_MAX + Fix Range (Lines 230-242)

**Issue:** Wrong range (has 0, should start at 10), no API persistence

**Current:**
```tsx
<input
  type="number"
  value={maxCards}
  min="0"  // WRONG
  max="50"  // WRONG
  onChange={(e) => setMaxCards(Number(e.target.value))}  // NO API CALL
/>
```

**Change To:**
```tsx
const [cardsMax, setCardsMax] = useState(10);

useEffect(() => {
  if (config?.env) {
    setCardsMax(Number(config.env.CARDS_MAX) || 10);
  }
}, [config]);

<input
  type="number"
  value={cardsMax}
  min="10"  // FIXED
  max="1000"  // FIXED (backend allows 10-1000)
  onChange={async (e) => {
    const val = Number(e.target.value);
    setCardsMax(val);
    await fetch(api('/api/config'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ env: { CARDS_MAX: val } })
    });
  }}
  data-tooltip="Maximum cards to generate per repository (0 = unlimited)"
/>
```

**Effort:** 20 min

**Total File Effort:** 20 min

---

## File 6: `web/src/components/Dashboard/EmbeddingConfigPanel.tsx`

### Fix 1: Fix EMBEDDING_DIM Key Name (Line 27)

**Issue:** Reads `EMBEDDING_DIMENSIONS` but backend uses `EMBEDDING_DIM`

**Current:**
```tsx
const dimensions = config.env.EMBEDDING_DIMENSIONS;  // WRONG KEY
```

**Change To:**
```tsx
const dimensions = config.env.EMBEDDING_DIM;  // CORRECT KEY
```

**Effort:** 5 min

**Total File Effort:** 5 min

---

## File 7: `web/src/components/Infrastructure/PathsSubtab.tsx`

### Fix 1: Resolve COLLECTION_NAME Duplication

**Issue:** COLLECTION_NAME exists here (working) AND in IndexingSubtab (not working)

**Decision:** Keep this one (it works), remove duplicate from IndexingSubtab

**Changes:**
1. In PathsSubtab.tsx: No changes needed (works correctly)
2. In IndexingSubtab.tsx: Remove lines 495-504 (duplicate control)
3. Add comment in IndexingSubtab: "Collection name configured in Infrastructure → Paths"

**Effort:** 10 min

**Total File Effort:** 10 min

---

# PHASE 3: ADD MISSING CONTROLS

## Pattern Template for All New Controls

**Standard Pattern:**

```tsx
// 1. Add state variable
const [paramName, setParamName] = useState(defaultValue);

// 2. Load from config on mount
useEffect(() => {
  if (config?.env) {
    setParamName(config.env.PARAM_NAME || defaultValue);
  }
}, [config]);

// 3. Render with appropriate input type
<div className="input-group">
  <label>Parameter Label</label>
  <input
    type="number"  // or "text", "range", etc.
    value={paramName}
    min="minValue"
    max="maxValue"
    onChange={async (e) => {
      const val = parseValue(e.target.value);  // Number() or String()
      setParamName(val);
      updateEnv('PARAM_NAME', val);  // Uses existing updateEnv from useConfigStore
    }}
    data-tooltip="Tooltip text from Pydantic description"
  />
</div>
```

**For Boolean Values (CRITICAL - Always use 1/0):**
```tsx
<select
  value={boolParam}
  onChange={async (e) => {
    const val = Number(e.target.value);  // MUST be Number, not Boolean
    setBoolParam(val);
    updateEnv('BOOL_PARAM', val);  // Will be 1 or 0
  }}
>
  <option value={0}>Disabled</option>
  <option value={1}>Enabled</option>
</select>
```

**For Enum Values:**
```tsx
<select
  value={enumParam}
  onChange={async (e) => {
    const val = e.target.value;
    setEnumParam(val);
    updateEnv('ENUM_PARAM', val);
  }}
>
  <option value="option1">Option 1</option>
  <option value="option2">Option 2</option>
  <option value="option3">Option 3</option>
</select>
```

---

## File 1: `web/src/components/RAG/RetrievalSubtab.tsx`

**Add 25 Missing Parameters**

### Section 1: Retrieval Parameters (12 params)

Add after existing FINAL_K control (~line 100):

1. **RRF_K_DIV** (int, 1-100, default 60)
2. **LANGGRAPH_FINAL_K** (int, 1-50, default 10)
3. **FALLBACK_CONFIDENCE** (float, 0.0-1.0, default 0.4)
4. **EVAL_FINAL_K** (int, 1-100, default 20)
5. **EVAL_MULTI** (bool 0/1, default 1)
6. **QUERY_EXPANSION_ENABLED** (bool 0/1, default 1)
7. **CARD_SEARCH_ENABLED** (bool 0/1, default 1)
8. **MULTI_QUERY_M** (int, 1-10, default 3)

**New Subsection: Hybrid Fusion Weights**

9. **BM25_WEIGHT** (float, 0.0-1.0, default 0.3)
10. **VECTOR_WEIGHT** (float, 0.0-1.0, default 0.7)

**New Subsection: Confidence Thresholds**

11. **CONF_TOP1** (float, 0.0-1.0, default 0.85)
12. **CONF_AVG5** (float, 0.0-1.0, default 0.75)
13. **CONF_ANY** (float, 0.0-1.0, default 0.6)

### Section 2: Scoring Parameters (After Decision on Schema)

**New Subsection: Scoring & Bonuses**

14. **CARD_BONUS** (float, TBD-TBD, default TBD) - AFTER DECISION
15. **FILENAME_BOOST_EXACT** (float, 1.0-5.0, default 2.0)
16. **FILENAME_BOOST_PARTIAL** (float, 1.0-3.0, default 1.3)
17. **LAYER_BONUS_GUI** (float, TBD-TBD, default TBD) - AFTER DECISION
18. **LAYER_BONUS_RETRIEVAL** (float, TBD-TBD, default TBD) - AFTER DECISION
19. **LAYER_BONUS_INDEXER** (float, TBD-TBD, default TBD) - AFTER DECISION
20. **VENDOR_PENALTY** (float, TBD-TBD, default TBD) - AFTER DECISION
21. **FRESHNESS_BONUS** (float, TBD-TBD, default TBD) - AFTER DECISION

### Section 3: Generation Parameters (6 params)

Add after existing GEN_TEMPERATURE (~line 125):

22. **GEN_MAX_TOKENS** (int, 100-8000, default 1000)
23. **GEN_TOP_P** (float, 0.0-1.0, default 0.9)
24. **GEN_TIMEOUT** (int, 10-300, default 60)
25. **GEN_RETRY_MAX** (int, 1-10, default 3)
26. **ENRICH_DISABLED** (bool 0/1, default 0)
27. **OLLAMA_NUM_CTX** (int, 2048-32768, default 8192)

**Effort:** 10 hours (25 params × 24 min each)

---

## File 2: `web/src/components/RAG/IndexingSubtab.tsx`

**Add 11 Missing Parameters (+ remove 1 duplicate)**

### Remove Duplicate

- Lines 495-504: Remove COLLECTION_NAME duplicate (already in PathsSubtab)

### Add to Advanced Settings Section (~line 540)

**Chunking Subsection:**

1. **AST_OVERLAP_LINES** (int, 0-20, default 3)
2. **MAX_CHUNK_SIZE** (int, 512-4096, default 1500)
3. **MIN_CHUNK_CHARS** (int, 10-500, default 50)
4. **GREEDY_FALLBACK_TARGET** (int, 200-2000, default 800)
5. **CHUNKING_STRATEGY** (enum: ["ast", "recursive", "greedy"], default "ast")
6. **PRESERVE_IMPORTS** (bool 0/1, default 1)

**Indexing Subsection:**

7. **INDEXING_BATCH_SIZE** (int, 1-200, default 50)
8. **BM25_TOKENIZER** (enum: ["simple", "whitespace", "bert"], default "simple")
9. **BM25_STEMMER_LANG** (string, default "english")
10. **INDEX_EXCLUDED_EXTS** (string, default ".pyc,.pyo,.git")
11. **INDEX_MAX_FILE_SIZE_MB** (int, 1-100, default 5)

**Effort:** 6 hours (11 params × 33 min each)

---

## File 3: `web/src/components/RAG/ExternalRerankersSubtab.tsx`

**Add 2 Missing Parameters**

Add after existing Cohere section (~line 227):

**New Section: Voyage Reranker**

1. **VOYAGE_RERANK_MODEL** (string, default "rerank-2")
   - Options: "rerank-1", "rerank-2", "rerank-lite-1"

**Advanced Settings:**

2. **RERANKER_TIMEOUT** (int, 5-300, default 30)

**Effort:** 1 hour (2 params × 30 min each)

---

## File 4: `web/src/components/RAG/LearningRankerSubtab.tsx`

**Add 5 Missing Parameters**

Add to Training Workflow section (after line 38):

1. **RERANKER_TRAIN_LR** (float, 1e-6 to 1e-3, default 2e-5)
   - Use scientific notation input or log-scale slider
2. **RERANKER_WARMUP_RATIO** (float, 0.0-0.5, default 0.1)
3. **TRIPLETS_MIN_COUNT** (int, 10-10000, default 100)

Add to Settings section:

4. **AGRO_RERANKER_TOPN** (int, 10-500, default 100)
5. **AGRO_RERANKER_RELOAD_ON_CHANGE** (bool 0/1, default 1)
6. **AGRO_RERANKER_RELOAD_PERIOD_SEC** (int, 60-3600, default 300)

**Effort:** 3 hours (5 params × 36 min each)

---

## File 5: `web/src/components/RAG/DataQualitySubtab.tsx`

**Add 5 Missing Parameters**

Add to Cards section (after line 260):

**New Subsection: Enrichment Settings**

1. **CARDS_ENRICH_DEFAULT** (bool 0/1, default 1)
2. **ENRICH_CODE_CHUNKS** (bool 0/1, default 1)
3. **ENRICH_MIN_CHARS** (int, 50-1000, default 100)
4. **ENRICH_MAX_CHARS** (int, 500-10000, default 2000)
5. **ENRICH_TIMEOUT** (int, 10-300, default 45)

**Effort:** 3 hours (5 params × 36 min each)

---

## File 6: `web/src/components/Dashboard/EmbeddingConfigPanel.tsx`

**Add 8 Missing Parameters**

Make this panel editable (currently display-only):

**Provider Configuration:**

1. **EMBEDDING_TYPE** (enum: ["voyage", "openai", "local", "cohere"], default "voyage")

**Conditional on EMBEDDING_TYPE:**

2. **VOYAGE_MODEL** (string, default "voyage-3") - show when type=voyage
3. **EMBEDDING_MODEL_LOCAL** (string, default "all-MiniLM-L6-v2") - show when type=local

**Advanced Settings:**

4. **EMBEDDING_BATCH_SIZE** (int, 1-128, default 32)
5. **EMBEDDING_MAX_TOKENS** (int, 128-8192, default 512)
6. **EMBEDDING_CACHE_ENABLED** (bool 0/1, default 1)
7. **EMBEDDING_TIMEOUT** (int, 5-300, default 30)
8. **EMBEDDING_RETRY_MAX** (int, 1-10, default 3)

**Effort:** 4 hours (8 params × 30 min each)

---

## File 7: `web/src/components/Infrastructure/MonitoringSubtab.tsx`

**Add 7 Missing Parameters**

Add to top of component (before Grafana section ~line 232):

**New Section: Tracing Configuration**

1. **TRACING_ENABLED** (bool 0/1, default 1) - Master toggle
2. **TRACE_SAMPLING_RATE** (float, 0.0-1.0, default 0.1) - Slider with percentage
3. **METRICS_ENABLED** (bool 0/1, default 1)

**Prometheus Section:**

4. **PROMETHEUS_PORT** (int, 1024-65535, default 9090)
   - Update hardcoded link (line 262) to use this value

**Alert Configuration:**

5. **ALERT_INCLUDE_RESOLVED** (bool 0/1, default 0)
6. **ALERT_WEBHOOK_TIMEOUT** (int, 1-60, default 10)

**Logging:**

7. **LOG_LEVEL** (enum: ["DEBUG", "INFO", "WARNING", "ERROR", "CRITICAL"], default "INFO")

**Effort:** 4 hours (7 params × 35 min each)

---

# PHASE 4: NEW COMPONENTS (Optional - Could Add to Existing)

## File 1: `web/src/utils/configHelpers.ts` (NEW - Required)

**Purpose:** Unified config update utility

**Implementation:**

```typescript
import { api } from '../modules/api';

/**
 * Update a single configuration parameter
 * Validates, updates local state, and persists to backend
 */
export async function updateConfig(key: string, value: any): Promise<void> {
  // Optimistic update to window.CoreUtils.state if it exists
  if (window.CoreUtils?.state?.config?.env) {
    window.CoreUtils.state.config.env[key] = value;
  }

  // Persist to backend
  const response = await fetch(api('/api/config'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ env: { [key]: value } })
  });

  if (!response.ok) {
    throw new Error(`Failed to update ${key}: ${response.statusText}`);
  }

  // Emit event for other components to react
  window.dispatchEvent(new CustomEvent('agro-config-updated', {
    detail: { key, value }
  }));
}

/**
 * Validate boolean value format
 * Ensures all booleans are 0 or 1 (not true/false)
 */
export function validateBoolean(value: any): 0 | 1 {
  if (value === true || value === 1 || value === '1') return 1;
  if (value === false || value === 0 || value === '0') return 0;
  throw new Error(`Invalid boolean value: ${value}. Must be 0 or 1.`);
}

/**
 * Batch update multiple config parameters
 */
export async function updateConfigBatch(updates: Record<string, any>): Promise<void> {
  const response = await fetch(api('/api/config'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ env: updates })
  });

  if (!response.ok) {
    throw new Error(`Batch update failed: ${response.statusText}`);
  }

  // Update local state
  if (window.CoreUtils?.state?.config?.env) {
    Object.assign(window.CoreUtils.state.config.env, updates);
  }

  // Emit event
  window.dispatchEvent(new CustomEvent('agro-config-updated', {
    detail: { batch: true, keys: Object.keys(updates) }
  }));
}
```

**Effort:** 2 hours

---

## File 2: `tests/playwright/test_config_persistence.spec.ts` (NEW - Required)

**Purpose:** E2E tests for all 100 parameters

**Implementation:**

```typescript
import { test, expect } from '@playwright/test';

test.describe('Config Persistence - All 100 Parameters', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:8012');
  });

  test('Retrieval parameters persist', async ({ page }) => {
    await page.click('[data-tab="rag"]');
    await page.click('[data-subtab="retrieval"]');

    // Test FINAL_K
    const finalKInput = page.locator('input[name="FINAL_K"]');
    await finalKInput.fill('15');

    // Test RRF_K_DIV
    const rrfInput = page.locator('input[name="RRF_K_DIV"]');
    await rrfInput.fill('80');

    // Click Apply
    await page.click('button:has-text("Apply")');
    await expect(page.locator('text=success')).toBeVisible();

    // Reload and verify
    await page.reload();
    await page.click('[data-tab="rag"]');
    await page.click('[data-subtab="retrieval"]');

    await expect(finalKInput).toHaveValue('15');
    await expect(rrfInput).toHaveValue('80');
  });

  // Repeat for each category:
  // - Embedding
  // - Chunking
  // - Indexing
  // - Reranking
  // - Generation
  // - Enrichment
  // - Keywords
  // - Tracing
  // - Training
  // - UI
});
```

**Effort:** 4 hours

---

# PHASE 5: VERIFICATION CHECKLIST

## Per-Parameter Verification (Do for ALL 100)

For each parameter, verify:

1. ✅ **GUI Control Renders**
   - Navigate to correct tab/subtab
   - Verify input/select/toggle appears
   - Verify label is clear

2. ✅ **Initial Value Loads from Backend**
   ```bash
   # Check agro_config.json has value
   cat agro_config.json | jq '.category.param_name'

   # GUI should show this value on page load
   ```

3. ✅ **Value Can Be Changed**
   - Click/type new value in GUI
   - Verify local state updates immediately

4. ✅ **Change Persists to Backend**
   ```bash
   # After changing in GUI and clicking Apply:
   cat agro_config.json | jq '.category.param_name'
   # Should show new value
   ```

5. ✅ **Page Reload Shows Persisted Value**
   - Press Ctrl+R
   - Navigate back to parameter
   - Verify shows changed value, not default

6. ✅ **Tooltip Displays**
   - Hover over input
   - Verify tooltip appears with description

7. ✅ **Validation Works**
   - Try invalid value (out of range, wrong type)
   - Verify error message or rejection

8. ✅ **Backend Uses New Value**
   ```bash
   # Trigger operation that uses parameter
   # Check logs show new value being used
   ```

9. ✅ **No Console Errors**
   - Open browser DevTools Console
   - Verify no errors when changing value

10. ✅ **Playwright Test Passes**
    ```bash
    npx playwright test tests/playwright/test_config_persistence.spec.ts
    ```

---

# SUMMARY: TOTAL EFFORT BY PHASE

| Phase | Tasks | Effort | Status |
|-------|-------|--------|--------|
| **Phase 0** | Schema Resolution | 3-5 hours | ⏸️ REQUIRED FIRST |
| **Phase 1** | Backend Fixes | 2.5 hours | 🔵 Ready to implement |
| **Phase 2** | Fix Broken Controls | 6-7 hours | 🔵 Ready to implement |
| **Phase 3** | Add Missing Controls | 31 hours | 🔵 Ready to implement |
| **Phase 4** | New Components | 6 hours | 🔵 Ready to implement |
| **Phase 5** | Testing | 4 hours | 🔵 Ready to implement |
| **TOTAL** | **All Fixes** | **52.5-56 hours** | |

**Excludes:** Time for schema resolution discussions (Phase 0)

---

# IMPLEMENTATION TIPS

## Development Workflow

1. **Work category by category**
   - Don't try to fix everything at once
   - Complete one file before moving to next
   - Test each category with Playwright before continuing

2. **Use copy-paste from working examples**
   - FINAL_K in RetrievalSubtab is a good template
   - EDITOR_PORT in Settings/General.tsx is perfect example
   - Copy pattern, change param name, done

3. **Test incrementally**
   ```bash
   # After each parameter:
   1. Change in GUI
   2. Click Apply
   3. cat agro_config.json | jq '.category.param'
   4. Reload page
   5. Verify persisted
   ```

4. **Handle booleans correctly**
   - ALWAYS use 0 or 1 (Number type)
   - NEVER use true/false or "True"/"False"
   - Check .env file after save - should show `PARAM=1` not `PARAM=true`

5. **Use existing patterns**
   ```tsx
   // NumberInput pattern:
   const [val, setVal] = useState(default);
   useEffect(() => { setVal(config.env.PARAM || default); }, [config]);
   <input value={val} onChange={(e) => { setVal(Number(e.target.value)); updateEnv('PARAM', Number(e.target.value)); }} />

   // SelectInput pattern:
   const [val, setVal] = useState(default);
   useEffect(() => { setVal(config.env.PARAM || default); }, [config]);
   <select value={val} onChange={(e) => { setVal(e.target.value); updateEnv('PARAM', e.target.value); }} />

   // Boolean pattern:
   const [val, setVal] = useState(1);
   useEffect(() => { setVal(Number(config.env.PARAM) || 1); }, [config]);
   <select value={val} onChange={(e) => { setVal(Number(e.target.value)); updateEnv('PARAM', Number(e.target.value)); }} />
   ```

## Common Pitfalls to Avoid

❌ **DON'T:**
- Skip schema resolution (Phase 0)
- Fix multiple files in parallel without testing
- Use true/false for booleans
- Hardcode values instead of reading from config
- Forget to add tooltips
- Skip Playwright tests

✅ **DO:**
- Resolve schema conflicts first
- Test each file after changes
- Always use 0/1 for booleans
- Load all values from config.env
- Add descriptive tooltips
- Write Playwright tests for each category

## Git Commit Strategy

**After each file is complete and tested:**

```bash
git add path/to/file.tsx
git commit -m "feat(config): wire PARAM_NAME params in ComponentName

- Fix: BROKEN_PARAM name mismatch
- Add: NEW_PARAM1, NEW_PARAM2, NEW_PARAM3 controls
- Wire: All params persist to agro_config.json
- Test: Playwright tests pass for category

Fixes #123 (if applicable)
"
```

**Do NOT commit until:**
- [ ] All params in file load from backend
- [ ] All params save to backend
- [ ] Playwright tests pass
- [ ] No console errors
- [ ] Manual smoke test successful

---

# FINAL CHECKLIST

Before considering GUI integration complete:

## Code Complete

- [ ] All 100 parameters have GUI controls
- [ ] All controls load from backend on mount
- [ ] All controls persist to backend on change
- [ ] All boolean values use 0/1 format
- [ ] All parameter names match backend keys exactly
- [ ] No duplicate controls exist
- [ ] Tooltips added for all controls
- [ ] Schema conflicts resolved

## Testing Complete

- [ ] Playwright tests pass for all categories
- [ ] Manual smoke tests pass for all categories
- [ ] No console errors in browser
- [ ] No backend errors in logs
- [ ] agro_config.json updates correctly
- [ ] .env file not corrupted by boolean bugs
- [ ] Page reloads show persisted values

## Documentation Complete

- [ ] Bug resolutions documented in bug-resolution.md
- [ ] Architecture audit updated
- [ ] CLAUDE.md guidelines followed
- [ ] Commit messages follow conventional commits

## ADA Compliance

- [ ] 100% of parameters accessible via GUI
- [ ] All controls keyboard-navigable
- [ ] All controls have descriptive labels
- [ ] All tooltips provide helpful context
- [ ] No command-line-only parameters

---

**END OF FIX MANIFEST**

**Ready to implement:** YES (after Phase 0 schema resolution)
**Estimated completion:** 52.5-56 hours (7-8 days focused work)
**Next step:** Resolve schema conflicts, then begin Phase 1
