# ___COMPLETE_CODEBASE_ARCHITECTURE_AUDIT___.md

**Generated:** 2025-11-14
**Purpose:** Source of truth for all code organization, connections, dependencies
**Status:** Living document - MUST be updated with every architectural change

================================================================================

## common

**Total Files:** 6
**Total Lines:** 396
**TODOs Found:** 0
**Stub Files:** 0

### Files in common

### `__init__.py` - 3 lines ✅ Complete

---

### `config_loader.py` - 180 lines ✅ Complete

**Functions (16):**
- `clear_cache`, `_repos_file_path`, `load_repos`, `list_repos`, `get_default_repo`, `_find_repo`, `_expand_env_vars`, `replace_var`
- ... and 8 more

---

### `filtering.py` - 41 lines ✅ Complete

---

### `metadata.py` - 97 lines ✅ Complete

---

### `paths.py` - 39 lines ✅ Complete

**Functions (6):**
- `_as_dir`, `repo_root`, `files_root`, `gui_dir`, `docs_dir`, `data_dir`

---

### `qdrant_utils.py` - 36 lines ✅ Complete

---


## data

**Total Files:** 7
**Total Lines:** 1,303
**TODOs Found:** 0
**Stub Files:** 0

### Files in data

### `compat_rules.json` - 30 lines ✅ Complete

---

### `discriminative_keywords.json` - 126 lines ✅ Complete

---

### `evaluation_dataset.json` - 971 lines ✅ Complete

---

### `llm_keywords.json` - 4 lines ✅ Complete

---

### `semantic_keywords.json` - 126 lines ✅ Complete

---

### `semantic_synonyms.json` - 19 lines ✅ Complete

---

### `versions.json` - 27 lines ✅ Complete

---

### data/config

**Total Files:** 1
**Total Lines:** 8
**TODOs Found:** 0
**Stub Files:** 0

#### Files in data/config

### `webhooks.json` - 8 lines ✅ Complete

---

### data/evals

**Total Files:** 14
**Total Lines:** 36,349
**TODOs Found:** 0
**Stub Files:** 0

#### Files in data/evals

### `baseline_after_excludes.json` - 8 lines ✅ Complete

---

### `baseline_dense_only.json` - 8 lines ✅ Complete

---

### `baseline_dense_only_temp.json` - 6977 lines ✅ Complete

---

### `baseline_dense_rerank.json` - 8 lines ✅ Complete

---

### `baseline_dense_rerank_temp.json` - 6717 lines ✅ Complete

---

### `bm25_clean_baseline_temp.json` - 6977 lines ✅ Complete

---

### `bm25_improved.json` - 8 lines ✅ Complete

---

### `bm25_improved_temp.json` - 6972 lines ✅ Complete

---

### `bm25_with_disc_keywords_temp.json` - 1330 lines ✅ Complete

---

### `bm25_with_trained_ce_temp.json` - 6986 lines ✅ Complete

---

### `clean_index_trained_ce_20cards.json` - 11 lines ✅ Complete

---

### `eval_baseline.json` - 332 lines ✅ Complete

---

### `latest.json` - 11 lines ✅ Complete

---

### `reranker_baseline.json` - 4 lines ✅ Complete

---

#### data/evals/inspect_logs

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0

### data/logs

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0

### data/qdrant

**Total Files:** 1
**Total Lines:** 1
**TODOs Found:** 0
**Stub Files:** 0

#### Files in data/qdrant

### `raft_state.json` - 1 lines ✅ Complete

---

#### data/qdrant/.deleted

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0

#### data/qdrant/aliases

**Total Files:** 1
**Total Lines:** 1
**TODOs Found:** 0
**Stub Files:** 0

##### Files in data/qdrant/aliases

### `data.json` - 1 lines ✅ Complete

---

#### data/qdrant/collections

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0

##### data/qdrant/collections/code_chunks_agro

**Total Files:** 2
**Total Lines:** 2
**TODOs Found:** 0
**Stub Files:** 0

###### Files in data/qdrant/collections/code_chunks_agro

### `config.json` - 1 lines ✅ Complete

---

### `shard_key_mapping.json` - 1 lines ✅ Complete

---

###### data/qdrant/collections/code_chunks_agro/0

**Total Files:** 3
**Total Lines:** 3
**TODOs Found:** 0
**Stub Files:** 0

####### Files in data/qdrant/collections/code_chunks_agro/0

### `newest_clocks.json` - 1 lines ✅ Complete

---

### `replica_state.json` - 1 lines ✅ Complete

---

### `shard_config.json` - 1 lines ✅ Complete

---

####### data/qdrant/collections/code_chunks_agro/0/segments

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0

######## data/qdrant/collections/code_chunks_agro/0/segments/3885f662-c090-4ab7-b1ed-1512171f6935

**Total Files:** 1
**Total Lines:** 1
**TODOs Found:** 0
**Stub Files:** 0

######### Files in data/qdrant/collections/code_chunks_agro/0/segments/3885f662-c090-4ab7-b1ed-1512171f6935

### `segment.json` - 1 lines ✅ Complete

---

######### data/qdrant/collections/code_chunks_agro/0/segments/3885f662-c090-4ab7-b1ed-1512171f6935/payload_index

**Total Files:** 1
**Total Lines:** 1
**TODOs Found:** 0
**Stub Files:** 0

########## Files in data/qdrant/collections/code_chunks_agro/0/segments/3885f662-c090-4ab7-b1ed-1512171f6935/payload_index

### `config.json` - 1 lines ✅ Complete

---

######### data/qdrant/collections/code_chunks_agro/0/segments/3885f662-c090-4ab7-b1ed-1512171f6935/payload_storage

**Total Files:** 1
**Total Lines:** 1
**TODOs Found:** 0
**Stub Files:** 0

########## Files in data/qdrant/collections/code_chunks_agro/0/segments/3885f662-c090-4ab7-b1ed-1512171f6935/payload_storage

### `config.json` - 1 lines ✅ Complete

---

######### data/qdrant/collections/code_chunks_agro/0/segments/3885f662-c090-4ab7-b1ed-1512171f6935/vector_storage-dense

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0

########## data/qdrant/collections/code_chunks_agro/0/segments/3885f662-c090-4ab7-b1ed-1512171f6935/vector_storage-dense/deleted

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0

########## data/qdrant/collections/code_chunks_agro/0/segments/3885f662-c090-4ab7-b1ed-1512171f6935/vector_storage-dense/vectors

**Total Files:** 1
**Total Lines:** 1
**TODOs Found:** 0
**Stub Files:** 0

########### Files in data/qdrant/collections/code_chunks_agro/0/segments/3885f662-c090-4ab7-b1ed-1512171f6935/vector_storage-dense/vectors

### `config.json` - 1 lines ✅ Complete

---

######## data/qdrant/collections/code_chunks_agro/0/segments/a0eb545b-b054-46a9-bd2a-5c99148531fd

**Total Files:** 1
**Total Lines:** 1
**TODOs Found:** 0
**Stub Files:** 0

######### Files in data/qdrant/collections/code_chunks_agro/0/segments/a0eb545b-b054-46a9-bd2a-5c99148531fd

### `segment.json` - 1 lines ✅ Complete

---

######### data/qdrant/collections/code_chunks_agro/0/segments/a0eb545b-b054-46a9-bd2a-5c99148531fd/payload_index

**Total Files:** 1
**Total Lines:** 1
**TODOs Found:** 0
**Stub Files:** 0

########## Files in data/qdrant/collections/code_chunks_agro/0/segments/a0eb545b-b054-46a9-bd2a-5c99148531fd/payload_index

### `config.json` - 1 lines ✅ Complete

---

######### data/qdrant/collections/code_chunks_agro/0/segments/a0eb545b-b054-46a9-bd2a-5c99148531fd/payload_storage

**Total Files:** 1
**Total Lines:** 1
**TODOs Found:** 0
**Stub Files:** 0

########## Files in data/qdrant/collections/code_chunks_agro/0/segments/a0eb545b-b054-46a9-bd2a-5c99148531fd/payload_storage

### `config.json` - 1 lines ✅ Complete

---

######### data/qdrant/collections/code_chunks_agro/0/segments/a0eb545b-b054-46a9-bd2a-5c99148531fd/vector_storage-dense

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0

########## data/qdrant/collections/code_chunks_agro/0/segments/a0eb545b-b054-46a9-bd2a-5c99148531fd/vector_storage-dense/deleted

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0

########## data/qdrant/collections/code_chunks_agro/0/segments/a0eb545b-b054-46a9-bd2a-5c99148531fd/vector_storage-dense/vectors

**Total Files:** 1
**Total Lines:** 1
**TODOs Found:** 0
**Stub Files:** 0

########### Files in data/qdrant/collections/code_chunks_agro/0/segments/a0eb545b-b054-46a9-bd2a-5c99148531fd/vector_storage-dense/vectors

### `config.json` - 1 lines ✅ Complete

---

####### data/qdrant/collections/code_chunks_agro/0/wal

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0

### data/tracking

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0

### data/training

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0


## eval

**Total Files:** 4
**Total Lines:** 347
**TODOs Found:** 0
**Stub Files:** 0

### Files in eval

### `eval_loop.py` - 108 lines ✅ Complete

---

### `eval_rag.py` - 87 lines ✅ Complete

**Functions (3):**
- `_resolve_golden_path`, `hit`, `main`

---

### `inspect_eval.py` - 70 lines ✅ Complete

**Functions (3):**
- `agro_rag_solver`, `solve`, `agro_rag_eval`

---

### `tune_params.py` - 82 lines ✅ Complete

---


## indexer

**Total Files:** 4
**Total Lines:** 584
**TODOs Found:** 0
**Stub Files:** 0

### Files in indexer

### `__init__.py` - 7 lines ✅ Complete

---

### `build_cards.py` - 111 lines ✅ Complete

---

### `index_repo.py` - 463 lines ✅ Complete

**Functions (14):**
- `_load_st_model`, `_filtered_os_walk`, `_filtered_rglob`, `_load_exclude_globs`, `should_index_file`, `detect_layer`, `detect_origin`, `_clip_for_openai`
- ... and 6 more

---

### `index_stats.py` - 3 lines ✅ Complete

---


## models

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0

### models/cross-encoder-agro

**Total Files:** 5
**Total Lines:** 31,133
**TODOs Found:** 0
**Stub Files:** 0

#### Files in models/cross-encoder-agro

### `README.md` - 316 lines ✅ Complete

---

### `config.json` - 36 lines ✅ Complete

---

### `special_tokens_map.json` - 38 lines ✅ Complete

---

### `tokenizer.json` - 30684 lines ✅ Complete

---

### `tokenizer_config.json` - 59 lines ✅ Complete

---

### models/cross-encoder-agro.baseline

**Total Files:** 5
**Total Lines:** 31,133
**TODOs Found:** 0
**Stub Files:** 0

#### Files in models/cross-encoder-agro.baseline

### `README.md` - 316 lines ✅ Complete

---

### `config.json` - 36 lines ✅ Complete

---

### `special_tokens_map.json` - 38 lines ✅ Complete

---

### `tokenizer.json` - 30684 lines ✅ Complete

---

### `tokenizer_config.json` - 59 lines ✅ Complete

---


## reranker

**Total Files:** 2
**Total Lines:** 172
**TODOs Found:** 0
**Stub Files:** 0

### Files in reranker

### `__init__.py` - 4 lines ✅ Complete

---

### `config.py` - 168 lines ✅ Complete

**Functions (10):**
- `_env_bool`, `_env_int`, `_env_float`, `metrics_label`, `_resolve_local_model_path`, `load_settings`, `_get`, `resolve_model_target`
- ... and 2 more

**Classes:** `RerankerSettings`

---


## retrieval

**Total Files:** 6
**Total Lines:** 1,873
**TODOs Found:** 0
**Stub Files:** 0

### Files in retrieval

### `__init__.py` - 7 lines ✅ Complete

---

### `ast_chunker.py` - 201 lines ✅ Complete

**Functions (8):**
- `lang_from_path`, `nonws_len`, `extract_imports`, `walk`, `greedy_fallback`, `collect_files`, `_guess_name`, `chunk_code`

---

### `embed_cache.py` - 66 lines ✅ Complete

**Functions (7):**
- `__init__`, `get`, `put`, `save`, `prune`, `embed_texts`, `_clip_for_openai`

**Classes:** `EmbeddingCache`

---

### `hybrid_search.py` - 1145 lines ✅ Complete

**Functions (29):**
- `with_langtrace_root_span`, `decorator`, `with_additional_attributes`, `decorator`, `_classify_query`, `_project_layer_bonus`, `_provider_plugin_hint`, `_origin_bonus`
- ... and 21 more

---

### `rerank.py` - 315 lines ✅ Complete

**Functions (6):**
- `_sigmoid`, `_normalize`, `_maybe_init_hf_pipeline`, `_load_settings_if_enabled`, `get_reranker`, `rerank_results`

---

### `synonym_expander.py` - 139 lines ✅ Complete

**Functions (3):**
- `load_synonyms`, `expand_query_with_synonyms`, `get_synonym_variants`

---


## server

**Total Files:** 21
**Total Lines:** 8,115
**TODOs Found:** 1
**Stub Files:** 0

### Files in server

### `__init__.py` - 7 lines ✅ Complete

---

### `alert_config.py` - 96 lines ✅ Complete

**Functions (5):**
- `load_thresholds`, `save_thresholds`, `get_thresholds`, `update_threshold`, `update_multiple_thresholds`

**Classes:** `AlertThresholds`

---

### `alerts.py` - 600 lines ⚠️ HAS TODOs

**Endpoints (15):**
- ... and 5 more

**Functions (27):**
- `_log_alert`, `_get_alert_summary`, `_get_webhook_config`, `_notify_severities`, `_notify_enabled`, `_include_resolved`, `_timeout_seconds`, `_title_prefix`
- ... and 19 more

**Classes:** `TestNotifyPayload`

---

### `api_interceptor.py` - 103 lines ✅ Complete

**Functions (6):**
- `_track_request`, `setup_interceptor`, `tracked_post`, `tracked_get`, `tracked_put`, `tracked_delete`

---

### `api_tracker.py` - 300 lines ✅ Complete

**Functions (14):**
- `to_dict`, `__init__`, `_cleanup_thread`, `cleanup`, `track_call`, `get_stats_for_provider`, `get_all_stats`, `check_anomalies`
- ... and 6 more

**Classes:** `APIProvider`, `APICall`, `APITracker`

---

### `app.py` - 4345 lines ✅ Complete

**Endpoints (110):**
- ... and 100 more

**Functions (166):**
- `get_graph`, `request_id_and_cache`, `serve_index`, `health`, `api_health`, `reranker_available`, `_effective_rerank_backend`, `pipeline_summary`
- ... and 158 more

**Classes:** `Answer`, `ChatRequest`

---

### `asgi.py` - 250 lines ✅ Complete

**Endpoints (6):**

**Functions (12):**
- `create_app`, `assign_request_id`, `web_spa_top`, `web_spa`, `index`, `health`, `api_health`, `pipeline_summary`
- ... and 4 more

---

### `autoprofile.py` - 263 lines ✅ Complete

**Functions (13):**
- `_looks_local`, `_any_true`, `_safe_num`, `_normalize_workload`, `_weights`, `_allowed_set`, `_meets_policy_maps`, `_decorate_row`
- ... and 5 more

---

### `cards_builder.py` - 440 lines ✅ Complete

**Functions (25):**
- `_progress_dir`, `_logs_path`, `_model_info`, `_read_jsonl`, `_log`, `start`, `cancel`, `events`
- ... and 17 more

**Classes:** `CardsBuildJob`, `_Registry`

---

### `env_model.py` - 234 lines ✅ Complete

**Functions (4):**
- `_get_mlx_model`, `client`, `_extract_text`, `generate_text`

---

### `feedback.py` - 39 lines ✅ Complete

**Endpoints (1):**

**Classes:** `FeedbackBody`

---

### `frequency_limiter.py` - 137 lines ✅ Complete

**Functions (3):**
- `dispatch`, `get_frequency_stats`, `reset_frequency_tracking`

**Classes:** `FrequencyAnomalyMiddleware`

---

### `index_stats.py` - 207 lines ✅ Complete

**Functions (3):**
- `_read_json`, `_last_index_timestamp_for_repo`, `get_index_stats`

---

### `langgraph_app.py` - 302 lines ✅ Complete

**Functions (8):**
- `should_use_multi_query`, `retrieve_node`, `route_after_retrieval`, `rewrite_query`, `generate_node`, `_cite`, `fallback_node`, `build_graph`

**Classes:** `RAGState`

---

### `metrics.py` - 230 lines ✅ Complete

**Functions (9):**
- `_classify_error`, `stage`, `record_tokens`, `record_cost`, `set_retrieval_quality`, `record_canary`, `record_api_call`, `dispatch`
- ... and 1 more

**Classes:** `MetricsMiddleware`

---

### `reranker.py` - 134 lines ✅ Complete

**Functions (5):**
- `_latest_mtime`, `get_reranker`, `_minmax`, `rerank_candidates`, `get_reranker_info`

---

### `reranker_info.py` - 56 lines ✅ Complete

**Endpoints (2):**

---

### `telemetry.py` - 86 lines ✅ Complete

**Functions (3):**
- `_now`, `log_query_event`, `log_feedback_event`

---

### `tempCodeRunnerFile.py` - 1 lines ✅ Complete

---

### `tracing.py` - 187 lines ✅ Complete

**Functions (10):**
- `_now_iso`, `__init__`, `enabled`, `add`, `_dir`, `save`, `start_trace`, `get_trace`
- ... and 2 more

**Classes:** `Trace`

---

### `webhook_config.py` - 98 lines ✅ Complete

**Functions (6):**
- `to_env_vars`, `load_webhooks`, `save_webhooks`, `get_webhooks`, `update_webhooks`, `get_webhook_env_vars`

**Classes:** `WebhookConfig`

---

### server/mcp

**Total Files:** 3
**Total Lines:** 508
**TODOs Found:** 0
**Stub Files:** 0

#### Files in server/mcp

### `__init__.py` - 7 lines ✅ Complete

---

### `http.py` - 164 lines ✅ Complete

**Functions (8):**
- `_get_graph`, `answer`, `search`, `netlify_deploy`, `_netlify_api`, `_find_site`, `web_get`, `_is_allowed`

---

### `server.py` - 337 lines ✅ Complete

**Functions (14):**
- `__init__`, `_init_graph`, `_error`, `_log`, `handle_rag_answer`, `handle_rag_search`, `handle_rag_feedback`, `_netlify_api`
- ... and 6 more

**Classes:** `MCPServer`

---

### server/routers

**Total Files:** 8
**Total Lines:** 340
**TODOs Found:** 0
**Stub Files:** 0

#### Files in server/routers

### `config.py` - 47 lines ✅ Complete

**Endpoints (7):**

**Functions (7):**
- `get_config_schema`, `api_env_reload`, `api_secrets_ingest`, `get_config`, `set_config`, `get_prices`, `upsert_price`

---

### `editor.py` - 36 lines ✅ Complete

**Endpoints (3):**

**Functions (3):**
- `editor_health`, `get_editor_settings`, `set_editor_settings`

---

### `indexing.py` - 32 lines ✅ Complete

**Endpoints (4):**

**Functions (4):**
- `index_start`, `index_stats`, `run_index`, `index_status`

---

### `keywords.py` - 27 lines ✅ Complete

**Endpoints (3):**

**Functions (3):**
- `get_keywords`, `add_keyword`, `generate_keywords`

---

### `pipeline.py` - 110 lines ✅ Complete

**Endpoints (1):**

**Functions (4):**
- `pipeline_summary`, `_qdrant_health`, `_redis_health`, `_llm_health`

---

### `repos.py` - 39 lines ✅ Complete

**Endpoints (4):**

**Functions (4):**
- `get_repos`, `get_repo`, `patch_repo`, `validate_repo_path`

---

### `search.py` - 27 lines ✅ Complete

**Endpoints (3):**

**Functions (3):**
- `search`, `answer`, `chat`

---

### `traces.py` - 22 lines ✅ Complete

**Endpoints (2):**

---

### server/services

**Total Files:** 6
**Total Lines:** 913
**TODOs Found:** 0
**Stub Files:** 0

#### Files in server/services

### `config_store.py` - 464 lines ✅ Complete

**Functions (18):**
- `_atomic_write_text`, `_write_json`, `env_reload`, `secrets_ingest`, `_effective_rerank_backend`, `get_config`, `set_config`, `repos_all`
- ... and 10 more

---

### `editor.py` - 56 lines ✅ Complete

**Functions (5):**
- `_settings_path`, `_status_path`, `read_settings`, `write_settings`, `health`

---

### `indexing.py` - 87 lines ✅ Complete

**Functions (6):**
- `start`, `run_index`, `stats`, `run`, `stream_output`, `status`

---

### `keywords.py` - 147 lines ✅ Complete

**Functions (7):**
- `_read_json`, `get_keywords`, `extract_terms`, `uniq`, `add_keyword`, `generate_keywords`, `run_heuristic`

---

### `rag.py` - 113 lines ✅ Complete

**Functions (4):**
- `_get_graph`, `do_search`, `do_answer`, `do_chat`

---

### `traces.py` - 46 lines ✅ Complete

---


## web/src

**Total Files:** 2
**Total Lines:** 254
**TODOs Found:** 0
**Stub Files:** 0

### Files in web/src

### `App.tsx` - 233 lines ✅ Complete

**Functions (5):**
- `App`, `interval`, `isOk`, `timestamp`, `loadModules`

---

### `main.tsx` - 21 lines ✅ Complete

---

### web/src/api

**Total Files:** 5
**Total Lines:** 151
**TODOs Found:** 0
**Stub Files:** 0

#### Files in web/src/api

### `client.ts` - 28 lines ✅ Complete

---

### `config.ts` - 56 lines ✅ Complete

---

### `docker.ts` - 48 lines ✅ Complete

---

### `health.ts` - 13 lines ✅ Complete

---

### `index.ts` - 6 lines ✅ Complete

---

### web/src/components

**Total Files:** 5
**Total Lines:** 1,435
**TODOs Found:** 0
**Stub Files:** 0

#### Files in web/src/components

### `DockerContainer.tsx` - 87 lines ✅ Complete

**Functions (4):**
- `DockerContainer`, `isRunning`, `isPaused`, `isExited`

---

### `DockerStatusCard.tsx` - 82 lines ✅ Complete

---

### `HealthStatusCard.tsx` - 72 lines ✅ Complete

---

### `KeywordManager.tsx` - 295 lines ✅ Complete

**Functions (13):**
- `KeywordManager`, `repoKeywords`, `availableKeywords`, `repoKeywordSet`, `searchLower`, `handleAddToRepo`, `updatedKeywords`, `handleRemoveFromRepo`
- ... and 5 more

---

### `Sidepanel.tsx` - 899 lines ✅ Complete

**Endpoints (8):**

**Functions (22):**
- `Sidepanel`, `handleCalculateCost`, `response`, `data`, `handleApplyProfile`, `response`, `handleSaveProfile`, `profileName`
- ... and 14 more

---

#### web/src/components/Admin

**Total Files:** 5
**Total Lines:** 1,861
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Admin

### `AdminSubtabs.tsx` - 41 lines ✅ Complete

---

### `GeneralSubtab.tsx` - 408 lines ✅ Complete

**Functions (10):**
- `GeneralSubtab`, `api`, `base`, `loadConfig`, `response`, `data`, `saveConfig`, `response`
- ... and 2 more

---

### `GitIntegrationSubtab.tsx` - 402 lines ✅ Complete

**Functions (6):**
- `GitIntegrationSubtab`, `installGitHooks`, `saveCommitMetadata`, `config`, `handlePull`, `handlePush`

---

### `IntegrationsSubtab.tsx` - 597 lines ✅ Complete

**Functions (9):**
- `IntegrationsSubtab`, `saveIntegrationSettings`, `testLangSmith`, `testGrafana`, `response`, `testVSCode`, `response`, `saveWebhooks`
- ... and 1 more

---

### `SecretsSubtab.tsx` - 413 lines ✅ Complete

**Functions (18):**
- `SecretsSubtab`, `api`, `base`, `saveApiKeys`, `keys`, `response`, `data`, `addEnvVariable`
- ... and 10 more

---

#### web/src/components/Analytics

**Total Files:** 5
**Total Lines:** 1,421
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Analytics

### `Cost.tsx` - 394 lines ✅ Complete

**Functions (10):**
- `Cost`, `fetchCostData`, `response`, `data`, `exportCSV`, `csv`, `blob`, `url`
- ... and 2 more

---

### `Performance.tsx` - 306 lines ✅ Complete

**Functions (4):**
- `Performance`, `fetchData`, `response`, `interval`

---

### `Tracing.tsx` - 414 lines ✅ Complete

**Functions (9):**
- `Tracing`, `fetchTraces`, `response`, `filteredTraces`, `exportTrace`, `json`, `blob`, `url`
- ... and 1 more

---

### `Usage.tsx` - 302 lines ✅ Complete

**Functions (3):**
- `Usage`, `fetchData`, `response`

---

### `index.ts` - 5 lines ✅ Complete

---

#### web/src/components/Cards

**Total Files:** 2
**Total Lines:** 501
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Cards

### `Builder.tsx` - 380 lines ✅ Complete

**Functions (15):**
- `Builder`, `startBuild`, `params`, `response`, `data`, `data`, `message`, `monitorProgress`
- ... and 7 more

---

### `CardDisplay.tsx` - 121 lines ✅ Complete

**Functions (6):**
- `CardDisplay`, `CardItem`, `handleClick`, `title`, `description`, `location`

---

#### web/src/components/Chat

**Total Files:** 3
**Total Lines:** 1,305
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Chat

### `ChatInterface.tsx` - 755 lines ✅ Complete

**Functions (35):**
- `ChatInterface`, `messagesEndRef`, `textareaRef`, `loadRepositories`, `response`, `data`, `loadChatHistory`, `saved`
- ... and 27 more

---

### `ChatSettings.tsx` - 544 lines ✅ Complete

**Functions (12):**
- `ChatSettings`, `loadConfig`, `response`, `data`, `saved`, `saved`, `handleSave`, `response`
- ... and 4 more

---

### `index.ts` - 6 lines ✅ Complete

---

#### web/src/components/Dashboard

**Total Files:** 10
**Total Lines:** 1,667
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Dashboard

### `AutoProfilePanel.tsx` - 78 lines ✅ Complete

**Endpoints (1):**

**Functions (4):**
- `AutoProfilePanel`, `handleOneClick`, `response`, `data`

---

### `EmbeddingConfigPanel.tsx` - 181 lines ✅ Complete

**Endpoints (1):**

**Functions (5):**
- `EmbeddingConfigPanel`, `loadConfig`, `response`, `data`, `handleRefresh`

---

### `IndexingCostsPanel.tsx` - 126 lines ✅ Complete

**Endpoints (1):**

**Functions (5):**
- `IndexingCostsPanel`, `loadCosts`, `response`, `data`, `handleRefresh`

---

### `LiveTerminalPanel.tsx` - 42 lines ✅ Complete

**Functions (3):**
- `LiveTerminalPanel`, `terminalRef`, `w`

---

### `MonitoringLogsPanel.tsx` - 107 lines ✅ Complete

**Endpoints (1):**

**Functions (6):**
- `MonitoringLogsPanel`, `loadAlerts`, `response`, `data`, `interval`, `handleRefresh`

---

### `QuickActionButton.tsx` - 102 lines ✅ Complete

**Functions (3):**
- `QuickActionButton`, `iconEl`, `iconEl`

---

### `QuickActions.tsx` - 445 lines ✅ Complete

**Endpoints (6):**

**Functions (25):**
- `QuickActions`, `loadOptions`, `response`, `data`, `handleGenerateKeywords`, `terminal`, `response`, `data`
- ... and 17 more

---

### `StorageBreakdownPanel.tsx` - 190 lines ✅ Complete

**Endpoints (1):**

**Functions (9):**
- `StorageBreakdownPanel`, `loadStorage`, `response`, `data`, `formatBytes`, `k`, `sizes`, `i`
- ... and 1 more

---

### `SystemStatus.tsx` - 171 lines ✅ Complete

**Functions (19):**
- `SystemStatus`, `refreshStatus`, `configRes`, `config`, `repo`, `reposCount`, `healthRes`, `health`
- ... and 11 more

---

### `SystemStatusPanel.tsx` - 225 lines ✅ Complete

**Endpoints (3):**

**Functions (10):**
- `SystemStatusPanel`, `loadStats`, `healthResp`, `health`, `indexResp`, `indexData`, `configResp`, `config`
- ... and 2 more

---

#### web/src/components/DevTools

**Total Files:** 6
**Total Lines:** 2,930
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/DevTools

### `Debug.tsx` - 557 lines ✅ Complete

**Functions (12):**
- `Debug`, `handleDebug`, `response`, `data`, `exportDebugInfo`, `exportData`, `blob`, `url`
- ... and 4 more

---

### `Editor.tsx` - 492 lines ✅ Complete

**Functions (22):**
- `Editor`, `editorRef`, `containerRef`, `loadMonaco`, `loaderScript`, `require`, `initEditor`, `currentValue`
- ... and 14 more

---

### `Integrations.tsx` - 798 lines ✅ Complete

**Functions (18):**
- `Integrations`, `availableEvents`, `loadIntegrations`, `response`, `data`, `testLangSmithConnection`, `response`, `data`
- ... and 10 more

---

### `Reranker.tsx` - 530 lines ✅ Complete

**Functions (13):**
- `Reranker`, `availableRerankers`, `toggleReranker`, `handleCompare`, `response`, `data`, `exportResults`, `exportData`
- ... and 5 more

---

### `Testing.tsx` - 544 lines ✅ Complete

**Functions (14):**
- `Testing`, `handleRunTests`, `response`, `data`, `generateMockResults`, `testCount`, `rand`, `exportReport`
- ... and 6 more

---

### `index.ts` - 9 lines ✅ Complete

---

#### web/src/components/Docker

**Total Files:** 3
**Total Lines:** 955
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Docker

### `ContainerCard.tsx` - 371 lines ✅ Complete

**Functions (12):**
- `formatLogs`, `lines`, `isoMatch`, `date`, `parts`, `upperLine`, `formatPorts`, `ContainerCard`
- ... and 4 more

---

### `DockerContainerCard.tsx` - 308 lines ✅ Complete

**Functions (15):**
- `DockerContainerCard`, `isRunning`, `isPaused`, `isExited`, `handleToggleLogs`, `refreshLogs`, `result`, `downloadLogs`
- ... and 7 more

---

### `InfrastructureServices.tsx` - 276 lines ✅ Complete

**Endpoints (3):**

**Functions (9):**
- `InfrastructureServices`, `interval`, `checkInfraStatus`, `result`, `handleStartInfra`, `handleStopInfra`, `statusColor`, `statusIcon`
- ... and 1 more

---

#### web/src/components/Editor

**Total Files:** 3
**Total Lines:** 550
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Editor

### `EditorPanel.tsx` - 198 lines ✅ Complete

**Functions (4):**
- `EditorPanel`, `getBadgeStyle`, `getStatusIcon`, `getBannerMessage`

---

### `EditorSettings.tsx` - 191 lines ✅ Complete

---

### `SimpleEditor.tsx` - 161 lines ✅ Complete

**Functions (15):**
- `SimpleEditor`, `textareaRef`, `lineNumbersRef`, `handleKeyDown`, `textarea`, `start`, `end`, `spaces`
- ... and 7 more

---

#### web/src/components/Evaluation

**Total Files:** 5
**Total Lines:** 2,341
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Evaluation

### `EvaluationRunner.tsx` - 569 lines ✅ Complete

**Functions (14):**
- `handleRunEval`, `handleSaveBaseline`, `success`, `handleCompare`, `result`, `handleExport`, `failures`, `passes`
- ... and 6 more

---

### `FeedbackPanel.tsx` - 266 lines ✅ Complete

**Functions (7):**
- `handleSubmitFeedback`, `response`, `data`, `displayRating`, `getRatingLabel`, `getRatingColor`, `isFilled`

---

### `HistoryViewer.tsx` - 455 lines ✅ Complete

**Functions (13):**
- `handleClearHistory`, `handleDeleteRun`, `handleExport`, `getConfigDisplay`, `getTop5Color`, `timestamp`, `dateStr`, `timeStr`
- ... and 5 more

---

### `QuestionManager.tsx` - 687 lines ✅ Complete

**Functions (18):**
- `handleAddQuestion`, `expectPaths`, `handleTestQuestion`, `question`, `result`, `handleDeleteQuestion`, `next`, `handleLoadRecommended`
- ... and 10 more

---

### `TraceViewer.tsx` - 364 lines ✅ Complete

**Functions (21):**
- `loadLatestTrace`, `repoParam`, `response`, `data`, `errorMsg`, `formatTable`, `cols`, `widths`
- ... and 13 more

---

#### web/src/components/Grafana

**Total Files:** 3
**Total Lines:** 836
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Grafana

### `GrafanaConfig.tsx` - 438 lines ✅ Complete

**Functions (12):**
- `GrafanaConfig`, `loadConfig`, `response`, `data`, `handleTestConnection`, `response`, `data`, `handleSave`
- ... and 4 more

---

### `GrafanaDashboard.tsx` - 392 lines ✅ Complete

**Functions (9):**
- `GrafanaDashboard`, `loadConfig`, `response`, `data`, `handleRefresh`, `handleFullscreen`, `getGrafanaUrl`, `baseUrl`
- ... and 1 more

---

### `index.ts` - 6 lines ✅ Complete

---

#### web/src/components/Infrastructure

**Total Files:** 5
**Total Lines:** 1,521
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Infrastructure

### `InfrastructureSubtabs.tsx` - 41 lines ✅ Complete

---

### `MCPSubtab.tsx` - 267 lines ✅ Complete

**Functions (11):**
- `MCPSubtab`, `api`, `base`, `checkMCPStatus`, `response`, `data`, `testConnection`, `response`
- ... and 3 more

---

### `MonitoringSubtab.tsx` - 303 lines ✅ Complete

**Functions (3):**
- `MonitoringSubtab`, `saveAlertConfig`, `config`

---

### `PathsSubtab.tsx` - 448 lines ✅ Complete

**Functions (10):**
- `PathsSubtab`, `api`, `base`, `loadConfig`, `response`, `data`, `saveConfig`, `response`
- ... and 2 more

---

### `ServicesSubtab.tsx` - 462 lines ✅ Complete

**Endpoints (3):**

**Functions (30):**
- `ServicesSubtab`, `interval`, `api`, `base`, `loadContainers`, `response`, `data`, `checkServiceStatuses`
- ... and 22 more

---

#### web/src/components/Layout

**Total Files:** 1
**Total Lines:** 770
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Layout

### `Sidepanel.tsx` - 770 lines ✅ Complete

**Functions (25):**
- `Sidepanel`, `loadProfiles`, `response`, `data`, `loadStorage`, `response`, `data`, `loadAutoTuneStatus`
- ... and 17 more

---

#### web/src/components/Navigation

**Total Files:** 2
**Total Lines:** 58
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Navigation

### `TabBar.tsx` - 25 lines ✅ Complete

---

### `TabRouter.tsx` - 33 lines ✅ Complete

---

#### web/src/components/Onboarding

**Total Files:** 6
**Total Lines:** 994
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Onboarding

### `IndexStep.tsx` - 145 lines ✅ Complete

---

### `QuestionsStep.tsx` - 177 lines ✅ Complete

**Functions (7):**
- `handleAsk`, `next`, `next`, `handleQuestionChange`, `toggleTrace`, `next`, `handleSaveGolden`

---

### `SourceStep.tsx` - 159 lines ✅ Complete

**Functions (8):**
- `folderPickerRef`, `handleModeSwitch`, `handleBrowseClick`, `handleFolderChange`, `files`, `file`, `path`, `folderName`

---

### `TuneStep.tsx` - 267 lines ✅ Complete

**Functions (7):**
- `summary`, `handleSliderChange`, `handleSaveProject`, `name`, `success`, `handleRunEval`, `result`

---

### `WelcomeStep.tsx` - 110 lines ✅ Complete

---

### `Wizard.tsx` - 136 lines ✅ Complete

**Functions (7):**
- `Wizard`, `handleSourceSelect`, `handleNext`, `handleBack`, `stepNum`, `isActive`, `isCompleted`

---

#### web/src/components/Profiles

**Total Files:** 3
**Total Lines:** 966
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Profiles

### `ProfileEditor.tsx` - 367 lines ✅ Complete

**Functions (10):**
- `ProfileEditor`, `showStatus`, `handleSave`, `handleExport`, `json`, `blob`, `url`, `a`
- ... and 2 more

---

### `ProfileManager.tsx` - 182 lines ✅ Complete

**Functions (6):**
- `ProfileManager`, `showStatus`, `handleLoadProfile`, `config`, `handleApplyProfile`, `handleProfileChange`

---

### `ProfilesTab.tsx` - 417 lines ✅ Complete

**Functions (13):**
- `ProfilesTab`, `showStatus`, `handleProfileSelect`, `handleGenerateAutoProfile`, `budgetInput`, `budget`, `mode`, `budgetOverride`
- ... and 5 more

---

#### web/src/components/RAG

**Total Files:** 8
**Total Lines:** 4,732
**TODOs Found:** 2
**Stub Files:** 0

##### Files in web/src/components/RAG

### `DataQualitySubtab-complete.tsx` - 420 lines ⚠️ HAS TODOs

**Endpoints (2):**

**Functions (12):**
- `DataQualitySubtab`, `loadRepos`, `response`, `data`, `repoList`, `initTerminal`, `w`, `terminal`
- ... and 4 more

---

### `DataQualitySubtab.tsx` - 420 lines ⚠️ HAS TODOs

**Endpoints (2):**

**Functions (12):**
- `DataQualitySubtab`, `loadRepos`, `response`, `data`, `repoList`, `initTerminal`, `w`, `terminal`
- ... and 4 more

---

### `EvaluateSubtab.tsx` - 948 lines ✅ Complete

**Functions (41):**
- `EvaluateSubtab`, `loadGoldenQuestions`, `response`, `data`, `loadEvalHistory`, `response`, `data`, `handleAddQuestion`
- ... and 33 more

---

### `ExternalRerankersSubtab.tsx` - 465 lines ✅ Complete

**Functions (9):**
- `ExternalRerankersSubtab`, `config`, `handleTestReranker`, `response`, `data`, `fetchRerankerInfo`, `response`, `data`
- ... and 1 more

---

### `IndexingSubtab.tsx` - 631 lines ✅ Complete

**Functions (21):**
- `IndexingSubtab`, `loadRepos`, `response`, `data`, `repoList`, `loadBranch`, `response`, `data`
- ... and 13 more

---

### `LearningRankerSubtab.tsx` - 971 lines ✅ Complete

**Functions (46):**
- `LearningRankerSubtab`, `config`, `fetchStatus`, `response`, `data`, `fetchRerankerInfo`, `response`, `data`
- ... and 38 more

---

### `RAGSubtabs.tsx` - 45 lines ✅ Complete

---

### `RetrievalSubtab.tsx` - 832 lines ✅ Complete

**Functions (20):**
- `RetrievalSubtab`, `env`, `handleTestQuery`, `apiBase`, `repo`, `params`, `response`, `data`
- ... and 12 more

---

#### web/src/components/Search

**Total Files:** 1
**Total Lines:** 231
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Search

### `GlobalSearch.tsx` - 231 lines ✅ Complete

**Functions (5):**
- `GlobalSearch`, `inputRef`, `highlightText`, `regex`, `parts`

---

#### web/src/components/Settings

**Total Files:** 5
**Total Lines:** 3,446
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Settings

### `Docker.tsx` - 642 lines ✅ Complete

**Functions (18):**
- `Docker`, `loadData`, `interval`, `handleServiceAction`, `container`, `handleStartAllInfrastructure`, `container`, `handleStopAllInfrastructure`
- ... and 10 more

---

### `General.tsx` - 620 lines ✅ Complete

**Functions (5):**
- `General`, `handleSaveSettings`, `envUpdates`, `handleResetToDefaults`, `markChanged`

---

### `Integrations.tsx` - 952 lines ✅ Complete

**Endpoints (3):**

**Functions (15):**
- `Integrations`, `loadMcpServers`, `response`, `data`, `handleSaveSettings`, `updates`, `handleTestConnection`, `response`
- ... and 7 more

---

### `Profiles.tsx` - 551 lines ✅ Complete

**Endpoints (5):**

**Functions (24):**
- `Profiles`, `loadProfiles`, `response`, `data`, `handleApplyProfile`, `response`, `handleSaveAsNewProfile`, `profileName`
- ... and 16 more

---

### `Secrets.tsx` - 681 lines ✅ Complete

**Endpoints (2):**

**Functions (14):**
- `Secrets`, `excludeKeys`, `handleSaveSecrets`, `updates`, `handleAddEnvVar`, `isMasked`, `handleDeleteEnvVar`, `handleEditEnvVar`
- ... and 6 more

---

#### web/src/components/Storage

**Total Files:** 4
**Total Lines:** 846
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/Storage

### `Calculator.tsx` - 162 lines ✅ Complete

**Functions (3):**
- `Calculator`, `calc1`, `calc2`

---

### `CalculatorForm.tsx` - 337 lines ✅ Complete

**Functions (4):**
- `CalculatorForm`, `isFullMode`, `fullInputs`, `optInputs`

---

### `OptimizationPlan.tsx` - 240 lines ✅ Complete

---

### `ResultsDisplay.tsx` - 107 lines ✅ Complete

---

#### web/src/components/icons

**Total Files:** 1
**Total Lines:** 11
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/icons

### `ChevronRight.tsx` - 11 lines ✅ Complete

---

#### web/src/components/tabs

**Total Files:** 12
**Total Lines:** 1,159
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/tabs

### `AdminTab.tsx` - 29 lines ✅ Complete

---

### `ChatTab.jsx` - 375 lines ✅ Complete

---

### `ChatTab.tsx` - 70 lines ✅ Complete

---

### `DashboardTab.jsx` - 277 lines ✅ Complete

---

### `EvaluationTab.tsx` - 101 lines ✅ Complete

---

### `GrafanaTab.jsx` - 85 lines ✅ Complete

---

### `InfrastructureTab.tsx` - 29 lines ✅ Complete

---

### `ProfilesTab.jsx` - 89 lines ✅ Complete

---

### `RAGTab.tsx` - 35 lines ✅ Complete

---

### `StartTab.jsx` - 10 lines ✅ Complete

---

### `VSCodeTab.jsx` - 50 lines ✅ Complete

---

### `VSCodeTab.tsx` - 9 lines ✅ Complete

---

#### web/src/components/ui

**Total Files:** 7
**Total Lines:** 609
**TODOs Found:** 0
**Stub Files:** 0

##### Files in web/src/components/ui

### `Button.tsx` - 88 lines ✅ Complete

**Functions (3):**
- `cx`, `base`, `Button`

---

### `LoadingSpinner.tsx` - 159 lines ✅ Complete

**Functions (7):**
- `LoadingSpinner`, `sizeMap`, `pixelSize`, `renderSpinner`, `spinner`, `LoadingOverlay`, `LoadingButton`

---

### `ProgressBar.tsx` - 87 lines ✅ Complete

**Functions (3):**
- `ProgressBar`, `percentage`, `isIndeterminate`

---

### `ProgressBarWithShimmer.tsx` - 71 lines ✅ Complete

---

### `SkeletonLoader.tsx` - 103 lines ✅ Complete

**Functions (6):**
- `SkeletonLoader`, `normalizedWidth`, `normalizedHeight`, `skeletons`, `SkeletonCard`, `SkeletonList`

---

### `StatusIndicator.tsx` - 73 lines ✅ Complete

**Functions (4):**
- `StatusIndicator`, `statusLabels`, `displayLabel`, `effectiveAriaLabel`

---

### `index.ts` - 28 lines ✅ Complete

---

### web/src/config

**Total Files:** 1
**Total Lines:** 144
**TODOs Found:** 0
**Stub Files:** 0

#### Files in web/src/config

### `routes.ts` - 144 lines ✅ Complete

---

### web/src/contexts

**Total Files:** 2
**Total Lines:** 127
**TODOs Found:** 0
**Stub Files:** 0

#### Files in web/src/contexts

### `CoreContext.tsx` - 121 lines ✅ Complete

**Functions (6):**
- `CoreContext`, `CoreProvider`, `uiHelpers`, `updateState`, `useCore`, `context`

---

### `index.ts` - 6 lines ✅ Complete

---

### web/src/hooks

**Total Files:** 21
**Total Lines:** 2,939
**TODOs Found:** 0
**Stub Files:** 0

#### Files in web/src/hooks

### `index.ts` - 22 lines ✅ Complete

---

### `useAPI.ts` - 65 lines ✅ Complete

**Functions (8):**
- `useAPI`, `resolveAPIBase`, `u`, `q`, `override`, `base`, `api`, `p`

---

### `useAppInit.ts` - 120 lines ✅ Complete

**Functions (3):**
- `useAppInit`, `init`, `message`

---

### `useApplyButton.ts` - 125 lines ✅ Complete

**Functions (13):**
- `useApplyButton`, `handleFormChange`, `handleApply`, `w`, `formData`, `api`, `response`, `errorData`
- ... and 5 more

---

### `useCards.ts` - 122 lines ✅ Complete

**Functions (15):**
- `useCards`, `load`, `response`, `message`, `build`, `params`, `response`, `data`
- ... and 7 more

---

### `useErrorHandler.ts` - 52 lines ✅ Complete

**Functions (7):**
- `useErrorHandler`, `showAlert`, `message`, `createHelpful`, `createInline`, `handleApiError`, `message`

---

### `useEventBus.ts` - 33 lines ✅ Complete

**Functions (8):**
- `useEventBus`, `eventBus`, `emit`, `customEvent`, `on`, `listener`, `once`, `listener`

---

### `useGlobalSearch.ts` - 259 lines ✅ Complete

**Functions (30):**
- `useGlobalSearch`, `abortControllerRef`, `buildSettingsIndex`, `sections`, `titleEl`, `title`, `inputGroups`, `labelEl`
- ... and 22 more

---

### `useGlobalState.ts` - 70 lines ✅ Complete

**Functions (8):**
- `useGlobalState`, `syncState`, `w`, `interval`, `handleStateUpdate`, `updateState`, `w`, `getState`

---

### `useIndexing.ts` - 187 lines ✅ Complete

**Functions (16):**
- `useIndexing`, `startIndexing`, `params`, `response`, `data`, `stopIndexing`, `response`, `pollIndexProgress`
- ... and 8 more

---

### `useKeywords.ts` - 66 lines ✅ Complete

**Functions (6):**
- `useKeywords`, `service`, `loadKeywords`, `data`, `filterKeywords`, `getCount`

---

### `useMCPRag.ts` - 78 lines ✅ Complete

**Functions (8):**
- `useMCPRag`, `service`, `search`, `response`, `errorMsg`, `formatResults`, `data`, `clearResults`

---

### `useModuleLoader.ts` - 56 lines ✅ Complete

**Functions (7):**
- `useModuleLoader`, `maxAttempts`, `checkModules`, `w`, `coreLoaded`, `uiLoaded`, `configLoaded`

---

### `useNavigation.ts` - 62 lines ✅ Complete

**Functions (9):**
- `useNavigation`, `navigate`, `location`, `activeTab`, `navigateTo`, `path`, `currentTab`, `lastTab`
- ... and 1 more

---

### `useOnboarding.ts` - 367 lines ✅ Complete

**Endpoints (12):**
- ... and 2 more

**Functions (39):**
- `useOnboarding`, `savedStep`, `savedState`, `parsed`, `setStep`, `nextStep`, `prevStep`, `setProjectDraft`
- ... and 31 more

---

### `useReranker.ts` - 267 lines ✅ Complete

**Functions (30):**
- `useReranker`, `service`, `startPolling`, `interval`, `currentStatus`, `stopPolling`, `mineTriplets`, `result`
- ... and 22 more

---

### `useStorageCalculator.ts` - 297 lines ✅ Complete

**Functions (56):**
- `useStorageCalculator`, `calculate`, `R`, `C`, `D`, `B`, `Q`, `hydrationPct`
- ... and 48 more

---

### `useTabs.ts` - 29 lines ✅ Complete

---

### `useTheme.ts` - 141 lines ✅ Complete

**Functions (14):**
- `useTheme`, `resolveTheme`, `m`, `prefersDark`, `applyThemeToDocument`, `resolved`, `selector`, `nodes`
- ... and 6 more

---

### `useTooltips.ts` - 264 lines ✅ Complete

**Functions (12):**
- `useTooltips`, `buildTooltipHTML`, `linkHtml`, `badgeHtml`, `badgesBlock`, `linksBlock`, `buildTooltipMap`, `L`
- ... and 4 more

---

### `useUIHelpers.ts` - 257 lines ✅ Complete

**Functions (54):**
- `useUIHelpers`, `getNum`, `el`, `value`, `setNum`, `el`, `attachCommaFormatting`, `el`
- ... and 46 more

---

### web/src/modules

**Total Files:** 54
**Total Lines:** 15,403
**TODOs Found:** 0
**Stub Files:** 0

#### Files in web/src/modules

### `alerts.js` - 555 lines ✅ Complete

**Functions (75):**
- `THRESHOLD_FIELDS`, `loadAlertThresholds`, `r`, `data`, `msg`, `populateAlertThresholds`, `field`, `loadAlertStatus`
- ... and 67 more

---

### `api-base-override.js` - 37 lines ✅ Complete

**Functions (3):**
- `BASE`, `setupAPI`, `p`

---

### `app.js` - 1914 lines ✅ Complete

**Functions (409):**
- `resolveTheme`, `applyTheme`, `initThemeFromEnv`, `switchTab`, `bindTabs`, `bindSubtabs`, `clearHighlights`, `highlightMatches`
- ... and 401 more

---

### `autoprofile_v2.js` - 202 lines ✅ Complete

**Functions (62):**
- `apiBase`, `u`, `q`, `override`, `api`, `getConfig`, `r`, `csvToList`
- ... and 54 more

---

### `autotune.js` - 71 lines ✅ Complete

**Functions (13):**
- `api`, `refreshAutotune`, `r`, `modeEl`, `modeEl`, `enabledEl`, `d`, `enabledEl`
- ... and 5 more

---

### `cards.js` - 217 lines ✅ Complete

**Functions (36):**
- `api`, `load`, `resp`, `data`, `cards`, `last`, `lastBox`, `when`
- ... and 28 more

---

### `cards_builder.js` - 326 lines ✅ Complete

**Functions (58):**
- `api`, `state`, `populateRepoSelect`, `sel`, `r`, `config`, `opt`, `msg`
- ... and 50 more

---

### `chat.js` - 722 lines ✅ Complete

**Functions (96):**
- `DEFAULT_CHAT_SETTINGS`, `loadChatSettings`, `saved`, `saveChatSettings`, `settings`, `msg`, `resetChatSettings`, `applyChatSettings`
- ... and 88 more

---

### `config.js` - 611 lines ✅ Complete

**Functions (80):**
- `loadConfig`, `r`, `d`, `msg`, `populateConfigForm`, `env`, `field`, `repoSelect`
- ... and 72 more

---

### `core-utils.js` - 53 lines ✅ Complete

**Functions (6):**
- `API_BASE`, `u`, `q`, `override`, `api`, `state`

---

### `cost_logic.js` - 215 lines ✅ Complete

**Endpoints (1):**

**Functions (45):**
- `PRICE_CACHE`, `PRICE_TTL_MS`, `normKey`, `loadPrices`, `now`, `res`, `json`, `getModelSpec`
- ... and 37 more

---

### `dino.js` - 36 lines ✅ Complete

**Functions (9):**
- `el`, `ctx`, `W`, `dino`, `obs`, `spawn`, `jump`, `step`
- ... and 1 more

---

### `docker.js` - 822 lines ✅ Complete

**Endpoints (3):**

**Functions (90):**
- `checkDockerStatus`, `display`, `response`, `data`, `errorHtml`, `listContainers`, `grid`, `response`
- ... and 82 more

---

### `editor-settings.js` - 142 lines ✅ Complete

**Functions (16):**
- `api`, `settingsCache`, `loadSettings`, `resp`, `data`, `saveSettings`, `resp`, `data`
- ... and 8 more

---

### `editor.js` - 219 lines ✅ Complete

**Functions (41):**
- `api`, `MAX_IFRAME_LOAD_ATTEMPTS`, `_env`, `_embedEnabled`, `ci`, `fld`, `envVal`, `checkEditorHealth`
- ... and 33 more

---

### `error-helpers.js` - 149 lines ✅ Complete

**Functions (6):**
- `createHelpfulError`, `createInlineError`, `linkHtml`, `createAlertError`, `escapeHtml`, `div`

---

### `eval_history.js` - 234 lines ✅ Complete

**Functions (19):**
- `EVAL_HISTORY_KEY`, `MAX_HISTORY_ENTRIES`, `addEvalRunToHistory`, `history`, `entry`, `getEvalHistory`, `stored`, `loadEvalHistory`
- ... and 11 more

---

### `eval_runner.js` - 544 lines ✅ Complete

**Endpoints (8):**

**Functions (88):**
- `DEFAULT_GOLDEN`, `DEFAULT_BASELINE`, `loadEvalSettings`, `r`, `cfg`, `env`, `golden`, `baseline`
- ... and 80 more

---

### `fetch-shim.js` - 7 lines ✅ Complete

---

### `git-commit-meta.js` - 69 lines ✅ Complete

**Functions (17):**
- `api`, `loadCommitMeta`, `d`, `m`, `user`, `setVal`, `el`, `setChk`
- ... and 9 more

---

### `git-hooks.js` - 53 lines ✅ Complete

**Functions (8):**
- `api`, `refreshHooksStatus`, `d`, `el`, `el`, `installHooks`, `r`, `d`

---

### `golden_questions.js` - 488 lines ✅ Complete

**Endpoints (6):**

**Functions (74):**
- `RECOMMENDED_GOLDEN`, `loadGoldenQuestions`, `response`, `data`, `renderGoldenQuestions`, `container`, `html`, `addGoldenQuestion`
- ... and 66 more

---

### `grafana.js` - 137 lines ✅ Complete

**Functions (35):**
- `env`, `vFromDom`, `envVal`, `el`, `buildUrl`, `base`, `uid`, `slug`
- ... and 27 more

---

### `health.js` - 37 lines ✅ Complete

**Functions (6):**
- `api`, `checkHealth`, `r`, `d`, `healthEl`, `healthEl`

---

### `index-display.js` - 184 lines ✅ Complete

**Functions (10):**
- `formatBytes`, `k`, `sizes`, `i`, `formatIndexStatusDisplay`, `html`, `emb`, `storage`
- ... and 2 more

---

### `index_profiles.js` - 187 lines ✅ Complete

**Functions (16):**
- `PROFILES`, `updateProfileDescription`, `select`, `descEl`, `profileKey`, `profile`, `applyProfile`, `select`
- ... and 8 more

---

### `index_status.js` - 105 lines ✅ Complete

**Functions (19):**
- `api`, `formatBytes`, `k`, `sizes`, `i`, `formatIndexStatus`, `html`, `totalSize`
- ... and 11 more

---

### `indexing.js` - 463 lines ✅ Complete

**Functions (44):**
- `populateIndexRepoDropdown`, `select`, `config`, `opt`, `refreshIndexStats`, `grid`, `response`, `stats`
- ... and 36 more

---

### `keywords.js` - 77 lines ✅ Complete

**Functions (17):**
- `api`, `state`, `loadKeywords`, `r`, `d`, `list`, `opt`, `kc`
- ... and 9 more

---

### `langsmith.js` - 56 lines ✅ Complete

**Functions (14):**
- `api`, `state`, `bind`, `btn`, `projEl`, `proj`, `shareSel`, `share`
- ... and 6 more

---

### `layout_fix.js` - 37 lines ✅ Complete

---

### `live-terminal.js` - 324 lines ✅ Complete

**Functions (13):**
- `container`, `terminalHTML`, `collapseBtn`, `scrollToggle`, `clearBtn`, `terminalBody`, `atBottom`, `scrollToggle`
- ... and 5 more

---

### `mcp_rag.js` - 53 lines ✅ Complete

**Functions (18):**
- `api`, `state`, `bind`, `btn`, `qEl`, `repoEl`, `topkEl`, `localEl`
- ... and 10 more

---

### `mcp_server.js` - 261 lines ✅ Complete

**Functions (31):**
- `updateHTTPStatus`, `statusEl`, `response`, `data`, `startHTTPServer`, `btn`, `response`, `data`
- ... and 23 more

---

### `model_flows.js` - 116 lines ✅ Complete

**Functions (27):**
- `api`, `updateEnv`, `upsertPrice`, `promptStr`, `v`, `addGenModelFlow`, `provider`, `model`
- ... and 19 more

---

### `navigation.js` - 623 lines ✅ Complete

**Functions (46):**
- `TAB_REGISTRY`, `NEW_TABS`, `navState`, `resolveTabId`, `navigateTo`, `resolvedTab`, `previousTab`, `previousView`
- ... and 38 more

---

### `onboarding.js` - 223 lines ✅ Complete

**Functions (85):**
- `onboardingState`, `showOnboardStep`, `backBtn`, `nextBtn`, `nextOnboard`, `mode`, `path`, `url`
- ... and 77 more

---

### `profile_logic.js` - 36 lines ✅ Complete

**Functions (4):**
- `proposeProfile`, `hasLocal`, `rprov`, `buildWizardProfile`

---

### `profile_renderer.js` - 199 lines ✅ Complete

**Functions (13):**
- `SETTING_INFO`, `TIER_INFO`, `renderProfileResults`, `tierInfo`, `categories`, `info`, `cat`, `bindTooltips`
- ... and 5 more

---

### `rag-navigation.js` - 211 lines ✅ Complete

**Functions (19):**
- `RAG_SUBTAB_MAP`, `showRagSubtabs`, `subtabBar`, `hideRagSubtabs`, `subtabBar`, `switchRagSubtab`, `ragTab`, `isActive`
- ... and 11 more

---

### `reranker.js` - 1099 lines ✅ Complete

**Endpoints (21):**
- ... and 11 more

**Functions (150):**
- `initRerankerTerminal`, `addFeedbackButtons`, `feedbackDiv`, `rating`, `submitNoteBtn`, `note`, `submitFeedback`, `statusSpan`
- ... and 142 more

---

### `search.js` - 254 lines ✅ Complete

**Functions (41):**
- `clearHighlights`, `t`, `highlightMatches`, `rx`, `walker`, `hits`, `n`, `m`
- ... and 33 more

---

### `secrets.js` - 111 lines ✅ Complete

**Functions (13):**
- `api`, `ingestFile`, `persist`, `fd`, `r`, `d`, `outEl`, `bindDropzone`
- ... and 5 more

---

### `simple_index.js` - 86 lines ✅ Complete

**Endpoints (1):**

**Functions (14):**
- `runRealIndex`, `repo`, `dense`, `output`, `btn`, `response`, `reader`, `decoder`
- ... and 6 more

---

### `storage-calculator-template.js` - 379 lines ✅ Complete

---

### `storage-calculator.js` - 211 lines ✅ Complete

**Functions (65):**
- `formatBytes`, `abs`, `KB`, `MB`, `GB`, `TB`, `nf`, `formatNumber`
- ... and 57 more

---

### `tabs.js` - 274 lines ✅ Complete

**Functions (24):**
- `loadStorageCalculator`, `container`, `TAB_ALIASES`, `switchTab`, `newTabId`, `targetDiv`, `groups`, `show`
- ... and 16 more

---

### `test-instrumentation.js` - 270 lines ✅ Complete

**Functions (30):**
- `init`, `addTestIds`, `tabButtons`, `tabName`, `oldTabButtons`, `tabName`, `ragSubtabs`, `subtabName`
- ... and 22 more

---

### `theme.js` - 97 lines ✅ Complete

**Functions (21):**
- `resolveTheme`, `m`, `prefersDark`, `applyTheme`, `t`, `mappings`, `nodes`, `initThemeFromEnv`
- ... and 13 more

---

### `tooltips.js` - 644 lines ✅ Complete

**Functions (23):**
- `L`, `linkHtml`, `badgeHtml`, `badgesBlock`, `buildTooltipMap`, `attachTooltipListeners`, `show`, `hide`
- ... and 15 more

---

### `trace.js` - 77 lines ✅ Complete

**Functions (25):**
- `api`, `_fmtTable`, `cols`, `widths`, `all`, `line`, `loadLatestTrace`, `repoSel`
- ... and 17 more

---

### `ui-helpers.js` - 204 lines ✅ Complete

**Functions (45):**
- `bindCollapsibleSections`, `headers`, `targetId`, `content`, `isCollapsed`, `storageKey`, `targetId`, `storageKey`
- ... and 37 more

---

### `ux-feedback.js` - 585 lines ✅ Complete

**Functions (34):**
- `prefersReducedMotion`, `createRipple`, `rect`, `x`, `y`, `ripple`, `position`, `initRippleEffects`
- ... and 26 more

---

### `vscode.js` - 97 lines ✅ Complete

**Functions (8):**
- `showEditor`, `container`, `hideEditor`, `container`, `openInNewWindow`, `copyUrl`, `restart`, `init`

---

### web/src/pages

**Total Files:** 4
**Total Lines:** 406
**TODOs Found:** 0
**Stub Files:** 0

#### Files in web/src/pages

### `Dashboard-complete.tsx` - 106 lines ✅ Complete

**Functions (4):**
- `Dashboard`, `initTerminal`, `w`, `timeout`

---

### `Dashboard-old.tsx` - 140 lines ✅ Complete

**Endpoints (1):**

---

### `Dashboard.tsx` - 122 lines ✅ Complete

**Endpoints (1):**

**Functions (7):**
- `Dashboard`, `loadBranch`, `response`, `data`, `initTerminal`, `w`, `timeout`

---

### `Docker.tsx` - 38 lines ✅ Complete

---

### web/src/services

**Total Files:** 6
**Total Lines:** 909
**TODOs Found:** 0
**Stub Files:** 0

#### Files in web/src/services

### `IndexProfilesService.ts` - 103 lines ✅ Complete

---

### `IndexingService.ts` - 190 lines ✅ Complete

**Functions (10):**
- `response`, `response`, `response`, `response`, `totalStorage`, `sizeGB`, `currentRepo`, `k`
- ... and 2 more

---

### `KeywordsService.ts` - 48 lines ✅ Complete

---

### `MCPRagService.ts` - 66 lines ✅ Complete

---

### `RAGService.ts` - 132 lines ✅ Complete

---

### `RerankService.ts` - 370 lines ✅ Complete

**Functions (28):**
- `response`, `response`, `response`, `response`, `response`, `data`, `response`, `response`
- ... and 20 more

---

### web/src/stores

**Total Files:** 4
**Total Lines:** 347
**TODOs Found:** 0
**Stub Files:** 0

#### Files in web/src/stores

### `index.ts` - 5 lines ✅ Complete

---

### `useConfigStore.ts` - 201 lines ✅ Complete

**Functions (4):**
- `useConfigStore`, `config`, `updatedRepos`, `keywordsCatalog`

---

### `useDockerStore.ts` - 93 lines ✅ Complete

---

### `useHealthStore.ts` - 48 lines ✅ Complete

---

### web/src/styles

**Total Files:** 0
**Total Lines:** 0
**TODOs Found:** 0
**Stub Files:** 0

### web/src/types

**Total Files:** 1
**Total Lines:** 137
**TODOs Found:** 0
**Stub Files:** 0

#### Files in web/src/types

### `index.ts` - 137 lines ✅ Complete

---

### web/src/utils

**Total Files:** 1
**Total Lines:** 125
**TODOs Found:** 0
**Stub Files:** 0

#### Files in web/src/utils

### `errorHelpers.ts` - 125 lines ✅ Complete

**Functions (6):**
- `createHelpfulError`, `createInlineError`, `linkHtml`, `createAlertError`, `escapeHtml`, `div`

---

