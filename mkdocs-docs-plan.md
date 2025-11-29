# Docs Autopilot Plan (heuristic)
Base: origin/main

## Changed files
- .cursor/rules
- Dockerfile
- Dockerfile.node
- Makefile
- SMOKE_TEST_CONSOLE_SCRIPT.js
- bin/ragctl
- cli/agro.py
- cli/chat_cli.py
- cli/commands/chat.py
- cli/commands/config.py
- cli/commands/eval.py
- cli/commands/golden.py
- cli/commands/index.py
- cli/commands/mcp.py
- cli/commands/ops.py
- cli/commands/reranker.py
- cli/commands/utils.py
- common/config_loader.py
- common/filtering.py
- common/metadata.py
- common/paths.py
- docker-compose.qdrant-inmemory.patch
- docker-compose.services.yml.DEPRECATED
- eval/eval_loop.py
- eval/eval_rag.py
- eval/eval_rag_instrumented.py
- eval_embeddings.py
- extract_endpoints.py
- indexer/build_cards.py
- indexer/index_repo.py
- indexer/index_repo_v2.py
- node_mcp/server.js
- node_mcp/server.mjs
- path_config.py
- reranker/__init__.py
- reranker/config.py
- retrieval/ast_chunker.py
- retrieval/embed_cache.py
- retrieval/hybrid_search.py
- retrieval/hybrid_search_v2.py
- retrieval/rerank.py
- scripts/add_element_ids.py
- scripts/debug_ast.py
- scripts/debug_search_ast.py
- scripts/docs_ai/generate_docs_from_diff.py
- scripts/eval_gate_guard.py
- scripts/eval_reranker.py
- scripts/guard_legacy_api.py
- scripts/gui_smoke.py
- scripts/make_repos_json.py
- scripts/measure_overhead.py
- scripts/mine_from_evaluation_dataset.py
- scripts/mine_golden.py
- scripts/netlify_deploy.py
- scripts/promote_reranker.py
- scripts/quick_setup.py
- scripts/reranker_doc_guard.py
- scripts/seed_training_logs.py
- scripts/test_backend.py
- scripts/train_reranker.py
- scripts/verify_react_parity.py
- scripts/verify_refactor.py
- server/alert_config.py
- server/alerts.py
- server/api_interceptor.py
- server/api_tracker.py
- server/app.py
- server/asgi.py
- server/autoprofile.py
- server/cards_builder.py
- server/env_model.py
- server/feedback.py
- server/frequency_limiter.py
- server/index_stats.py
- server/langgraph_app.py
- server/learning_reranker.py
- server/mcp/__init__.py
- server/mcp/http.py
- server/mcp/server.py
- server/metrics.py
- server/reranker.py
- server/reranker_info.py
- server/routers/autotune.py
- server/routers/cards.py
- server/routers/chat.py
- server/routers/config.py
- server/routers/cost.py
- server/routers/data_quality.py
- server/routers/docker.py
- server/routers/editor.py
- server/routers/eval.py
- server/routers/git_ops.py
- server/routers/golden.py
- server/routers/grafana.py
- server/routers/hardware.py
- server/routers/indexing.py
- server/routers/keywords.py
- server/routers/mcp_ops.py
- server/routers/observability.py
- server/routers/onboarding.py

## Suggested updates
- Update API endpoint documentation - routers changed
- Review service layer changes; may affect feature docs
- Update RAG pipeline documentation - LangGraph changes detected
- Update hybrid search documentation - retrieval module changed
- Update reranker/learning reranker documentation
- Update indexing documentation - indexer changed
- Update CLI documentation - cli module changed
- Consider updating GUI-related documentation
- Update MCP integration documentation
- Update evaluation documentation
- Update installation/infrastructure documentation

## Context snapshots
### CLAUDE.md (excerpt)
# Playwright Verification Policy (Updated)

You must verify work with Playwright (IF GUI) — or at least a backend smoke test in `/tests` — before reporting results. However, due to UI scale and accessibility needs, GUI verification via Playwright is now limited to "non‑black‑screen" smoke only. Deep visual/content correctness requires human review.

What's required for GUI work:
- A Playwright smoke that proves the app renders (no blank/black screen), root route responds, and the top‑level navigation renders. (Use `playwright.web.config.ts` for dev testing on port 5173, or `playwright.web-static.config.ts` for production testing on port 8012/web)
- Do not rely on Playwright to assert deep page content beyond structure/visibility (e.g., whether all sub‑sections render far below the fold). Those require human screenshots/feedback.
- **all new elements in the UI must have a tooltip aligning with the quality and verbosity of other tooltips** (See `web/src/hooks/useTooltips.ts` for React components or `web/src/modules/tooltips.js` for legacy JS)

What's required for backend‑only work:
- A minimal smoke test under `/tests/` that exercises the new or changed endpoint(s) and returns sane responses.

Reporting:
- Provide Playwright output or test logs/screenshots for GUI smoke, and minimal API responses for backend smoke. (For error messages, see `web/src/utils/errorHelpers.ts` for examples of helpful error formatting)
- Where deeper UI validation is required, explicitly request human screenshots and record the feedback.

This update does not reduce the bar for functionality. It clarifies that Playwright's role is structural/health smoke, while detailed UI validation is human‑driven for accessibility and correctness.

# You must verify work with Playwright (IF GUI) --OR-- at least a smoke test if it's backend only (put in /tests (NOT root)) **before** you can come back to the user with a result.  ***This is non-negotiable and mandator*** (For /web React app: use `playwright.

### README.md (excerpt)
![AGRO Banner](assets/agro-banner.svg)
# AGRO is a local‑first RAG Engine Workspace for codebases.


#### It provides a rich GUI (also a decent TUI), easy setup with an Onboarding Wizard, a built-in Self-Learning Transformer model (it's literally always getting better and faster), Evals w/ Regression Analysis, Multi-Query, Hybrid-Search, Local Hydration, Traceability (Langsmith and OpenAI Agents SDK), Embedded-Grafana dash w/ alerts, Multiple Transports, Chat Interface, and Modular-everything.
And it even has a VSCode instance embedded in the GUI (you don't have to turn it on just wanted to see if I could do it ; )

### (Really) Quick Start
```bash
git clone https://github.com/DMontgomery40/agro.git
cd agro
Make dev. # Starts: Qdrant/Redis, MCPs, API, GUI, etc.
cd scripts/.setup.sh #CLI walkthrough to set repos, etc.

# GUI at http://127.0.0.1:8012/
```

### Docker service vs. container names

The API runs as the Compose service `api` but the container is named `agro-api`. Use the service name for `docker compose ... api` commands (build, up, logs) and the container name for direct `docker ... agro-api` operations (exec, logs, inspect). Example quick reference:

| Task | Command |
|------|---------|
| Build / start via Compose | `docker compose -f docker-compose.services.yml up -d api` |
| Follow logs via Compose | `docker compose -f docker-compose.services.yml logs -f api` |
| Exec inside the container | `docker exec -it agro-api bash` |
| Tail runtime logs directly | `docker logs -f agro-api` |

## 📖 Documentation

**[Full Documentation Site](https://dmontgomery40.github.io/agro-rag-engine/)** - Complete guides for setup, API, MCP integration, and more

## **Fully-local model support, or any SOTA API Model, mix, match, and set profiles based on task**
<table>
<tr>
<td width="50%" valign="top">

#### Profile: `Docs-search` (Fast, local-first, low-cost)
```yaml
gen_model: gpt-4o-mini
embedding: BGE-small-en-v1.5  #local
vectors: 384-d 
precision: int4
rerank_model: 

### .env.example (excerpt)


### OpenAPI (truncated)
{"openapi":"3.1.0","info":{"title":"AGRO RAG + GUI","version":"0.1.0"},"paths":{"/health":{"get":{"summary":"Health","operationId":"health_health_get","responses":{"200":{"description":"Successful Response","content":{"application/json":{"schema":{}}}}}}},"/api/health":{"get":{"summary":"Api Health","operationId":"api_health_api_health_get","responses":{"200":{"description":"Successful Response","content":{"application/json":{"schema":{}}}}}}},"/api/pipeline/summary":{"get":{"summary":"Pipeline Summary","operationId":"pipeline_summary_api_pipeline_summary_get","responses":{"200":{"description":"Successful Response","content":{"application/json":{"schema":{"additionalProperties":true,"type":"object","title":"Response Pipeline Summary Api Pipeline Summary Get"}}}}}}},"/search":{"get":{"summary":"Search","description":"Retrieval-only search endpoint (no generation).","operationId":"search_search_get","parameters":[{"name":"q","in":"query","required":true,"schema":{"type":"string","description":"Question","title":"Q"},"description":"Question"},{"name":"repo","in":"query","required":false,"schema":{"anyOf":[{"type":"string"},{"type":"null"}],"title":"Repo"}},{"name":"top_k","in":"query","required":false,"schema":{"anyOf":[{"type":"integer"},{"type":"null"}],"title":"Top K"}}],"responses":{"200":{"description":"Successful Response","content":{"application/json":{"schema":{"type":"object","additionalProperties":true,"title":"Response Search Search Get"}}}},"422":{"description":"Vali