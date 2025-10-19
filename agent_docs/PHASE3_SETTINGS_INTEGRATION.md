# Phase 3 Settings Integration Instructions
**For:** Agent 1 (HTML Migration Specialist)
**Purpose:** Settings consolidation during tab merges
**Created:** 2025-10-18

---

## CRITICAL: Settings to Consolidate During Tab Merges

### 1. AGRO_LOG_PATH (Telemetry Path) Consolidation

**Context:**
When merging `tab-reranker` + `tab-devtools-reranker` → `tab-rag-learning-ranker`, you will encounter **2 identical AGRO_LOG_PATH inputs**.

**Current Locations:**
- Line 3326: `tab-reranker`
  ```html
  <input type="text" name="AGRO_LOG_PATH" placeholder="data/logs/queries.jsonl" value="data/logs/queries.jsonl">
  ```
- Line 4691: `tab-devtools-reranker`
  ```html
  <input type="text" name="AGRO_LOG_PATH" placeholder="data/logs/queries.jsonl" value="data/logs/queries.jsonl">
  ```

**REQUIRED ACTION:**
1. In new `tab-rag-learning-ranker`, include **ONLY ONE** AGRO_LOG_PATH input
2. Place it prominently at the top of the tab (before the Mine → Train → Evaluate workflow)
3. Label it clearly as "Telemetry Log Path"
4. Add description: "Path to telemetry logs used for training data mining"
5. **Delete the duplicate** - do NOT include both

**Example Placement:**
```html
<div id="tab-rag-learning-ranker" class="tab-content">
    <h2>Learning Ranker</h2>

    <!-- Single source for telemetry path -->
    <div class="settings-section">
        <h3>Configuration</h3>
        <div class="input-row">
            <div class="input-group">
                <label>Telemetry Log Path</label>
                <input type="text" name="AGRO_LOG_PATH" placeholder="data/logs/queries.jsonl" value="data/logs/queries.jsonl">
                <p class="small" style="color: var(--fg-muted);">
                    Path to telemetry logs used for training data mining. This is the <strong>single source</strong> for this setting.
                </p>
            </div>
            <!-- other config fields like AGRO_RERANKER_MODEL_PATH, AGRO_RERANKER_ALPHA, etc. -->
        </div>
    </div>

    <!-- Then the Mine → Train → Evaluate workflow -->
    <!-- ... rest of tab content ... -->
</div>
```

**Validation:**
- [ ] Only ONE editable AGRO_LOG_PATH input in tab-rag-learning-ranker
- [ ] No duplicate AGRO_LOG_PATH anywhere
- [ ] Setting persists correctly
- [ ] Mining workflow reads from this path

---

### 2. BUDGET Settings Consolidation

**Context:**
When merging `tab-analytics-cost` → `tab-profiles`, you will move budget alert settings.

**Current Locations in tab-analytics-cost:**
- Line 3218: `id="alert_monthly_budget_usd"`
- Line 3223: `id="alert_budget_warning_usd"`
- Line 3231: `id="alert_budget_critical_usd"`

**REQUIRED ACTION:**
1. Move all 3 budget alert inputs to `tab-profiles`
2. Place them in a "Budget Alerts" section
3. Ensure they are EDITABLE in Profiles tab
4. Keep dashboard wizard budget inputs (id="budget", id="apv2-budget") in dashboard - those are wizard-specific UI

**Example Structure for tab-profiles:**
```html
<div id="tab-profiles" class="tab-content">
    <h2>Profiles</h2>

    <!-- Budget & Cost Tracking -->
    <div class="settings-section">
        <h3>Budget Alerts</h3>
        <p class="small">Set monthly budget limits and warning thresholds.</p>

        <div class="input-row">
            <div class="input-group">
                <label>Monthly Budget (USD)</label>
                <input type="number" id="alert_monthly_budget_usd" min="1" max="10000" step="1" placeholder="500">
            </div>
            <div class="input-group">
                <label>Budget Warning Level (USD)</label>
                <input type="number" id="alert_budget_warning_usd" min="1" max="10000" step="1" placeholder="400">
            </div>
            <div class="input-group">
                <label>Budget Critical Level (USD)</label>
                <input type="number" id="alert_budget_critical_usd" min="1" max="10000" step="1" placeholder="450">
            </div>
        </div>
    </div>

    <!-- Cost Calculator (from tab-analytics-cost) -->
    <!-- ... -->

    <!-- Profile Management (from tab-settings-profiles) -->
    <!-- ... -->
</div>
```

**Validation:**
- [ ] All 3 budget alert inputs moved to tab-profiles
- [ ] Budget alerts are editable in Profiles
- [ ] Dashboard wizard budget inputs remain in dashboard (separate concern)
- [ ] Settings persist correctly

---

### 3. Profile Override Settings

**Context:**
Profile overrides (GEN_MODEL_HTTP, GEN_MODEL_MCP, GEN_MODEL_CLI) are **INTENTIONAL duplicates**.

**Current Locations:**
- Primary: tab-config-models (lines 3583, 3587, 3593)
- Overrides: tab-settings-profiles (lines 5224, 5228, 5234)

**REQUIRED ACTION:**
1. When creating tab-rag-retrieval (from tab-config-models), **KEEP** the primary model settings
2. When creating tab-profiles (from tab-settings-profiles), **KEEP** the override settings
3. Add a note in Profiles: "Primary model config is in RAG > Retrieval. These are profile-specific overrides."
4. **DO NOT consolidate** - these are context-specific by design

**Example Note in tab-profiles:**
```html
<div class="settings-section">
    <h3>Model Overrides</h3>
    <p class="small" style="color: var(--accent); font-style: italic;">
        <strong>Note:</strong> Primary model configuration is in <strong>RAG > Retrieval</strong>.
        These settings allow profile-specific overrides for different channels (HTTP/MCP/CLI).
    </p>
    <!-- override inputs here -->
</div>
```

**Validation:**
- [ ] Primary model settings in tab-rag-retrieval
- [ ] Override settings in tab-profiles
- [ ] Note explaining relationship
- [ ] Both work correctly (primary + overrides)

---

## SETTINGS ALREADY CONSOLIDATED (Phase 4 Complete)

### ✅ OUT_DIR_BASE
- **Single Source:** tab-config-infra (line 4421) - **EDITABLE**
- **Read-Only Reference:** tab-data-indexing (line 4595) - **READ-ONLY with note**
- **Status:** ✅ Complete (Phase 4)

### ✅ QDRANT_URL
- **Single Source:** tab-config-infra (line 4034)
- **Status:** ✅ Already correct (no duplicates)

### ✅ REDIS_URL
- **Single Source:** tab-config-infra (line 4038)
- **Status:** ✅ Already correct (no duplicates)

### ✅ MQ_REWRITES
- **Single Source:** tab-config-retrieval (line 3637)
- **Status:** ✅ Already correct (no duplicates)

### ✅ FINAL_K
- **Single Source:** tab-config-retrieval (line 3653)
- **Status:** ✅ Already correct (no duplicates)

### ✅ GEN_MODEL & GEN_TEMPERATURE
- **Single Source:** tab-config-models (lines 3527, 3547)
- **Overrides:** tab-settings-profiles (intentional, by design)
- **Status:** ✅ Already correct

---

## TESTING CHECKLIST (For Phase 3 Agent)

After consolidating settings during tab merges:

- [ ] AGRO_LOG_PATH: Only 1 editable input in tab-rag-learning-ranker
- [ ] BUDGET alerts: All 3 inputs in tab-profiles and editable
- [ ] OUT_DIR_BASE: Still read-only in indexing tab, editable in infrastructure
- [ ] Model overrides: Both primary (RAG) and overrides (Profiles) present
- [ ] All settings save correctly
- [ ] All settings persist across page reloads
- [ ] No broken references
- [ ] No duplicate editable fields
- [ ] JS modules read correct values

---

## REFERENCE: Settings Ownership Map

From INTEGRATION_CONTRACTS.md:

```javascript
{
  'OUT_DIR_BASE': 'infrastructure',              // ✅ Phase 4 complete
  'QDRANT_URL': 'infrastructure',                // ✅ Phase 4 complete
  'REDIS_URL': 'infrastructure',                 // ✅ Phase 4 complete
  'MODEL_PRIMARY': 'rag.retrieval',              // ✅ Phase 4 complete
  'MODEL_TEMPERATURE': 'rag.retrieval',          // ✅ Phase 4 complete
  'MQ_REWRITES': 'rag.retrieval',                // ✅ Phase 4 complete
  'FINAL_K': 'rag.retrieval',                    // ✅ Phase 4 complete
  'TELEMETRY_PATH': 'rag.learning-ranker',       // ⏳ Phase 3 (during merge)
  'BUDGET_DAILY': 'profiles',                    // ⏳ Phase 3 (during merge)
  'BUDGET_MONTHLY': 'profiles',                  // ⏳ Phase 3 (during merge)
  'ACTIVE_PROFILE': 'profiles'                   // ✅ Already in profiles
}
```

---

**Agent 1:** Follow these instructions when performing tab merges in Phase 3.
**Agent 2:** Settings consolidation work (Phase 4) is complete except for items requiring Phase 3 merges.

