# Integration & Data Flow Analysis - /gui Frontend

**Generated:** 2025-11-20
**Scope:** Complete data flow mapping for /gui frontend
**Status:** COMPREHENSIVE DOCUMENTATION

## Overview

This document maps all integration points and data flows in the /gui frontend, from user interaction to backend API calls and back.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      User Interface Layer                    │
│  index.html (6,142 lines) - Tabs, Forms, Controls          │
└────────────┬────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│                JavaScript Module Layer (56 files)            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Core Utils   │  │   Features   │  │ Integration  │     │
│  │ (7 modules)  │  │ (8 modules)  │  │ (8 modules)  │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└────────────┬────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│                      API Communication                       │
│  CoreUtils.api() → fetch() → Backend Endpoints             │
└────────────┬────────────────────────────────────────────────┘
             │
┌────────────▼────────────────────────────────────────────────┐
│                     Backend Services                         │
│  FastAPI (Python) - 25+ endpoints                          │
│  /api/config, /api/docker/*, /api/reranker/*, etc.        │
└─────────────────────────────────────────────────────────────┘
```

---

## Data Flow Patterns

### Pattern 1: Configuration Load Flow

**Trigger:** Page load, tab switch, manual refresh

```
┌──────────────────────────────────────────────────────────────┐
│ 1. USER ACTION                                               │
│    - Page loads OR user clicks "Retrieval" tab              │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 2. NAVIGATION MOUNT                                          │
│    Navigation.registerView('rag-retrieval').mount()         │
│    └──> config.js: initConfigRetrieval()                    │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 3. CONFIG LOAD                                               │
│    config.js: loadConfig()                                   │
│    ├──> POST /api/env/reload (refresh .env from disk)       │
│    └──> GET /api/config                                      │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 4. BACKEND PROCESSING                                        │
│    server/routers/config_routes.py: read_config()           │
│    ├──> Read agro_config.json                               │
│    ├──> Validate with Pydantic (AgroConfigRoot)             │
│    └──> Return { env: {...}, repos: [...], hints: {...} }   │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 5. STATE UPDATE                                              │
│    CoreUtils.state.config = response.data                   │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 6. FORM POPULATION                                           │
│    config.js: populateConfigForm(data)                      │
│    ├──> For each parameter in data.env:                     │
│    │    ├──> Find <input name="PARAM_KEY">                  │
│    │    ├──> Apply type-specific handling                   │
│    │    │    ├──> Secret fields: mask with ••••••           │
│    │    │    ├──> Checkboxes: convert '1'/'0' → checked     │
│    │    │    ├──> Selects: set selected option              │
│    │    │    └──> Text/number: set value                    │
│    │    └──> Set input.value = data.env[key]                │
│    ├──> Render repos section (dynamic forms)                │
│    └──> Populate model dropdowns from models                │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 7. UI RENDERING COMPLETE                                     │
│    - All form fields populated                               │
│    - Theme applied (light/dark/auto)                         │
│    - Ready for user interaction                              │
└──────────────────────────────────────────────────────────────┘
```

**Key Files:**
- HTML: Lines 3015-3400 (retrieval parameters form)
- JS: `config.js` lines 102-686 (loadConfig, populateConfigForm)
- API: `GET /api/config` → `server/routers/config_routes.py:read_config()`

---

### Pattern 2: Configuration Save Flow

**Trigger:** User clicks "Save" button after editing form

```
┌──────────────────────────────────────────────────────────────┐
│ 1. USER ACTION                                               │
│    - User edits form fields (change values)                  │
│    - Clicks "Save" button                                    │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 2. FORM DATA GATHERING                                       │
│    config.js: gatherConfigForm()                            │
│    ├──> Iterate all <input>, <select>, <textarea>           │
│    │    with [name] attribute                                │
│    ├──> Extract values:                                      │
│    │    ├──> Checkboxes: field.checked → true/false         │
│    │    ├──> Numbers: field.value (⚠️ BUG: sent as string)  │
│    │    ├──> Secrets: preserve if unchanged (masked)        │
│    │    └──> Text: field.value                              │
│    ├──> Parse repo fields:                                   │
│    │    ├──> repo_keywords_* → CSV split                    │
│    │    ├──> repo_layerbonuses_* → JSON parse               │
│    │    └──> repo_path_* → string                           │
│    └──> Return { env: {...}, repos: [...] }                 │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 3. VALIDATION (CLIENT-SIDE)                                  │
│    ⚠️ CRITICAL GAP: No validation implemented                │
│    - No type checking (numbers as strings)                   │
│    - No range validation (min/max)                           │
│    - No enum validation (allowed values)                     │
│    - Only JSON syntax checked for layer_bonuses              │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 4. API REQUEST                                               │
│    config.js: saveConfig()                                   │
│    POST /api/config                                          │
│    Headers: { 'Content-Type': 'application/json' }          │
│    Body: { env: {...}, repos: [...] }                       │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 5. BACKEND VALIDATION                                        │
│    server/routers/config_routes.py: set_config()            │
│    ├──> Parse request body                                   │
│    ├──> Validate with Pydantic (AgroConfigRoot)             │
│    │    ├──> Type coercion: "150" → 150                     │
│    │    ├──> Range validation: 1 ≤ FINAL_K ≤ 100            │
│    │    ├──> Enum validation: THEME_MODE in [auto,light,dark]│
│    │    └──> Default values for missing fields               │
│    ├──> Write to agro_config.json                           │
│    └──> Return { status: 'success' } or error               │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 6. RESPONSE HANDLING                                         │
│    config.js: saveConfig() (continued)                      │
│    IF response.ok AND result.status === 'success':          │
│    ├──> Show success toast                                   │
│    └──> Call loadConfig() to refresh UI                     │
│    ELSE:                                                     │
│    └──> Show error alert with details                       │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 7. UI REFRESH                                                │
│    - Success: Form re-populated with confirmed values        │
│    - Error: Form unchanged, error message displayed          │
└──────────────────────────────────────────────────────────────┘
```

**Key Files:**
- HTML: All form elements with `name=` attributes
- JS: `config.js` lines 692-864 (gatherConfigForm, saveConfig)
- API: `POST /api/config` → `server/routers/config_routes.py:set_config()`

---

### Pattern 3: Indexing Flow

**Trigger:** User clicks "Index Now" button

```
┌──────────────────────────────────────────────────────────────┐
│ 1. USER ACTION                                               │
│    - Selects repository from dropdown                        │
│    - Checks "Include Dense Embeddings" (optional)            │
│    - Clicks "🚀 INDEX NOW" button                           │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 2. PARAMETER COLLECTION                                      │
│    indexing.js: startIndexing()                             │
│    ├──> repo = $('#index-repo-select').value                │
│    ├──> skip_dense = $('#index-skip-dense').checked ? 1 : 0 │
│    └──> enrich = $('#index-enrich-chunks').checked ? 1 : 0  │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 3. START INDEXING API                                        │
│    POST /api/index/start                                     │
│    Body: { repo, skip_dense, enrich }                       │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 4. BACKEND INDEXING PROCESS                                  │
│    server/routers/index_routes.py: start_index()            │
│    ├──> Validate repo exists                                 │
│    ├──> Start background process (subprocess)                │
│    ├──> Track with PID                                       │
│    └──> Return { success: true, pid: 12345 }                │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 5. STATUS POLLING LOOP                                       │
│    indexing.js: pollIndexStatus()                           │
│    Every 2000ms (2 seconds):                                 │
│    ├──> GET /api/index/status                               │
│    ├──> response: { running, current_repo, progress }       │
│    ├──> Update progress bar (0-100%)                        │
│    ├──> Update status text                                   │
│    └──> If !running: stop polling, show completion          │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 6. COMPLETION                                                │
│    - Progress bar reaches 100%                               │
│    - Status: "Indexing complete"                             │
│    - User can start new indexing operation                   │
└──────────────────────────────────────────────────────────────┘
```

**Key Files:**
- HTML: Lines 3813-3941 (indexing controls)
- JS: `indexing.js` lines 160-404 (startIndexing, pollIndexStatus)
- API: `POST /api/index/start`, `GET /api/index/status`

---

### Pattern 4: Reranker Training Flow

**Trigger:** User clicks "Train" button in Learning Reranker section

```
┌──────────────────────────────────────────────────────────────┐
│ 1. USER ACTION                                               │
│    - Mine triplets (optional, separate button)               │
│    - Set training parameters (epochs, batch, maxlen)         │
│    - Clicks "Train" button                                   │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 2. PARAMETER COLLECTION                                      │
│    reranker.js: trainReranker()                             │
│    ├──> epochs = $('#reranker-epochs').value || 2           │
│    ├──> batch = $('#reranker-batch').value || 16            │
│    └──> maxlen = $('#reranker-maxlen').value || 512         │
│    ⚠️ BUG: These inputs missing name= attributes            │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 3. TRAINING API REQUEST                                      │
│    POST /api/reranker/train                                  │
│    Body: { epochs, batch_size, max_length }                 │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 4. BACKEND TRAINING (ASYNC)                                  │
│    server/routers/reranker_routes.py: train_reranker()      │
│    ├──> Start training subprocess (5-15 minutes)             │
│    ├──> Stream output to live_output buffer                  │
│    ├──> Update progress (0-100%)                             │
│    └──> Return immediately: { success: true }               │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 5. LIVE TERMINAL STREAMING                                   │
│    reranker.js: initRerankerTerminal()                      │
│    ├──> Create LiveTerminal instance                         │
│    └──> Start status polling (every 1000ms)                  │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 6. STATUS POLLING LOOP                                       │
│    reranker.js: startStatusPolling()                        │
│    Every 1000ms (1 second):                                  │
│    ├──> GET /api/reranker/status                            │
│    ├──> { running, progress, task, live_output, result }    │
│    ├──> Update terminal with new output lines               │
│    ├──> Update progress bar                                  │
│    └──> If !running: show results, stop polling             │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 7. TRAINING COMPLETE                                         │
│    - Show training metrics (loss, accuracy)                  │
│    - Enable "Evaluate" button                                │
│    - Update reranker status display                          │
└──────────────────────────────────────────────────────────────┘
```

**Key Files:**
- HTML: Lines 3577-3693 (reranker training UI)
- JS: `reranker.js` lines 181-330 (trainReranker, startStatusPolling)
- API: `POST /api/reranker/train`, `GET /api/reranker/status`

---

### Pattern 5: Chat Flow (RAG Query)

**Trigger:** User types question and clicks "Send"

```
┌──────────────────────────────────────────────────────────────┐
│ 1. USER INPUT                                                │
│    - Types question in chat textarea                         │
│    - Clicks "Send" button or presses Enter                   │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 2. QUESTION PREPARATION                                      │
│    chat.js: sendMessage()                                    │
│    ├──> question = $('#chat-input').value                   │
│    ├──> repo = $('#chat-repo-select').value || 'auto'       │
│    ├──> model = localStorage.getItem('chat-model')          │
│    ├──> settings = { final_k, confidence, multi_query }     │
│    └──> Add to chat history (localStorage)                  │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 3. CHAT API REQUEST                                          │
│    POST /api/chat                                            │
│    Body: { question, repo, model, settings }                │
│    ⚠️ NO STREAMING - waits for full response                │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 4. BACKEND RAG PROCESSING                                    │
│    server/routers/chat_routes.py: chat_endpoint()           │
│    ├──> 1. Query Understanding                               │
│    │    ├──> Rephrase with LLM                              │
│    │    └──> Generate semantic synonyms                      │
│    ├──> 2. Hybrid Retrieval                                  │
│    │    ├──> Dense: Qdrant vector search (TOPK_DENSE)       │
│    │    ├──> Sparse: BM25 keyword search (TOPK_SPARSE)      │
│    │    └──> Fusion: RRF_K_DIV                              │
│    ├──> 3. Reranking                                         │
│    │    ├──> If AGRO reranker: cross-encoder scoring        │
│    │    └──> If Cohere: API call                            │
│    ├──> 4. Context Hydration                                 │
│    │    └──> Load full code for top FINAL_K chunks          │
│    ├──> 5. Generation                                        │
│    │    ├──> Build prompt with context                       │
│    │    ├──> LLM call (OpenAI/Anthropic/etc.)               │
│    │    └──> Stream response (NOT used by GUI)              │
│    └──> Return { answer, sources, confidence, trace }       │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 5. RESPONSE HANDLING                                         │
│    chat.js: sendMessage() (continued)                       │
│    ├──> Add assistant message to chat history               │
│    ├──> Display answer in chat UI                           │
│    ├──> Show citations/sources (if enabled)                 │
│    ├──> Show confidence score (if enabled)                  │
│    └──> Show routing trace (in details element)             │
└────────────┬─────────────────────────────────────────────────┘
             │
┌────────────▼─────────────────────────────────────────────────┐
│ 6. UI UPDATE COMPLETE                                        │
│    - Chat history updated                                    │
│    - Auto-scroll to latest message                           │
│    - Input cleared, ready for next question                  │
│    - ⚠️ LATENCY: 1-3 seconds due to no streaming            │
└──────────────────────────────────────────────────────────────┘
```

**Key Files:**
- HTML: Lines 5414-5784 (chat interface)
- JS: `chat.js` lines 100-400 (sendMessage, displayMessage)
- API: `POST /api/chat` → `server/routers/chat_routes.py:chat_endpoint()`

---

## API Endpoint Summary

### Configuration Endpoints (6)
- `GET /api/config` - Load current configuration
- `POST /api/config` - Save configuration updates
- `POST /api/env/reload` - Refresh environment from disk
- `GET /api/models` - Get model pricing data
- `POST /api/repos/{name}/validate-path` - Validate repository path
- `POST /api/keywords/add` - Add new keyword

### Indexing Endpoints (4)
- `GET /api/index/stats` - Get index statistics
- `POST /api/index/start` - Start indexing operation
- `POST /api/index/stop` - Stop running indexer
- `GET /api/index/status` - Poll indexing progress

### Reranker Endpoints (17)
- `POST /api/reranker/mine` - Mine training triplets
- `POST /api/reranker/train` - Train reranker model
- `POST /api/reranker/evaluate` - Evaluate model performance
- `GET /api/reranker/status` - Get training/eval status
- `GET /api/reranker/info` - Get reranker configuration
- `GET /api/reranker/logs` - Fetch query logs
- `GET /api/reranker/logs/download` - Download logs as JSONL
- `POST /api/reranker/logs/clear` - Clear query logs
- `POST /api/reranker/cron/setup` - Schedule nightly training
- `POST /api/reranker/cron/remove` - Remove cron job
- `POST /api/reranker/baseline/save` - Save eval baseline
- `GET /api/reranker/baseline/compare` - Compare to baseline
- `POST /api/reranker/rollback` - Rollback to previous model
- `POST /api/reranker/smoketest` - Run smoke test
- `POST /api/feedback` - Submit user feedback
- `GET /api/reranker/costs` - Get cost tracking data
- `GET /api/reranker/nohits` - Get failed queries

### Docker & Infrastructure (10)
- `GET /api/docker/containers` - List Docker containers
- `POST /api/docker/refresh` - Refresh container status
- `GET /api/health` - System health check
- `GET /api/health/editor` - Editor health status
- `POST /api/mcp/start` - Start MCP server
- `POST /api/mcp/stop` - Stop MCP server
- `GET /api/mcp/status` - Get MCP server status
- `POST /api/mcp/rag_search` - RAG search debug tool
- `POST /api/secrets/ingest` - Upload secrets file
- `GET /api/langsmith/latest` - Get latest LangSmith run

### Chat & RAG (4)
- `POST /api/chat` - Submit RAG query
- `GET /api/search` - Text search (NOT IMPLEMENTED in GUI)
- `POST /api/cards/build` - Build semantic cards
- `POST /api/cards/stop` - Stop cards build

---

## State Management

### Global State (CoreUtils.state)

```javascript
window.CoreUtils.state = {
  models: null,        // { models: [...] } from /api/models
  config: null,        // { env, repos, hints } from /api/config
  profiles: [],        // User-saved profiles
  defaultProfile: null // Currently active profile
}
```

**Issues:**
- ⚠️ Mutable - any module can modify
- ⚠️ No change notifications - other modules unaware of updates
- ⚠️ No validation - can be set to invalid values

### localStorage State

**Keys Used:**
- `THEME_MODE` - UI theme preference
- `collapsed-{id}` - Collapsible section states
- `agro-sidepanel-width` - Sidepanel width in pixels
- `chat-history` - Chat message history (JSON array)
- `chat-model` - Selected chat model
- `chat-temperature`, `chat-max-tokens` - Chat settings

**Issues:**
- ⚠️ 5-10MB limit - chat history can fill storage
- ⚠️ Not synced across devices
- ⚠️ Lost on browser storage clear

---

## Critical Data Flow Issues

### Issue 1: Type Coercion Gap
**Location:** config.js:gatherConfigForm()
**Problem:** Numeric inputs sent as strings
**Impact:** Backend receives `"150"` instead of `150`
**Fix:** Add `parseFloat()` or `parseInt()` conversion

### Issue 2: No Streaming in Chat
**Location:** chat.js:sendMessage()
**Problem:** Waits for complete response before displaying
**Impact:** 1-3 second latency, poor UX
**Fix:** Implement Server-Sent Events or WebSocket

### Issue 3: Missing Form Validation
**Location:** config.js:saveConfig()
**Problem:** No client-side validation before API call
**Impact:** Invalid data sent to backend, error on server
**Fix:** Add validation library with range/enum checks

### Issue 4: Polling Inefficiency
**Location:** Multiple modules (indexing.js, reranker.js)
**Problem:** Fixed 1-2 second polling intervals
**Impact:** Battery drain, unnecessary API calls
**Fix:** Implement exponential backoff or WebSocket

### Issue 5: State Synchronization
**Location:** All modules using CoreUtils.state
**Problem:** No notification when state changes
**Impact:** UI may show stale data
**Fix:** Implement observer pattern or reactive state

---

## Integration Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                     CoreUtils (Foundation)                   │
│  - API base resolution                                       │
│  - Global state container                                    │
│  - Event bus                                                 │
└────────┬────────────────────────────────────────────────────┘
         │
         ├──> Theme (UI theme management)
         ├──> UiHelpers (DOM utilities)
         ├──> Tabs (Navigation)
         ├──> Config (All parameters)
         ├──> Indexing (Index operations)
         ├──> Reranker (Training/eval)
         ├──> Chat (RAG queries)
         ├──> Docker (Container management)
         └──> All other modules (20+ dependencies)
```

**Risk:** Single point of failure - if CoreUtils fails, entire UI breaks

---

## Recommendations

### High Priority
1. Add type conversion in form gathering
2. Implement client-side validation
3. Add streaming support to chat
4. Fix polling inefficiency
5. Implement state change notifications

### Medium Priority
6. Migrate chat history to IndexedDB
7. Add WebSocket support for real-time updates
8. Implement retry logic with exponential backoff
9. Add request timeout handling
10. Cache API responses where appropriate

### Low Priority
11. Convert to ES6 modules (from window.* namespace)
12. Add comprehensive error boundaries
13. Implement request queue management
14. Add offline support with service workers

---

**Document Prepared By:** Claude Code
**Last Updated:** 2025-11-20
**Status:** COMPREHENSIVE DOCUMENTATION COMPLETE
**Next Step:** Use this for implementation planning
