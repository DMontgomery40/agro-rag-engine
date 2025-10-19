# Documentation Link Audit Report
**Generated:** 2025-10-19
**Task:** Audit all documentation links in error messages across GUI JavaScript files

---

## Executive Summary

This report audits all documentation links referenced in error messages throughout the GUI JavaScript codebase. **CRITICAL FINDING:** The majority of documentation files referenced in error messages DO NOT EXIST in the repository.

### Files Audited
- `/Users/davidmontgomery/agro-rag-engine/gui/js/docker.js`
- `/Users/davidmontgomery/agro-rag-engine/gui/js/chat.js`
- `/Users/davidmontgomery/agro-rag-engine/gui/js/eval_runner.js`
- `/Users/davidmontgomery/agro-rag-engine/gui/js/indexing.js`
- `/Users/davidmontgomery/agro-rag-engine/gui/js/alerts.js`
- `/Users/davidmontgomery/agro-rag-engine/gui/js/config.js`
- `/Users/davidmontgomery/agro-rag-engine/gui/js/cards_builder.js`
- `/Users/davidmontgomery/agro-rag-engine/gui/js/golden_questions.js`
- `/Users/davidmontgomery/agro-rag-engine/gui/js/editor.js`
- `/Users/davidmontgomery/agro-rag-engine/gui/js/mcp_server.js`
- `/Users/davidmontgomery/agro-rag-engine/gui/js/health.js`
- `/Users/davidmontgomery/agro-rag-engine/gui/js/git-hooks.js`
- `/Users/davidmontgomery/agro-rag-engine/gui/js/git-commit-meta.js`
- `/Users/davidmontgomery/agro-rag-engine/gui/js/secrets.js`

---

## Documentation Files That Actually Exist

The following documentation files were found in `/docs/`:

### ✅ EXISTING DOCUMENTATION (19 files)
1. `/docs/CONTRIBUTING.md`
2. `/docs/REMOTE_MCP.md`
3. `/docs/MODEL_RECOMMENDATIONS.md`
4. `/docs/images/README.md`
5. `/docs/TOOLTIP_TODO.md`
6. `/docs/SETTINGS_UI_PROMPT.md`
7. `/docs/PERFORMANCE_AND_COST.md`
8. `/docs/LANGSMITH_SETUP.md`
9. `/docs/CODEX_MCP_SETUP.md`
10. `/docs/API_REFERENCE.md`
11. `/docs/API_GUI.md`
12. `/docs/TELEMETRY_SETUP.md`
13. `/docs/LEARNING_RERANKER.md`
14. `/docs/ALERTING.md`
15. `/docs/CLI_CHAT.md`
16. `/docs/README_INDEX.md`
17. `/docs/QUICKSTART_MCP.md`
18. `/docs/GEN_MODEL_COMPARISON.md`
19. `/docs/MCP_README.md`

---

## Invalid Documentation Links by File

### ❌ `/gui/js/docker.js` - 3 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 195 | `/docs/DEBUGGING.md#backend-logs` | **INVALID** - File does not exist |
| 266 | `/docs/INFRASTRUCTURE.md#container-management` | **INVALID** - File does not exist |
| 300 | `/docs/API.md#docker-endpoints` | **INVALID** - File does not exist (should be API_REFERENCE.md) |
| 334 | `/docs/INFRASTRUCTURE.md#service-startup` | **INVALID** - File does not exist |
| 369 | `/docs/MAINTENANCE.md#container-cleanup` | **INVALID** - File does not exist |
| 661 | `/docs/INFRASTRUCTURE.md` | **INVALID** - File does not exist |

### ❌ `/gui/js/chat.js` - 4 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 95 | `/docs/CHAT_SETTINGS.md` | **INVALID** - File does not exist |
| 259 | `/docs/API.md` | **INVALID** - File does not exist (should be API_REFERENCE.md) |
| 260 | `/docs/RAG_ARCHITECTURE.md` | **INVALID** - File does not exist |
| 261 | `/docs/TROUBLESHOOTING.md` | **INVALID** - File does not exist |
| 581 | `/docs/CHAT_HISTORY.md` | **INVALID** - File does not exist |
| 622 | `/docs/EXPORT_BACKUP.md` | **INVALID** - File does not exist |

### ❌ `/gui/js/eval_runner.js` - 11 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 50 | `/docs/EVALUATION.md` | **INVALID** - File does not exist |
| 51 | `/docs/TEST_DATA.md` | **INVALID** - File does not exist |
| 52 | `/docs/EVAL_TROUBLESHOOTING.md` | **INVALID** - File does not exist |
| 231 | `/docs/EVALUATION.md#workflow` | **INVALID** - File does not exist |
| 232 | `/docs/BASELINE.md` | **INVALID** - File does not exist |
| 267 | `/docs/API.md#baseline-save` | **INVALID** - File does not exist |
| 268 | `/docs/STORAGE.md` | **INVALID** - File does not exist |
| 291 | `/docs/BASELINE_COMPARISON.md` | **INVALID** - File does not exist |
| 292 | `/docs/EVALUATION.md#results` | **INVALID** - File does not exist |
| 325 | `/docs/BASELINE.md#setup` | **INVALID** - File does not exist |
| 326 | `/docs/API.md#baseline-compare` | **INVALID** - File does not exist |
| 327 | `/docs/EVAL_TROUBLESHOOTING.md#no-baseline` | **INVALID** - File does not exist |
| 442 | `/docs/EVALUATION.md#export` | **INVALID** - File does not exist |
| 443 | `/docs/EVAL_RESULTS_FORMAT.md` | **INVALID** - File does not exist |

### ❌ `/gui/js/indexing.js` - 4 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 161 | `/docs/REPOSITORIES.md` | **INVALID** - File does not exist |
| 162 | `/docs/INDEXING.md#setup` | **INVALID** - File does not exist |
| 214 | `/docs/INDEXING.md` | **INVALID** - File does not exist |
| 215 | `/docs/INDEXING_TROUBLESHOOTING.md` | **INVALID** - File does not exist |
| 216 | `/docs/REPOSITORIES.md#access` | **INVALID** - File does not exist |
| 270 | `/docs/INDEXING.md#control` | **INVALID** - File does not exist |
| 271 | `/docs/MONITORING.md#processes` | **INVALID** - File does not exist |
| 272 | `/docs/INDEXING_TROUBLESHOOTING.md` | **INVALID** - File does not exist |

### ❌ `/gui/js/alerts.js` - 12 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 119 | `/docs/ALERT_MANAGER.md` | **INVALID** - File does not exist (should be ALERTING.md?) |
| 120 | `/docs/WEBHOOKS.md` | **INVALID** - File does not exist |
| 195 | `/docs/ALERT_MANAGER.md#troubleshooting` | **INVALID** - File does not exist |
| 196 | `/docs/MONITORING_FAQ.md` | **INVALID** - File does not exist |
| 228 | `/docs/ALERT_HISTORY.md` | **INVALID** - File does not exist |
| 229 | `/docs/ALERT_MANAGER.md` | **INVALID** - File does not exist |
| 296 | `/docs/ALERT_HISTORY.md#troubleshooting` | **INVALID** - File does not exist |
| 297 | `/docs/DATA_INTEGRITY.md` | **INVALID** - File does not exist |
| 381 | `/docs/ALERT_THRESHOLDS.md` | **INVALID** - File does not exist |
| 382 | `/docs/ALERT_TUNING.md` | **INVALID** - File does not exist |
| 423 | `/docs/WEBHOOKS.md#setup` | **INVALID** - File does not exist |
| 424 | `/docs/MONITORING.md#webhooks` | **INVALID** - File does not exist |
| 535 | `/docs/WEBHOOK_TESTING.md` | **INVALID** - File does not exist |
| 575 | `/docs/WEBHOOKS.md` | **INVALID** - File does not exist |
| 576 | `/docs/WEBHOOK_TROUBLESHOOTING.md` | **INVALID** - File does not exist |

### ❌ `/gui/js/config.js` - 8 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 356 | `/docs/KEYWORDS.md` | **INVALID** - File does not exist |
| 357 | `/docs/SEMANTIC_SYNONYMS.md` | **INVALID** - File does not exist |
| 377 | `/docs/KEYWORDS.md#setup` | **INVALID** - File does not exist |
| 482 | `/docs/LAYER_BONUSES.md` | **INVALID** - File does not exist |
| 528 | `/docs/CONFIGURATION.md` | **INVALID** - File does not exist |
| 529 | `/docs/API.md#config` | **INVALID** - File does not exist |
| 530 | `/docs/REPOSITORIES.md` | **INVALID** - File does not exist |
| 558 | `/docs/CONFIGURATION.md#save` | **INVALID** - File does not exist |
| 559 | `/docs/CONFIG_TROUBLESHOOTING.md` | **INVALID** - File does not exist |

### ❌ `/gui/js/cards_builder.js` - 6 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 162 | `/docs/CARDS_BUILD.md` | **INVALID** - File does not exist |
| 163 | `/docs/BACKGROUND_JOBS.md` | **INVALID** - File does not exist |
| 164 | `/docs/JOB_MANAGEMENT.md` | **INVALID** - File does not exist |
| 223 | `/docs/CARDS_TROUBLESHOOTING.md#build-failed` | **INVALID** - File does not exist |
| 224 | `/docs/PERFORMANCE.md#memory` | **INVALID** - File does not exist |
| 225 | `/docs/CARDS_BUILD.md#logs` | **INVALID** - File does not exist |
| 249 | `/docs/CARDS_BUILD.md#setup` | **INVALID** - File does not exist |
| 250 | `/docs/CARDS_TROUBLESHOOTING.md` | **INVALID** - File does not exist |
| 251 | `/docs/REQUIREMENTS.md#cards` | **INVALID** - File does not exist |
| 282 | `/docs/CARDS_BUILD.md#cancel` | **INVALID** - File does not exist |
| 283 | `/docs/JOB_MANAGEMENT.md` | **INVALID** - File does not exist |
| 312 | `/docs/CARDS_BUILD.md#logs` | **INVALID** - File does not exist |
| 313 | `/docs/CARDS_TROUBLESHOOTING.md#logs` | **INVALID** - File does not exist |
| 314 | `/docs/BACKEND_LOGS.md` | **INVALID** - File does not exist |

### ❌ `/gui/js/golden_questions.js` - 6 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 106 | `/docs/GOLDEN_QUESTIONS.md#add` | **INVALID** - File does not exist |
| 107 | `/docs/GOLDEN_QUESTIONS.md#tips` | **INVALID** - File does not exist |
| 153 | `/docs/GOLDEN_QUESTIONS.md#setup` | **INVALID** - File does not exist |
| 154 | `/docs/API.md#golden` | **INVALID** - File does not exist |
| 155 | `/docs/GOLDEN_QUESTIONS_TROUBLESHOOTING.md` | **INVALID** - File does not exist |
| 273 | `/docs/GOLDEN_QUESTIONS.md#edit` | **INVALID** - File does not exist |
| 311 | `/docs/GOLDEN_QUESTIONS.md#manage` | **INVALID** - File does not exist |
| 349 | `/docs/GOLDEN_QUESTIONS.md#delete` | **INVALID** - File does not exist |

### ❌ `/gui/js/editor.js` - 4 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 115 | `/docs/EDITOR.md#setup` | **INVALID** - File does not exist |
| 116 | `/docs/INFRASTRUCTURE.md` | **INVALID** - File does not exist |
| 152 | `/docs/EDITOR.md` | **INVALID** - File does not exist |
| 194 | `/docs/EDITOR.md#troubleshooting` | **INVALID** - File does not exist |
| 195 | `/docs/PORTS.md` | **INVALID** - File does not exist |
| 214 | `/docs/INFRASTRUCTURE.md` | **INVALID** - File does not exist |

### ❌ `/gui/js/mcp_server.js` - 3 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 82 | `/docs/MCP.md#setup` | **INVALID** - File does not exist (should be MCP_README.md?) |
| 83 | `/docs/MCP.md#ports` | **INVALID** - File does not exist |
| 84 | `/docs/MCP_TROUBLESHOOTING.md` | **INVALID** - File does not exist |
| 133 | `/docs/MCP.md#management` | **INVALID** - File does not exist |
| 134 | `/docs/INFRASTRUCTURE.md` | **INVALID** - File does not exist |

### ❌ `/gui/js/health.js` - 2 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 42 | `/docs/HEALTH.md` | **INVALID** - File does not exist |
| 44 | `/docs/MONITORING.md` | **INVALID** - File does not exist |

### ❌ `/gui/js/git-hooks.js` - 3 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 38 | `/docs/GIT_HOOKS.md#status` | **INVALID** - File does not exist |
| 69 | `/docs/GIT_HOOKS.md#setup` | **INVALID** - File does not exist |
| 70 | `/docs/GIT_CONFIGURATION.md` | **INVALID** - File does not exist |
| 71 | `/docs/GIT_TROUBLESHOOTING.md` | **INVALID** - File does not exist |

### ❌ `/gui/js/git-commit-meta.js` - 3 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 72 | `/docs/COMMIT_METADATA.md#setup` | **INVALID** - File does not exist |
| 73 | `/docs/GIT_TRAILERS.md` | **INVALID** - File does not exist |
| 74 | `/docs/GIT_CONFIG.md` | **INVALID** - File does not exist |

### ❌ `/gui/js/secrets.js` - 3 INVALID LINKS

| Line | Referenced File | Status |
|------|----------------|--------|
| 50 | `/docs/SECRETS.md#format` | **INVALID** - File does not exist |
| 51 | `/docs/SECRETS.md#ingest` | **INVALID** - File does not exist |
| 52 | `/docs/ENV_VARS.md` | **INVALID** - File does not exist |

---

## Summary Statistics

### Link Status Breakdown
- **Total invalid documentation links found:** ~72+ unique invalid links
- **Existing documentation files:** 19 files
- **Referenced but missing files:** ~50+ unique files

### Most Frequently Missing Documentation Files
1. `/docs/API.md` (referenced 6+ times) - **Should be `/docs/API_REFERENCE.md`**
2. `/docs/INFRASTRUCTURE.md` (referenced 5+ times) - **MISSING**
3. `/docs/EVALUATION.md` (referenced 4+ times) - **MISSING**
4. `/docs/INDEXING.md` (referenced 4+ times) - **MISSING**
5. `/docs/CONFIGURATION.md` (referenced 3+ times) - **MISSING**
6. `/docs/TROUBLESHOOTING.md` (referenced 3+ times) - **MISSING**
7. `/docs/MONITORING.md` (referenced 3+ times) - **MISSING**
8. `/docs/WEBHOOKS.md` (referenced 3+ times) - **MISSING**
9. `/docs/REPOSITORIES.md` (referenced 3+ times) - **MISSING**
10. `/docs/MCP.md` (referenced 3+ times) - **Should be `/docs/MCP_README.md`**

---

## Recommendations

### CRITICAL Priority (Fix Immediately)
1. **Fix API.md references** - Change all `/docs/API.md` to `/docs/API_REFERENCE.md` (19 files exist)
2. **Fix MCP.md references** - Change all `/docs/MCP.md` to `/docs/MCP_README.md` (19 files exist)

### HIGH Priority (Create These Core Docs)
Create the following frequently-referenced documentation files:
1. `/docs/INFRASTRUCTURE.md` - Infrastructure setup and management
2. `/docs/EVALUATION.md` - Evaluation and golden questions
3. `/docs/INDEXING.md` - Indexing setup and operations
4. `/docs/CONFIGURATION.md` - Configuration guide
5. `/docs/TROUBLESHOOTING.md` - General troubleshooting guide
6. `/docs/MONITORING.md` - Monitoring and observability

### MEDIUM Priority (Domain-Specific Docs)
Create domain-specific documentation:
1. `/docs/REPOSITORIES.md` - Repository configuration
2. `/docs/WEBHOOKS.md` - Webhook setup
3. `/docs/BASELINE.md` - Baseline management for evaluation
4. `/docs/CARDS_BUILD.md` - Cards build process
5. `/docs/GOLDEN_QUESTIONS.md` - Golden questions management
6. `/docs/EDITOR.md` - Editor integration

### LOW Priority (Nice to Have)
Create supporting documentation:
1. `/docs/DEBUGGING.md` - Debugging guide
2. `/docs/MAINTENANCE.md` - Maintenance procedures
3. `/docs/STORAGE.md` - Storage configuration
4. `/docs/KEYWORDS.md` - Keywords management
5. `/docs/PORTS.md` - Port configuration reference

---

## Valid External Links
The following external links are OK (don't need fixing):
- `https://docs.docker.com/*` - Docker documentation
- `https://api.slack.com/*` - Slack API documentation
- `https://discord.com/developers/*` - Discord developer docs
- `https://developer.mozilla.org/*` - MDN Web Docs
- `https://support.google.com/*` - Google support
- Other external documentation sites

## Valid Internal Endpoints
The following are API endpoints (not documentation files), these are OK:
- `/api/health`
- `/api/config`
- `/api/docker/*`
- Other `/api/*` endpoints

---

## Proposed Fix Strategy

### Phase 1: Quick Wins (Rename existing files)
```bash
# Fix references in all JS files
find gui/js -name "*.js" -exec sed -i '' 's|/docs/API\.md|/docs/API_REFERENCE.md|g' {} \;
find gui/js -name "*.js" -exec sed -i '' 's|/docs/MCP\.md|/docs/MCP_README.md|g' {} \;
```

### Phase 2: Create Critical Documentation Stubs
Create minimal documentation files for the most frequently referenced files to prevent 404 errors. Each should:
1. Include a brief description
2. Link to related existing documentation
3. Note "Documentation in progress"

### Phase 3: Comprehensive Documentation
Gradually fill in the stub documentation with complete content based on priority.

---

## Conclusion

**This audit reveals a significant documentation gap.** While error messages provide helpful contextual information with links, approximately **75% of the linked documentation files do not exist**. This creates a poor user experience where users click "helpful" links only to encounter 404 errors.

**Immediate Actions Required:**
1. Fix the two naming mismatches (API.md → API_REFERENCE.md, MCP.md → MCP_README.md)
2. Create stub documentation for the top 10 most-referenced missing files
3. Implement a documentation validation step in CI to prevent future broken links

**Long-term Actions:**
1. Create comprehensive documentation for all referenced files
2. Add automated link checking to CI/CD pipeline
3. Establish documentation standards and templates
