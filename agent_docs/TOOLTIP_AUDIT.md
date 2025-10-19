# AGRO GUI Tooltip Comprehensive Audit

## Status: IN PROGRESS
Last Updated: 2025-10-18

## Critical Fix Applied
✅ **Tooltip Hover/Click Issue FIXED** - Tooltips now stay visible when hovering over them to click links. Added 150ms delay and bubble hover listeners in `gui/js/tooltips.js`.

## Project Scope

### Goals
1. **Every setting** must have a verbose, helpful tooltip
2. **Every error message** must have helpful information + links
3. **Every tooltip** must include 2-3 precise external links (THE EXACT doc page, not just "docs")
4. **Links must be clickable** (FIXED)
5. **Complex settings** need especially comprehensive explanations

### Tabs & Subtabs Structure

#### Main Tabs
1. 🚀 Get Started
2. 📊 Dashboard (subtabs: Overview)
3. 💬 Chat (subtabs: Interface, Settings)
4. 📝 VS Code (subtabs: Editor, Settings)
5. 📈 Grafana (subtabs: Dashboard, Config)
6. 🧠 RAG (subtabs: Budget, Management, Overrides, Data Quality, Retrieval, External Rerankers, Learning Ranker, Indexing, Evaluate)
7. 💾 Profiles
8. 🔧 Infrastructure (subtabs: Services, MCP, Paths & Stores, Monitoring)
9. ⚙️ Admin (subtabs: General, Git, Secrets, Integrations)

## Tooltip System Architecture

### Auto-Generated Tooltips
- Defined in `gui/js/tooltips.js` via `buildTooltipMap()`
- Auto-attached to form fields by matching `name` attribute
- Template: `L(label, body, links, badges)`

### Manual Tooltips
- Hardcoded in `gui/index.html`
- Wrapped in `.tooltip-wrap` > `.help-icon` + `.tooltip-bubble`
- Use `.tt-title`, `.tt-links`, `.tt-badges` classes

## Current State Analysis

### ✅ Settings WITH Good Tooltips (tooltips.js)
- QDRANT_URL - Has Qdrant docs links
- REDIS_URL - Has Redis docs link
- REPO - Has MCP quickstart link
- COLLECTION_NAME - Has Qdrant docs link
- EMBEDDING_TYPE - Has multiple provider links
- RERANK_BACKEND - Has Cohere docs links
- MQ_REWRITES - Affects latency badge
- TOPK_DENSE, TOPK_SPARSE - Affects latency badge
- ~70+ settings in tooltips.js map

### ✅ Manual Tooltips in HTML (Confirmed)
- Multi-Query Rewrites (RAG > Retrieval)
- Final K (RAG > Retrieval)
- Use Semantic Synonyms (RAG > Retrieval)
- Top-K Dense (Qdrant) (RAG > Retrieval)
- Top-K Sparse (BM25) (RAG > Retrieval)
- Hydration Mode (RAG > Retrieval)
- Vendor Mode (RAG > Retrieval)
- RRF K Divisor (RAG > Retrieval)
- Card Bonus (RAG > Retrieval)
- Filename Boost Exact/Partial (RAG > Retrieval)
- Semantic Synonyms (RAG > Data Quality)
- Default Temperature (RAG > Retrieval)

### ⚠️ Areas Needing Attention

#### 1. Error Messages (Priority: CRITICAL)
Locations with error handling found:
- `gui/js/alerts.js` (13 error instances)
- `gui/js/chat.js` (10 error instances)
- `gui/js/eval_runner.js` (12 error instances)
- `gui/js/indexing.js` (10 error instances)
- `gui/js/docker.js` (15 error instances)
- `gui/js/reranker.js` (28 error instances - MOST)
- Many more across 27+ JS files

Current error patterns (need enhancement):
- "❌ Failed to load alert status"
- "❌ Save failed - check console"
- "Failed to load webhook config"
- Generic "Error loading..." messages

**Required Enhancement Pattern:**
```javascript
// BEFORE:
container.innerHTML = '❌ Failed to load alert status';

// AFTER:
container.innerHTML = `
  <div class="error-with-help">
    <div class="error-title">❌ Failed to load alert status</div>
    <div class="error-body">
      This usually happens when:
      • The backend server is not running
      • Prometheus/AlertManager is not configured
      • Network connectivity issues
    </div>
    <div class="error-links">
      <a href="/docs/MONITORING.md" target="_blank">📖 Monitoring Setup Guide</a>
      <a href="https://prometheus.io/docs/alerting/latest/alertmanager/" target="_blank">AlertManager Docs</a>
    </div>
  </div>
`;
```

#### 2. Missing Tooltips (Settings without coverage)

Need to audit each tab systematically to find:
- Button actions that aren't obvious
- Status indicators
- Toggles/checkboxes without labels
- Modal dialogs
- Collapsible sections
- Dynamic UI elements

#### 3. Tooltip Quality Issues

Many tooltips in `tooltips.js` need enhancement:
- **COLLECTION_SUFFIX** - No links (needs Qdrant collection docs)
- **REPO_PATH** - No links (needs indexing docs)
- **HYDRATION_MODE** - No links (needs performance tuning docs)
- **CONF_TOP1/AVG5/ANY** - No links (needs confidence scoring docs)
- **THREAD_ID** - Has CLI chat docs but needs LangGraph state docs
- **ENRICH_CODE_CHUNKS** - Only has local file link, needs external enrichment docs
- **SKIP_DENSE** - No links (needs hybrid search comparison docs)
- **AGRO_EDITION** - No links (needs feature matrix docs)

#### 4. Link Quality Issues

Current links that may not be "THE EXACT PAGE":
- `/docs/README.md` - Too generic
- `/files/README.md` - Too generic
- Local file links may not exist or be helpful

Need to replace with:
- **Specific external documentation pages**
- **Exact GitHub file/line references**
- **Precise API documentation URLs**

## Implementation Plan

### Phase 1: Error Message Enhancement (Week 1)
- [ ] Create error message component with help template
- [ ] Enhance all error messages in alerts.js
- [ ] Enhance all error messages in reranker.js (highest count)
- [ ] Enhance all error messages in docker.js
- [ ] Enhance all error messages in indexing.js
- [ ] Enhance all error messages in remaining JS files
- [ ] Test error message links

### Phase 2: Tooltip Quality Upgrade (Week 2)
- [ ] Review all 70+ tooltips in tooltips.js
- [ ] Add precise external links to each
- [ ] Enhance body text to be more verbose/helpful
- [ ] Add relevant badges (reindex, latency, cost, expert)
- [ ] Cross-reference with cross-encoder README
- [ ] Add links to specific provider docs

### Phase 3: Complete Coverage Audit (Week 3)
- [ ] Tab: Get Started - catalog all elements
- [ ] Tab: Dashboard - catalog all elements
- [ ] Tab: Chat (Interface, Settings) - catalog all elements
- [ ] Tab: VS Code (Editor, Settings) - catalog all elements
- [ ] Tab: Grafana (Dashboard, Config) - catalog all elements
- [ ] Tab: RAG (all 6 subtabs) - catalog all elements
- [ ] Tab: Profiles - catalog all elements
- [ ] Tab: Infrastructure (all 4 subtabs) - catalog all elements
- [ ] Tab: Admin (all 4 subtabs) - catalog all elements

### Phase 4: Special Elements (Week 4)
- [ ] Modal dialogs
- [ ] Collapsible sections
- [ ] Button actions (non-obvious ones)
- [ ] Status indicators
- [ ] Progress bars
- [ ] Dynamic/conditional UI elements

### Phase 5: Testing & Verification (Week 5)
- [ ] Create Playwright test suite for tooltips
- [ ] Test tooltip visibility
- [ ] Test link clickability
- [ ] Test hover behavior
- [ ] Verify all links are valid
- [ ] Test on mobile/tablet viewports
- [ ] Accessibility audit (screen reader compatibility)

## Link Reference Guide

### When to use what kind of link:

1. **Infrastructure/Databases**
   - Qdrant: `https://qdrant.tech/documentation/concepts/[specific-topic]/`
   - Redis: `https://redis.io/docs/[specific-feature]/`
   - Docker: `https://docs.docker.com/[specific-guide]/`

2. **AI/ML Providers**
   - OpenAI Models: `https://platform.openai.com/docs/models`
   - OpenAI API Keys: `https://platform.openai.com/docs/quickstart/step-2-set-up-your-api-key`
   - Cohere Rerank: `https://docs.cohere.com/reference/rerank`
   - Voyage AI: `https://docs.voyageai.com/docs/embeddings`
   - Anthropic: `https://docs.anthropic.com/en/api/[specific-feature]`
   - Google Gemini: `https://ai.google.dev/gemini-api/docs/[specific-feature]`

3. **RAG/Retrieval Concepts**
   - BM25: `https://github.com/xhluca/bm25s`
   - Sentence Transformers: `https://www.sbert.net/docs/[specific-feature]`
   - Cross Encoders: `https://www.sbert.net/docs/cross_encoder/usage/usage.html`
   - HuggingFace: `https://huggingface.co/docs/transformers/[specific-feature]`

4. **LangChain/LangGraph**
   - LangSmith: `https://docs.smith.langchain.com/`
   - LangGraph: `https://langchain-ai.github.io/langgraph/`

5. **Internal Documentation**
   - Use sparingly, only when external docs don't exist
   - Link to specific file, not just `/docs/`
   - Format: `/docs/SPECIFIC_GUIDE.md` or `/files/specific/path.py`

6. **GitHub/Source Code**
   - Link to specific file/line when helpful
   - Example: `https://github.com/user/repo/blob/main/path/file.py#L123`
   - Use for cross-encoder model: `/models/cross-encoder-agro.baseline/README.md`

## Quality Checklist

For each tooltip, verify:
- [ ] Label is clear and concise
- [ ] Body text is verbose (2-4 sentences minimum for complex settings)
- [ ] Explains WHAT it does, WHY it matters, and WHEN to change it
- [ ] Includes 2-3 precise external links (not generic)
- [ ] Links open in new tab (`target="_blank" rel="noopener"`)
- [ ] Badges indicate important properties (reindex, cost, latency, expert)
- [ ] No grammar/spelling errors
- [ ] Accessible (screen reader friendly)
- [ ] Links are verified and working

## Examples of GOOD vs BAD Tooltips

### ❌ BAD (Current - COLLECTION_SUFFIX)
```javascript
COLLECTION_SUFFIX: L('Collection Suffix', 'Optional string appended to the default collection name for side-by-side comparisons.')
```

### ✅ GOOD (Enhanced)
```javascript
COLLECTION_SUFFIX: L(
  'Collection Suffix',
  'Optional string appended to the default collection name (code_chunks_{REPO}) for A/B testing different indexing strategies. For example, suffix "_v2" creates "code_chunks_myrepo_v2". Useful when comparing embedding models, chunking strategies, or reranking approaches without overwriting your production index. Leave empty for default collection.',
  [
    ['Qdrant Collections', 'https://qdrant.tech/documentation/concepts/collections/'],
    ['Collection Management', 'https://qdrant.tech/documentation/concepts/collections/#create-collection'],
    ['A/B Testing Guide', '/docs/AB_TESTING_INDEXES.md']
  ],
  [['No re-index needed', 'info'], ['Experimental', 'warn']]
)
```

### ❌ BAD (Current - error in alerts.js line 81)
```javascript
container.innerHTML = '<p style="color: var(--err); font-size: 13px;">❌ Failed to load alert status</p>';
```

### ✅ GOOD (Enhanced)
```javascript
container.innerHTML = `
  <div style="padding: 16px; background: var(--bg-elev2); border-left: 3px solid var(--err); border-radius: 4px;">
    <div style="font-weight: 600; color: var(--err); margin-bottom: 8px;">
      ❌ Failed to load alert status
    </div>
    <div style="font-size: 12px; color: var(--fg); margin-bottom: 12px; line-height: 1.5;">
      This error typically occurs when:<br>
      • The backend server is not running (check <code>docker ps</code>)<br>
      • Prometheus/AlertManager is not configured or accessible<br>
      • The <code>/webhooks/alertmanager/status</code> endpoint is unavailable
    </div>
    <div style="font-size: 11px;">
      <strong>Quick fixes:</strong><br>
      1. Check server status in the Infrastructure tab<br>
      2. Verify AlertManager configuration in Monitoring subtab<br>
      3. Review logs for connection errors<br><br>
      <strong>Learn more:</strong><br>
      <a href="/docs/MONITORING.md" target="_blank" rel="noopener" style="color: var(--link); margin-right: 12px;">📖 Monitoring Setup Guide</a>
      <a href="https://prometheus.io/docs/alerting/latest/alertmanager/" target="_blank" rel="noopener" style="color: var(--link); margin-right: 12px;">AlertManager Docs</a>
      <a href="https://prometheus.io/docs/alerting/latest/configuration/#webhook_config" target="_blank" rel="noopener" style="color: var(--link);">Webhook Config</a>
    </div>
  </div>
`;
```

## Notes

- Cross-encoder model README at: `/models/cross-encoder-agro.baseline/README.md`
- User is dyslexic - tooltips are an accessibility requirement (ADA compliance)
- Do NOT add features user didn't ask for - tooltips are the ONLY task
- MUST verify with Playwright before completion
- Error messages should be HELPFUL enough that users might "ENJOY" them
