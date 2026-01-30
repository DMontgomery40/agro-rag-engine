# CRITICAL FIXES NEEDED - 2025-12-03

## STATUS: 🔴 MULTIPLE CRITICAL ISSUES

This is a sub-plan branching from `HANDOFF_2025_12_02_RERANKER_CONFIG_UNIFICATION.md` which is ~50% complete.

---

## 🚨 ISSUE 1: .env POLLUTION (CRITICAL)

### Problem
Non-secret config values have been dumped into `.env`. This violates the Pydantic config architecture where:
- `.env` = SECRETS ONLY (API keys, tokens, passwords)
- `agro_config.json` = ALL other configuration

### What's Wrong in .env

**BANNED/LEGACY VALUES (DELETE):**
```
RERANK_BACKEND=cloud           # ❌ BANNED terminology - delete entirely
active_reranker=cloud          # ❌ Unknown/legacy - delete entirely
```

**CONFIG VALUES (MOVE TO agro_config.json):**
```
AGRO_EDITION=enterprise
AGRO_PATH=
AUTO_COLIMA=1
CARDS_EXCLUDE_DIRS=...
CARDS_EXCLUDE_KEYWORDS=playwright
CORS_ALLOW_ORIGINS=...
DATA_DIR=data
DEV_LOCAL_UVICORN=1
DOCS_DIR=docs
EDITOR_HOST=127.0.0.1
FILES_ROOT=.
GIT_BRANCH=development
GUI_DIR=gui
HOST=127.0.0.1
INCLUDE_RESOLVED=1
INDEX_MAX_WORKERS=8
KMP_DUPLICATE_LIB_OK=True
KMP_INIT_AT_FORK=FALSE
MCP_HTTP_HOST=127.0.0.1
MCP_HTTP_PATH=/mcp
MCP_HTTP_PORT=8013
NOTIFICATIONS_ENABLED=1
NOTIFY_CRITICAL=1
NOTIFY_INFO=0
NOTIFY_WARNING=1
OAUTH_ENABLED=false
OLLAMA_URL=http://127.0.0.1:11434/api
PORT=8012
REDIS_URL=redis://127.0.0.1:6379/0
REPO=agro
REPO_ROOT=/app
RERANKER_CLOUD_MODEL_SELECT=rerank-3.5
RERANKER_CLOUD_PROVIDER=jina
RERANKER_LOCAL_MODEL=cross-encoder/ms-marco-MiniLM-L-12-v2
RERANKER_MODE=cloud
RERANKER_TRAIN_MAX_LENGTH=512
TEST_KEY=test_value
THREAD_ID=
```

**SECRETS (KEEP IN .env):**
```
COHERE_API_KEY=...
DEEPSEEK_API_KEY=...
DEEPSEEK_BASE_URL=...  # Debatable - could be config
GRAFANA_AUTH_TOKEN=
JINA_API_KEY=...
MCP_API_KEY=...
NETLIFY_API_KEY=...
OAUTH_TOKEN=
OPENAI_API_KEY=...
VOYAGE_API_KEY=...
```

### Fix Steps
1. Delete `RERANK_BACKEND` and `active_reranker` from .env
2. Move config values to agro_config.json (check if already there first)
3. Ensure backend reads from config_registry, not os.getenv() for non-secrets
4. Clean .env to secrets-only

---

## 🚨 ISSUE 2: TOOLTIPS NOT WORKING IN REACT (HIGH)

### Problem
The RerankerConfigSubtab uses `data-tooltip="RERANKER_MODE"` but tooltips never show because:

1. The legacy tooltip system (tooltips.js) expects this DOM structure:
```html
<span class="tooltip-wrap">
  <span class="help-icon" data-tooltip="KEY">?</span>
  <div class="tooltip-bubble">...content...</div>
</span>
```

2. The React component only renders:
```html
<span class="help-icon" data-tooltip="KEY">?</span>
```

3. There's no `.tooltip-bubble` element and no event listeners attached.

### Fix Options

**Option A: Use the legacy tooltip system properly**
- Create a React `<TooltipIcon>` component that renders the full structure
- Call `window.Tooltips.attachManualTooltips()` after mount

**Option B: Create a React tooltip component**
- Use useTooltips() hook to get tooltip content
- Render tooltip bubble on hover/click with React state
- Style with existing CSS classes

### Current Tooltip Implementation
- `web/src/modules/tooltips.js` - 230+ tooltip definitions
- `web/src/hooks/useTooltips.ts` - React hook to access tooltips
- `web/src/stores/useTooltipStore.ts` - Zustand store

### Fix Steps
1. Create `web/src/components/ui/TooltipIcon.tsx` component
2. It should:
   - Accept `name` prop (e.g., "RERANKER_MODE")
   - Use useTooltips() to get content
   - Render proper .tooltip-wrap > .help-icon + .tooltip-bubble structure
   - Attach hover/click listeners
3. Replace all `<Tooltip name="..." />` in RerankerConfigSubtab with `<TooltipIcon name="..." />`

---

## 🚨 ISSUE 3: RerankerConfigSubtab INCOMPLETE (HIGH)

### What's Done ✅
- 4 mode cards (none, local, learning, cloud)
- Provider dropdown loads from models.json via CostLogic
- Model dropdown loads correctly per provider
- API key input for cloud mode
- Advanced settings section
- Server status section

### What's Broken ❌

1. **Tooltips don't show** (see Issue 2)

2. **API key detection is wrong**
   - Shows "configured" for wrong provider (Jina when should be Cohere)
   - Reason: RERANKER_CLOUD_PROVIDER in .env is set to "jina" but user uses Cohere
   - Config is reading from polluted .env instead of agro_config.json

3. **Server info always fails**
   - "Failed to get reranker info"
   - useReranker().getInfo() is failing
   - Need to check RerankService.getInfo() implementation

4. **No local model dropdown options**
   - CostLogic.listModels('Local', 'rerank') returns empty
   - models.json may not have local rerank entries
   - Should show manual input as fallback (currently does, but ugly)

5. **Mode selection visual feedback**
   - Current mode indicator (green dot) works
   - But card doesn't show as "active" when it should be cloud mode by default

### Fix Steps
1. Fix tooltips (Issue 2)
2. Fix API key detection - read from correct config
3. Debug useReranker().getInfo() endpoint
4. Improve local model handling when no models.json entries

---

## 🚨 ISSUE 4: MAIN RERANKER UNIFICATION INCOMPLETE (50%)

### Reference: HANDOFF_2025_12_02_RERANKER_CONFIG_UNIFICATION.md

### Completed ✅
- Pydantic model updated (server/models/agro_config_model.py)
- Config registry updated (server/services/config_registry.py)
- web/src/hooks/useOnboarding.ts
- web/src/components/Onboarding/TuneStep.tsx
- web/src/components/Sidepanel.tsx (partial)
- web/src/components/Profiles/ProfileEditor.tsx
- web/src/components/Evaluation/HistoryViewer.tsx
- web/src/hooks/useEvalHistory.ts (created)
- web/src/hooks/useUIHelpers.ts (added showToast)
- web/src/components/RAG/RerankerConfigSubtab.tsx (created, replacing ExternalRerankersSubtab)
- web/src/components/RAG/RAGSubtabs.tsx (renamed tab)
- web/src/components/tabs/RAGTab.tsx (updated import)
- web/src/modules/tooltips.js (added RERANKER_MODE, RERANKER_CLOUD_PROVIDER, RERANKER_LOCAL_MODEL)

### Pending ❌

**Tier 2 (React/TS) - Deferred from user request to focus on other issues:**
- web/src/modules/model_flows.js (lines 93-95)
- web/src/modules/app.js (lines 375, 393, 443, 572, 581, 590, 670, 825, 855, 906, 1985-1988)
- web/src/modules/profile_renderer.js (lines 18, 135)
- web/src/modules/profile_logic.js (lines 6, 23)
- web/src/modules/eval_history.js (lines 34, 51, 168, 172, 232, 240, 251, 262, 273)
- web/src/modules/config.js (lines 148-149)
- web/src/modules/autoprofile_v2.js (line 288)

**Backend:**
- server/reranker_info.py - partially done, needs verification
- Any remaining os.getenv() calls for reranker config

---

## PRIORITY ORDER

1. **CRITICAL**: Clean .env (delete banned values, this affects everything)
2. **HIGH**: Fix tooltips in React (user can't understand settings)
3. **HIGH**: Fix RerankerConfigSubtab remaining issues
4. **MEDIUM**: Complete main reranker unification (JS modules)

---

## NOTES

- The user is extremely frustrated - DO NOT phone it in
- DO NOT add stubs or placeholders
- Test everything with Playwright before reporting done
- All config goes through Pydantic (agro_config.json) not .env
- The 4 reranker modes are: none, local, learning, cloud
- "backend" is BANNED terminology everywhere

