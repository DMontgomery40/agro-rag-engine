# Settings Consolidation Analysis
**Generated:** 2025-10-18
**Agent:** Settings Consolidation Specialist (Agent 2)
**Phase:** Phase 4 - Settings Consolidation

---

## COMPLETE SETTINGS INVENTORY

### 1. OUT_DIR_BASE - Output Directory Base
**Single Source:** Infrastructure tab
**Current Locations:**
- Line 4074: `tab-config-infra` - **PRIMARY (will keep as single source)**
- Line 4080: `tab-config-infra` - RAG_OUT_BASE (override field, related)
- Line 4248: `tab-data-indexing` - **DUPLICATE (will make read-only)**

**Action Plan:**
1. Keep line 4074 in tab-config-infra as EDITABLE (this will become tab-infrastructure)
2. Make line 4248 in tab-data-indexing READ-ONLY with note "Managed in Infrastructure"
3. Ensure JS reads from Infrastructure value

**Status:** Found 2 editable instances, need to consolidate to 1

---

### 2. QDRANT_URL - Qdrant Database URL
**Single Source:** Infrastructure tab
**Current Locations:**
- Line 4034: `tab-config-infra` - **SINGLE SOURCE (already correct)**
  - `<input type="text" name="QDRANT_URL" value="http://127.0.0.1:6333">`

**Action Plan:**
1. Keep in tab-config-infra as EDITABLE (becomes tab-infrastructure)
2. No duplicates found - already consolidated ✅

**Status:** Already consolidated correctly

---

### 3. REDIS_URL - Redis Cache URL
**Single Source:** Infrastructure tab
**Current Locations:**
- Line 4038: `tab-config-infra` - **SINGLE SOURCE (already correct)**
  - `<input type="text" name="REDIS_URL" value="redis://127.0.0.1:6379/0">`

**Action Plan:**
1. Keep in tab-config-infra as EDITABLE (becomes tab-infrastructure)
2. No duplicates found - already consolidated ✅

**Status:** Already consolidated correctly

---

### 4. GEN_MODEL - Primary Generation Model
**Single Source:** RAG > Retrieval tab
**Current Locations:**
- Line 3527: `tab-config-models` - **PRIMARY (will keep as single source)**
  - `<input type="text" name="GEN_MODEL" placeholder="gpt-4o-mini or qwen3-coder:30b">`
- Line 3583: `tab-config-models` - GEN_MODEL_HTTP (channel-specific override)
- Line 3587: `tab-config-models` - GEN_MODEL_MCP (channel-specific override)
- Line 3593: `tab-config-models` - GEN_MODEL_CLI (channel-specific override)
- Line 5224: `tab-settings-profiles` - GEN_MODEL_HTTP override (profile context)
- Line 5228: `tab-settings-profiles` - GEN_MODEL_MCP override (profile context)
- Line 5234: `tab-settings-profiles` - GEN_MODEL_CLI override (profile context)

**Action Plan:**
1. Keep line 3527 in tab-config-models as EDITABLE primary (becomes tab-rag-retrieval)
2. Keep channel overrides in same tab (HTTP/MCP/CLI)
3. Keep profile overrides in tab-settings-profiles (becomes tab-profiles) with note "Primary config in RAG > Retrieval"
4. Profile overrides are CONTEXT-SPECIFIC, not duplicates

**Status:** Primary source clear, overrides are intentional contexts

---

### 5. GEN_TEMPERATURE - Generation Temperature
**Single Source:** RAG > Retrieval tab
**Current Locations:**
- Line 3547: `tab-config-models` - **SINGLE SOURCE**
  - `<input type="number" name="GEN_TEMPERATURE" value="0.0" min="0" max="2" step="0.01">`
- Line 2932: `tab-chat` - chat-temperature (chat-specific UI control, not a config setting)

**Action Plan:**
1. Keep line 3547 in tab-config-models as EDITABLE (becomes tab-rag-retrieval)
2. Line 2932 is chat UI control (separate concern, not a duplicate)
3. No consolidation needed

**Status:** Already consolidated correctly

---

### 6. MQ_REWRITES - Multi-Query Rewrites
**Single Source:** RAG > Retrieval tab
**Current Locations:**
- Line 3637: `tab-config-retrieval` - **SINGLE SOURCE (already correct)**
  - `<input type="number" name="MQ_REWRITES" value="2" min="1">`

**Action Plan:**
1. Keep in tab-config-retrieval as EDITABLE (becomes tab-rag-retrieval)
2. No duplicates found - already consolidated ✅

**Status:** Already consolidated correctly

---

### 7. FINAL_K - Final Top-K Results
**Single Source:** RAG > Retrieval tab
**Current Locations:**
- Line 3653: `tab-config-retrieval` - **SINGLE SOURCE**
  - `<input type="number" name="FINAL_K" value="10" min="1">`
- Line 3943: `tab-config-retrieval` - LANGGRAPH_FINAL_K (LangGraph-specific, different setting)

**Action Plan:**
1. Keep line 3653 in tab-config-retrieval as EDITABLE (becomes tab-rag-retrieval)
2. LANGGRAPH_FINAL_K is a separate setting for LangGraph mode
3. No consolidation needed

**Status:** Already consolidated correctly

---

### 8. TELEMETRY_PATH (AGRO_LOG_PATH) - Telemetry Log Path
**Single Source:** RAG > Learning Ranker tab
**Current Locations:**
- Line 3326: `tab-reranker` - **DUPLICATE**
  - `<input type="text" name="AGRO_LOG_PATH" placeholder="data/logs/queries.jsonl" value="data/logs/queries.jsonl">`
- Line 4691: `tab-devtools-reranker` - **DUPLICATE**
  - `<input type="text" name="AGRO_LOG_PATH" placeholder="data/logs/queries.jsonl" value="data/logs/queries.jsonl">`

**NOTE:** Both tab-reranker and tab-devtools-reranker will be CONSOLIDATED into tab-rag-learning-ranker

**Action Plan:**
1. When consolidating into tab-rag-learning-ranker, keep ONLY ONE editable AGRO_LOG_PATH input
2. Remove the duplicate
3. Place in prominent location in Learning Ranker tab

**Status:** Found 2 instances in tabs that will be merged - consolidate to 1 during migration

---

### 9. BUDGET Settings - Cost and Budget Tracking
**Single Source:** Profiles tab
**Current Locations:**

**In tab-dashboard (Wizard context):**
- Line 2356: `id="budget"` - Wizard budget input (wizard-specific UI, not config)
- Line 2413: `id="apv2-budget"` - AutoProfile v2 budget (wizard-specific)

**In tab-analytics-cost (Budget alerts):**
- Line 3218: `id="alert_monthly_budget_usd"` - **MOVE TO PROFILES**
- Line 3223: `id="alert_budget_warning_usd"` - **MOVE TO PROFILES**
- Line 3231: `id="alert_budget_critical_usd"` - **MOVE TO PROFILES**

**Action Plan:**
1. Dashboard wizard budget (line 2356, 2413) stays in wizard context (it's UI for wizard, not persistent config)
2. Budget alerts (lines 3218, 3223, 3231) MOVE from tab-analytics-cost to tab-profiles
3. tab-analytics-cost will become part of tab-profiles anyway per TAB_REORGANIZATION_MAPPING.md

**Status:** Will be consolidated when tab-analytics-cost is merged into tab-profiles

---

## SUMMARY TABLE

| Setting | Single Source | Current Locations | Duplicates | Action Required |
|---------|---------------|-------------------|------------|-----------------|
| OUT_DIR_BASE | Infrastructure | config-infra (2x), data-indexing | YES | Make data-indexing read-only |
| QDRANT_URL | Infrastructure | config-infra | NO | ✅ Already correct |
| REDIS_URL | Infrastructure | config-infra | NO | ✅ Already correct |
| GEN_MODEL | RAG > Retrieval | config-models + profile overrides | NO | ✅ Overrides are intentional |
| GEN_TEMPERATURE | RAG > Retrieval | config-models | NO | ✅ Already correct |
| MQ_REWRITES | RAG > Retrieval | config-retrieval | NO | ✅ Already correct |
| FINAL_K | RAG > Retrieval | config-retrieval | NO | ✅ Already correct |
| AGRO_LOG_PATH | RAG > Learning Ranker | reranker (2x) | YES | Consolidate during tab merge |
| BUDGET_* | Profiles | analytics-cost | NO | Will merge during Phase 3 |

---

## FINDINGS

### Good News ✅
- Most settings are ALREADY properly consolidated
- QDRANT_URL, REDIS_URL, MQ_REWRITES, FINAL_K, GEN_TEMPERATURE - all single source
- Profile overrides are INTENTIONAL (not duplicates)

### Issues to Fix 🔧
1. **OUT_DIR_BASE** - Has 1 duplicate in tab-data-indexing (line 4248) - needs to be made read-only
2. **AGRO_LOG_PATH** - Has 1 duplicate across 2 tabs that will be merged - consolidate during merge

### Phase 3 Dependencies
- BUDGET settings will consolidate naturally when tab-analytics-cost merges into tab-profiles
- AGRO_LOG_PATH will consolidate naturally when tab-reranker + tab-devtools-reranker merge into tab-rag-learning-ranker

---

## ACTION PLAN

### Immediate Actions (Phase 4)
1. **OUT_DIR_BASE in tab-data-indexing (line 4248)**
   - Make input disabled (read-only)
   - Add note: "Managed in Infrastructure tab"
   - Ensure JS reads value from Infrastructure tab

### Phase 3 Integration Actions
2. **AGRO_LOG_PATH consolidation**
   - When merging reranker tabs, keep only ONE editable input
   - Place prominently in tab-rag-learning-ranker

3. **BUDGET consolidation**
   - When merging tab-analytics-cost into tab-profiles, ensure budget alerts are editable in Profiles

---

## VALIDATION CHECKLIST

After consolidation:
- [ ] OUT_DIR_BASE: Only 1 editable (in Infrastructure), 1 read-only (in Indexing)
- [ ] AGRO_LOG_PATH: Only 1 editable (in Learning Ranker after merge)
- [ ] All settings persist correctly
- [ ] Read-only fields show current value from single source
- [ ] No broken references
- [ ] All tabs still functional

---

**Status:** Analysis complete. Ready to implement OUT_DIR_BASE fix.
**Next:** Update tab-data-indexing to make OUT_DIR_BASE read-only and add reference note.
