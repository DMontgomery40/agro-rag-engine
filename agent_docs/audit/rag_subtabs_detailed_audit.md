# RAG Subtabs Detailed Content Audit

**Date:** November 21, 2024  
**Status:** Complete - 6/6 subtabs analyzed  
**Priority:** HIGHEST - These are critical to React migration

---

## Executive Summary

All 6 RAG subtabs use `dangerouslySetInnerHTML` to render complex configuration interfaces. They contain:
- **Total form elements:** 250+
- **Total buttons:** 40+
- **Total inputs/selects:** 200+
- **Model picker locations:** 5 different subtabs

**Critical Finding:** EvaluateSubtab appears incomplete - it ends abruptly in the middle of the Profiles tab content (line 326), suggesting it was restored from git without full content.

---

## 1. DataQualitySubtab.tsx

**File Path:** `/Users/davidmontgomery/agro-rag-engine/web/src/components/RAG/DataQualitySubtab.tsx`

### Basic Info
- **Uses dangerouslySetInnerHTML:** YES
- **HTML Content Line Count:** ~200 lines (lines 5-198)
- **Complexity Score:** 6/10
- **Estimated Effort:** Medium

### Buttons (7 total)
| ID | Label | Purpose |
|---|---|---|
| `btn-cards-build` | ⚡ Build Cards | Triggers card building process |
| `btn-cards-refresh` | ↻ Refresh | Refreshes card list/status |
| `btn-cards-view-all` | 📋 View All | Opens cards viewer modal |
| `cards-progress-cancel` | ■ Cancel Build | Cancels ongoing build |
| `cards-progress-logs` | 📄 View Logs | Opens build logs terminal |
| `cards-progress-clear` | ✕ Clear | Clears progress display |

### Input Fields (6 total)
| ID | Type | Purpose | Default |
|---|---|---|---|
| `cards-repo-select` | select | Repository to build cards for | Loading... |
| `cards-exclude-dirs` | text | Directories to exclude | e.g., node_modules, vendor, dist |
| `cards-exclude-patterns` | text | File patterns to exclude | e.g., .test.js, .spec.ts, .min.js |
| `cards-exclude-keywords` | text | Keywords to skip | e.g., deprecated, legacy, TODO |
| `cards-max` | number | Max chunks limit (0=all) | 0 |
| `cards-enrich-gui` | checkbox | Enable AI enrichment | checked |
| `cards-search` | search | Filter cards by text | Search semantic cards... |

### Forms
- No explicit `<form>` tags; inputs are collected via IDs in JavaScript

### Progress/Status Elements
- Loading panel: `#data-quality-loading` with progress bar
- Progress container: `#cards-progress-container` with:
  - Stage pills: `#cards-progress-stage-{scan|chunk|summarize|sparse|write|finalize}`
  - Progress bar: `#cards-progress-bar`
  - Stats: `#cards-progress-stats`, `#cards-progress-throughput`, `#cards-progress-eta`
  - Tip: `#cards-progress-tip`

### Model Picker
**YES** - Present as:
- `#cards-progress-models` (display area)
- Shows: embed model, enrich model, rerank model

### Sections
1. **Repository Configuration** - `#repos-section`
2. **Code Cards Builder & Viewer** - Main section with all controls
3. **Semantic Synonyms** - Read-only info section

### Expected Backend API Endpoints
- `POST /api/cards/build` - Initiate card building
- `GET /api/cards/status` - Poll build status
- `DELETE /api/cards/cancel` - Cancel build
- `GET /api/cards/logs` - Fetch build logs
- `GET /api/cards/list` - Fetch built cards
- `GET /api/repos` - List repositories

### Event Handlers Required
- `#btn-cards-build` → onclick → POST /api/cards/build
- `#btn-cards-refresh` → onclick → GET /api/cards/list
- `#btn-cards-view-all` → onclick → Navigate to cards viewer
- `#cards-progress-cancel` → onclick → DELETE /api/cards/cancel
- `#cards-progress-logs` → onclick → GET /api/cards/logs
- `#cards-search` → oninput → Filter cards array

### Issues/Notes
- No existing event handlers in HTML (no onclick attributes)
- Terminal container: `#cards-terminal-container` - expects SSE or WebSocket connection
- Cards viewer uses grid layout: `#cards-viewer`
- All styling via CSS variables (accessible from theme)

---

## 2. RetrievalSubtab.tsx

**File Path:** `/Users/davidmontgomery/agro-rag-engine/web/src/components/RAG/RetrievalSubtab.tsx`

### Basic Info
- **Uses dangerouslySetInnerHTML:** YES
- **HTML Content Line Count:** ~950 lines (lines 5-948)
- **Complexity Score:** 9/10 (MOST COMPLEX)
- **Estimated Effort:** Complex - extensive parameter tuning UI

### Buttons (4 total)
| ID | Label | Purpose |
|---|---|---|
| `btn-add-gen-model` | Add Model | Opens model addition dialog |
| `btn-trace-latest` | Open | Load latest trace |
| `btn-trace-open-ls` | Open | Open trace in LangSmith |

### Input Fields (55+ total)
**Generation Models Section:**
| Name | Type | ID | Purpose | Default |
|---|---|---|---|---|
| GEN_MODEL | select | `gen-model-select` | Primary generation model | — |
| OPENAI_API_KEY | password | — | OpenAI API credentials | — |
| GEN_TEMPERATURE | number | — | Generation temperature | 0.0 |
| ENRICH_MODEL | select | `enrich-model-select` | Enrich model (OpenAI/Claude) | — |
| ENRICH_MODEL_OLLAMA | select | `enrich-model-ollama-select` | Ollama enrichment model | — |
| ANTHROPIC_API_KEY | password | — | Anthropic API key | — |
| GOOGLE_API_KEY | password | — | Google API key | — |
| OLLAMA_URL | text | — | Ollama server URL | http://127.0.0.1:11434 |
| OPENAI_BASE_URL | text | — | OpenAI proxy URL (vLLM) | For vLLM proxy |
| GEN_MODEL_HTTP | select | `http-override-model-select` | HTTP override model | — |
| GEN_MODEL_MCP | select | `mcp-override-model-select` | MCP override model | — |
| GEN_MODEL_CLI | select | `cli-override-model-select` | CLI override model | — |
| ENRICH_BACKEND | select | `enrich-backend-select` | Enrich backend (openai/anthropic/google/cohere/ollama/local/mlx) | Default |
| GEN_MAX_TOKENS | number | `GEN_MAX_TOKENS` | Max output tokens | 2048 |
| GEN_TOP_P | number | `GEN_TOP_P` | Nucleus sampling (top-p) | 1.0 |
| GEN_TIMEOUT | number | `GEN_TIMEOUT` | API timeout in seconds | 60 |
| GEN_RETRY_MAX | number | `GEN_RETRY_MAX` | Max retries on failure | 2 |
| ENRICH_DISABLED | select | `ENRICH_DISABLED` | Disable enrichment | 0 (enabled) |

**Keywords Parameters Section:**
| Name | Type | ID | Purpose | Default |
|---|---|---|---|---|
| KEYWORDS_MAX_PER_REPO | number | `KEYWORDS_MAX_PER_REPO` | Max keywords per repo | 50 |
| KEYWORDS_MIN_FREQ | number | `KEYWORDS_MIN_FREQ` | Min frequency threshold | 3 |
| KEYWORDS_BOOST | number | `KEYWORDS_BOOST` | Keyword boost multiplier | 1.3 |
| KEYWORDS_AUTO_GENERATE | select | `KEYWORDS_AUTO_GENERATE` | Auto-generate keywords | 1 (enabled) |
| KEYWORDS_REFRESH_HOURS | number | `KEYWORDS_REFRESH_HOURS` | Refresh interval hours | 24 |

**Retrieval Parameters Section:**
| Name | Type | ID | Purpose | Default |
|---|---|---|---|---|
| MQ_REWRITES | number | — | Multi-query rewrites | 2 |
| FINAL_K | number | — | Final results count | 10 |
| USE_SEMANTIC_SYNONYMS | select | — | Enable semantic synonyms | 1 (ON) |
| TOPK_DENSE | number | — | Dense vector candidates | 75 |
| VECTOR_BACKEND | select | — | Vector backend (qdrant/faiss) | qdrant |
| TOPK_SPARSE | number | — | BM25 candidates | 75 |
| HYDRATION_MODE | select | — | Code loading (lazy/none) | lazy |
| HYDRATION_MAX_CHARS | number | — | Max chars per chunk | 2000 |
| VENDOR_MODE | select | — | Code priority (prefer_first_party/prefer_vendor) | prefer_first_party |
| BM25_WEIGHT | number | `BM25_WEIGHT` | BM25 fusion weight | 0.3 |
| VECTOR_WEIGHT | number | `VECTOR_WEIGHT` | Vector fusion weight | 0.7 |
| CARD_SEARCH_ENABLED | select | `CARD_SEARCH_ENABLED` | Enable card search | 1 (enabled) |
| MULTI_QUERY_M | number | `MULTI_QUERY_M` | Multi-query parameter M | 4 |
| CONF_TOP1 | number | `CONF_TOP1` | Confidence threshold (top-1) | 0.62 |
| CONF_AVG5 | number | `CONF_AVG5` | Confidence threshold (avg-5) | 0.55 |

**Advanced RAG Tuning Section:**
| Name | Type | ID | Purpose | Default |
|---|---|---|---|---|
| RRF_K_DIV | number | — | RRF K divisor | 60 |
| CARD_BONUS | number | — | Card semantic bonus | 0.08 |
| FILENAME_BOOST_EXACT | number | — | Exact filename multiplier | 1.5 |
| FILENAME_BOOST_PARTIAL | number | — | Partial path multiplier | 1.2 |
| LANGGRAPH_FINAL_K | number | — | LangGraph document count | 20 |
| MAX_QUERY_REWRITES | number | — | Max iteration rewrites | 3 |
| FALLBACK_CONFIDENCE | number | — | Fallback threshold | 0.55 |
| LAYER_BONUS_GUI | number | `LAYER_BONUS_GUI` | GUI layer bonus | 0.15 |
| LAYER_BONUS_RETRIEVAL | number | `LAYER_BONUS_RETRIEVAL` | Retrieval layer bonus | 0.15 |
| VENDOR_PENALTY | number | `VENDOR_PENALTY` | Vendor code penalty | -0.1 |
| FRESHNESS_BONUS | number | `FRESHNESS_BONUS` | Freshness bonus | 0.05 |

**Routing Trace Section:**
| Name | Type | ID | Purpose | Default |
|---|---|---|---|---|
| TRACING_MODE | select | — | Trace backend (off/local/langsmith) | off |
| TRACE_AUTO_LS | select | — | Auto-open in LangSmith | 0 |
| TRACE_RETENTION | number | — | Trace retention count | 50 |
| LANGCHAIN_TRACING_V2 | select | — | LangChain tracing v2 | 0 |
| LANGCHAIN_ENDPOINT | text | — | LangSmith endpoint | https://api.smith.langchain.com |
| LANGCHAIN_API_KEY | password | — | LangChain API key | — |
| LANGSMITH_API_KEY | password | — | LangSmith API key (alias) | — |
| LANGCHAIN_PROJECT | text | — | LangSmith project name | agro |
| LANGTRACE_API_HOST | text | — | LangTrace API host | — |
| LANGTRACE_PROJECT_ID | text | — | LangTrace project ID | — |
| LANGTRACE_API_KEY | password | — | LangTrace API key | — |

### Forms
- No explicit form tags; all inputs collected via name attributes in JavaScript

### Model Pickers
**YES** - Multiple model selectors with class `.model-select`:
- `#gen-model-select` (GEN_MODEL) with `data-component-filter="GEN"`
- `#enrich-model-select` (ENRICH_MODEL) with `data-component-filter="GEN"`
- `#enrich-model-ollama-select` (ENRICH_MODEL_OLLAMA)
- `#http-override-model-select` (GEN_MODEL_HTTP)
- `#mcp-override-model-select` (GEN_MODEL_MCP)
- `#cli-override-model-select` (GEN_MODEL_CLI)

### Sections (7 major)
1. Generation Models
2. Keywords Parameters
3. Retrieval Parameters
4. Advanced RAG Tuning
5. Routing Trace
6. LangSmith/LangChain Tracing Settings
7. LangTrace Settings

### Display Elements
- `#trace-output` - Terminal display for trace results

### Expected Backend API Endpoints
- `POST /api/config` - Save all settings
- `GET /api/config` - Fetch current settings
- `GET /api/models` - List available models
- `GET /api/traces/latest` - Get latest trace
- `POST /api/traces/open-langsmith` - Open trace in LangSmith
- `GET /api/health/langsmith` - Check LangSmith connectivity
- `GET /api/health/qdrant` - Check Qdrant health
- `GET /api/health/ollama` - Check Ollama health

### Event Handlers Required
- `#btn-add-gen-model` → onclick → Show model picker
- `#btn-trace-latest` → onclick → GET /api/traces/latest
- `#btn-trace-open-ls` → onclick → POST /api/traces/open-langsmith
- All model selectors → onchange → Save to config
- All input fields → onchange → Save to config (debounced)
- All number/text inputs → onblur → Validate and save

### Special Features
- Extensive help tooltips with `.tooltip-bubble` elements
- Nested tooltip-wrap sections with detailed explanations
- Help icon tooltips with `data-tooltip` attributes
- Badge system (tt-badge): info, warn, etc.

### Issues/Notes
- Very large subtab - consider splitting into multiple tabs or using accordion
- Tooltip content is extensive and helpful but static
- No existing form submission mechanism
- Settings need debounced saving to prevent API spam
- Model selectors may need remote loading based on backend capabilities

---

## 3. ExternalRerankersSubtab.tsx

**File Path:** `/Users/davidmontgomery/agro-rag-engine/web/src/components/RAG/ExternalRerankersSubtab.tsx`

### Basic Info
- **Uses dangerouslySetInnerHTML:** YES
- **HTML Content Line Count:** ~100 lines (lines 5-99)
- **Complexity Score:** 5/10
- **Estimated Effort:** Simple-Medium

### Buttons (0 total)
No action buttons; all elements are configuration inputs.

### Input Fields (4 total)
| Name | Type | ID | Purpose | Default |
|---|---|---|---|---|
| RERANK_BACKEND | select | — | Reranking backend (none/local/hf/cohere) | none |
| RERANKER_MODEL | text | — | Local/HF model name | cross-encoder/ms-marco-MiniLM-L-12-v2 |
| COHERE_RERANK_MODEL | select | — | Cohere rerank model | (select model) |
| COHERE_API_KEY | password | — | Cohere API credentials | — |
| TRANSFORMERS_TRUST_REMOTE_CODE | select | — | Trust remote code (HF) | 1 |
| RERANK_INPUT_SNIPPET_CHARS | number | — | Input snippet max chars | 700 |

### Forms
- No form tags

### Model Pickers
**NO** - Just select dropdowns for predefined models

### Display Elements
- **Current Reranker Info Panel:** `#reranker-info-panel-ext`
  - Displays: enabled status, model path, device, alpha, topn, batch, maxlen
  - Element IDs: `#reranker-info-{enabled|path|device|alpha|topn|batch|maxlen}-ext`
- **Warning Panel:** `#rerank-none-warning` (shown when no reranker enabled)

### Sections (1 major)
1. Reranking Configuration

### Expected Backend API Endpoints
- `POST /api/config/reranker` - Save reranker settings
- `GET /api/reranker/info` - Get current reranker info
- `POST /api/reranker/test` - Test reranker configuration

### Event Handlers Required
- `RERANK_BACKEND` select → onchange → Update model options & save
- `COHERE_API_KEY` input → onchange → Validate API key
- `TRANSFORMERS_TRUST_REMOTE_CODE` select → onchange → Save setting

### Issues/Notes
- Status panel reads server state, not form state
- Needs live refresh of reranker info after config change
- Cohere models are hardcoded (good for stability)
- Warning message when reranker is disabled is good UX

---

## 4. LearningRankerSubtab.tsx

**File Path:** `/Users/davidmontgomery/agro-rag-engine/web/src/components/RAG/LearningRankerSubtab.tsx`

### Basic Info
- **Uses dangerouslySetInnerHTML:** YES
- **HTML Content Line Count:** ~380 lines (lines 5-384)
- **Complexity Score:** 9/10 (VERY COMPLEX)
- **Estimated Effort:** Complex - multi-step workflow with terminals

### Buttons (15+ total)
| ID | Label | Purpose | Section |
|---|---|---|---|
| `reranker-mine-btn` | Mine Triplets | Extract training data | Training Workflow |
| `reranker-train-btn` | Train Model | Fine-tune cross-encoder | Training Workflow |
| `reranker-eval-btn` | Evaluate | Measure MRR/Hit@K | Training Workflow |
| `reranker-view-logs` | View Logs | Display query logs | Log Viewer |
| `reranker-download-logs` | Download Logs | Export logs as JSON | Log Viewer |
| `reranker-clear-logs` | Clear Logs | Delete all logs | Log Viewer |
| `reranker-save-baseline` | Save as Baseline | Save evaluation baseline | Evaluation Results |
| `reranker-compare-baseline` | Compare vs Baseline | Compare to saved baseline | Evaluation Results |
| `reranker-rollback` | Rollback Model | Revert to previous model | Evaluation Results |
| `reranker-setup-cron` | Setup Nightly Job | Schedule nightly training | Automation |
| `reranker-remove-cron` | Remove Nightly Job | Cancel scheduled training | Automation |
| `reranker-smoke-test` | Run Smoke Test | Test end-to-end flow | Smoke Test |
| `reranker-cost-details` | View Cost Breakdown | Show cost details | Cost Tracking |

### Input Fields (30+ total)

**System Status Section:**
| ID | Type | Purpose | Display Only |
|---|---|---|---|
| `reranker-enabled-status` | div | Status (enabled/disabled) | YES |
| `reranker-query-count` | div | Total queries logged | YES |
| `reranker-triplet-count` | div | Training triplets count | YES |

**Configuration Section:**
| Name | Type | ID | Purpose | Default |
|---|---|---|---|---|
| AGRO_RERANKER_ENABLED | select | — | Enable learning reranker | 0 (OFF) |
| AGRO_RERANKER_MODEL_PATH | text | — | Model directory path | models/cross-encoder-agro |
| AGRO_LOG_PATH | text | — | Query log file path | data/logs/queries.jsonl |
| AGRO_TRIPLETS_PATH | text | — | Triplets output file | data/training/triplets.jsonl |
| AGRO_RERANKER_MINE_MODE | select | — | Mine mode (append/replace) | append |
| AGRO_RERANKER_MINE_RESET | select | — | Reset before mining | 0 (No) |
| AGRO_RERANKER_ALPHA | number | — | Blend alpha (CE weight) | 0.7 |
| AGRO_RERANKER_MAXLEN | number | — | Max sequence length | 512 |
| AGRO_RERANKER_BATCH | number | — | Batch size (inference) | 16 |
| AGRO_RERANKER_TOPN | number | `AGRO_RERANKER_TOPN` | Reranker top-N | 50 |
| VOYAGE_RERANK_MODEL | text | `VOYAGE_RERANK_MODEL` | Voyage rerank model | rerank-2 |
| AGRO_RERANKER_RELOAD_ON_CHANGE | select | `AGRO_RERANKER_RELOAD_ON_CHANGE` | Auto-reload on config change | 0 (Disabled) |

**Training Hyperparameters:**
| Name | Type | ID | Purpose | Default |
|---|---|---|---|---|
| RERANKER_TRAIN_EPOCHS | number | `reranker-epochs` | Training epochs | 2 |
| RERANKER_TRAIN_BATCH | number | `reranker-batch` | Training batch size | 16 |
| RERANKER_TRAIN_MAX_LENGTH | number | `reranker-maxlen` | Training max length | 512 |
| RERANKER_TRAIN_LR | number | `RERANKER_TRAIN_LR` | Learning rate | 0.00002 |
| RERANKER_WARMUP_RATIO | number | `RERANKER_WARMUP_RATIO` | Warmup ratio | 0.1 |

**Triplets Configuration:**
| Name | Type | ID | Purpose | Default |
|---|---|---|---|---|
| TRIPLETS_MIN_COUNT | number | `TRIPLETS_MIN_COUNT` | Min triplets for training | 100 |
| TRIPLETS_MINE_MODE | select | `TRIPLETS_MINE_MODE` | Mine mode (replace/append) | replace |

**Automation Section:**
| Type | ID | Purpose |
|---|---|---|
| time input | `reranker-cron-time` | Nightly training time |

**Smoke Test Section:**
| ID | Type | Purpose |
|---|---|---|
| `reranker-test-query` | text input | Test query for smoke test |

### Forms
- No explicit form tags

### Model Pickers
**NO** - Configuration only, no model picker dropdown

### Display Elements (Important)
- **System Status Displays (read-only):**
  - `#reranker-enabled-status` - Status badge
  - `#reranker-query-count` - Query counter
  - `#reranker-triplet-count` - Triplet counter

- **Terminal Containers (for live output):**
  - `#reranker-terminal-container` - Main terminal for workflow steps
  - `#reranker-logs-viewer` - Log viewer terminal
  - `#reranker-smoke-result` - Smoke test results

- **Metrics Display:**
  - `#reranker-metrics-display` - Evaluation metrics grid
  - `#reranker-status` - Current task status
  - `#reranker-cron-status` - Cron job status
  - `#reranker-cost-24h` - 24-hour cost
  - `#reranker-cost-avg` - Average cost per query
  - `#reranker-nohits-list` - No-hit queries list

- **Result Cards (workflow steps):**
  - `#reranker-mine-result` - Mine step result
  - `#reranker-train-result` - Train step result
  - `#reranker-eval-result` - Eval step result

- **Info Panel (reads server state):**
  - `#reranker-info-panel` with child elements:
    - `#reranker-info-enabled`, `#reranker-info-path`, `#reranker-info-device`
    - `#reranker-info-alpha`, `#reranker-info-topn`, `#reranker-info-batch`, `#reranker-info-maxlen`

### Sections (11 major)
1. System Status
2. Training Workflow (3-step process)
3. Reranker Configuration
4. Evaluation Metrics
5. Evaluation Metrics Display
6. Query Logs
7. Automation (Cron)
8. Smoke Test
9. Cost Tracking
10. No-Hit Tracking

### Expected Backend API Endpoints
- `POST /api/reranker/mine-triplets` - Start mining
- `POST /api/reranker/train` - Start training
- `POST /api/reranker/evaluate` - Run evaluation
- `GET /api/reranker/status` - Get workflow status
- `GET /api/reranker/metrics` - Get evaluation metrics
- `POST /api/reranker/save-baseline` - Save baseline
- `POST /api/reranker/compare-baseline` - Compare to baseline
- `POST /api/reranker/rollback` - Rollback model
- `GET /api/reranker/logs` - Fetch query logs
- `POST /api/reranker/logs/clear` - Clear logs
- `POST /api/reranker/cron/setup` - Setup cron job
- `POST /api/reranker/cron/remove` - Remove cron job
- `GET /api/reranker/cron/status` - Get cron status
- `POST /api/reranker/smoke-test` - Run smoke test
- `GET /api/reranker/cost/24h` - Get 24h cost
- `GET /api/reranker/cost/breakdown` - Get detailed costs
- `GET /api/reranker/no-hits` - Get no-hit queries
- `GET /api/reranker/info` - Get current reranker info

### Event Handlers Required
- Buttons: onclick handlers for all 13 action buttons
- Workflow status polling: Continuous GET /api/reranker/status during mining/training/eval
- Terminal output streaming: SSE or WebSocket for live updates
- Cost display: Periodic refresh of cost metrics
- Form inputs: onchange/onblur with validation and save

### Special Features
- **3-Step Workflow UI:** Grid layout with 3 cards for mine → train → evaluate
- **Live Terminal:** Terminal container expects ANSI output or HTML rendering
- **Status Polling:** Needs continuous status updates during operations
- **Cost Tracking:** Real-time cost monitoring with spike alerts
- **Cron Management:** Schedule-based nightly training automation
- **Baseline Comparison:** Save and compare evaluation metrics over time
- **No-Hit Analysis:** Track queries that returned no results

### Issues/Notes
- Very interactive - requires significant event handler infrastructure
- Live terminal output needs streaming implementation (SSE/WebSocket)
- Status displays are read-only and need polling updates
- Cron scheduling requires backend scheduler (APScheduler, etc.)
- Cost tracking needs fine-grained telemetry
- Model info panel reads server state, not local state
- Smoke test needs to hit actual search endpoints

---

## 5. IndexingSubtab.tsx

**File Path:** `/Users/davidmontgomery/agro-rag-engine/web/src/components/RAG/IndexingSubtab.tsx`

### Basic Info
- **Uses dangerouslySetInnerHTML:** YES
- **HTML Content Line Count:** ~570 lines (lines 5-570)
- **Complexity Score:** 8/10 (Complex - lots of settings + progress tracking)
- **Estimated Effort:** Complex - extensive configuration + progress UI

### Buttons (12+ total)
| ID | Label | Purpose | Section |
|---|---|---|---|
| `simple-index-btn` | 🚀 INDEX NOW | Start indexing (simple UI) | Simple Index |
| `btn-index-start` | ▶ Start Indexing | Start indexing (advanced) | Build Index |
| `btn-index-stop` | ■ Stop | Stop running indexing | Build Index |
| `btn-refresh-index-stats` | Refresh | Refresh index status | Index Status |
| `btn-save-index-settings` | 💾 Save Settings | Save all index settings | Advanced Settings |
| `btn-apply-profile` | Apply Profile | Apply index profile | Index Profiles |

### Input Fields (40+ total)

**Current Repo Display Section:**
| Type | ID | Purpose |
|---|---|---|
| select | `indexing-repo-selector` | Select current repo (styled) |
| display | `indexing-branch-display` | Show current branch (read-only) |

**Simple Index Section:**
| Type | ID | Purpose | Default |
|---|---|---|---|
| select | `simple-repo-select` | Repository to index | Loading... |
| checkbox | `simple-dense-check` | Include dense embeddings | checked |
| pre | `simple-output` | Output display area | hidden |

**Build Index Section:**
| Name | Type | ID | Purpose | Default |
|---|---|---|---|---|
| — | select | `index-repo-select` | Repository to index | — |
| EMBEDDING_TYPE | select | — | Embedding type (openai/local/voyage) | openai |
| — | select | `index-skip-dense` | Skip dense index | 0 (No) |
| — | select | `index-enrich-chunks` | Enrich code chunks | 0 (No) |

**Advanced Settings Section:**
| Name | Type | ID | Purpose | Default |
|---|---|---|---|---|
| OUT_DIR_BASE | text | — | Output directory (read-only) | ./out |
| COLLECTION_NAME | text | — | Qdrant collection name | code_chunks_{repo} |
| CHUNK_SIZE | number | — | Chunk size in tokens | 1000 |
| CHUNK_OVERLAP | number | — | Chunk overlap in tokens | 200 |
| INDEX_MAX_WORKERS | number | — | Max parallel workers | 4 |
| AST_OVERLAP_LINES | number | `AST_OVERLAP_LINES` | AST overlap lines | 20 |
| MAX_CHUNK_SIZE | number | `MAX_CHUNK_SIZE` | Max chunk size in bytes | 2000000 |
| MIN_CHUNK_CHARS | number | `MIN_CHUNK_CHARS` | Min chunk chars | 50 |
| GREEDY_FALLBACK_TARGET | number | `GREEDY_FALLBACK_TARGET` | Greedy fallback target | 800 |
| CHUNKING_STRATEGY | select | `CHUNKING_STRATEGY` | Strategy (ast/greedy/hybrid) | ast |
| PRESERVE_IMPORTS | select | `PRESERVE_IMPORTS` | Preserve imports in chunks | 1 (Yes) |
| INDEXING_BATCH_SIZE | number | `INDEXING_BATCH_SIZE` | Batch size for indexing | 100 |
| INDEXING_WORKERS | number | `INDEXING_WORKERS` | Indexing worker threads | 4 |
| BM25_TOKENIZER | select | `BM25_TOKENIZER` | Tokenizer (stemmer/lowercase/whitespace) | stemmer |
| BM25_STEMMER_LANG | text | `BM25_STEMMER_LANG` | Stemmer language | english |
| INDEX_EXCLUDED_EXTS | text | `INDEX_EXCLUDED_EXTS` | Excluded file extensions | .png,.jpg,.gif,.ico,.svg,.woff,.ttf |
| INDEX_MAX_FILE_SIZE_MB | number | `INDEX_MAX_FILE_SIZE_MB` | Max file size in MB | 10 |
| EMBEDDING_MODEL | text | `EMBEDDING_MODEL` | Embedding model name | text-embedding-3-large |
| EMBEDDING_DIM | number | `EMBEDDING_DIM` | Embedding dimensions | 3072 |
| VOYAGE_MODEL | text | `VOYAGE_MODEL` | Voyage AI model | voyage-code-3 |
| EMBEDDING_MODEL_LOCAL | text | `EMBEDDING_MODEL_LOCAL` | Local embedding model | all-MiniLM-L6-v2 |
| EMBEDDING_BATCH_SIZE | number | `EMBEDDING_BATCH_SIZE` | Embedding batch size | 64 |
| EMBEDDING_MAX_TOKENS | number | `EMBEDDING_MAX_TOKENS` | Max tokens for embedding | 8000 |
| EMBEDDING_CACHE_ENABLED | select | `EMBEDDING_CACHE_ENABLED` | Enable embedding cache | 1 (Enabled) |
| EMBEDDING_TIMEOUT | number | `EMBEDDING_TIMEOUT` | Embedding timeout (seconds) | 30 |
| EMBEDDING_RETRY_MAX | number | `EMBEDDING_RETRY_MAX` | Max embedding retries | 3 |

**Index Profiles Section:**
| Type | ID | Purpose | Options |
|---|---|---|---|
| select | `index-profile-select` | Active index profile | shared, full, dev |

### Forms
- No explicit form tags

### Model Pickers
**NO** - Fixed model selections, no dynamic model picker

### Display Elements
- **Index Status Display:** `#index-status-display` (read-only info)
- **Progress Bar:** `#index-bar` with text inside `#index-bar-text`
- **Status Output:** `#index-status` (terminal-style output, max-height 300px)
- **Profile Description:** `#profile-description` (populated by JS based on selection)
- **Simple Output:** `#simple-output` (pre-formatted output area)

### Progress Tracking Elements
- Progress bar: `#index-bar` (width animation)
- Progress text: `#index-bar-text` (percentage/status)
- Status log: `#index-status` (scrollable terminal-style output)

### Sections (6 major)
1. Current Repo Display
2. Simple Index Button (Large, friendly UX)
3. Build Index (Advanced)
4. Index Status Display
5. Advanced Settings (with many subsections)
6. Index Profiles

### Expected Backend API Endpoints
- `POST /api/index/start` - Start indexing
- `POST /api/index/stop` - Stop indexing
- `GET /api/index/status` - Poll indexing status
- `GET /api/index/stats` - Get index statistics
- `GET /api/repos` - List repositories
- `GET /api/repos/{repo}/branch` - Get current branch
- `POST /api/config/indexing` - Save indexing settings
- `GET /api/config/indexing` - Get indexing settings
- `POST /api/index/apply-profile` - Apply index profile
- WebSocket or SSE for live progress streaming

### Event Handlers Required
- `#simple-index-btn` → onclick → POST /api/index/start
- `#btn-index-start` → onclick → POST /api/index/start
- `#btn-index-stop` → onclick → POST /api/index/stop
- `#indexing-repo-selector` → onchange → Update branch display + reload settings
- `#simple-repo-select` → onchange → Update repo context
- `#index-repo-select` → onchange → Update repo context
- `#btn-refresh-index-stats` → onclick → GET /api/index/stats
- `#btn-save-index-settings` → onclick → POST /api/config/indexing
- `#btn-apply-profile` → onclick → POST /api/index/apply-profile
- All numeric/text inputs → onchange → Validate and mark as dirty
- Progress polling → setInterval → GET /api/index/status (every 500ms during indexing)

### Special Features
- **Simple vs Advanced UX:** Two levels of indexing UI
- **Live Progress Tracking:** Progress bar with detailed status updates
- **Index Profiles:** Presets for different use cases (shared/full/dev)
- **Branch Display:** Shows git branch for transparency
- **Rich Settings:** Very granular control over chunking, embedding, tokenization
- **Multi-step Configuration:** Shows which embedding type affects which settings

### Issues/Notes
- Very long settings section - consider splitting or using accordion
- Some settings are context-specific (e.g., EMBEDDING_MODEL only needed when using OpenAI)
- OUT_DIR_BASE is disabled but shown (good for visibility)
- Profile description needs to be populated dynamically
- Progress display needs streaming updates (not just polling)
- Status output should support ANSI color codes or HTML
- Very broad configuration surface - many settings could use better defaults

---

## 6. EvaluateSubtab.tsx

**File Path:** `/Users/davidmontgomery/agro-rag-engine/web/src/components/RAG/EvaluateSubtab.tsx`

### Basic Info
- **Uses dangerouslySetInnerHTML:** YES
- **HTML Content Line Count:** ~325 lines (lines 5-326)
- **Complexity Score:** 8/10
- **Estimated Effort:** Complex - evaluation workflow + comparison UI
- **⚠️ CRITICAL ISSUE:** File appears INCOMPLETE - ends abruptly at line 326 in middle of Profiles tab

### Buttons (14+ total)
| ID | Label | Purpose | Section |
|---|---|---|---|
| `btn-golden-add` | Add Question | Add new golden question | Golden Questions |
| `btn-golden-test-new` | Test First | Test before adding | Golden Questions |
| `btn-golden-refresh` | Refresh List | Reload questions | Golden Questions |
| `btn-golden-load-recommended` | Load Recommended | Load preset questions | Golden Questions |
| `btn-golden-run-tests` | Run All Tests | Execute all tests | Golden Questions |
| `btn-golden-export` | Export JSON | Export as JSON | Golden Questions |
| `btn-eval-run` | Run Full Evaluation | Execute evaluation suite | Evaluation Runner |
| `btn-eval-save-settings` | Save Eval Settings | Save evaluation config | Evaluation Runner |
| `btn-eval-save-baseline` | Save as Baseline | Save current results | Results Display |
| `btn-eval-compare` | Compare to Baseline | Show comparison | Results Display |
| `btn-eval-export` | Export Results | Export evaluation results | Results Display |
| `btn-eval-history-refresh` | Refresh History | Reload run history | Run History |
| `btn-eval-history-clear` | Clear History | Delete history | Run History |

### Input Fields (15+ total)

**Golden Questions Form:**
| Type | ID | Purpose | Placeholder |
|---|---|---|---|
| textarea | `golden-new-q` | New question text | e.g., Where is OAuth token validated? |
| select | `golden-new-repo` | Repository | agro |
| text | `golden-new-paths` | Expected paths (comma-separated) | auth, oauth, token |

**Evaluation Settings:**
| Name | Type | ID | Purpose | Default |
|---|---|---|---|---|
| — | select | `eval-use-multi` | Use multi-query | 1 (Yes) |
| EVAL_FINAL_K | number | `eval-final-k` | Final K results | 5 |
| eval_sample_size | select | `eval-sample-size` | Sample size | Full |
| EVAL_GOLDEN_PATH | text | `eval-golden-path` | Golden questions path | data/golden.json |
| EVAL_BASELINE_PATH | text | `eval-baseline-path` | Baseline path | data/evals/eval_baseline.json |

**Golden Questions List:**
| Type | ID | Purpose |
|---|---|---|
| div | `golden-questions-content` | Display questions list |

### Forms
- No explicit form tags

### Model Pickers
**NO**

### Display Elements

**Golden Questions Section:**
- Questions list container: `#golden-questions-list`
- Questions content area: `#golden-questions-content`

**Evaluation Runner Section:**
- Progress display: `#eval-progress` (hidden by default)
- Progress bar: `#eval-progress-bar` (width animation)
- Status text: `#eval-status` (mono font, centered)

**Results Display:**
- Overall metrics grid (3 columns):
  - `#eval-top1-acc` - Top-1 accuracy
  - `#eval-topk-acc` - Top-K accuracy
  - `#eval-duration` - Execution time

- Details display: `#eval-details` (scrollable, max-height 300px)
- Comparison results: `#eval-comparison` (initially hidden)

**Run History Section:**
- History table: `#eval-history-table`
- Table body: `#eval-history-tbody`
- Headers: Timestamp, Configuration, Top-1, Top-5, Time(s), Δ Top-5

### Sections (4 major - but file INCOMPLETE)
1. Golden Questions Manager
2. Evaluation Runner
3. Evaluation Results Display
4. Evaluation Run History
5. (File cuts off - Profiles tab content NOT INCLUDED)

### Expected Backend API Endpoints
- `POST /api/eval/golden-questions` - Add new golden question
- `GET /api/eval/golden-questions` - Fetch all questions
- `DELETE /api/eval/golden-questions/{id}` - Delete question
- `POST /api/eval/test-question` - Test single question
- `POST /api/eval/run` - Run full evaluation
- `GET /api/eval/status` - Poll evaluation status
- `GET /api/eval/results` - Fetch latest results
- `POST /api/eval/save-baseline` - Save as baseline
- `POST /api/eval/compare-baseline` - Compare to baseline
- `GET /api/eval/history` - Fetch run history
- `POST /api/eval/history/clear` - Clear history
- `POST /api/eval/recommended-questions` - Load recommended questions
- `GET /api/eval/golden-questions/export` - Export as JSON
- `POST /api/eval/results/export` - Export results

### Event Handlers Required
- `#btn-golden-add` → onclick → POST /api/eval/golden-questions
- `#btn-golden-test-new` → onclick → POST /api/eval/test-question
- `#btn-golden-refresh` → onclick → GET /api/eval/golden-questions
- `#btn-golden-load-recommended` → onclick → POST /api/eval/recommended-questions
- `#btn-golden-run-tests` → onclick → POST /api/eval/run
- `#btn-golden-export` → onclick → GET /api/eval/golden-questions/export
- `#btn-eval-run` → onclick → POST /api/eval/run
- `#btn-eval-save-settings` → onclick → Save form inputs to backend
- `#btn-eval-save-baseline` → onclick → POST /api/eval/save-baseline
- `#btn-eval-compare` → onclick → POST /api/eval/compare-baseline
- `#btn-eval-export` → onclick → POST /api/eval/results/export
- `#btn-eval-history-refresh` → onclick → GET /api/eval/history
- `#btn-eval-history-clear` → onclick → POST /api/eval/history/clear
- Evaluation polling during run: GET /api/eval/status (every 1s)

### Special Features
- **Golden Questions Manager:** Add/manage test cases
- **Evaluation Runner:** Execute tests against current retrieval config
- **Metrics Display:** Top-1 & Top-K accuracy, duration
- **Baseline Comparison:** Track improvements over time
- **Run History Table:** Compare multiple evaluation runs
- **Results Export:** Download evaluation data for analysis

### Issues/Notes
- ⚠️ **FILE IS INCOMPLETE** - Ends at line 326, in the middle of the HTML
- Missing closing div tags for the htmlContent string
- Profiles tab section (line 248-326) is PARTIALLY present:
  - Starts a tab-profiles div
  - Includes tab-profiles-budget subtab
  - Has Cost & Token Burn Alerts section
  - Has Budget Alerts section
  - References `#storage-calculator-container` but no content
  - **ABRUPTLY CUTS OFF** - no closing tags
- The htmlContent string probably should end with closing `</div>` tags
- Component return statement at line 328 is correct, but HTML is malformed
- This needs to be completed or restored properly

---

## Priority Matrix & Conversion Order

### Conversion Difficulty Ranking
1. **ExternalRerankersSubtab** (5/10) - EASIEST
   - Simplest form, fewest elements
   - Straightforward model selectors
   - Good for warmup/learning

2. **DataQualitySubtab** (6/10) - EASY-MEDIUM
   - Well-organized sections
   - Card-based UI with grid layout
   - Progress tracking (can reuse patterns)
   - ~6 input fields, ~7 buttons

3. **IndexingSubtab** (8/10) - MEDIUM-HARD
   - Many settings (40+)
   - Progress tracking UI
   - Index profiles dropdown
   - Two UI levels (simple vs advanced)

4. **RetrievalSubtab** (9/10) - HARD
   - Most complex form (~55+ inputs)
   - Extensive tooltips
   - Multiple model selectors
   - Advanced tuning section
   - Very large subtab

5. **LearningRankerSubtab** (9/10) - HARD
   - Multi-step workflow (mine → train → eval)
   - Live terminal output needed
   - Cost tracking display
   - Cron job management
   - Status polling required

6. **EvaluateSubtab** (8/10) - MEDIUM-HARD (when completed)
   - Golden questions management
   - Evaluation workflow
   - **CRITICAL:** File is currently INCOMPLETE

### Recommended Conversion Order

#### Phase 1: Warmup (Low Risk, Quick Wins)
1. **ExternalRerankersSubtab** 
   - Start here - simplest, good learning
   - ~1-2 hours to convert
   - Minimal dependencies

#### Phase 2: Core Configuration (High Impact)
2. **DataQualitySubtab**
   - Medium complexity
   - Card building is important feature
   - ~2-3 hours

3. **RetrievalSubtab**
   - Largest single subtab
   - Many settings but straightforward structure
   - Consider breaking into multiple tabs if too large
   - ~4-5 hours (might need to split)

4. **IndexingSubtab**
   - Important for RAG setup
   - Progress tracking adds complexity
   - ~3-4 hours

#### Phase 3: Advanced Features (Interdependent)
5. **LearningRankerSubtab**
   - Most interactive
   - Requires solid backend endpoints
   - Terminal streaming complexity
   - ~4-5 hours (wait until backend is solid)

#### Phase 4: Evaluation (When Inspection Complete)
6. **EvaluateSubtab**
   - Fix incomplete file first
   - Evaluation workflow
   - Simpler than learning ranker
   - ~3-4 hours (after file is complete)

### Parallelization Potential

**Can work in parallel:**
- ExternalRerankersSubtab + DataQualitySubtab (no dependencies)
- RetrievalSubtab + IndexingSubtab (no dependencies)

**Must be sequential:**
- LearningRankerSubtab → depends on RetrievalSubtab (model pickers)
- EvaluateSubtab → depends on RetrievalSubtab (evaluation settings)

---

## Critical Findings

### 1. EvaluateSubtab is Incomplete ⚠️
The file ends abruptly at line 326 in the middle of HTML content. The Profiles tab section is partially included but not completed. This needs to be:
- Fixed in place before conversion
- Check git history for complete version
- Either restore full content or remove incomplete sections

### 2. All Subtabs Use dangerouslySetInnerHTML
- 6/6 = 100% use dangerous HTML rendering
- All need conversion to React components
- No existing event handlers (all JavaScript-driven)
- No state management (all form-based)

### 3. No Model Picker Consistency
- Each subtab with models uses own approach
- RetrievalSubtab has 6 different model selectors
- LearningRankerSubtab has none
- Should standardize on single ModelPicker component

### 4. Progress Tracking Pattern Appears 3 Times
- DataQualitySubtab: Card building progress
- IndexingSubtab: Indexing progress
- LearningRankerSubtab: Training/mining/eval progress
- Should create reusable ProgressBar + Terminal components

### 5. Terminal/Output Display Pattern Appears 3 Times
- DataQualitySubtab: `#cards-terminal-container`
- IndexingSubtab: `#index-status`
- LearningRankerSubtab: `#reranker-terminal-container`, `#reranker-logs-viewer`
- Needs WebSocket/SSE support for streaming updates

### 6. Settings Display Elements Are Read-Only
Multiple displays that show server state (not form state):
- Reranker info panels (4 different ones)
- Index status display
- Reranker system status
- These need polling or event-based updates

### 7. Very Large Subtabs May Need Splitting
- RetrievalSubtab: 950 lines, 55+ inputs - consider 2-3 tabs
- IndexingSubtab: 570 lines, 40+ inputs - consider accordion or tabs
- Could improve UX significantly

---

## Conversion Checklist Template

For each subtab conversion:

- [ ] Create new React component file
- [ ] Extract all buttons with IDs and handlers
- [ ] Convert form inputs to controlled React inputs (useState)
- [ ] Create event handlers for all buttons
- [ ] Implement save/cancel button handlers
- [ ] Add form validation
- [ ] Create progress displays (if applicable)
- [ ] Create terminal output components (if applicable)
- [ ] Create model pickers (if applicable)
- [ ] Implement API calls for:
  - Loading initial data
  - Saving configuration
  - Polling for status updates
  - Streaming for terminal output
- [ ] Test with backend (smoke test)
- [ ] Update architecture audit doc
- [ ] Remove dangerouslySetInnerHTML

---

## Backend API Requirements Summary

### Total Endpoints Needed Across All Subtabs
Approximately 45-50 distinct endpoints needed:

**Configuration/Settings:**
- `/api/config` (GET/POST) - Generic config
- `/api/config/reranker` (POST)
- `/api/config/indexing` (GET/POST)
- `/api/config/evaluation` (POST)

**Model Management:**
- `/api/models` (GET) - List available models
- `/api/models/{category}` (GET) - Models by category

**Cards (DataQualitySubtab):**
- `/api/cards/build` (POST)
- `/api/cards/status` (GET)
- `/api/cards/cancel` (DELETE)
- `/api/cards/logs` (GET)
- `/api/cards/list` (GET)
- `/api/repos` (GET)

**Reranking (ExternalRerankersSubtab + LearningRankerSubtab):**
- `/api/reranker/info` (GET)
- `/api/reranker/mine-triplets` (POST)
- `/api/reranker/train` (POST)
- `/api/reranker/evaluate` (POST)
- `/api/reranker/status` (GET)
- `/api/reranker/metrics` (GET)
- `/api/reranker/save-baseline` (POST)
- `/api/reranker/compare-baseline` (POST)
- `/api/reranker/rollback` (POST)
- `/api/reranker/logs` (GET)
- `/api/reranker/logs/clear` (POST)
- `/api/reranker/cron/setup` (POST)
- `/api/reranker/cron/remove` (POST)
- `/api/reranker/cron/status` (GET)
- `/api/reranker/smoke-test` (POST)
- `/api/reranker/cost/24h` (GET)
- `/api/reranker/cost/breakdown` (GET)
- `/api/reranker/no-hits` (GET)

**Indexing (IndexingSubtab):**
- `/api/index/start` (POST)
- `/api/index/stop` (POST)
- `/api/index/status` (GET)
- `/api/index/stats` (GET)
- `/api/index/apply-profile` (POST)
- `/api/repos/{repo}/branch` (GET)

**Evaluation (EvaluateSubtab):**
- `/api/eval/golden-questions` (GET/POST/DELETE)
- `/api/eval/test-question` (POST)
- `/api/eval/run` (POST)
- `/api/eval/status` (GET)
- `/api/eval/results` (GET)
- `/api/eval/save-baseline` (POST)
- `/api/eval/compare-baseline` (POST)
- `/api/eval/history` (GET)
- `/api/eval/history/clear` (POST)
- `/api/eval/recommended-questions` (POST)
- `/api/eval/golden-questions/export` (GET)
- `/api/eval/results/export` (POST)

**Health/Telemetry:**
- `/api/health/langsmith` (GET)
- `/api/health/qdrant` (GET)
- `/api/health/ollama` (GET)
- `/api/traces/latest` (GET)
- `/api/traces/open-langsmith` (POST)

---

## Notes for Next Stages

1. **Before Starting Conversion:** 
   - Fix EvaluateSubtab file completion
   - Verify all backend endpoints are implemented
   - Set up mock data for development

2. **During Conversion:**
   - Create reusable components (ProgressBar, Terminal, ModelPicker, SettingsSection)
   - Use React hooks for state management
   - Implement proper error handling
   - Add loading states for all async operations

3. **After Conversion:**
   - Smoke test each subtab against real backend
   - Verify settings persist correctly
   - Test progress tracking with long operations
   - Validate form validation works
   - Check accessibility (labels, ARIA attributes)

---

**Generated:** 2024-11-21  
**Status:** Complete - Ready for conversion planning  
**Next Steps:** Begin Phase 1 (ExternalRerankersSubtab)

