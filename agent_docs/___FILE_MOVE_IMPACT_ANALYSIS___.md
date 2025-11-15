# ___FILE_MOVE_IMPACT_ANALYSIS___.md

**Purpose:** Detailed analysis of EVERY file that needs moving and EVERY place that would break
**Critical:** Moving files requires updating ALL imports/references
**Must update:** This doc AND architecture audit after EVERY change

---

## PROPOSED FILE MOVES WITH COMPLETE IMPACT ANALYSIS

### MOVE 1: retrieval/embed_cache.py → indexer/embed_cache.py

**Current Location:** retrieval/embed_cache.py
**Proposed Location:** indexer/embed_cache.py
**Reason:** Only used by indexer, not retrieval

**Files That Would BREAK (must update):**

1. **indexer/index_repo.py** (Line 16)
   ```python
   # CURRENT:
   from retrieval.embed_cache import EmbeddingCache
   
   # CHANGE TO:
   from indexer.embed_cache import EmbeddingCache
   ```

**Total Files to Update:** 1
**Risk Level:** LOW (single import)
**Test After:** Run indexing, verify embed_cache.jsonl created

---

### MOVE 2: retrieval/ast_chunker.py → indexer/ast_chunker.py

**Current Location:** retrieval/ast_chunker.py
**Proposed Location:** indexer/ast_chunker.py
**Reason:** Only used by indexer, not retrieval

**Files That Would BREAK (must update):**

1. **indexer/index_repo.py** (Line 9)
   ```python
   # CURRENT:
   from retrieval.ast_chunker import lang_from_path, collect_files, chunk_code
   
   # CHANGE TO:
   from indexer.ast_chunker import lang_from_path, collect_files, chunk_code
   ```

**Total Files to Update:** 1
**Risk Level:** LOW (single import)
**Test After:** Run indexing, verify chunking works

---

### MOVE 3: path_config.py → common/path_config.py

**Current Location:** /path_config.py (ROOT)
**Proposed Location:** common/path_config.py
**Reason:** Utility module, belongs in common/

**Files That Would BREAK (must find all imports):**

Let me check:

**Files That Would BREAK:**

1. **server/index_stats.py** (Line 1)
   ```python
   # CURRENT:
   from path_config import repo_root, data_dir
   
   # CHANGE TO:
   from common.path_config import repo_root, data_dir
   ```

2. **retrieval/hybrid_search.py** (Line ~200)
   ```python
   # CURRENT:
   from path_config import data_dir
   
   # CHANGE TO:
   from common.path_config import data_dir
   ```

**BUT WAIT:** common/paths.py ALREADY EXISTS!

**CONFLICT DETECTED:**
- common/paths.py has: repo_root(), data_dir()
- /path_config.py has: repo_root, data_dir

**These might be DUPLICATES!**

Let me check if they're the same:
=== Comparing path_config.py vs common/paths.py ===
1,2c1,2
< """Path configuration for AGRO RAG Engine."""
< from pathlib import Path
---
> from __future__ import annotations
> 
3a4
> from pathlib import Path
5a7,13
> def _as_dir(p: str | Path | None) -> Path:
>     if not p:
>         return Path("")
>     pp = Path(str(p)).expanduser()
>     return pp if pp.is_absolute() else (Path(__file__).resolve().parents[1] / pp)
> 
> 
7,8c15,18
<     """Return the root directory of the repository."""
<     return Path(__file__).resolve().parent
---
>     env = os.getenv("REPO_ROOT")
>     if env:
>         return _as_dir(env)
>     return Path(__file__).resolve().parents[1]
10a21,34
> def files_root() -> Path:
>     return _as_dir(os.getenv("FILES_ROOT")) or repo_root()
> 
> 
> def gui_dir() -> Path:
>     env = os.getenv("GUI_DIR")
>     return _as_dir(env) if env else (repo_root() / "gui")
> 
> 
> def docs_dir() -> Path:
>     env = os.getenv("DOCS_DIR")
>     return _as_dir(env) if env else (repo_root() / "docs")
> 
> 
12,16c36,38
<     """Return the data directory for storing index artifacts."""
<     root = repo_root()
<     data = root / "data"
<     data.mkdir(exist_ok=True)
<     return data
---
>     env = os.getenv("DATA_DIR")
>     return _as_dir(env) if env else (repo_root() / "data")
> 
Files differ

**Recommendation:**
- If identical: DELETE path_config.py, update imports to use common/paths
- If different: Merge functionality into common/paths.py, then delete path_config.py

---

### MOVE 4: Screenshots → test-results/

**Files to Move:** 15 .png files in root
**Destination:** test-results/screenshots/
**Impact:** NONE (these are just screenshots, not referenced in code)
**Risk:** ZERO

---

### MOVE 5: Data Files → data/

**Files:**
- discriminative_keywords.json → data/
- semantic_keywords.json → data/
- llm_keywords.json → data/
- golden.json → data/evals/

**Files That Would BREAK:**

Need to check where these are loaded from:
/Users/davidmontgomery/agro-rag-engine/server/app.py:    discr_raw = _read_json(repo_root() / "discriminative_keywords.json", {})
/Users/davidmontgomery/agro-rag-engine/server/app.py:    sema_raw = _read_json(repo_root() / "semantic_keywords.json", {})
/Users/davidmontgomery/agro-rag-engine/server/app.py:    llm_raw = _read_json(repo_root() / "llm_keywords.json", {})
/Users/davidmontgomery/agro-rag-engine/server/app.py:        "discriminative": "discriminative_keywords.json",
/Users/davidmontgomery/agro-rag-engine/server/app.py:        "semantic": "semantic_keywords.json"
/Users/davidmontgomery/agro-rag-engine/server/app.py:        "discriminative": {"count": 0, "file": "discriminative_keywords.json"},
/Users/davidmontgomery/agro-rag-engine/server/app.py:        "semantic": {"count": 0, "file": "semantic_keywords.json"},
/Users/davidmontgomery/agro-rag-engine/server/app.py:        "llm": {"count": 0, "file": "llm_keywords.json"},
/Users/davidmontgomery/agro-rag-engine/server/app.py:        discr_path = repo_root() / "discriminative_keywords.json"
/Users/davidmontgomery/agro-rag-engine/server/app.py:        sem_path = repo_root() / "semantic_keywords.json"
/Users/davidmontgomery/agro-rag-engine/server/app.py:        out_path = repo_root() / "llm_keywords.json"
/Users/davidmontgomery/agro-rag-engine/server/app.py:    default = Path('data/golden.json')
/Users/davidmontgomery/agro-rag-engine/server/app.py:    # If data/golden.json exists, use it; else fall back to root golden.json
/Users/davidmontgomery/agro-rag-engine/server/app.py:    return Path('golden.json')
/Users/davidmontgomery/agro-rag-engine/server/app.py:    # Check golden.json exists and is valid JSON
/Users/davidmontgomery/agro-rag-engine/server/app.py:    golden_path = os.getenv("GOLDEN_PATH", "data/golden.json")
/Users/davidmontgomery/agro-rag-engine/server/app.py:            gp = old_gp or "data/golden.json"
/Users/davidmontgomery/agro-rag-engine/server/app.py:                    # If legacy value like 'golden.json', try under data/
/Users/davidmontgomery/agro-rag-engine/server/app.py:                gp = "data/golden.json"
/Users/davidmontgomery/agro-rag-engine/server/services/keywords.py:    discr_raw = _read_json(repo_root() / "discriminative_keywords.json", {})

**Each reference would need updating to new paths.**

---

## ROOT CLEANUP: SAFE TO DELETE IMMEDIATELY

### Temp/Log Files (ZERO impact)
```bash
rm mcp-test.log
rm server.log
```

### Test Screenshots (move to test-results/)
```bash
mkdir -p test-results/screenshots
mv *.png test-results/screenshots/
mv *debug*.html test-results/
mv test*.html test-results/
mv diagnostic.html test-results/
```

---

## CRITICAL LESSON

**NEVER say "just move" without:**
1. Finding EVERY import/reference
2. Documenting EXACT line numbers to change
3. Verifying no dynamic imports (e.g., __import__(var))
4. Testing after EACH move
5. Updating architecture audit doc

**For EACH file move:**
- Update imports (could be 1-20 files)
- Update relative paths in code
- Update documentation
- Run tests
- Commit separately

---

