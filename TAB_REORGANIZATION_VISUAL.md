# AGRO GUI Tab Reorganization - Visual Mapping
## Before & After Structure

---

## BEFORE (Current State - 10 main tabs)

```
┌─────────────┬───────────┬──────┬──────────────┬─────────────┬──────────┬────────────┬───────────┬─────────┬──────────┐
│ Get Started │ Dashboard │ Chat │Configuration │ Data & Index│ Reranker │ Dev Tools  │ Analytics │ Metrics │ Settings │
└─────────────┴───────────┴──────┴──────────────┴─────────────┴──────────┴────────────┴───────────┴─────────┴──────────┘
                                         │              │            │           │            │           │        │
                                         ├─ Models      │            ├─ Editor   ├─ Cost      │           ├─ General
                                         ├─ Retrieval   │            ├─ Testing  ├─ Perf      │           ├─ Docker
                                         ├─ Infra       │            ├─ Reranker ├─ Usage     │           ├─ Integrations
                                         └─ Repos       │            ├─ Debug    └─ Tracing   │           ├─ Profiles
                                                        │            └─ Integrations           │           └─ Secrets
                                                        │
                                               Simple Index UI
```

### Content Distribution (OLD)
- **Config tab:** 4 subtabs (models, retrieval, infra, repos)
- **Data tab:** 1 view (indexing)
- **Reranker tab:** 1 view (standalone)
- **DevTools tab:** 5 subtabs (editor, testing, reranker, debug, integrations)
- **Analytics tab:** 4 subtabs (cost, performance, usage, tracing)
- **Settings tab:** 5 subtabs (general, docker, integrations, profiles, secrets)

**Problems:**
- VS Code buried 3 clicks deep (DevTools → Editor)
- Grafana hidden in "Metrics" tab
- Reranker content duplicated (2 locations)
- Settings scattered across 3 tabs
- No clear RAG organization
- DevTools is a junk drawer

---

## AFTER (New State - 9 main tabs)

```
┌─────────────┬───────────┬──────┬─────────┬─────────┬───────────────────────┬──────────┬────────────────┬───────┐
│ Get Started │ Dashboard │ Chat │ VS Code │ Grafana │        RAG            │ Profiles │ Infrastructure │ Admin │
└─────────────┴───────────┴──────┴─────────┴─────────┴───────────────────────┴──────────┴────────────────┴───────┘
                                     📝         📈               🧠                💾           🔧            ⚙️
                                  PROMOTED   PROMOTED      MEGA-TAB           NEW TAB       NEW TAB      NEW TAB
```

### RAG Mega-Tab Structure (6 subtabs)

```
RAG 🧠
├─ Data Quality
│  ├─ Keywords (chips UI)
│  ├─ Path Boosts (chips UI)
│  ├─ Synonyms Editor
│  ├─ Semantic Cards Builder
│  └─ Repository Configuration
│
├─ Retrieval
│  ├─ Models (primary, temperature)
│  ├─ Multi-Query & Final-K
│  ├─ BM25/Dense Top-K
│  ├─ Hydration Settings
│  └─ Advanced Tuning (RRF, boosts)
│
├─ External Rerankers
│  ├─ Provider: Cohere
│  ├─ Provider: Voyage AI
│  ├─ Provider: Jina
│  ├─ Provider: Local/HF
│  └─ Input Snippet Chars
│
├─ Learning Ranker (built-in cross-encoder)
│  ├─ Status & Telemetry
│  ├─ Mine → Train → Evaluate Workflow
│  ├─ Config (blend alpha, batch sizes)
│  ├─ Automation & Cron
│  └─ Logs & Metrics
│
├─ Indexing
│  ├─ Index Now (simple UI)
│  ├─ Repository Selector
│  ├─ Profiles (shared/full/dev)
│  └─ Advanced Settings
│
└─ Evaluate
   ├─ Golden Questions Manager
   │  ├─ Add/Edit Questions
   │  ├─ Test Individual
   │  └─ Load Recommended
   └─ Evaluation Runner
      ├─ Run Full Suite
      ├─ Metrics (Top-1, Top-K, MRR)
      └─ Baseline Compare
```

---

## CONTENT FLOW DIAGRAM

### VS Code Tab (Promoted)
```
OLD LOCATION:                    NEW LOCATION:
DevTools → Editor        →       VS Code (top-level)
(3 clicks deep)                  (1 click)

MOVED CONTENT:
┌──────────────────────────┐
│ • Editor iframe embed    │
│ • Port settings          │
│ • Bind mode (local/net)  │
│ • Health status          │
│ + Open in new window     │  ← ADDED
│ + Copy URL button        │  ← ADDED
└──────────────────────────┘
```

### Grafana Tab (Promoted)
```
OLD LOCATION:                    NEW LOCATION:
Metrics                  →       Grafana (top-level)
(hidden at end)                  (1 click)

MOVED CONTENT:
┌──────────────────────────┐
│ • Grafana iframe embed   │
│ • Preview button         │
│ • Open external button   │
│ + Base URL config        │  ← ADDED
│ + Dashboard UID config   │  ← ADDED
│ + Auth settings          │  ← ADDED
└──────────────────────────┘
```

### Profiles Tab (Consolidated)
```
OLD LOCATIONS:               NEW LOCATION:
Analytics → Cost      ┐
Settings → Profiles   ┴→     Profiles (top-level)

MERGED CONTENT:
┌──────────────────────────┐
│ From Analytics-Cost:     │
│ • Budget calculator      │
│ • Cost tracking (24h)    │
│ • Monthly projections    │
│                          │
│ From Settings-Profiles:  │
│ • Save/Load profiles     │
│ • Apply profile          │
│ • Channel overrides      │
│ • Import/Export          │
└──────────────────────────┘
```

### Infrastructure Tab (Heavily Consolidated)
```
OLD LOCATIONS:                         NEW LOCATION:
Config → Infrastructure         ┐
Settings → Docker               │
DevTools → Integrations         │→    Infrastructure (top-level)
Analytics → Performance         │
Analytics → Usage               │
Analytics → Tracing             ┘

MERGED CONTENT (6 sources):
┌──────────────────────────┐
│ SERVICES:                │
│ • Qdrant control         │
│ • Redis control          │
│ • Prometheus control     │
│ • Grafana service        │
│                          │
│ MCP SERVERS:             │
│ • stdio MCP control      │
│ • HTTP MCP control       │
│                          │
│ PATHS & ENDPOINTS:       │
│ • OUT_DIR_BASE           │
│ • Repository paths       │
│ • Service URLs           │
│                          │
│ MONITORING:              │
│ • Performance metrics    │
│ • Usage statistics       │
│ • Trace viewer           │
└──────────────────────────┘
```

### Admin Tab (Consolidated)
```
OLD LOCATIONS:                    NEW LOCATION:
Settings → General         ┐
Settings → Integrations    │→     Admin (top-level)
Settings → Secrets         │
DevTools → Debug           ┘

MERGED CONTENT:
┌──────────────────────────┐
│ • Theme & Appearance     │
│ • Server Settings        │
│ • LangSmith Integration  │
│ • Alert Thresholds       │
│ • Git Hooks              │
│ • Secrets Management     │
│ • Config Export          │
└──────────────────────────┘
```

---

## COMPLEXITY HEATMAP

```
┌─────────────────────────────────────────────────────────────┐
│ TAB                    │ RISK  │ SOURCES │ NEW CONTENT      │
├─────────────────────────────────────────────────────────────┤
│ Get Started            │ ✅ Low │    1    │ None (rename)    │
│ Dashboard              │ ✅ Low │    1    │ None (keep)      │
│ Chat                   │ ✅ Low │    1    │ None (keep)      │
├─────────────────────────────────────────────────────────────┤
│ VS Code                │ ⚠️ Med │    1    │ Config form      │
│ Grafana                │ ⚠️ Med │    1    │ Config form      │
│ Profiles               │ ⚠️ Med │    2    │ Channel UI       │
│ Admin                  │ ⚠️ Med │    4    │ Git hooks UI     │
├─────────────────────────────────────────────────────────────┤
│ Infrastructure         │ 🔴 High│    6    │ Consolidated UI  │
│ RAG: Data Quality      │ 🔴 High│    3    │ Keywords, Boosts │
│ RAG: External Rerankers│ 🔴 High│    1    │ Voyage, Jina     │
│ RAG: Learning Ranker   │ 🔴 High│    2    │ Merge workflows  │
├─────────────────────────────────────────────────────────────┤
│ RAG: Retrieval         │ ⚠️⚠️ Crit│  2    │ None             │
│ RAG: Evaluate          │ ⚠️⚠️ Crit│  1    │ None             │
│ RAG: Indexing          │ ✅ Low │    1    │ None (rename)    │
└─────────────────────────────────────────────────────────────┘

Legend:
✅ Low Risk    = Simple move/rename, minimal changes
⚠️ Med Risk    = 2-4 sources, some new UI needed
🔴 High Risk   = 3+ sources OR significant new UI
⚠️⚠️ Crit Risk  = Core functionality, lots of settings
```

---

## CLICKS TO REACH COMPARISON

### Before vs After

| Feature                  | BEFORE        | AFTER          | Improvement |
|--------------------------|---------------|----------------|-------------|
| VS Code                  | 3 clicks      | 1 click        | 🟢 -2 clicks |
| Grafana                  | 1 click (hidden)| 1 click (promoted)| 🟢 Visible |
| Models Config            | 2 clicks      | 2 clicks       | ⚪ Same     |
| Retrieval Settings       | 2 clicks      | 2 clicks       | ⚪ Same     |
| Reranker Training        | 1 or 3 clicks | 2 clicks       | 🟡 Consolidated |
| Golden Questions         | 3 clicks      | 2 clicks       | 🟢 -1 click |
| Evaluation Runner        | 3 clicks      | 2 clicks       | 🟢 -1 click |
| Index Repository         | 1 click       | 2 clicks       | 🔴 +1 click |
| Budget Calculator        | 3 clicks      | 1 click        | 🟢 -2 clicks |
| Profile Save/Load        | 3 clicks      | 1 click        | 🟢 -2 clicks |
| MCP Control              | 3 clicks      | 1 click        | 🟢 -2 clicks |
| Docker Services          | 3 clicks      | 1 click        | 🟢 -2 clicks |
| Theme Settings           | 3 clicks      | 1 click        | 🟢 -2 clicks |
| Secrets Management       | 3 clicks      | 1 click        | 🟢 -2 clicks |

**Overall:** Most features become more accessible, with a few requiring one additional click to reach subtabs.

---

## FILE SIZE IMPACT

### Current State
```
gui/index.html: 5892 lines (monolithic)
```

### After Reorganization (same file)
```
gui/index.html: ~5900 lines (minimal change)

New divs: +15
Removed divs: -23
Net change: -8 divs
```

### Future State (if splitting to views/)
```
gui/index.html: ~500 lines (shell only)
gui/views/start.html: ~280 lines
gui/views/dashboard.html: ~270 lines
gui/views/chat.html: ~370 lines
gui/views/vscode.html: ~80 lines
gui/views/grafana.html: ~100 lines
gui/views/rag-data-quality.html: ~200 lines
gui/views/rag-retrieval.html: ~600 lines
gui/views/rag-external-rerankers.html: ~80 lines
gui/views/rag-learning-ranker.html: ~800 lines
gui/views/rag-indexing.html: ~200 lines
gui/views/rag-evaluate.html: ~180 lines
gui/views/profiles.html: ~200 lines
gui/views/infrastructure.html: ~600 lines
gui/views/admin.html: ~400 lines
```

---

## NAVIGATION FLOW

### Old Navigation Pattern
```
Click Main Tab → Click Subtab → Use Feature
     (1)            (2)            (3)

Example: Reranker Training
Dashboard → DevTools → Reranker → Mine/Train/Eval
   (1)        (2)        (3)          (4)
```

### New Navigation Pattern
```
Click Main Tab → [Click Subtab] → Use Feature
     (1)            (2-optional)      (3)

Example: Reranker Training
Dashboard → RAG → Learning Ranker → Mine/Train/Eval
   (1)      (2)       (3)               (4)

Example: VS Code (promoted)
Dashboard → VS Code → Use Editor
   (1)        (2)        (3)
```

**Key Difference:** Important features (VS Code, Grafana) are now top-level, reducing clicks.

---

## MOBILE IMPACT

### Mobile Drawer Before
```
┌─────────────────────────┐
│ 🚀 Get Started          │
│ 📊 Dashboard (active)   │
│ 💬 Chat                 │
│ ⚙️ Configuration        │  ← Hidden subtabs
│ 🗄️ Data & Indexing      │
│ 🛠️ Developer Tools      │  ← Hidden subtabs
│ 📈 Analytics            │  ← Hidden subtabs
│ ⚙️ Settings             │  ← Hidden subtabs
└─────────────────────────┘
8 items (many with hidden subtabs)
```

### Mobile Drawer After
```
┌─────────────────────────┐
│ 🚀 Get Started          │
│ 📊 Dashboard (active)   │
│ 💬 Chat                 │
│ 📝 VS Code              │  ← NEW (promoted)
│ 📈 Grafana              │  ← NEW (promoted)
│ 🧠 RAG                  │  ← NEW (mega-tab)
│ 💾 Profiles             │  ← NEW
│ 🔧 Infrastructure       │  ← NEW
│ ⚙️ Admin                │  ← NEW
└─────────────────────────┘
9 items (all top-level, subtabs in content)
```

**Impact:** More items in drawer, but clearer hierarchy. Subtabs appear after selecting main tab.

---

## BACKWARD COMPATIBILITY

### JavaScript Tab References
All old tab IDs will be aliased in window.Navigation:

```javascript
// Example: Old code still works
window.Tabs.switchTo('tab-devtools-editor');
// → Navigation resolves to 'tab-vscode'

// Old event still fires
CoreUtils.events.emit('tab-switched', {tab: 'tab-metrics'});
// → Navigation forwards to {tab: 'tab-grafana'}
```

### URL Hash Support
```
Old: #tab-devtools-editor
New: #tab-vscode (aliased)

Old: #tab-config-retrieval
New: #tab-rag-retrieval (aliased)
```

**Guarantee:** No bookmarks or deep links break during transition.

---

## SUMMARY STATS

### Tabs
- **Before:** 10 main tabs, ~30 subtabs
- **After:** 9 main tabs, 6 RAG subtabs
- **Reduction:** 1 main tab, but clearer organization

### Content Divs
- **Removed:** 23 old divs
- **Created:** 15 new divs
- **Net:** -8 divs (simplification)

### Clicks to Features
- **Improved:** 9 features (-1 to -2 clicks)
- **Same:** 3 features (0 change)
- **Worse:** 1 feature (+1 click: indexing)

### Risk Distribution
- **Low Risk:** 4 tabs (44%)
- **Medium Risk:** 4 tabs (44%)
- **High/Critical Risk:** 7 subtabs (RAG mega-tab)

---

**END OF VISUAL MAPPING**
