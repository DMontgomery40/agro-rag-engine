# AGRO GUI Redesign Specification
## Version 1.0 - Navigation & Information Architecture Overhaul

### Executive Summary
Complete reorganization of AGRO's GUI from a confusing 10-tab system with buried features to a clean, logical hierarchy that prominently features VS Code and Grafana integrations.

### Current State Inventory

#### Main Tabs (Current)
1. **Get Started** (`start`) - Onboarding wizard
2. **Dashboard** (`dashboard`) - System status, quick actions, cost calculator
3. **Chat** (`chat`) - RAG interaction interface
4. **Configuration** (`config`) - Models, retrieval, infrastructure, repositories
5. **Data & Indexing** (`data`) - Indexing controls and profiles
6. **Learning Reranker** (`reranker`) - Built-in cross-encoder training
7. **Developer Tools** (`devtools`) - Editor, MCP, debug, reranker training, golden questions, evaluation
8. **Analytics** (`analytics`) - Cost, performance, usage, tracing
9. **Metrics** (`metrics`) - Grafana embed
10. **Settings** (`settings`) - General, Docker, integrations, profiles, secrets

#### JavaScript Modules (42 files)
- **Core Infrastructure**: core-utils.js, theme.js, tabs.js, search.js, tooltips.js
- **Feature Modules**: chat.js, config.js, indexing.js, reranker.js, editor.js, grafana.js
- **MCP/Integration**: mcp_rag.js, mcp_server.js, docker.js, langsmith.js
- **Data Management**: cards.js, cards_builder.js, keywords.js, golden_questions.js
- **Evaluation**: eval_runner.js, autotune.js
- **Profile/Config**: profile_logic.js, profile_renderer.js, autoprofile_v2.js, index_profiles.js
- **UI Helpers**: ui-helpers.js, index-display.js, index_status.js, health.js, trace.js
- **Cost/Storage**: cost_logic.js, storage-calculator.js, storage-calculator-template.js
- **Git Integration**: git-hooks.js, git-commit-meta.js
- **Misc**: secrets.js, alerts.js, model_flows.js, onboarding.js, simple_index.js, dino.js

#### DOM Structure
- **Total Lines**: 5826
- **Tab Content Divs**: 30+ (including subtabs)
- **Form Elements**: 200+ inputs/selects/textareas
- **API Endpoints Referenced**: 50+

### New Information Architecture

#### Top-Level Navigation (9 tabs)
```
┌────────────┬──────────┬──────┬─────────┬─────────┬─────┬─────────┬────────────────┬───────┐
│ Get Started│ Dashboard│ Chat │ VS Code │ Grafana │ RAG │ Profiles│ Infrastructure │ Admin │
└────────────┴──────────┴──────┴─────────┴─────────┴─────┴─────────┴────────────────┴───────┘
```

#### Detailed Structure ( "-" under main tabs indicate subtabs)

**1. Get Started** 🚀
- Onboarding wizard (unchanged)
- Quick setup flow

**2. Dashboard** 📊
- System status (read-only)
- Quick actions
- Resource usage summary
- NO editable settings

**3. Chat** 💬
- Chat interface
- Routing trace toggle
- Chat settings (model, temp, MQ, top-k)
- Feedback buttons

**4. VS Code** 📝 (PROMOTED)
- Embedded editor iframe
- Port/bind settings
- Open in window
- Health status

**5. Grafana** 📈 (PROMOTED)
- Embedded dashboard
- Config (base URL, UID, auth)
- Preview/Open buttons
- Live metrics panel

**6. RAG** 🧠 (6 subtabs)
- **Data Quality**
  - Keywords (chips UI)
  - Path boosts (chips UI)
  - Synonyms editor
  - Semantic Cards builder
- **Retrieval**
  - Models + temperature
  - MQ rewrites, Final-K
  - BM25/Dense top-k
  - Hydration settings
  - Advanced tuning (RRF, boosts)
- **External Rerankers**
  - Provider selection (Cohere/Voyage/Jina/Local)
  - Model + API keys
  - Input snippet chars
- **Learning Ranker** (built-in cross-encoder)
  - Status + telemetry path
  - Mine → Train → Evaluate workflow
  - Config (blend alpha, batch sizes)
  - Automation + logs
- **Indexing**
  - Index Now + progress
  - Profiles (shared/full/dev)
  - Advanced settings
- **Evaluate**
  - Golden Questions
  - Evaluation runner
  - Results + MRR/Hit@K

**7. Profiles** 💾
- Budget calculator
- Save/Load/Apply profiles
- Channel overrides (HTTP/CLI/MCP)
- Profile import/export

**8. Infrastructure** 🔧
- Services (Qdrant, Redis, Prometheus, Grafana)
- MCP servers control
- Editor daemon settings
- Paths (OUT_DIR_BASE, repos, collections)
- Endpoints (URLs)

**9. Admin** ⚙️
- Theme/appearance
- Server settings
- Git hooks
- Secrets import
- Config export

### Migration Mapping

#### Tab ID Migrations
```javascript
// Old ID → New ID
{
  "tab-dashboard": "tab-dashboard",  // Keep
  "tab-chat": "tab-chat",  // Keep
  "tab-onboarding": "tab-start",  // Rename
  "tab-config-models": "tab-rag-retrieval",
  "tab-config-retrieval": "tab-rag-retrieval",
  "tab-config-infra": "tab-infrastructure",
  "tab-config-repos": "tab-rag-data-quality",
  "tab-data-indexing": "tab-rag-indexing",
  "tab-reranker": "tab-rag-learning-ranker",
  "tab-devtools-editor": "tab-vscode",
  "tab-devtools-mcp": "tab-infrastructure",
  "tab-devtools-debug": "tab-admin",
  "tab-devtools-reranker": "tab-rag-learning-ranker",
  "tab-devtools-golden": "tab-rag-evaluate",
  "tab-devtools-eval": "tab-rag-evaluate",
  "tab-analytics-cost": "tab-profiles",
  "tab-analytics-performance": "tab-infrastructure",
  "tab-analytics-usage": "tab-infrastructure",
  "tab-analytics-tracing": "tab-infrastructure",
  "tab-metrics": "tab-grafana",
  "tab-settings-general": "tab-admin",
  "tab-settings-docker": "tab-infrastructure",
  "tab-settings-integrations": "tab-admin",
  "tab-settings-profiles": "tab-profiles",
  "tab-settings-secrets": "tab-admin"
}
```

#### Module Ownership
```javascript
// Module → New Owner Tab(s)
{
  "chat.js": ["chat"],
  "config.js": ["rag-retrieval", "profiles"],
  "indexing.js": ["rag-indexing"],
  "reranker.js": ["rag-learning-ranker"],
  "editor.js": ["vscode"],
  "grafana.js": ["grafana"],
  "cards.js": ["rag-data-quality"],
  "cards_builder.js": ["rag-data-quality"],
  "keywords.js": ["rag-data-quality"],
  "golden_questions.js": ["rag-evaluate"],
  "eval_runner.js": ["rag-evaluate"],
  "profile_logic.js": ["profiles"],
  "autoprofile_v2.js": ["profiles"],
  "mcp_server.js": ["infrastructure"],
  "docker.js": ["infrastructure"],
  "secrets.js": ["admin"],
  "git-hooks.js": ["admin"],
  "theme.js": ["admin"]
}
```

### Settings Consolidation

#### Single Source of Truth Locations
- **OUT_DIR_BASE**: Infrastructure (read-only elsewhere)
- **Telemetry Path**: RAG > Learning Ranker (read-only in Chat)
- **Model Settings**: RAG > Retrieval (overrides in Profiles)
- **MCP Settings**: Infrastructure (status badges elsewhere)
- **Cost/Budget**: Profiles only

### Implementation Phases

#### Phase 0: Preparation (Current)
- [x] Create inventory
- [ ] Add data-testid attributes
- [ ] Create migration map
- [ ] Build compatibility layer

#### Phase 1: Routing Foundation
- [ ] Implement tab registry
- [ ] Add compatibility aliases
- [ ] Create navigation.js module
- [ ] Test backward compatibility

#### Phase 2: Visual Reorganization
- [ ] Create new tab bar
- [ ] Promote VS Code and Grafana
- [ ] Build RAG mega-tab with subtabs
- [ ] Consolidate settings

#### Phase 3: Cleanup
- [ ] Remove duplicate controls
- [ ] Delete dead code
- [ ] Update labels/copy
- [ ] Optimize bundle size

#### Phase 4: Testing & Documentation
- [ ] Playwright test suite
- [ ] CI/CD pipeline
- [ ] User documentation
- [ ] Migration guide

### Success Metrics
- VS Code and Grafana visible as top-level tabs
- No functionality lost
- Zero console errors
- Page load < 1s
- All 42 JS modules functional
- Rollback capability < 30s

### Risk Mitigation
- Feature flag: AGRO_NEW_IA=1
- Compatibility mode for 1 release
- Module-level smoke tests
- Automated rollback on errors
- Incremental PR strategy

### File Ownership

#### Protected Files (Do Not Delete)
- All 42 JS modules in gui/js/
- gui/index.html (until migration complete)
- gui/css/main.css, dark.css, light.css
- All API endpoints in server/

#### New Files to Create
- gui/js/navigation.js - New navigation system
- gui/views/*.html - Split tab content (Phase 2+)
- tests/gui/*.spec.ts - Playwright tests
- MIGRATION_STATUS.md - Track progress

### Notes
- HTML file will remain monolithic in Phase 1-2, split in Phase 3
- All settings must be editable in GUI (accessibility requirement)
- Preserve all existing keyboard shortcuts
- Maintain theme switching capability

