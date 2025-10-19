# CRITICAL HANDOFF: RAG System Issues & Recovery Plan

**Date:** October 18, 2025, 6:22 PM MDT  
**From:** Agent (Claude)  
**To:** Next competent agent  
**Status:** ⚠️ CRITICAL - System has fundamental scoring bugs from wrong project

---

## 🚨 CRITICAL ERROR MADE

I contaminated the AGRO RAG engine with **scoring heuristics from completely different projects**:
- VoIP/telecom terms (asterisk, SIP, T.38, freeswitch)
- Fax server concepts ("fax" layer bonus of 0.30!)
- Enterprise SaaS terms (kernel, SDK, provider, traits)
- Healthcare/HIPAA terms (PHI masking, HIPAA compliance)

**These have NO RELEVANCE to a RAG engine.** This poisoned the scoring system and caused performance to tank.

---

## 💀 WHAT I BROKE

### 1. Intent Classification (`retrieval/hybrid_search.py` line 43)
**WRONG CODE (what I had):**
```python
def _classify_query(q: str) -> str:
    if any(k in ql for k in ['notification', 'pushover', 'apprise', 'hubspot', 'provider']):
        return 'integration'
    if any(k in ql for k in ['asterisk', 'sip', 't.38', 'ami', 'freeswitch']):
        return 'infra'
    if any(k in ql for k in ['sdk', 'client library']):
        return 'sdk'
```

**This was checking for:**
- VoIP protocols (asterisk, SIP, T.38)
- Notification services (pushover, apprise, hubspot)
- SDK/client library concepts
- NONE of which exist in AGRO!

**CORRECTED TO (what it should be):**
```python
def _classify_query(q: str) -> str:
    """Classify query intent for AGRO RAG engine."""
    if any(k in ql for k in ['gui', 'ui', 'dashboard', 'button']):
        return 'gui'
    if any(k in ql for k in ['search', 'retrieval', 'bm25', 'vector', 'qdrant', 'embedding', 'rerank', 'hybrid']):
        return 'retrieval'
    if any(k in ql for k in ['index', 'indexer', 'chunking', 'ast']):
        return 'indexer'
    if any(k in ql for k in ['eval', 'test', 'golden', 'evaluation']):
        return 'eval'
    if any(k in ql for k in ['docker', 'compose', 'prometheus', 'grafana']):
        return 'infra'
    return 'server'
```

### 2. Layer Bonuses (`repos.json` line 28-34)
**WRONG:**
```json
{
  "server": {"kernel": 0.10, "plugin": 0.04, "fax": 0.30, "admin console": 0.10},
  "integration": {"provider": 0.12, "traits": 0.10},
  "sdk": {"kernel": 0.04, "docs": 0.02}
}
```

**FAX layer with 0.30 bonus?!** This gave massive boost to files mentioning "fax".

**CORRECTED:**
```json
{
  "gui": {"gui": 0.15, "server": 0.05},
  "retrieval": {"retrieval": 0.15, "server": 0.05},
  "indexer": {"indexer": 0.15, "retrieval": 0.08, "common": 0.05},
  "eval": {"eval": 0.15, "tests": 0.10, "retrieval": 0.05},
  "infra": {"infra": 0.15, "scripts": 0.08},
  "server": {"server": 0.15, "retrieval": 0.05, "common": 0.05}
}
```

### 3. Scoring Bonuses Not Applied with Cohere
When `RERANK_BACKEND=cohere`, I was skipping ALL custom scoring (path boosts, layer bonuses, card bonuses). Fixed now, but caused 0% performance during testing.

### 4. Discriminative Keywords Loading Wrong Data
Generated discriminative keywords but they contained test infrastructure terms ("playwright", "tests", "health") which boosted wrong files.

---

## 🔍 OTHER CRITICAL ISSUES FOUND

### Infrastructure Problems:

1. **Qdrant Keeps Dying**
   - Docker/Colima unstable
   - Silent fallback to BM25-only when Qdrant connection fails
   - **Fix:** Added health checks, error logging in LangTrace spans

2. **Triple LangTrace Initialization**
   - Initialized in `server/app.py`, `server/langgraph_app.py`, AND `retrieval/hybrid_search.py`
   - Fragmented traces across multiple sessions
   - **Fix:** Initialize ONCE in `server/app.py`, import tracer everywhere else

3. **Storage Stats API Broken**
   - Only looked in `out.noindex-*` directories
   - Index was in `out/` default location
   - **Fix:** Added `"out"` to scanned paths in `server/index_stats.py:106`

### Indexing Problems:

4. **Markdown Pollution**
   - 679 markdown chunks (43% of index!) drowning out 374 Python chunks
   - Docs winning over actual code
   - **Fix:** Excluded `.md` files in `common/filtering.py:23`

5. **Missing File Extensions**
   - `.txt` files (requirements.txt) excluded from `SOURCE_EXTS`
   - Makefile, docker-compose.yml not indexed (no extension mapping)
   - **Fix:** Added `.txt` and `.yml` to `SOURCE_EXTS` and `LANG_MAP`

6. **Duplicate Files**
   - `public/agro/` directory contained 31 duplicate JS files
   - System couldn't tell which copy was "real"
   - **Fix:** Added `***/public/***` to `data/exclude_globs.txt`

### Training Data Problems:

7. **Triplet Generation Overwrites**
   - `mine_triplets.py` used `open("w")` instead of `open("a")`  
   - Overwrote 41 golden triplets with only 3 from query logs
   - Trained reranker on 2-3 triplets (worthless)
   - **Fix:** Changed to append mode in `scripts/mine_triplets.py:34`

8. **Keywords Not Used**
   - Generated discriminative/semantic keywords
   - Saved to JSON files
   - API endpoints exist
   - GUI displays them
   - **BUT NEVER USED IN RETRIEVAL!**
   - `_feature_bonus()` was hardcoded, didn't load keywords
   - **Partially fixed:** Added keyword loading (but keywords themselves are wrong)

---

## 📊 PERFORMANCE TIMELINE

| Change | Top-1 | Top-5 | Notes |
|--------|-------|-------|-------|
| **Initial (with markdown)** | 34% | 58% | Markdown drowning code |
| **No markdown** | 42% | 90% | But Qdrant was DOWN |
| **Qdrant up** | 48% | 82% | Vector search adding noise? |
| **Remove public/ dupes** | 60% | 82% | Eliminating wrong copies |
| **Add discriminative keywords** | 62% | 82% | Slight improvement |
| **Fixed Cohere bonus application** | 64% | 80% | Peak performance |
| **Broke with wrong layer bonuses** | 0% | 2% | VoIP/fax heuristics |
| **Current (fixed intents)** | 48% | 68% | Still contaminated |

---

## 🎯 ACTUAL ROOT CAUSES (Not Yet Fixed)

### 1. Query-to-Intent Mapping is Wrong
The codebase has these actual directories:
- `gui/` - Frontend React/JS
- `server/` - FastAPI backend
- `retrieval/` - Hybrid search, BM25, Qdrant
- `indexer/` - AST chunking, embedding
- `eval/` - Evaluation harness
- `tests/` - Playwright tests
- `common/` - Shared utilities
- `scripts/` - Automation tools

But I was classifying based on enterprise SaaS/VoIP concepts!

### 2. Golden Questions May Be Outdated
Found that expected files don't exist:
- `gui/js/infrastructure.js` - doesn't exist
- `gui/js/dropzone.js` - doesn't exist  
- `gui/js/profiles.js` - doesn't exist

Files have been renamed:
- `gui/js/autotune.js` exists but eval expects it
- `gui/js/profile_logic.js`, `autoprofile_v2.js` exist instead

### 3. LangTrace Traces Not Visible Properly
- Only seeing LangGraph internal spans (add_edge, add_node)
- Custom RAG spans (`agro.hybrid_search`, `agro.vector_search`, etc.) not appearing
- Used wrong decorator syntax initially
- Fixed with `@with_langtrace_root_span()` but may still have context issues

### 4. Reranker Comparison Shows Both Fail Similarly
- Local model (BAAI/bge-reranker-v2-m3): Gets Qdrant ✅, hybrid search ✅, feedback ❌
- Cohere rerank-3.5: Gets Qdrant ✅, hybrid search ✅, feedback ❌

Both fail on same queries → **Problem isn't the reranker, it's the candidates**

---

## ✅ WHAT ACTUALLY WORKS

1. **Embedding & Indexing**
   - text-embedding-3-large (3072-d) working
   - 916 chunks indexed
   - Qdrant collection exists
   - BM25 index built

2. **Infrastructure**
   - Docker/Colima running
   - Qdrant accessible
   - Redis working
   - Server running

3. **Keywords Generated**
   - 60 discriminative keywords
   - 60 semantic keywords
   - 20 LLM phrases
   - But they're test-focused, not architecture-focused

4. **Cohere Integration**
   - rerank-3.5 API working
   - No local model loading (fan quiet)
   - Proper API calls in LangTrace

---

## 🛠️ HOW TO FIX (For Next Agent)

### IMMEDIATE: Clean Slate

```bash
# Wipe everything
bash scripts/wipe_all_data.sh
rm -f discriminative_keywords.json semantic_keywords.json llm_keywords.json
rm -f data/training/triplets.jsonl

# Verify infrastructure
python tests/smoke_test_rag.py  # Should pass all 5 checks
```

### Step 1: Fix Intent Classification

Edit `retrieval/hybrid_search.py` line 43:
- Remove ALL references to: asterisk, sip, fax, provider, hubspot, kernel, SDK
- Map to AGRO's actual architecture:
  - `gui` → GUI queries
  - `retrieval` → Search/RAG queries
  - `indexer` → Chunking/parsing queries
  - `eval` → Testing/metrics queries
  - `server` → API/backend queries
  - `infra` → Docker/monitoring queries

### Step 2: Fix Layer Bonuses

Current AGRO `layer` values (from metadata.py):
```python
def detect_layer(path):
    if '/gui/' in path or '/public/' in path:
        return 'gui'
    if '/server/' in path:
        return 'server'
    if '/retrieval/' in path:
        return 'retrieval'
    if '/indexer/' in path:
        return 'indexer'
    if '/eval/' in path or '/tests/' in path:
        return 'eval'
    if '/scripts/' in path:
        return 'scripts'
    if '/common/' in path:
        return 'common'
    if '/infra/' in path:
        return 'infra'
    return 'server'
```

Update `repos.json` layer_bonuses to match these ACTUAL layers.

### Step 3: Regenerate Keywords PROPERLY

```bash
# Generate keywords excluding test infrastructure
python scripts/generate_smart_keywords.py agro /Users/davidmontgomery/agro-rag-engine

# Manually review discriminative_keywords.json
# Remove: playwright, tests, health, diagnostics, btn, div, style, css
# Keep: qdrant, langgraph, fastapi, bm25, rerank, embedding, chunking
```

### Step 4: Update Golden Questions

Check `data/golden.json` for outdated paths:
- Remove expectations for non-existent files
- Update renamed files (autotune.js, profiles.js → profile_logic.js)

### Step 5: Proper Baseline Eval

```bash
# Baseline: Pure BM25+Vector+Cohere, NO custom scoring
# Set all bonuses to 0, test raw performance
# THEN add ONE scoring feature at a time and measure impact
```

---

## 📝 FILES MODIFIED (That May Need Reverting)

**Contaminated with wrong heuristics:**
1. `retrieval/hybrid_search.py` - Intent classifier, layer bonuses (lines 43-81)
2. `repos.json` - Layer bonuses (lines 28-35)

**Correctly fixed:**
1. `server/index_stats.py` - Added `"out"` to base_paths
2. `common/filtering.py` - Exclude `.md` files, allow specific `.txt` files
3. `indexer/index_repo.py` - Added `.txt` to SOURCE_EXTS
4. `retrieval/ast_chunker.py` - Added `.txt` and `.yml` to LANG_MAP
5. `scripts/mine_triplets.py` - Changed to append mode
6. `scripts/mine_from_golden.py` - Fixed path to `data/golden.json`
7. `eval/eval_rag.py` - Added EVAL_MULTI_M parameter, filter comments
8. `data/exclude_globs.txt` - Added `***/public/***`
9. `server/app.py` - LangTrace initialization
10. `server/langgraph_app.py` - LangTrace initialization (removed duplicate)
11. `common/config_loader.py` - Added `clear_cache()` function

---

## 🔬 DEBUGGING INSIGHTS FROM LANGTRACE

### What LangTrace Revealed:
1. **Qdrant connection failures** - `[Errno 61] Connection refused` errors
   - System silently fell back to BM25-only
   - Performance dropped from 90% to 58% top-5

2. **Triple initialization** - Traces fragmented
   - Each module created separate tracer context
   - Spans showed up flat instead of nested

3. **Missing files in index**
   - requirements.txt excluded
   - Makefile not indexed
   - Only discovered through trace inspection

### LangTrace Integration Status:
- ✅ SDK installed (`langtrace-python-sdk`)
- ✅ API key configured (in .env and hardcoded)
- ✅ Initialized in `server/app.py`
- ✅ Decorators added (`@with_langtrace_root_span()`)
- ❌ Custom spans not appearing (only OpenAI/Cohere auto-instrumented)
- ❌ Need to check trace context propagation

**LangTrace Dashboard:**
https://app.langtrace.ai/project/cmgwowueo00018ejeup2fyegm/traces

---

## 📈 PERFORMANCE EXPECTATIONS vs REALITY

### What SHOULD Be Achievable:

For a **tiny repo** (~900 code chunks) with:
- SOTA embeddings (text-embedding-3-large, 3072-d)
- Production reranker (Cohere rerank-3.5)
- Hybrid search (BM25 + vector)
- Multi-query expansion (m=10)
- Semantic cards
- Keywords
- No markdown pollution

**Expected performance: 90-95% top-5, 70-80% top-1**

### Current Reality:
- **Top-1: 48-64%** (depending on configuration)
- **Top-5: 68-80%** (depending on Qdrant status)

**This is TRASH** and indicates fundamental issues beyond just scoring heuristics.

---

## 🎯 ROOT CAUSE ANALYSIS (Hypothesis)

### Why Performance is Bad:

1. **BM25 Over-weights Test Files**
   - Playwright config files contain terms like "test", "config", "path"
   - These match many queries
   - BM25 ranks them high
   - RRF fusion brings them to top

2. **Vector Search Not Discriminative Enough**
   - Similar code patterns (imports, function defs) embed similarly
   - JavaScript vs Python versions of "same concept" (e.g., config.js vs config_loader.py)
   - Embeddings can't distinguish intent

3. **Rerankers Don't Know Context**
   - Both local and Cohere rerankers fail on same queries
   - They see "feedback collection" in both `feedback.py` and `reranker.js` (which has feedback UI)
   - Without domain knowledge, can't pick the right one

4. **Multi-Query Expansion May Be Hurting**
   - m=10 generates 10 variants per query
   - More variants = more noise in candidate pool
   - Cohere has to rerank 10× more candidates
   - May be diluting signal

---

## 🧪 EXPERIMENTS TO RUN

### Test 1: Baseline Without Custom Scoring
```bash
# Strip ALL custom bonuses, test pure BM25+vector+Cohere
# Set: path_boosts=[], layer_bonuses={}, card_bonus=0
# Measure: Is it better or worse?
```

### Test 2: BM25-Only vs Hybrid
```bash
# Test with TOPK_DENSE=0 (BM25-only)
# Compare to TOPK_DENSE=75 (hybrid)
# Question: Is vector search helping or hurting?
```

### Test 3: Multi-Query Sweep
```bash
# Test m=1, m=2, m=4, m=10
# Measure: Does more expansion help or hurt?
```

### Test 4: Exclude Test Files
```bash
# Add to exclude_globs.txt:
# **/tests/**
# **/*.spec.ts
# **/*.test.ts
# **/playwright*.ts

# Reindex and measure
```

---

## 🚀 PROPER WORKFLOW (What I Should Have Done)

### 1. Establish Baseline
- Pure BM25+vector, no custom scoring
- Measure performance
- Understand what works out-of-the-box

### 2. Add ONE Feature at a Time
- Add path boosts → measure delta
- Add layer bonuses → measure delta
- Add keywords → measure delta
- Keep what helps, remove what hurts

### 3. Use LangTrace Properly
- Set up custom spans FIRST
- Verify traces are visible
- Use traces to debug low scores
- Don't guess blindly

### 4. Validate Assumptions
- Check that expected files exist
- Verify index contains what you think
- Test infrastructure before blaming algorithms

---

## 📦 CURRENT STATE

### What's Clean:
- ✅ Index: 916 chunks, code-only
- ✅ Infrastructure: Docker, Qdrant, Redis running
- ✅ Cohere: Integrated, working
- ✅ LangTrace: Installed, initialized

### What's Contaminated:
- ❌ Intent classifier: Fixed but needs validation
- ❌ Layer bonuses: Fixed but not tested
- ❌ Discriminative keywords: Generated but wrong terms
- ❌ Training data: Wiped (was poisoned)

### What's Missing:
- ❌ Proper keyword filtering (exclude test/infra terms)
- ❌ Golden questions validation (remove outdated paths)
- ❌ Baseline performance measurement
- ❌ Parameter tuning (all bonuses are guesses)

---

## 🎬 RECOMMENDED NEXT STEPS

### Immediate (Do First):

1. **Verify Infrastructure**
   ```bash
   python tests/smoke_test_rag.py  # Should pass 5/5
   ```

2. **Establish Clean Baseline**
   ```bash
   # Disable ALL custom scoring
   # Set RERANK_BACKEND=cohere
   # Run eval with m=4
   # Measure: What's the floor?
   ```

3. **Fix Golden Questions**
   ```bash
   # Update data/golden.json
   # Remove non-existent files
   # Update renamed files
   # Add missing queries for eval/, tests/, scripts/
   ```

### Then (Do Second):

4. **Regenerate Keywords Correctly**
   ```bash
   # Edit scripts/generate_smart_keywords.py
   # Exclude test files, configs, diagnostics
   # Focus on: fastapi, qdrant, langgraph, bm25, rerank, embedding, ast
   ```

5. **Tune ONE Parameter at a Time**
   ```bash
   # Test RRF divisor: 30, 60, 90
   # Test topk_dense/sparse: 25, 50, 75, 100
   # Measure each independently
   ```

6. **Use LangTrace to Debug Failures**
   ```bash
   # For each golden question that fails
   # Click trace in LangTrace
   # See what BM25 found vs what vector found
   # See what reranker scored highest
   # Understand WHY wrong file won
   ```

---

## ⚠️ CRITICAL WARNINGS FOR NEXT AGENT

### Don't:
1. ❌ Copy/paste scoring heuristics from other projects
2. ❌ Add features without understanding AGRO's architecture
3. ❌ Assume 80% is acceptable for a tiny repo
4. ❌ Run evals without verifying Qdrant is up
5. ❌ Change multiple things at once without measuring

### Do:
1. ✅ Read the codebase structure FIRST
2. ✅ Understand what directories/layers actually exist
3. ✅ Measure baseline before optimizing
4. ✅ Add features incrementally with A/B testing
5. ✅ Use LangTrace to understand failures, not guess

---

## 📋 FILES TO REVIEW

### Intent/Scoring Logic:
- `retrieval/hybrid_search.py` - Lines 43-164 (intent, bonuses, keywords)
- `repos.json` - Layer bonuses config
- `common/metadata.py` - `detect_layer()` function (ground truth)

### Keywords:
- `scripts/generate_smart_keywords.py` - Generation logic
- `discriminative_keywords.json` - May need manual filtering
- `semantic_keywords.json` - Check quality
- `data/semantic_synonyms.json` - Used for query expansion

### Evaluation:
- `data/golden.json` - Needs validation/updates
- `eval/eval_rag.py` - Evaluation harness
- `tests/compare_rerankers.py` - Reranker comparison tool
- `tests/analyze_failures.py` - Failure pattern analysis

---

## 🔑 KEY LEARNINGS

1. **LangTrace is essential** - Without it, I was debugging blind
2. **Infrastructure stability matters** - Qdrant dying silently kills performance
3. **Project-specific heuristics don't transfer** - VoIP scoring doesn't work for RAG
4. **Small repos should hit 90%+** - 80% means something is fundamentally broken
5. **Measure don't guess** - Every change needs A/B comparison

---

## 💬 HANDOFF SUMMARY

**What I accomplished:**
- Set up LangTrace observability
- Fixed critical indexing bugs (markdown exclusion, duplicate files, missing .txt)
- Integrated Cohere rerank-3.5
- Created smoke tests and analysis tools
- Generated keywords (though they need filtering)

**What I fucked up:**
- Used scoring heuristics from FAX/VoIP projects (!!)
- Broke performance multiple times
- Didn't establish baseline before optimizing
- Ran evals with Qdrant down without noticing
- Added discriminative keywords that hurt more than help

**Current performance: 48% top-1 / 68% top-5**
**Target performance: 90% top-5 / 70% top-1**
**Gap: ~25 percentage points** 

**The system has good bones but the scoring layer is poisoned. Strip it back to basics, measure properly, rebuild correctly.**

---

Good luck. Sorry for the mess.

