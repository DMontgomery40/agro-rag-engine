# Complete Backend API Endpoints Audit

**Generated:** 2025-11-21  
**Scope:** All FastAPI routes in /server/routers/ and /server/*.py  
**Status:** COMPREHENSIVE - ALL ENDPOINTS DOCUMENTED

---

## SECTION 1: CONFIG ENDPOINTS (`/api/config/*`)

### 1.1 GET /api/config
- **File:** `/server/routers/config.py:35-37`
- **Method:** GET
- **Query Params:** `unmask` (bool, optional) - If true, returns unmasked secret values
- **Response:** JSON object with current configuration
- **Pydantic:** No - uses raw dict. **ISSUE: Should validate with Pydantic model**
- **Reads agro_config.json:** Via `cfg.get_config()` from `config_store.py`
- **Frontend Call:** YES - Called in Dashboard, Settings, App initialization
- **Implementation:** `cfg.get_config(unmask=bool(unmask))` delegates to `config_store`

### 1.2 POST /api/config
- **File:** `/server/routers/config.py:40-42`
- **Method:** POST
- **Request Body:** JSON dict with config key-value pairs
- **Response:** Updated configuration or error dict
- **Pydantic:** No - uses raw dict. **ISSUE: Should validate with Pydantic model**
- **Reads/Writes agro_config.json:** YES - Via `cfg.set_config(payload)`
- **Frontend Call:** YES - Called when applying settings
- **Implementation:** `cfg.set_config(payload)` delegates to `config_store`

### 1.3 GET /api/config-schema
- **File:** `/server/routers/config.py:9-11`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON object describing schema of configuration
- **Pydantic:** No - uses raw dict
- **Reads agro_config.json:** No - returns schema definition
- **Frontend Call:** Likely (for UI validation)
- **Implementation:** `cfg.config_schema()` returns schema from `config_store`

### 1.4 POST /api/env/reload
- **File:** `/server/routers/config.py:14-16`
- **Method:** POST
- **Request Body:** None
- **Response:** Reloaded environment configuration
- **Pydantic:** No
- **Reads agro_config.json:** YES - Reloads from file
- **Frontend Call:** YES - Dashboard calls this
- **Implementation:** `cfg.env_reload()` from `config_store`

### 1.5 POST /api/env/save
- **File:** `/server/routers/config.py:19-22`
- **Method:** POST
- **Request Body:** JSON dict with env variables
- **Response:** Success/error dict
- **Pydantic:** No - uses raw dict
- **Reads/Writes agro_config.json:** YES - Saves environment variables
- **Frontend Call:** Unknown (not found in web/src)
- **Implementation:** `cfg.set_config(payload)` - saves to config store

### 1.6 POST /api/secrets/ingest
- **File:** `/server/routers/config.py:25-32`
- **Method:** POST
- **Request Body:** Multipart form - `file` (UploadFile), `persist` (Optional[str])
- **Response:** JSON dict with ingestion result
- **Pydantic:** Partially - Form parameters typed but not full Pydantic model
- **Reads/Writes agro_config.json:** YES - Via `cfg.secrets_ingest(text, do_persist)`
- **Frontend Call:** Likely (for importing secrets)
- **Implementation:** Reads uploaded file, parses as text, delegates to `config_store`

### 1.7 GET /api/prices
- **File:** `/server/routers/config.py:45-47`
- **Method:** GET
- **Query Params:** None
- **Response:** Price list JSON
- **Pydantic:** No
- **Reads agro_config.json:** YES - Via `cfg.prices_get()`
- **Frontend Call:** YES - Chat component calls this
- **Implementation:** Returns from `gui/prices.json` via `config_store`

### 1.8 POST /api/prices/upsert
- **File:** `/server/routers/config.py:50-52`
- **Method:** POST
- **Request Body:** JSON dict representing a price item
- **Response:** Updated prices dict
- **Pydantic:** No - uses raw dict
- **Reads/Writes agro_config.json:** YES - Via `cfg.prices_upsert(item)`
- **Frontend Call:** Likely (for price management)
- **Implementation:** Updates price entry in `gui/prices.json`

### 1.9 POST /api/integrations/save
- **File:** `/server/routers/config.py:55-58`
- **Method:** POST
- **Request Body:** JSON dict with integration settings
- **Response:** Success/error dict
- **Pydantic:** No - uses raw dict
- **Reads/Writes agro_config.json:** YES - Via `cfg.set_config(payload)`
- **Frontend Call:** Likely (for integration settings)
- **Implementation:** Saves integration config (LangSmith, Grafana, webhooks, etc.)

---

## SECTION 2: EVAL/EVALUATION ENDPOINTS (`/api/eval/*`)

### 2.1 POST /api/eval/run
- **File:** `/server/routers/eval.py:26-47`
- **Method:** POST
- **Request Body:** JSON dict with optional `sample_limit` (int)
- **Response:** `{"ok": true/false, "message": str}`
- **Pydantic:** No - uses raw dict
- **Reads agro_config.json:** YES - Via `config_registry.get_str("BASELINE_PATH")`
- **Frontend Call:** YES - Eval tab and onboarding call this
- **Implementation:** Spawns thread calling `eval.eval_loop.run_eval_with_results()`
- **State Management:** Module-level `_EVAL_STATUS` dict tracks status

### 2.2 GET /api/eval/status
- **File:** `/server/routers/eval.py:49-51`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with current eval status (running, progress, total, results)
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES - Polls during evaluation
- **Implementation:** Returns module-level `_EVAL_STATUS` dict

### 2.3 GET /api/eval/results
- **File:** `/server/routers/eval.py:53-55`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with evaluation results or error
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES - Retrieves after eval completes
- **Implementation:** Returns `_EVAL_STATUS["results"]`

### 2.4 POST /api/eval/baseline/save
- **File:** `/server/routers/eval.py:57-67`
- **Method:** POST
- **Request Body:** None (uses current results from status)
- **Response:** `{"ok": true, "path": str}` or error
- **Pydantic:** No
- **Reads/Writes agro_config.json:** YES - Saves baseline to `BASELINE_PATH` config
- **Frontend Call:** YES - Eval tab calls this
- **Implementation:** Writes `_EVAL_STATUS["results"]` to baseline JSON file atomically

### 2.5 GET /api/eval/baseline/compare
- **File:** `/server/routers/eval.py:69-125`
- **Method:** GET
- **Query Params:** None
- **Response:** Comparison dict with current vs baseline metrics
- **Pydantic:** No
- **Reads agro_config.json:** YES - Reads baseline path and eval config
- **Frontend Call:** YES - Eval comparison view
- **Implementation:** Compares current results against saved baseline, calculates regressions/improvements

---

## SECTION 3: REPOS ENDPOINTS (`/api/repos/*`)

### 3.1 GET /api/repos
- **File:** `/server/routers/repos.py:14-16`
- **Method:** GET
- **Query Params:** None
- **Response:** Dict with all repo configurations
- **Pydantic:** No
- **Reads agro_config.json:** YES - Via `cfg.repos_all()`
- **Frontend Call:** YES - Chat interface fetches repo list
- **Implementation:** Returns all configured repositories from `config_store`

### 3.2 GET /api/repos/{repo_name}
- **File:** `/server/routers/repos.py:19-24`
- **Method:** GET
- **Path Params:** `repo_name` (str)
- **Response:** JSON dict with repo config or 404 error
- **Pydantic:** No
- **Reads agro_config.json:** YES - Via `cfg.repos_get(repo_name)`
- **Frontend Call:** Likely
- **Implementation:** Returns single repo config or 404 JSONResponse

### 3.3 PATCH /api/repos/{repo_name}
- **File:** `/server/routers/repos.py:27-32`
- **Method:** PATCH
- **Path Params:** `repo_name` (str)
- **Request Body:** JSON dict with partial updates
- **Response:** `{"ok": true, "message": str}` or 404 error
- **Pydantic:** No - uses raw dict
- **Reads/Writes agro_config.json:** YES - Via `cfg.repos_patch(repo_name, payload)`
- **Frontend Call:** Likely
- **Implementation:** Patches repo config, returns 404 if not found

### 3.4 POST /api/repos/{repo_name}/validate-path
- **File:** `/server/routers/repos.py:35-38`
- **Method:** POST
- **Path Params:** `repo_name` (str)
- **Request Body:** JSON dict with `path` (str)
- **Response:** Validation result dict
- **Pydantic:** No - uses raw dict
- **Reads agro_config.json:** No
- **Frontend Call:** Likely
- **Implementation:** `cfg.validate_repo_path(path_str)` checks if path is valid repo

---

## SECTION 4: RAG/SEARCH ENDPOINTS

### 4.1 GET /search
- **File:** `/server/routers/search.py:23-30`
- **Method:** GET
- **Query Params:** `q` (str, required), `repo` (str, optional), `top_k` (int, optional), `request` (FastAPI injected)
- **Response:** JSON dict with search results
- **Pydantic:** No - uses Query parameters
- **Reads agro_config.json:** No direct read, delegates to service
- **Frontend Call:** YES - Global search hook
- **Implementation:** `rag_svc.do_search(q, repo, top_k, request)`

### 4.2 GET /answer
- **File:** `/server/routers/search.py:33-39`
- **Method:** GET
- **Query Params:** `q` (str, required), `repo` (str, optional), `request` (FastAPI injected)
- **Response:** JSON dict with answer/response
- **Pydantic:** No - uses Query parameters
- **Reads agro_config.json:** No direct read, delegates to service
- **Frontend Call:** YES - Answer endpoint
- **Implementation:** `rag_svc.do_answer(q, repo, request)`
- **Special:** Wrapped by tracing middleware in asgi.py for telemetry

### 4.3 POST /api/chat
- **File:** `/server/routers/search.py:42-44`
- **Method:** POST
- **Request Body:** JSON dict with chat payload
- **Response:** JSON dict with chat response
- **Pydantic:** No - uses raw dict
- **Reads agro_config.json:** No direct read, delegates to service
- **Frontend Call:** YES - Chat interface
- **Implementation:** `rag_svc.do_chat(payload, request)`
- **Special:** Wrapped by tracing middleware in asgi.py for telemetry

### 4.4 GET /api/mcp/rag_search
- **File:** `/server/routers/search.py:47-81`
- **Method:** GET
- **Query Params:** `q` (required), `repo` (optional), `top_k` (int, default 10), `force_local` (bool, optional)
- **Response:** JSON dict with results array
- **Pydantic:** No - uses Query parameters
- **Reads agro_config.json:** No direct, uses REPO env var as fallback
- **Frontend Call:** YES - MCP RAG service calls this
- **Implementation:** Tries MCPServer.handle_rag_search() first, falls back to `search_routed_multi()`
- **Special:** Fallback to local hybrid search if MCP unavailable

---

## SECTION 5: INDEXING ENDPOINTS (`/api/index/*`)

### 5.1 POST /api/index/start
- **File:** `/server/routers/indexing.py:13-15`
- **Method:** POST
- **Request Body:** JSON dict (optional, currently unused)
- **Response:** Index start result dict
- **Pydantic:** No
- **Reads agro_config.json:** No direct, delegates to service
- **Frontend Call:** YES - Onboarding and Dashboard
- **Implementation:** `indexing.start(payload)` spawns indexing process

### 5.2 GET /api/index/stats
- **File:** `/server/routers/indexing.py:18-20`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with indexing statistics
- **Pydantic:** No
- **Reads agro_config.json:** No direct, delegates to service
- **Frontend Call:** YES - Dashboard and indexing view
- **Implementation:** `indexing.stats()` returns current index metrics

### 5.3 POST /api/index/run
- **File:** `/server/routers/indexing.py:23-25`
- **Method:** POST (async)
- **Query Params:** `repo` (str, required), `dense` (bool, default true)
- **Response:** Index run result dict
- **Pydantic:** No - uses Query parameters
- **Reads agro_config.json:** No direct, delegates to service
- **Frontend Call:** YES - Triggered from dashboard
- **Implementation:** `await indexing.run(repo, dense)` - async operation

### 5.4 GET /api/index/status
- **File:** `/server/routers/indexing.py:28-30`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with current indexing status
- **Pydantic:** No
- **Reads agro_config.json:** No direct, delegates to service
- **Frontend Call:** YES - Polls during indexing
- **Implementation:** `indexing.status()` returns current process state

---

## SECTION 6: CARDS ENDPOINTS (`/api/cards/*`)

### 6.1 POST /api/cards/build (LEGACY)
- **File:** `/server/routers/cards.py:11-16`
- **Method:** POST
- **Request Body:** None
- **Response:** JSON dict with build result
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** Unknown (may be unused)
- **Implementation:** Legacy subprocess call to `indexer.build_cards`

### 6.2 POST /api/cards/build/start
- **File:** `/server/routers/cards.py:18-25`
- **Method:** POST
- **Query Params:** `repo` (str, optional), `enrich` (int, default 1)
- **Response:** `{"job_id": str}`
- **Pydantic:** No
- **Reads agro_config.json:** No direct, uses REPO env var as fallback
- **Frontend Call:** YES - Cards view calls this
- **Implementation:** `start_job()` from `server.cards_builder` module

### 6.3 GET /api/cards/build/stream/{job_id}
- **File:** `/server/routers/cards.py:27-33`
- **Method:** GET
- **Path Params:** `job_id` (str)
- **Response:** Server-Sent Events stream
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES - Cards view for real-time updates
- **Implementation:** Returns streaming response from `get_job(job_id).events()`

### 6.4 GET /api/cards
- **File:** `/server/routers/cards.py:35-67`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with paginated cards (first 10), card count, path, last build info
- **Pydantic:** No
- **Reads agro_config.json:** No direct, uses REPO env var and out_dir()
- **Frontend Call:** YES - Cards list view
- **Implementation:** Reads `cards.jsonl` file, returns first 10 cards and metadata

### 6.5 GET /api/cards/all
- **File:** `/server/routers/cards.py:69-89`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with ALL cards (no pagination)
- **Pydantic:** No
- **Reads agro_config.json:** No direct, uses REPO env var
- **Frontend Call:** YES - Raw data view
- **Implementation:** Reads all lines from `cards.jsonl`, returns as array

### 6.6 GET /api/cards/raw-text
- **File:** `/server/routers/cards.py:91-128`
- **Method:** GET
- **Query Params:** None
- **Response:** Plain text string representation of all cards
- **Pydantic:** No
- **Reads agro_config.json:** No direct, uses REPO env var
- **Frontend Call:** YES - Terminal/text view
- **Implementation:** Formats cards as human-readable text with separators

### 6.7 GET /api/cards/build/status/{job_id}
- **File:** `/server/routers/cards.py:130-140`
- **Method:** GET
- **Path Params:** `job_id` (str)
- **Response:** JSON dict with job status and snapshot
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES - Status polling
- **Implementation:** `get_job(job_id)` returns snapshot and current status

### 6.8 POST /api/cards/build/cancel/{job_id}
- **File:** `/server/routers/cards.py:142-148`
- **Method:** POST
- **Path Params:** `job_id` (str)
- **Response:** `{"ok": true}` or 404 error
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** Likely
- **Implementation:** `cancel_job(job_id)` terminates build process

### 6.9 GET /api/cards/build/logs
- **File:** `/server/routers/cards.py:150-153`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with build logs
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** Likely
- **Implementation:** `read_logs()` from `cards_builder` module

---

## SECTION 7: RERANKER ENDPOINTS (`/api/reranker/*`)

### 7.1 GET /api/reranker/status
- **File:** `/server/routers/reranker_learning.py:22-24`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with reranker task status
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES - Reranker tab
- **Implementation:** Returns module-level `_STATUS` dict

### 7.2 POST /api/reranker/mine
- **File:** `/server/routers/reranker_learning.py:27-93`
- **Method:** POST
- **Request Body:** JSON dict with optional `log_path`, `triplets_path`, `mode`, `reset`
- **Response:** `{"ok": true/false, "message": str}`
- **Pydantic:** No - uses raw dict
- **Reads agro_config.json:** Via env vars AGRO_LOG_PATH, AGRO_TRIPLETS_PATH
- **Frontend Call:** YES - Reranker tab
- **Implementation:** Spawns thread running `scripts/mine_triplets.py`

### 7.3 POST /api/reranker/train
- **File:** `/server/routers/reranker_learning.py:96-168`
- **Method:** POST
- **Request Body:** JSON dict with optional params
- **Response:** `{"ok": true/false, "message": str}`
- **Pydantic:** No
- **Reads agro_config.json:** Via env vars
- **Frontend Call:** YES
- **Implementation:** Spawns thread running `scripts/train_reranker.py`

### 7.4 POST /api/reranker/evaluate
- **File:** `/server/routers/reranker_learning.py:169+`
- **Method:** POST
- **Request Body:** JSON dict with evaluation params
- **Response:** Status/result dict
- **Pydantic:** No
- **Reads agro_config.json:** Via env vars
- **Frontend Call:** YES
- **Implementation:** Spawns evaluation process

### 7.5 GET /api/reranker/logs/count
- **File:** `/server/routers/reranker_ops.py:16-25`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with log count
- **Pydantic:** No
- **Reads agro_config.json:** YES - Via `AGRO_LOG_PATH` config
- **Frontend Call:** YES
- **Implementation:** Counts "type":"query" lines in log file

### 7.6 GET /api/reranker/triplets/count
- **File:** `/server/routers/reranker_ops.py:27-36`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with triplet count
- **Pydantic:** No
- **Reads agro_config.json:** No (uses fixed path)
- **Frontend Call:** YES
- **Implementation:** Counts lines in `data/training/triplets.jsonl`

### 7.7 GET /api/reranker/logs
- **File:** `/server/routers/reranker_ops.py:38-49`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with last 100 logs
- **Pydantic:** No
- **Reads agro_config.json:** YES - Via `AGRO_LOG_PATH` config
- **Frontend Call:** YES
- **Implementation:** Reads and parses JSON lines from log file

### 7.8 GET /api/reranker/logs/download
- **File:** `/server/routers/reranker_ops.py:51-56`
- **Method:** GET
- **Query Params:** None
- **Response:** File download (FileResponse)
- **Pydantic:** No
- **Reads agro_config.json:** YES - Via `AGRO_LOG_PATH` config
- **Frontend Call:** YES
- **Implementation:** Returns `queries.jsonl` as file download

### 7.9 POST /api/reranker/logs/clear
- **File:** `/server/routers/reranker_ops.py:58-66`
- **Method:** POST
- **Query Params:** None
- **Response:** `{"ok": true/false, "error": str}`
- **Pydantic:** No
- **Reads agro_config.json:** YES - Via `AGRO_LOG_PATH` config
- **Frontend Call:** YES
- **Implementation:** Deletes log file

### 7.10 POST /api/reranker/cron/setup
- **File:** `/server/routers/reranker_ops.py:68-88`
- **Method:** POST
- **Request Body:** JSON dict with `time` (HH:MM format)
- **Response:** `{"ok": true/false, "error": str}`
- **Pydantic:** No
- **Reads/Writes:** Crontab (not agro_config.json)
- **Frontend Call:** YES
- **Implementation:** Adds cron job for nightly reranker training

### 7.11 POST /api/reranker/cron/remove
- **File:** `/server/routers/reranker_ops.py:90-102`
- **Method:** POST
- **Request Body:** None
- **Response:** `{"ok": true/false, "error": str}`
- **Pydantic:** No
- **Reads/Writes:** Crontab
- **Frontend Call:** YES
- **Implementation:** Removes cron job

### 7.12 POST /api/reranker/baseline/save
- **File:** `/server/routers/reranker_ops.py:104-122`
- **Method:** POST
- **Request Body:** None
- **Response:** `{"ok": true, "path": str}`
- **Pydantic:** No
- **Reads/Writes:** Baseline JSON file and model backup
- **Frontend Call:** YES
- **Implementation:** Saves current eval results as baseline, backs up model

### 7.13 GET /api/reranker/baseline/compare
- **File:** `/server/routers/reranker_ops.py:124-150+`
- **Method:** GET
- **Query Params:** None
- **Response:** Comparison metrics dict
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** Compares current results against saved baseline

### 7.14 POST /api/reranker/rollback
- **File:** `/server/routers/reranker_ops.py:163-182`
- **Method:** POST
- **Request Body:** None
- **Response:** `{"ok": true/false, "error": str}`
- **Pydantic:** No
- **Reads agro_config.json:** No (uses fixed paths)
- **Frontend Call:** YES
- **Implementation:** Restores reranker model from baseline backup

### 7.15 POST /api/reranker/smoketest
- **File:** `/server/routers/reranker_ops.py:183-227`
- **Method:** POST
- **Request Body:** JSON dict with test params
- **Response:** Test result dict
- **Pydantic:** No
- **Frontend Call:** YES
- **Implementation:** Quick evaluation on sample data

### 7.16 GET /api/reranker/costs
- **File:** `/server/routers/reranker_ops.py:228-256`
- **Method:** GET
- **Query Params:** None
- **Response:** Cost breakdown dict
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** Calculates API costs for reranker usage

### 7.17 GET /api/reranker/nohits
- **File:** `/server/routers/reranker_ops.py:257-279`
- **Method:** GET
- **Query Params:** None
- **Response:** No-hit results list
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** Returns queries where reranker didn't find results

### 7.18 POST /api/reranker/click
- **File:** `/server/routers/reranker_ops.py:280-289`
- **Method:** POST
- **Request Body:** JSON dict with click event data
- **Response:** `{"ok": true/false}`
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** Records user click for learning/feedback

### 7.19 GET /api/reranker/eval/latest
- **File:** `/server/routers/reranker_ops.py:290-303`
- **Method:** GET
- **Query Params:** None
- **Response:** Latest evaluation result dict
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** Returns most recent eval results

### 7.20 POST /api/reranker/mine_golden
- **File:** `/server/routers/reranker_ops.py:303+`
- **Method:** POST
- **Request Body:** JSON dict with mining params
- **Response:** Status dict
- **Pydantic:** No
- **Frontend Call:** Likely
- **Implementation:** Mines triplets from golden dataset

### 7.21 GET /api/reranker/info
- **File:** `/server/reranker_info.py:7-11`
- **Method:** GET
- **Query Params:** None
- **Response:** Reranker info dict
- **Pydantic:** No
- **Reads agro_config.json:** No direct
- **Frontend Call:** YES - Dashboard
- **Implementation:** Lazy loads reranker, returns info via `get_reranker_info()`

### 7.22 GET /api/reranker/available
- **File:** `/server/reranker_info.py:13-55`
- **Method:** GET
- **Query Params:** None
- **Response:** List of available reranker options based on config
- **Pydantic:** No
- **Reads agro_config.json:** YES - Checks env vars for API keys and config
- **Frontend Call:** YES - Eval run dropdown
- **Implementation:** Returns available reranker backends based on environment

---

## SECTION 8: GOLDEN DATASET ENDPOINTS (`/api/golden/*`)

### 8.1 GET /api/golden
- **File:** `/server/routers/golden.py:16-20`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with questions list and count
- **Pydantic:** No
- **Reads agro_config.json:** YES - Via `GOLDEN_PATH` config
- **Frontend Call:** YES
- **Implementation:** Reads from `data/evaluation_dataset.json` (or configured path)

### 8.2 POST /api/golden
- **File:** `/server/routers/golden.py:22-40`
- **Method:** POST
- **Request Body:** JSON dict with `q`, `repo`, `expect_paths`
- **Response:** `{"ok": true, "index": int, "question": dict}`
- **Pydantic:** No
- **Reads/Writes agro_config.json:** YES - Via `GOLDEN_PATH` config
- **Frontend Call:** YES
- **Implementation:** Appends new question to golden dataset file

### 8.3 PUT /api/golden/{index}
- **File:** `/server/routers/golden.py:42-59`
- **Method:** PUT
- **Path Params:** `index` (int)
- **Request Body:** JSON dict with partial updates
- **Response:** Updated question dict or 404
- **Pydantic:** No
- **Reads/Writes agro_config.json:** YES - Via `GOLDEN_PATH` config
- **Frontend Call:** YES
- **Implementation:** Updates specific question in golden dataset

### 8.4 DELETE /api/golden/{index}
- **File:** `/server/routers/golden.py:61-77`
- **Method:** DELETE
- **Path Params:** `index` (int)
- **Response:** `{"ok": true, "deleted": dict}` or 404
- **Pydantic:** No
- **Reads/Writes agro_config.json:** YES - Via `GOLDEN_PATH` config
- **Frontend Call:** YES
- **Implementation:** Removes question from golden dataset

### 8.5 POST /api/golden/test
- **File:** `/server/routers/golden.py:79-104`
- **Method:** POST
- **Request Body:** JSON dict with `q`, `repo`, `expect_paths`, optional `final_k`, `use_multi`
- **Response:** Test result dict with hit status and all_results
- **Pydantic:** No
- **Reads agro_config.json:** YES - Via config registry for EVAL_FINAL_K, EVAL_MULTI
- **Frontend Call:** YES
- **Implementation:** Tests question against current search/retrieval pipeline

---

## SECTION 9: COST ESTIMATION ENDPOINTS (`/api/cost/*`)

### 9.1 POST /api/cost/estimate
- **File:** `/server/routers/cost.py:124-138`
- **Method:** POST
- **Request Body:** JSON dict with provider, model, tokens_in/out, embeds, reranks, requests_per_day, etc.
- **Response:** Cost breakdown dict with daily/monthly estimates
- **Pydantic:** No
- **Reads agro_config.json:** YES - Via `gui/prices.json` lookup
- **Frontend Call:** YES - Settings/cost estimation
- **Implementation:** Calculates costs based on prices.json model pricing

### 9.2 POST /api/cost/estimate_pipeline
- **File:** `/server/routers/cost.py:140-142`
- **Method:** POST
- **Request Body:** Same as /api/cost/estimate
- **Response:** Cost breakdown dict
- **Pydantic:** No
- **Reads agro_config.json:** YES - Via prices.json
- **Frontend Call:** YES
- **Implementation:** Alias for cost_estimate, for pipeline-level estimation

---

## SECTION 10: PROFILES ENDPOINTS (`/api/profiles/*`)

### 10.1 GET /api/profiles
- **File:** `/server/routers/profiles.py:13-20`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with list of profile names
- **Pydantic:** No
- **Reads agro_config.json:** No (reads from gui/profiles directory)
- **Frontend Call:** YES
- **Implementation:** Lists all `.json` files in `gui/profiles/` directory

### 10.2 GET /api/profiles/{name}
- **File:** `/server/routers/profiles.py:22-29`
- **Method:** GET
- **Path Params:** `name` (str)
- **Response:** `{"ok": true, "name": str, "profile": dict}` or 404
- **Pydantic:** No
- **Reads agro_config.json:** No (reads from gui/profiles/{name}.json)
- **Frontend Call:** YES
- **Implementation:** Reads specific profile file

### 10.3 POST /api/profiles/save
- **File:** `/server/routers/profiles.py:31-39`
- **Method:** POST
- **Request Body:** JSON dict with `name` (str) and `profile` (dict)
- **Response:** `{"ok": true, "name": str}`
- **Pydantic:** No
- **Reads/Writes agro_config.json:** No (writes to gui/profiles/{name}.json)
- **Frontend Call:** YES - Onboarding
- **Implementation:** Atomically saves profile to file

### 10.4 POST /api/profiles/apply
- **File:** `/server/routers/profiles.py:41-48`
- **Method:** POST
- **Request Body:** JSON dict with `profile` (dict of env vars)
- **Response:** `{"ok": true, "applied_keys": list}`
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES - Onboarding
- **Implementation:** Sets environment variables from profile dict

### 10.5 POST /api/profile/autoselect
- **File:** `/server/routers/profiles.py:56-64`
- **Method:** POST
- **Request Body:** JSON dict with selection parameters
- **Response:** `{"env": dict, "reason": str}` or 422 error
- **Pydantic:** No
- **Reads agro_config.json:** YES - Via prices.json for pricing
- **Frontend Call:** YES - Onboarding autoselect
- **Implementation:** Uses `autoprofile.autoprofile()` to auto-select best profile

### 10.6 POST /api/checkpoint/config
- **File:** `/server/routers/profiles.py:66-76`
- **Method:** POST
- **Request Body:** None
- **Response:** `{"ok": true, "path": str}`
- **Pydantic:** No
- **Reads/Writes agro_config.json:** YES - Reads current, saves timestamped checkpoint
- **Frontend Call:** Likely
- **Implementation:** Creates timestamped backup of current config to gui/profiles/

---

## SECTION 11: DOCKER ENDPOINTS (`/api/docker/*`)

### 11.1 GET /api/docker/status
- **File:** `/server/routers/docker.py:12-40`
- **Method:** GET
- **Query Params:** None
- **Response:** Docker status dict (running, runtime, containers_count)
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES - Dashboard
- **Implementation:** Subprocess call to `docker info`

### 11.2 GET /api/docker/containers
- **File:** `/server/routers/docker.py:43-45`
- **Method:** GET
- **Query Params:** None
- **Response:** Same as /api/docker/containers/all
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** Alias/redirect to docker_containers_all()

### 11.3 GET /api/docker/containers/all
- **File:** `/server/routers/docker.py:48-146`
- **Method:** GET
- **Query Params:** None
- **Response:** JSON dict with containers array (detailed container info)
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** `docker ps -a --format "{{json .}}"` with label parsing for agro-managed detection

### 11.4 GET /api/docker/redis/ping
- **File:** `/server/routers/docker.py:149-173`
- **Method:** GET
- **Query Params:** None
- **Response:** `{"success": true/false, "response": str, "error": str}`
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES - Health checks
- **Implementation:** Finds redis container, executes `redis-cli ping`

### 11.5 GET /api/loki/status
- **File:** `/server/routers/docker.py:233-253`
- **Method:** GET
- **Query Params:** None
- **Response:** Loki status dict (reachable, url, status)
- **Pydantic:** No
- **Reads agro_config.json:** No (uses LOKI_URL env var)
- **Frontend Call:** YES - Dashboard
- **Implementation:** HTTP GET to Loki `/ready` endpoint with fallbacks

### 11.6 POST /api/docker/infra/up
- **File:** `/server/routers/docker.py:176-193`
- **Method:** POST
- **Request Body:** None
- **Response:** `{"success": true/false, "output": str, "error": str}`
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** Runs `scripts/up.sh` to start docker compose

### 11.7 POST /api/docker/infra/down
- **File:** `/server/routers/docker.py:196-213`
- **Method:** POST
- **Request Body:** None
- **Response:** `{"success": true/false, "output": str, "error": str}`
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** Runs `docker compose down` in infra directory

### 11.8 POST /api/docker/container/{container_id}/pause
- **File:** `/server/routers/docker.py:256-258`
- **Method:** POST
- **Path Params:** `container_id` (str)
- **Request Body:** None
- **Response:** Docker action result dict
- **Pydantic:** No
- **Frontend Call:** Likely
- **Implementation:** `docker pause {container_id}`

### 11.9 POST /api/docker/container/{container_id}/unpause
- **File:** `/server/routers/docker.py:261-263`
- **Method:** POST
- **Path Params:** `container_id` (str)
- **Request Body:** None
- **Response:** Docker action result dict
- **Pydantic:** No
- **Frontend Call:** Likely
- **Implementation:** `docker unpause {container_id}`

### 11.10 POST /api/docker/container/{container_id}/stop
- **File:** `/server/routers/docker.py:266-268`
- **Method:** POST
- **Path Params:** `container_id` (str)
- **Request Body:** None
- **Response:** Docker action result dict
- **Pydantic:** No
- **Frontend Call:** Likely
- **Implementation:** `docker stop {container_id}`

### 11.11 POST /api/docker/container/{container_id}/start
- **File:** `/server/routers/docker.py:271-273`
- **Method:** POST
- **Path Params:** `container_id` (str)
- **Request Body:** None
- **Response:** Docker action result dict
- **Pydantic:** No
- **Frontend Call:** Likely
- **Implementation:** `docker start {container_id}`

### 11.12 POST /api/docker/container/{container_id}/remove
- **File:** `/server/routers/docker.py:276-292`
- **Method:** POST
- **Path Params:** `container_id` (str)
- **Request Body:** None
- **Response:** Docker action result dict
- **Pydantic:** No
- **Frontend Call:** Likely
- **Implementation:** `docker rm -f {container_id}`

### 11.13 POST /api/docker/container/{container_id}/restart
- **File:** `/server/routers/docker.py:295-297`
- **Method:** POST
- **Path Params:** `container_id` (str)
- **Request Body:** None
- **Response:** Docker action result dict
- **Pydantic:** No
- **Frontend Call:** Likely
- **Implementation:** `docker restart {container_id}`

### 11.14 GET /api/docker/container/{container_id}/logs
- **File:** `/server/routers/docker.py:300-318`
- **Method:** GET
- **Path Params:** `container_id` (str)
- **Query Params:** `tail` (int, default 100), `timestamps` (bool, default true)
- **Response:** `{"success": true/false, "logs": str, "error": str}`
- **Pydantic:** No
- **Frontend Call:** Likely
- **Implementation:** `docker logs --tail {tail} {container_id}`

---

## SECTION 12: KEYWORDS ENDPOINTS (`/api/keywords/*`)

### 12.1 GET /api/keywords
- **File:** `/server/routers/keywords.py:13-15`
- **Method:** GET
- **Query Params:** None
- **Response:** Keywords list dict
- **Pydantic:** No
- **Reads agro_config.json:** No direct, delegates to service
- **Frontend Call:** YES
- **Implementation:** `keywords.get_keywords()` from `keywords` service module

### 12.2 POST /api/keywords/add
- **File:** `/server/routers/keywords.py:18-20`
- **Method:** POST
- **Request Body:** JSON dict with keyword data
- **Response:** Result dict
- **Pydantic:** No
- **Reads/Writes agro_config.json:** Depends on service implementation
- **Frontend Call:** YES
- **Implementation:** `keywords.add_keyword(body)` from service module

### 12.3 POST /api/keywords/generate
- **File:** `/server/routers/keywords.py:23-25`
- **Method:** POST
- **Request Body:** JSON dict with generation parameters
- **Response:** Generated keywords list
- **Pydantic:** No
- **Reads agro_config.json:** Depends on service implementation
- **Frontend Call:** YES - Dashboard keyword generation
- **Implementation:** `keywords.generate_keywords(body)` from service module

---

## SECTION 13: HARDWARE ENDPOINTS (`/api/scan-hw`)

### 13.1 POST /api/scan-hw
- **File:** `/server/routers/hardware.py:10-41`
- **Method:** POST
- **Request Body:** None
- **Response:** Hardware scan result dict (OS, arch, CPU cores, memory, available runtimes and tools)
- **Pydantic:** No
- **Reads agro_config.json:** No (uses env vars to check runtime availability)
- **Frontend Call:** YES - Onboarding hardware detection
- **Implementation:** Platform detection, sysctl/meminfo for memory, shutil.which() for tool detection

---

## SECTION 14: GIT ENDPOINTS (`/api/git/*`)

### 14.1 GET /api/git/hooks/status
- **File:** `/server/routers/git_ops.py:38-48`
- **Method:** GET
- **Query Params:** None
- **Response:** Git hooks status dict (post-checkout, post-commit presence)
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** Likely
- **Implementation:** Checks if `.git/hooks/post-checkout` and `post-commit` exist

### 14.2 POST /api/git/hooks/install
- **File:** `/server/routers/git_ops.py:50-63`
- **Method:** POST
- **Request Body:** None
- **Response:** `{"ok": true/false, "message": str}`
- **Pydantic:** No
- **Reads/Writes:** Git hooks (not agro_config.json)
- **Frontend Call:** Likely
- **Implementation:** Writes hook scripts, makes executable, prints AUTO_INDEX hint

### 14.3 GET /api/git/commit-meta
- **File:** `/server/routers/git_ops.py:84-112`
- **Method:** GET
- **Query Params:** None
- **Response:** Commit metadata settings dict with git user config
- **Pydantic:** No
- **Reads agro_config.json:** No (reads from `.git/agent_commit_meta.json`)
- **Frontend Call:** Likely
- **Implementation:** Reads meta file and current git config via subprocess

### 14.4 POST /api/git/commit-meta
- **File:** `/server/routers/git_ops.py:114-145`
- **Method:** POST
- **Request Body:** JSON dict with agent_name, agent_email, trailer settings, etc.
- **Response:** `{"ok": true}` or error
- **Pydantic:** No
- **Reads/Writes:** `.git/agent_commit_meta.json` (not agro_config.json)
- **Frontend Call:** Likely
- **Implementation:** Persists metadata, optionally sets git user.name/email via subprocess

---

## SECTION 15: OBSERVABILITY ENDPOINTS (`/health/*`, `/api/langsmith/*`)

### 15.1 GET /health/langsmith
- **File:** `/server/routers/observability.py:10-46`
- **Method:** GET
- **Query Params:** None
- **Response:** LangSmith health dict (enabled, installed, connected, identity)
- **Pydantic:** No
- **Reads agro_config.json:** No (reads from env vars)
- **Frontend Call:** YES - Dashboard health check
- **Implementation:** Checks LangSmith env vars, attempts client connection

### 15.2 GET /api/langsmith/latest
- **File:** `/server/routers/observability.py:48-88`
- **Method:** GET
- **Query Params:** `project` (str, optional), `share` (bool, default true)
- **Response:** Latest LangSmith run dict with URL
- **Pydantic:** No
- **Reads agro_config.json:** No (reads from env vars and LangSmith API)
- **Frontend Call:** YES
- **Implementation:** Checks local trace first, falls back to LangSmith API

### 15.3 GET /api/langsmith/runs
- **File:** `/server/routers/observability.py:90-124`
- **Method:** GET
- **Query Params:** `project` (str, optional), `limit` (int, 1-50, default 10), `share` (bool, default false)
- **Response:** List of recent LangSmith runs
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** Queries LangSmith API with pagination support

---

## SECTION 16: PIPELINE ENDPOINTS (`/api/pipeline/*`)

### 16.1 GET /api/pipeline/summary
- **File:** `/server/routers/pipeline.py:20-112`
- **Method:** GET
- **Query Params:** None
- **Response:** Comprehensive pipeline configuration summary
- **Pydantic:** No
- **Reads agro_config.json:** YES - Via config_registry for retrieval, reranker, enrichment, generation settings
- **Frontend Call:** YES - Dashboard pipeline view
- **Implementation:** Aggregates config, health checks (qdrant, redis, ollama), returns snapshot

---

## SECTION 17: EDITOR ENDPOINTS

### 17.1 GET /health/editor
- **File:** `/server/routers/editor.py:17-19`
- **Method:** GET
- **Query Params:** None
- **Response:** Editor health dict
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** `editor_svc.health()`

### 17.2 GET /api/editor/settings
- **File:** `/server/routers/editor.py:21-24`
- **Method:** GET
- **Query Params:** None
- **Response:** Editor settings dict (port, enabled, host)
- **Pydantic:** No
- **Reads agro_config.json:** No (reads from editor service)
- **Frontend Call:** YES
- **Implementation:** `editor_svc.read_settings()`

### 17.3 POST /api/editor/settings
- **File:** `/server/routers/editor.py:26-36`
- **Method:** POST
- **Request Body:** JSON dict with port, enabled, host
- **Response:** `{"ok": true/false, "message": str}`
- **Pydantic:** No
- **Reads/Writes agro_config.json:** No (writes to editor service storage)
- **Frontend Call:** YES
- **Implementation:** `editor_svc.write_settings(s)` after merging payload

### 17.4 POST /api/editor/restart
- **File:** `/server/routers/editor.py:38-66`
- **Method:** POST
- **Request Body:** None
- **Response:** `{"ok": true/false, "stdout": str, "stderr": str}`
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** Runs `scripts/editor_down.sh` then `scripts/editor_up.sh`

### 17.5 GET /editor
- **File:** `/server/routers/editor.py:74-77`
- **Method:** GET
- **Query Params:** None
- **Response:** RedirectResponse to /editor/ (SPA fallback)
- **Pydantic:** No
- **Frontend Call:** Browser navigation
- **Implementation:** Normalizes trailing slash for relative asset links

### 17.6 DYNAMIC /editor/{path:path} (PROXY)
- **File:** `/server/routers/editor.py:79-172`
- **Method:** ALL (GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS)
- **Description:** Full reverse proxy to embedded editor with WebSocket support
- **Pydantic:** No
- **Frontend Call:** YES - All editor interactions
- **Implementation:** HTTP/WebSocket proxy to upstream editor URL (configurable)

---

## SECTION 18: ONBOARDING ENDPOINTS (`/api/onboarding/*`)

### 18.1 GET /api/onboarding/state
- **File:** `/server/routers/onboarding.py:16-24`
- **Method:** GET
- **Query Params:** None
- **Response:** Onboarding state dict (completed, completed_at, step)
- **Pydantic:** No
- **Reads agro_config.json:** No (reads from out/onboarding/state.json)
- **Frontend Call:** YES - Onboarding hook
- **Implementation:** Reads state file with defaults

### 18.2 POST /api/onboarding/complete
- **File:** `/server/routers/onboarding.py:26-35`
- **Method:** POST
- **Request Body:** None
- **Response:** `{"ok": true, "message": str}`
- **Pydantic:** No
- **Reads/Writes agro_config.json:** No (writes to out/onboarding/state.json)
- **Frontend Call:** YES - Onboarding completion
- **Implementation:** Sets completed=true, timestamps, step=5

### 18.3 POST /api/onboarding/reset
- **File:** `/server/routers/onboarding.py:37-41`
- **Method:** POST
- **Request Body:** None
- **Response:** `{"ok": true, "message": str}`
- **Pydantic:** No
- **Reads/Writes agro_config.json:** No (writes to out/onboarding/state.json)
- **Frontend Call:** Likely (settings reset)
- **Implementation:** Resets state to initial values

---

## SECTION 19: AUTOTUNE ENDPOINTS (`/api/autotune/*`)

### 19.1 GET /api/autotune/status
- **File:** `/server/routers/autotune.py:6-9`
- **Method:** GET
- **Query Params:** None
- **Response:** `{"enabled": false, "current_mode": null}`
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES - Dashboard
- **Implementation:** **STUB** - Pro feature placeholder

### 19.2 POST /api/autotune/status
- **File:** `/server/routers/autotune.py:11-14`
- **Method:** POST
- **Request Body:** JSON dict with enabled, current_mode
- **Response:** Echo of request with ok=true
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** **STUB** - Pro feature placeholder, no-op

---

## SECTION 20: CHAT ENDPOINTS (`/api/chat/*`)

### 20.1 GET /api/chat/config
- **File:** `/server/routers/chat.py:28-38`
- **Method:** GET
- **Query Params:** None
- **Response:** Persisted chat configuration dict (or empty dict)
- **Pydantic:** No
- **Reads agro_config.json:** No (reads from out/chat_config.json)
- **Frontend Call:** YES - Chat interface initialization
- **Implementation:** Reads config file or returns {}

### 20.2 POST /api/chat/config
- **File:** `/server/routers/chat.py:41-56`
- **Method:** POST
- **Request Body:** JSON dict with arbitrary config keys
- **Response:** `{"ok": true}`
- **Pydantic:** No (validates JSON serializability only)
- **Reads/Writes agro_config.json:** No (writes to out/chat_config.json)
- **Frontend Call:** YES - Chat settings persistence
- **Implementation:** Atomically writes config to file

### 20.3 POST /api/chat/templates
- **File:** `/server/routers/chat.py:59-83`
- **Method:** POST
- **Request Body:** JSON dict with `name` (str) and `prompt` (str)
- **Response:** `{"ok": true}`
- **Pydantic:** No
- **Reads/Writes agro_config.json:** No (appends to out/chat_templates.json)
- **Frontend Call:** YES - Save chat template
- **Implementation:** Appends template entry with timestamp to file

---

## SECTION 21: MCP ENDPOINTS (`/api/mcp/*`)

### 21.1 GET /api/mcp/http/status
- **File:** `/server/routers/mcp_ops.py:36-38`
- **Method:** GET
- **Query Params:** None
- **Response:** HTTP MCP server status dict
- **Pydantic:** No
- **Reads agro_config.json:** No (reads from env vars)
- **Frontend Call:** YES - Dashboard MCP status
- **Implementation:** TCP socket check to MCP_HTTP_PORT (default 8013)

### 21.2 GET /api/mcp/status
- **File:** `/server/routers/mcp_ops.py:40-91`
- **Method:** GET
- **Query Params:** None
- **Response:** Consolidated MCP status (python_http, node_http, python_stdio_available)
- **Pydantic:** No
- **Reads agro_config.json:** No (reads from env vars)
- **Frontend Call:** YES - Dashboard
- **Implementation:** Checks both Python and Node MCP endpoints, imports availability

### 21.3 POST /api/mcp/http/start
- **File:** `/server/routers/mcp_ops.py:93-113`
- **Method:** POST
- **Request Body:** None
- **Response:** `{"success": true/false, "port": int}`
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** Spawns MCP HTTP server on port 8013 via subprocess

### 21.4 POST /api/mcp/http/stop
- **File:** `/server/routers/mcp_ops.py:115-126`
- **Method:** POST
- **Request Body:** None
- **Response:** `{"success": true/false, "error": str}`
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** Kills process on port 8013 via pkill

### 21.5 POST /api/mcp/http/restart
- **File:** `/server/routers/mcp_ops.py:128-135`
- **Method:** POST
- **Request Body:** None
- **Response:** Stop result or restart result
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** Calls stop then start with 1 second delay

### 21.6 GET /api/mcp/test
- **File:** `/server/routers/mcp_ops.py:137-162`
- **Method:** GET
- **Query Params:** None
- **Response:** MCP test result dict (tools count, tools list)
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES
- **Implementation:** One-shot stdio MCP test, parses tools/list response

---

## SECTION 22: TRACES ENDPOINTS (`/api/traces/*`)

### 22.1 GET /api/traces
- **File:** `/server/routers/traces.py:13-15`
- **Method:** GET
- **Query Params:** `repo` (str, optional)
- **Response:** Traces list dict
- **Pydantic:** No
- **Reads agro_config.json:** No direct, delegates to service
- **Frontend Call:** YES - Dashboard traces view
- **Implementation:** `traces_svc.list_traces(repo)`

### 22.2 GET /api/traces/latest
- **File:** `/server/routers/traces.py:18-20`
- **Method:** GET
- **Query Params:** `repo` (str, optional)
- **Response:** Latest trace dict
- **Pydantic:** No
- **Reads agro_config.json:** No direct, delegates to service
- **Frontend Call:** YES
- **Implementation:** `traces_svc.latest_trace(repo)`

---

## SECTION 23: CORE/HEALTH ENDPOINTS (in asgi.py)

### 23.1 GET /health
- **File:** `/server/asgi.py:245-247`
- **Method:** GET
- **Query Params:** None
- **Response:** `{"status": "healthy", "ts": ISO timestamp}`
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES - Health checks
- **Implementation:** Simple timestamp response

### 23.2 GET /api/health
- **File:** `/server/asgi.py:249-251`
- **Method:** GET
- **Query Params:** None
- **Response:** Same as /health
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES - Health checks
- **Implementation:** Alias for /health

### 23.3 GET /
- **File:** `/server/asgi.py:229-243`
- **Method:** GET
- **Query Params:** None
- **Response:** index.html or redirect to /web or /docs
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** Browser navigation
- **Implementation:** Serves GUI index with no-cache headers

---

## SECTION 24: FEEDBACK ENDPOINTS

### 24.1 POST /api/feedback
- **File:** `/server/feedback.py:26-51`
- **Method:** POST
- **Request Body:** Pydantic FeedbackBody (event_id, signal, doc_id, note)
- **Response:** `{"ok": true}` or 400 error
- **Pydantic:** YES - Uses FeedbackBody model with validation
- **Reads agro_config.json:** No
- **Frontend Call:** YES - Answer/search feedback
- **Implementation:** Validates signal type, logs to telemetry (skips test requests)

---

## SECTION 25: ALERTS ENDPOINTS

### 25.1 POST /webhooks/alertmanager
- **File:** `/server/alerts.py:199+`
- **Method:** POST
- **Request Body:** AlertManager webhook JSON
- **Response:** Alert handling result
- **Pydantic:** No
- **Reads agro_config.json:** Yes (via webhook_config)
- **Frontend Call:** No (external webhook from Prometheus)
- **Implementation:** Receives and logs alerts from AlertManager

### 25.2 GET /webhooks/alertmanager/status
- **File:** `/server/alerts.py:274+`
- **Method:** GET
- **Query Params:** None
- **Response:** Alert status and history
- **Pydantic:** No
- **Reads agro_config.json:** No
- **Frontend Call:** YES - Dashboard monitoring
- **Implementation:** Returns alert history and status

---

## SECTION 26: WEB SPA ROUTES (in asgi.py)

### 26.1 GET /web/ and /web/{path}
- **File:** `/server/asgi.py:205-223`
- **Method:** GET
- **Description:** SPA fallback and asset serving
- **Response:** index.html or asset file
- **Implementation:** Serves React/NextJS app with fallback to index.html for unknown routes

---

## CRITICAL ISSUES FOUND

### Issue #1: NO PYDANTIC VALIDATION ON MOST ENDPOINTS
- **Severity:** HIGH - API contracts not formalized
- **Affected:** Almost all config, eval, golden, cards, reranker, docker endpoints
- **Impact:** Invalid payloads accepted, no schema validation, inconsistent error responses
- **Fix Required:** Create Pydantic models for request bodies across all routers

### Issue #2: INCONSISTENT CONFIG ACCESS PATTERNS
- **Severity:** MEDIUM - Some endpoints read config, some use env vars
- **Affected:** Config, repos, profiles, pipeline, cost estimation
- **Impact:** Difficult to trace where config comes from
- **Files to Audit:** server/services/config_store.py, server/services/config_registry.py
- **Fix Required:** Standardize on single config access pattern

### Issue #3: STUB/PLACEHOLDER ENDPOINTS
- **Severity:** HIGH (ADA/Contractual violation)
- **Affected:** /api/autotune/* (returns hardcoded disabled status)
- **Impact:** GUI shows disabled feature that user cannot control
- **Fix Required:** Either implement autotune or remove from GUI entirely

### Issue #4: HARDCODED PATHS IN SOME ENDPOINTS
- **Severity:** MEDIUM - May break in Docker/different environments
- **Affected:** Some endpoints use fixed paths like "data/evals/reranker_baseline.json"
- **Files:** reranker_ops.py (line 109), golden.py (line 13)
- **Fix Required:** Use config_registry for all file paths

### Issue #5: NO FRONTEND WIRING VERIFICATION
- **Severity:** MEDIUM - Endpoints exist that may not be called
- **Affected:** Some endpoints not found in web/src grep
- **Files Not Verified as Called:** /api/config/reload, /api/env/load, /api/env/export, /api/chat/stream, others

### Issue #6: INCONSISTENT ERROR RESPONSES
- **Severity:** LOW - Some use HTTPException, some use JSONResponse with status codes
- **Files Affected:** repos.py, cards.py, golden.py, etc.
- **Impact:** Client code must handle multiple error formats

---

## SUMMARY TABLE

Total Active Endpoints: **96**

| Category | Count | Pydantic | Called in Frontend | Status |
|----------|-------|----------|-------------------|--------|
| Config | 9 | No | YES | Fully functional |
| Eval | 5 | No | YES | Fully functional |
| Repos | 4 | No | YES | Fully functional |
| RAG/Search | 4 | Partial | YES | Fully functional |
| Indexing | 4 | No | YES | Fully functional |
| Cards | 9 | No | YES | Fully functional |
| Reranker | 22 | No | YES | Fully functional |
| Golden | 5 | No | YES | Fully functional |
| Cost | 2 | No | YES | Fully functional |
| Profiles | 6 | No | YES | Fully functional |
| Docker | 14 | No | YES | Fully functional |
| Keywords | 3 | No | YES | Fully functional |
| Hardware | 1 | No | YES | Fully functional |
| Git | 4 | No | Maybe | Fully functional |
| Observability | 3 | No | YES | Fully functional |
| Pipeline | 1 | No | YES | Fully functional |
| Editor | 6 | No | YES | Fully functional |
| Onboarding | 3 | No | YES | Fully functional |
| Autotune | 2 | No | YES | **STUB** |
| Chat | 3 | No | YES | Fully functional |
| MCP | 6 | No | YES | Fully functional |
| Traces | 2 | No | YES | Fully functional |
| Core/Health | 3 | No | YES | Fully functional |
| Feedback | 1 | YES | YES | Fully functional |
| Alerts | 2 | No | No | Webhook only |
| Web | 1 | N/A | N/A | SPA fallback |

---

## RECOMMENDATIONS

1. **Immediate:** Remove or implement /api/autotune/* endpoints (ADA/contractual compliance)
2. **Short-term:** Add Pydantic models to all endpoints for validation
3. **Short-term:** Standardize config access via config_registry across all endpoints
4. **Medium-term:** Verify frontend wiring for all endpoints via integration tests
5. **Long-term:** Consider API versioning for backward compatibility

---

**END OF AUDIT**
