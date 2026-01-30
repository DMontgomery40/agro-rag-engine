# Docs Autopilot Plan (heuristic)
Base: origin/main

## Changed files
- .cursor/rules
- .github/workflows/reranker-docs.yml
- .gitignore
- .vscode/extensions.json
- .codex/docs/AGENTS.md
- agent_docs/AUDIT_SUMMARY.md
- .claude/docs/CLAUDE.md
- Dockerfile
- Dockerfile.node
- _archived/ai/GEMINI.md
- Makefile
- indexer/README.md
- README.md
- REDESIGN_SPEC.md
- SMOKE_TEST_CONSOLE_SCRIPT.js
- TOOLTIPS_JS_COMPLETE.md
- TOOLTIP_ERROR_ENHANCEMENT_PROGRESS.md
- TOOLTIP_UPGRADE_PROGRESS.md
- TOOLTIP_WORK_COMPLETED.md
- agent_docs/AGENT4_SMOKE_TEST_STATUS.md
- agent_docs/AGENT4_TESTING_VALIDATION_REPORT.md
- agent_docs/AGENT5_BRUTAL_AUDIT.md
- agent_docs/AGENT5_DEBUG_LOG.md
- agent_docs/AGENT5_FINAL_SUMMARY.md
- agent_docs/AGENT5_QUICK_TEST_GUIDE.md
- agent_docs/AGENT5_README.md
- agent_docs/AGENT5_REVISED_STATUS.md
- agent_docs/AGENT6_UI_ENHANCEMENT_REPORT.md
- agent_docs/AGENTS_STATUS_REPORT.md
- agent_docs/AGENT_5_DELIVERABLES.md
- agent_docs/AGENT_HANDOFF_FAILURE_ANALYSIS.md
- agent_docs/AGENT_HANDOFF_RAG_FIXES.md
- agent_docs/API_CLIENT_FIX_REPORT.md
- agent_docs/CATASTROPHIC_REVERT_ANALYSIS.md
- agent_docs/DOCKER_CONSOLIDATION_BACKUP.md
- agent_docs/DOCKER_CONSOLIDATION_COMPLETE.md
- agent_docs/DOCUMENTATION_LINK_AUDIT_REPORT.md
- agent_docs/DOCUSAURUS_CONTENT_MIGRATION.md
- agent_docs/DOCUSAURUS_FINAL_SUMMARY.md
- agent_docs/DOCUSAURUS_PAGES_COMPLETE.md
- agent_docs/DOCUSAURUS_SETUP_COMPLETE.md
- agent_docs/DOCUSAURUS_STUB_PAGES_FILLED.md
- agent_docs/DOCUSAURUS_TEST_REPORT.md
- agent_docs/ENTERPRISE_INDEXING_IMPLEMENTATION_PLAN.md
- agent_docs/EVAL_PERSISTENCE_FIX_2025_11_25.md
- agent_docs/EVERY_TAB_TESTED.md
- agent_docs/FEATURE_INVENTORY_FORENSIC_ANALYSIS.md
- agent_docs/FEATURE_RECOVERY_SUMMARY.md
- agent_docs/FINAL_VERIFICATION.md
- agent_docs/FIXES_APPLIED.md
- agent_docs/GRAFANA_DASHBOARD_COMPLETE.md
- agent_docs/GRAFANA_DASHBOARD_FIXES_COMPLETE.md
- agent_docs/HANDOFF_2025_11_25_RAG_REWRITE.md
- agent_docs/HANDOFF_2025_11_26_PROMPTS_SUBTAB_ISSUES.md
- agent_docs/HANDOFF_2025_11_28_CODE_AUDIT.md
- agent_docs/HANDOFF_2025_11_28_ENTERPRISE_INDEXING.md
- agent_docs/HANDOFF_2025_11_28_PYDANTIC_CRISIS.md
- agent_docs/HANDOFF_GUI_RESTORATION_DISASTER.md
- agent_docs/HANDOFF_PHASE2_RAG_CONTENT.md
- agent_docs/IFRAME_FIXES.md
- agent_docs/IMPLEMENTATION_SUMMARY.md
- agent_docs/INTEGRATION_CONTRACTS.md
- agent_docs/MASTER_REFACTOR_REPORT.md
- agent_docs/METRICS_INSTRUMENTATION_COMPLETE.md
- agent_docs/MICRO_INTERACTIONS_DEMO.html
- agent_docs/MIGRATION_STATUS.md
- agent_docs/MODULE_UPDATE_STATUS.md
- agent_docs/MODULE_UPDATE_SUMMARY.md
- agent_docs/MULTI_TAB_COORDINATION_COMPLETE.md
- agent_docs/PARALLEL_AGENTS_PROGRESS.md
- agent_docs/PARALLEL_EXECUTION_STATUS.md
- agent_docs/PHASE2_COMPLETION.md
- agent_docs/PHASE2_QUICK_SUMMARY.md
- agent_docs/PHASE3_SETTINGS_INTEGRATION.md
- agent_docs/PHASE4_QUICK_REFERENCE.md
- agent_docs/PHASE4_VALIDATION.md
- agent_docs/PHASE_4_FRONTEND_WIRING_REPORT.md
- agent_docs/PHASE_5C_CHECKLIST.md
- agent_docs/PHASE_SUMMARY_MULTI_TAB_COORDINATION.md
- agent_docs/POLISH_AUDIT.md
- agent_docs/PYDANTIC_CONFIG_FIXES_2025_11_28.md
- agent_docs/QDRANT_MACOS_ENTERPRISE_SOLUTION.md
- agent_docs/QUICK_REFERENCE.md
- agent_docs/QUICK_STATUS.md
- agent_docs/RAG_TESTING_REPORT.md
- agent_docs/README_FORENSIC_INVESTIGATION.md
- agent_docs/SEIZURE_BUG_FIX_REPORT.md
- agent_docs/SESSION_COMPLETE_SUMMARY.md
- agent_docs/SESSION_SUMMARY_2025-10-19_CONTINUED.md
- agent_docs/SETTINGS_ANALYSIS.md
- agent_docs/SETTINGS_CONSOLIDATION_SUMMARY.md
- agent_docs/SUPPORT_MODULES_COMPLETION.md
- agent_docs/TAB_REORGANIZATION_MAPPING.md
- agent_docs/TAB_REORGANIZATION_VISUAL.md
- agent_docs/TESTING_SUMMARY.md
- agent_docs/TONIGHT_ACCOMPLISHMENTS_2025-10-19.md
- agent_docs/TOOLTIP_AUDIT.md
- agent_docs/TOOLTIP_DEMO_COMPLETE.md
- agent_docs/UX_POLISH_SUMMARY.md
- agent_docs/VALID_DOCUMENTATION_ONLY.md

## Suggested updates
- Update API endpoint documentation - routers changed
- Review service layer changes; may affect feature docs
- Update RAG pipeline documentation - LangGraph changes detected
- Update hybrid search documentation - retrieval module changed
- Update reranker/learning reranker documentation
- Update indexing documentation - indexer changed
- Update CLI documentation - cli module changed
- Update configuration documentation - Pydantic config models changed
- Review settings documentation - agro_config.json schema may have changed
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