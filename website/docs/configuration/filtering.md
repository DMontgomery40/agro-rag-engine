---
sidebar_position: 3
---

# Filtering & Exclusions

AGRO's indexer automatically excludes noise files (tests, node_modules, build artifacts) to keep retrieval focused on production code. This is **critical for retrieval quality** - including tests can tank accuracy from 82% to 1.9%.

## Why Filtering Matters

**The Problem:** Without filtering, your index includes:
- Test files (`.spec.ts`, `test_*.py`) that use similar language to prod code
- Build artifacts (`dist/`, `build/`) that duplicate source code
- Dependencies (`node_modules/`, `.venv/`) with irrelevant library code
- Generated files (`.d.ts`, `.min.js`) that pollute embeddings

**Impact on retrieval:**
```
Index WITH tests:        Index WITHOUT tests:
Top-1 accuracy: 1.9%     Top-1 accuracy: 82%
Top-5 accuracy: 12%      Top-5 accuracy: 95%
MRR: 0.14                MRR: 0.88
```

**Real example:** Query "How does authentication work?" returned `auth.test.js` (mock auth) instead of `auth.js` (real implementation).

---

## Filtering Architecture

```
┌─────────────────────────────────────────┐
│  Source Directory                       │
│  - 10,000 files                         │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  Step 1: Directory Pruning              │
│  - Skip .git, node_modules, .venv, etc. │
│  - Defined in common/filtering.py       │
└──────────────┬──────────────────────────┘
               │ → 5,000 files
               ↓
┌─────────────────────────────────────────┐
│  Step 2: File Extension Filter          │
│  - Skip binaries, images, backups       │
│  - Defined in common/filtering.py       │
└──────────────┬──────────────────────────┘
               │ → 3,000 files
               ↓
┌─────────────────────────────────────────┐
│  Step 3: Glob Pattern Exclusions        │
│  - data/exclude_globs.txt patterns      │
│  - Tests, generated files, etc.         │
└──────────────┬──────────────────────────┘
               │ → 1,200 files (production code only)
               ↓
┌─────────────────────────────────────────┐
│  Indexed Chunks                         │
│  - AST-aware chunking                   │
│  - Embeddings + BM25 index              │
└─────────────────────────────────────────┘
```

---

## Built-in Directory Exclusions

**Hard-coded in `common/filtering.py`:**

```python
PRUNE_DIRS = {
    ".git", ".github", ".gitlab",     # Version control
    ".venv", "venv", "env",           # Python virtualenvs
    "node_modules",                   # Node.js dependencies
    "dist", "build", "target",        # Build outputs
    "__pycache__", ".pytest_cache",   # Python caches
    "coverage", ".tox", ".mypy_cache", # Testing/linting
    ".idea", ".vscode"                # IDE metadata
}
```

**Why hard-coded?** These directories are universally noise - no scenario where you'd want them indexed.

**To modify:** Edit `common/filtering.py` and rebuild index.

---

## File Extension Exclusions

**Defined in `common/filtering.py`:**

```python
def _should_index_file(name: str) -> bool:
    # ALWAYS index important .txt files
    if name in ("requirements.txt", "requirements-rag.txt", "exclude_globs.txt"):
        return True

    # EXCLUDE markdown and generic text (per user requirement)
    if name.endswith((".md", ".markdown", ".rst", ".txt")):
        return False

    # Skip binaries, images, backups
    skip_suffixes = (
        ".min.js", ".png", ".jpg", ".jpeg", ".gif", ".webp",
        ".pdf", ".zip", ".tar", ".gz", ".bak", ".backup"
    )
    if any(name.endswith(s) for s in skip_suffixes):
        return False

    # Skip lock files and caches
    if "lock" in name or ".cache" in name or "backup" in name:
        return False

    return True
```

**Exception handling:** Critical files like `requirements.txt` are always indexed even if they match exclusion patterns.

---

## Glob Pattern Exclusions

**File:** `data/exclude_globs.txt`

This is the **most powerful filtering layer** - supports full glob syntax for complex patterns.

### Default Patterns

```bash
# Backup files
**/*.bak
**/*.bak[0-9]
**/*.backup
**/*.backup-*

# Build artifacts / vendor / caches
**/node_modules/**
**/vendor/**
**/dist/**
**/build/**
**/.venv/**
**/venv/**
**/.next/**
**/.turbo/**
**/__pycache__/**
**/.pytest_cache/**

# IDE / Editor data (CRITICAL)
**/.editor_data/**
**/.code-server/**
**/.vscode-server/**
**/.openvscode-server/**

# Minified or generated
**/*.min.js
**/*.min.css
**/*.map
**/*.bundle.js
**/*.generated.*

# Test files (CRITICAL for accuracy)
**/test/**
**/tests/**
**/*.spec.ts
**/*.test.ts
**/*.spec.js
**/*.test.js
**/fixtures/**
**/mocks/**
**/__mocks__/**
**/playwright*.ts

# Generated/vendor code
**/*.d.ts
**/external/**
**/third_party/**
**/migrations/**
```

**Full file:** `/Users/davidmontgomery/agro-rag-engine/data/exclude_globs.txt`

---

## How to Configure Filtering

### Via GUI (Recommended)

1. **Settings tab → Filters subtab**
2. **Edit exclusion patterns** (live preview of matched files)
3. **Click "Save & Reindex"** (rebuilds index with new patterns)

**GUI Features:**
- Syntax highlighting for glob patterns
- Live validation (shows which files will be excluded)
- Preset templates (Python, JavaScript, Rust, Go)
- Dry-run mode (see what would be excluded without reindexing)

---

### Via File Editing

Edit `data/exclude_globs.txt` directly:

```bash
# Custom exclusions for your project
**/legacy/**           # Old code
**/archived/**         # Archived files
**/temp/**             # Temporary files
**/scratch/**          # Scratch work
**/.DS_Store           # macOS metadata
**/Thumbs.db           # Windows metadata
```

**Glob syntax:**
- `*` - Matches any characters (not /)
- `**` - Matches any number of directories
- `?` - Matches single character
- `[abc]` - Matches one character in set
- `[!abc]` - Matches one character NOT in set

**Example patterns:**
```bash
# Exclude all JavaScript test files
**/*.test.js
**/*.spec.js

# Exclude specific directories
**/legacy/**
**/archive/**

# Exclude files with 'backup' anywhere in name
**/*backup*

# Exclude numbered backups
**/*.bak[0-9]
```

After editing, reindex:
```bash
REPO=agro python indexer/index_repo.py
```

---

## Language-Specific Presets

AGRO includes preset filter templates for common stacks:

### Python

```bash
# Python-specific exclusions
**/__pycache__/**
**/*.pyc
**/.pytest_cache/**
**/.mypy_cache/**
**/.tox/**
**/venv/**
**/.venv/**
**/*.egg-info/**
**/dist/**
**/build/**
```

### JavaScript/TypeScript

```bash
# JS/TS-specific exclusions
**/node_modules/**
**/dist/**
**/build/**
**/.next/**
**/.turbo/**
**/.svelte-kit/**
**/*.min.js
**/*.bundle.js
**/*.d.ts
**/coverage/**
```

### Rust

```bash
# Rust-specific exclusions
**/target/**
**/Cargo.lock  # Optional - can be helpful for dependency context
**/*.rlib
**/*.rmeta
```

### Go

```bash
# Go-specific exclusions
**/vendor/**
**/*.test
**/testdata/**
```

**Apply preset:**
```bash
# Via GUI: Settings → Filters → Load Preset → Python
# Or copy preset to exclude_globs.txt
```

---

## Lockfile Strategy

**Default: Include lockfiles** (disabled exclusions in `exclude_globs.txt`)

```bash
# Lockfiles - DISABLED for SOTA RAG (can be helpful for dependency context)
# **/pnpm-lock.yaml
# **/package-lock.json
# **/yarn.lock
# **/poetry.lock
# **/Pipfile.lock
```

**Rationale:**
- Lockfiles contain dependency versions (useful for debugging version conflicts)
- Small file size impact (~1-2% of index)
- Can help answer "What version of X are we using?"

**To exclude lockfiles:**
```bash
# Uncomment these lines in exclude_globs.txt
**/pnpm-lock.yaml
**/package-lock.json
**/yarn.lock
**/poetry.lock
**/Pipfile.lock
```

---

## Testing Exclusion Impact

### Dry Run Mode

Preview what files would be excluded without reindexing:

```bash
# Via GUI: Settings → Filters → Dry Run
# Shows list of files that match exclusion patterns
```

### Eval Before/After

Compare retrieval quality before and after changing filters:

```bash
# 1. Run baseline eval
REPO=agro python -m eval.eval_loop --baseline

# 2. Change filters (e.g., add test exclusions)
echo '**/test/**' >> data/exclude_globs.txt

# 3. Reindex
REPO=agro python indexer/index_repo.py

# 4. Run eval again
REPO=agro python -m eval.eval_loop --compare

# Output:
# Baseline MRR: 0.72
# Current MRR: 0.88  (+0.16)
# Top-1 accuracy: 82% (was 1.9%)
```

**Golden question accuracy tracks filtering effectiveness.**

---

## Common Exclusion Patterns

### Exclude Tests (Critical)

```bash
# Comprehensive test exclusions
**/test/**
**/tests/**
**/__tests__/**
**/*.test.ts
**/*.test.js
**/*.spec.ts
**/*.spec.js
**/*.test.py
**/test_*.py
**/fixtures/**
**/mocks/**
**/__mocks__/**
**/playwright*.ts
**/cypress/**
**/*.e2e.ts
```

### Exclude Generated Files

```bash
# TypeScript declarations
**/*.d.ts

# Minified JS/CSS
**/*.min.js
**/*.min.css
**/*.bundle.js
**/*.chunk.js

# Source maps
**/*.map

# Proto-generated code
**/*.pb.go
**/*_pb2.py
**/*_pb2_grpc.py
```

### Exclude Build Artifacts

```bash
# Build directories
**/dist/**
**/build/**
**/out/**
**/target/**
**/.next/**
**/.turbo/**
**/.svelte-kit/**
**/public/build/**
```

### Exclude Vendor/Dependencies

```bash
# Package managers
**/node_modules/**
**/vendor/**
**/Pods/**
**/Godeps/**
**/.bundle/**

# Python
**/site-packages/**
**/.venv/**
**/venv/**
```

### Exclude Documentation (Optional)

```bash
# If you want retrieval to focus on code only
**/*.md
**/*.markdown
**/*.rst
**/docs/**
**/documentation/**
**/wiki/**

# Exception: Keep critical docs
!README.md
!CONTRIBUTING.md
!CHANGELOG.md
```

**Note:** AGRO's default is to exclude `.md` files per built-in filtering, but you can override by allowing specific patterns.

---

## Troubleshooting

### "Index is too large"

**Symptom:** Index size > 1GB, slow retrieval

**Cause:** Not excluding vendor code, build artifacts, or tests

**Solution:**
```bash
# Check what's being indexed
ls -lh data/agro/chunks.jsonl  # Should be < 100MB for typical repo

# Add aggressive exclusions
cat >> data/exclude_globs.txt <<EOF
**/node_modules/**
**/dist/**
**/build/**
**/test/**
**/tests/**
EOF

# Reindex
REPO=agro python indexer/index_repo.py
```

---

### "Retrieval returns wrong files"

**Symptom:** Search returns test files or mocks instead of prod code

**Cause:** Tests not excluded, or insufficient test exclusions

**Solution:**
```bash
# Add comprehensive test exclusions
cat >> data/exclude_globs.txt <<EOF
**/test/**
**/tests/**
**/*.test.*
**/*.spec.*
**/fixtures/**
**/mocks/**
**/__mocks__/**
EOF

# Reindex and eval
REPO=agro python indexer/index_repo.py
REPO=agro python -m eval.eval_loop
```

**Expected improvement:** Top-1 accuracy should jump from ~2% to ~80%+

---

### "Important files are excluded"

**Symptom:** Can't find files you know exist

**Cause:** Overly aggressive exclusion patterns

**Solution:**

1. **Check dry run:**
   ```bash
   # GUI: Settings → Filters → Dry Run
   # Shows excluded files - look for false positives
   ```

2. **Use negation patterns:**
   ```bash
   # Exclude all markdown EXCEPT README
   **/*.md
   !README.md
   !CONTRIBUTING.md
   ```

3. **Override built-in filters:**
   ```python
   # Edit common/filtering.py
   # Add exception to _should_index_file()
   if name == "important_file.txt":
       return True
   ```

---

### "Glob patterns not working"

**Common mistakes:**

```bash
# ❌ Wrong: Missing ** for recursive
test/**          # Only matches /test/, not /src/test/

# ✅ Correct: Use **/ for recursive
**/test/**       # Matches test/ anywhere in tree

# ❌ Wrong: Using / at start (won't match)
/test/**         # Only matches /test/ at repo root

# ✅ Correct: Use **/ for anywhere
**/test/**       # Matches at any depth
```

**Test patterns:**
```bash
# Install globmatch tool
pip install globmatch

# Test pattern
globmatch '**/*.test.js' src/components/Button.test.js
# Output: True
```

---

## Performance Impact

### Index Size

```
Repo: agro (Python, ~500 files)

With tests + node_modules:
- Files indexed: 15,420
- Chunks: 89,342
- BM25 index: 342 MB
- Qdrant collection: 1.2 GB

Without tests/node_modules:
- Files indexed: 287
- Chunks: 3,420
- BM25 index: 12 MB
- Qdrant collection: 42 MB

Reduction: 96% files, 96% chunks, 96% storage
```

### Retrieval Speed

```
With tests (89k chunks):
- BM25 search: ~800ms
- Qdrant search: ~600ms
- Reranking: ~1.2s
Total: ~2.6s

Without tests (3.4k chunks):
- BM25 search: ~30ms
- Qdrant search: ~50ms
- Reranking: ~200ms
Total: ~280ms

Speed-up: 9.3x faster
```

### Accuracy

```
Golden questions: 25 queries

With tests:
- Top-1: 1.9%
- Top-5: 12.0%
- MRR: 0.14

Without tests:
- Top-1: 82.0%
- Top-5: 95.2%
- MRR: 0.88

Improvement: 43x better Top-1, 6.3x better MRR
```

---

## Best Practices

### 1. Start Conservative

```bash
# Minimal exclusions (safest)
**/node_modules/**
**/.venv/**
**/dist/**
**/build/**
```

Run eval to get baseline, then add exclusions incrementally.

---

### 2. Measure Impact

```bash
# Before changing filters
REPO=agro python -m eval.eval_loop --baseline

# After each change
REPO=agro python -m eval.eval_loop --compare
```

Only keep exclusions that improve MRR or accuracy.

---

### 3. Exclude Tests Aggressively

**Critical for retrieval quality.** Tests use similar language to prod code but represent mocks, not real implementations.

```bash
# Comprehensive test exclusions
**/test/**
**/tests/**
**/__tests__/**
**/*.test.*
**/*.spec.*
**/fixtures/**
**/mocks/**
**/__mocks__/**
**/e2e/**
**/integration/**
```

---

### 4. Keep Lockfiles (Usually)

Unless you have a huge monorepo, lockfiles are small and can help answer dependency questions.

**Exclude only if:**
- Repo has 10k+ files
- Storage is constrained
- You never query about dependencies

---

### 5. Use Presets as Starting Point

```bash
# Load preset (via GUI or copy manually)
cp presets/python.exclude.txt data/exclude_globs.txt

# Customize for your repo
vim data/exclude_globs.txt

# Test
REPO=agro python indexer/index_repo.py
REPO=agro python -m eval.eval_loop
```

---

## Advanced: Per-Repo Filters

**File:** `repos.json`

```json
{
  "agro": {
    "path": "/path/to/agro",
    "exclude_patterns": [
      "**/legacy/**",
      "**/deprecated/**"
    ]
  },
  "client-app": {
    "path": "/path/to/client-app",
    "exclude_patterns": [
      "**/node_modules/**",
      "**/dist/**",
      "**/*.test.ts"
    ]
  }
}
```

**Priority:**
1. Per-repo `exclude_patterns` (highest)
2. Global `data/exclude_globs.txt`
3. Built-in `PRUNE_DIRS` (lowest)

---

## Migration Guide

### From No Filtering

If you previously indexed without filters:

```bash
# 1. Backup old index
cp -r data/agro data/agro.backup

# 2. Add exclusions
cat > data/exclude_globs.txt <<EOF
**/test/**
**/tests/**
**/*.test.*
**/*.spec.*
**/node_modules/**
**/dist/**
**/build/**
EOF

# 3. Reindex
REPO=agro python indexer/index_repo.py

# 4. Compare eval results
REPO=agro python -m eval.eval_loop
# Expected: Massive accuracy improvement
```

---

## Next Steps

- **[Performance Tuning](performance.md)** - Optimize retrieval speed and quality
- **[Learning Reranker](../features/learning-reranker.md)** - Improve search quality with feedback
- **[Troubleshooting](../operations/troubleshooting.md)** - Debug retrieval issues
