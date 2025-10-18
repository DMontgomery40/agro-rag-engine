# RAG Performance Improvement Runbook (Adjusted)

**What changed vs your draft**

* ✅ **No writes to your existing `.env`**. We use *runtime env vars* or repo‑specific env files under `env/`.
* ✅ **Model names/APIs verified** (Voyage `voyage-code-3`, Jina code embeddings, BGE v2 M3 reranker, MS MARCO MiniLM cross‑encoder).
* ✅ **Single knob for embeddings**: `EMBEDDING_TYPE` = `openai` | `voyage` | `local`.
* ✅ **Qdrant collections versioned** to avoid dimension mismatches when switching models/dims.
* ✅ **Reranker code fixed** to match the `rerankers` API and normalize scores to 0–1.
* ✅ **Commands bundled** with `&&` and copy‑paste safe.

**Targets** (unchanged)

* Easy ≥ **0.80**, Medium ≥ **0.70**, Hard ≥ **0.65**, Overall ≥ **0.72**

---

## Phase 0 — Preflight (5 min)

```bash
cd /opt/app//rag-service && \
[[ -d .venv ]] || python3 -m venv .venv && \
. .venv/bin/activate && \
python -V && pip -V && \
 git add -A && git commit -m "preflight: snapshot before RAG tuning" || true
```

**Assumptions**

* You already have **OPENAI_API_KEY**, **VOYAGE_API_KEY**, **QDRANT_URL**, **REDIS_URL** configured in your environment or process manager (not editing `.env`).
* Your indexer honors `REPO` and optionally `COLLECTION_NAME`.

---

## Phase 1 — Code‑Optimized Embeddings (30 min)

### 1.1 Install / wire providers (Voyage + Local)

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
pip install -U voyageai sentence-transformers
```

### 1.2 Patch: single embedding function

*Edit `hybrid_search.py` (or your embedding helper) and **replace** the existing embedding routine with this.*

```python
# --- hybrid_search.py (embedding section) ---
import os
from typing import List

# Optional lazy imports
def _lazy_import_openai():
    from openai import OpenAI
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def _lazy_import_voyage():
    import voyageai
    return voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))

_local_embed_model = None

def _get_embedding(text: str, kind: str = "document") -> List[float]:
    """Return embedding vector for `text`.
    kind: "query" | "document" (voyage benefits from this)
    Controlled by EMBEDDING_TYPE = openai | voyage | local
    """
    et = os.getenv("EMBEDDING_TYPE", "openai").lower()

    if et == "voyage":
        vo = _lazy_import_voyage()
        # voyage-code-3 supports 256/512/1024/2048 dims; default 1024
        # Use 512 to halve storage & speed ANN without large quality loss.
        out = vo.embed([text], model="voyage-code-3", input_type=kind, output_dimension=512)
        return out.embeddings[0]

    if et == "local":
        global _local_embed_model
        if _local_embed_model is None:
            from sentence_transformers import SentenceTransformer
            _local_embed_model = SentenceTransformer("jinaai/jina-embeddings-v2-base-code")
        # ST returns numpy; convert to list for JSON/storage
        return _local_embed_model.encode(text, convert_to_numpy=True).tolist()

    # Default: OpenAI text-embedding-3-large
    client = _lazy_import_openai()
    resp = client.embeddings.create(input=text, model="text-embedding-3-large")
    return resp.data[0].embedding
```

> **Why 512 dims on Voyage?** Faster searches, smaller Qdrant footprint, typically negligible quality drop for code. Adjust to 1024 if quality is short of target.

### 1.3 Versioned Qdrant collections (avoid dim clashes)

Pick a suffix per embedding config. Example: `voyage-c3-d512`.

```bash
# PROJECT reindex (Voyage, 512d) to a fresh collection
cd /opt/app//rag-service && \
. .venv/bin/activate && \
export EMBEDDING_TYPE=voyage && \
export REPO=project && \
export COLLECTION_SUFFIX=voyage-c3-d512 && \
export COLLECTION_NAME="${REPO}_${COLLECTION_SUFFIX}" && \
python index_repo.py

# PROJECT reindex
cd /opt/app//rag-service && \
. .venv/bin/activate && \
export EMBEDDING_TYPE=voyage && \
export REPO=project && \
export COLLECTION_SUFFIX=voyage-c3-d512 && \
export COLLECTION_NAME="${REPO}_${COLLECTION_SUFFIX}" && \
python index_repo.py
```

> If your indexer does **not** honor `COLLECTION_NAME`, use separate Qdrant DBs or adjust the code once here to derive collection name from `REPO` + `EMBEDDING_TYPE` + dim.

### 1.4 Quick sanity check

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
python - << 'PY'
import os
os.environ['EMBEDDING_TYPE'] = 'voyage'
from hybrid_search import search_routed_multi
queries = [
    ('project', 'ai studio'),
    ('project', 'TBAC trait system'),
    ('project', 'plugin builder'),
    ('project', 'webhook verification'),
]
for repo, q in queries:
    docs = search_routed_multi(q, repo_override=repo, final_k=5)
    top = (docs or [{}])[0]
    print(f"{repo:9} | {q:28} | top_score={top.get('rerank_score', 0):.3f} | file={top.get('file_path', 'n/a')}")
PY
```

---

## Phase 2 — Cross‑Encoder Reranker (20 min)

### 2.1 Install & wire `rerankers`

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
pip install -U "rerankers[transformers]"
```

### 2.2 Patch: reranker with score normalization

*Replace your reranker module (e.g., `rerank.py`) with this implementation.*

```python
# --- rerank.py ---
import math
import os
from typing import List, Dict
from rerankers import Reranker

_RERANKER = None

# Favor Jina v2 multilingual for code/doc mixed repos; alt: ms-marco MiniLM for speed
DEFAULT_RERANK_MODEL = os.getenv('RERANKER_MODEL', 'jinaai/jina-reranker-v2-base-multilingual')


def _sigmoid(x: float) -> float:
    try:
        return 1.0 / (1.0 + math.exp(-float(x)))
    except Exception:
        return 0.0


def _normalize(score: float, model_name: str) -> float:
    # Many cross-encoders output logits; map to 0..1 for consistent thresholds
    if any(k in model_name.lower() for k in ['bge-reranker', 'cross-encoder', 'mxbai', 'jina-reranker']):
        return _sigmoid(score)
    return float(score)


def get_reranker() -> Reranker:
    global _RERANKER
    if _RERANKER is None:
        model_name = DEFAULT_RERANK_MODEL
        # Explicitly mark type for safety
        _RERANKER = Reranker(model_name, model_type='cross-encoder')
    return _RERANKER


def rerank_results(query: str, results: List[Dict], top_k: int = 10) -> List[Dict]:
    """Rerank list of result dicts that include at least `code` and `file_path`."""
    if not results:
        return []

    # Construct lightweight text with minimal hallucination risk
    docs = []
    for r in results:
        file_ctx = r.get('file_path', '')
        code_snip = (r.get('code') or r.get('text') or '')[:600]
        docs.append(f"{file_ctx}\n\n{code_snip}")

    model_name = DEFAULT_RERANK_MODEL
    ranked = get_reranker().rank(query=query, docs=docs, doc_ids=list(range(len(docs))))

    # Apply normalized scores back onto original dicts
    for res in ranked.results:
        idx = res.document.doc_id
        results[idx]['rerank_score'] = _normalize(res.score, model_name)

    results.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)
    return results[:top_k]
```

**Switch models quickly**

```bash
# Jina (quality, multilingual)
export RERANKER_MODEL="jinaai/jina-reranker-v2-base-multilingual"
# OR MS MARCO MiniLM (faster, smaller)
export RERANKER_MODEL="cross-encoder/ms-marco-MiniLM-L-6-v2"
```

*No reindex required when swapping rerankers.*

---

## Phase 3 — Chunking for Code (15 min)

### 3.1 Larger chunks + overlap

*Edit `ast_chunker.py` (or your chunker) constants and add overlap.*

```python
# --- ast_chunker.py (constants) ---
MIN_CHUNK_LINES = 50
MAX_CHUNK_LINES = 300
OVERLAP_LINES = 20
```

```python
# --- ast_chunker.py (function) ---
from typing import List, Dict

def chunk_code(file_path: str, code: str, lang: str) -> List[Dict]:
    # ... your language-aware parsing to produce raw_chunks: List[List[int]] ...
    all_lines = code.splitlines()
    chunks: List[Dict] = []
    for i, chunk_lines in enumerate(raw_chunks):
        start_line = chunk_lines[0]
        end_line = chunk_lines[-1]
        if i > 0 and OVERLAP_LINES > 0:
            overlap_start = max(0, start_line - OVERLAP_LINES)
            chunk_text = '\n'.join(all_lines[overlap_start:end_line + 1])
            actual_start = overlap_start
        else:
            chunk_text = '\n'.join(all_lines[start_line:end_line + 1])
            actual_start = start_line
        chunks.append({
            'file_path': file_path,
            'start_line': actual_start,
            'end_line': end_line,
            'code': chunk_text,
            'lang': lang,
        })
    return chunks
```

**Reindex** (same as Phase 1.3) for both repos.

---

## Phase 4 — Quieter Multi‑Query (5 min)

### 4.1 Heuristic toggle

*Edit your LangGraph retrieve step (e.g., `langgraph_app.py`).*

```python
# --- langgraph_app.py (snippet) ---
import os

def should_use_multi_query(question: str) -> bool:
    q = (question or '').lower().strip()
    if len(q.split()) <= 3:
        return False
    for w in ("how", "why", "explain", "compare", "tradeoff"):
        if w in q:
            return True
    return False

# where you set rewrites
mq = int(os.getenv('MQ_REWRITES', '2')) if should_use_multi_query(state['question']) else 1
```

In env/process manager, prefer `MQ_REWRITES=2`.

---

## Phase 5 — File/Path Boosts (10 min)

### 5.1 Post‑rerank boosts

*Add to the end of your `search_routed_multi()` just after reranking.*

```python
# --- hybrid_search.py (within search_routed_multi) ---
import os, os.path

def _apply_filename_boosts(docs, question: str):
    terms = set(question.lower().replace('/', ' ').replace('-', ' ').split())
    for d in docs:
        fp = (d.get('file_path') or '').lower()
        fn = os.path.basename(fp)
        parts = fp.split('/')
        score = d.get('rerank_score', 0.0)
        if any(t in fn for t in terms):
            score *= 1.5
        if any(t in p for t in terms for p in parts):
            score *= 1.2
        d['rerank_score'] = score
    docs.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)

# ...after you call rerank_results(...)
_apply_filename_boosts(docs, question)
```

---

## Phase 6 — Split Pipelines per Repo (30 min)

> Keeps Redis/Qdrant state clean and lets you tune knobs per repo without cross‑talk.

### 6.1 Repo‑specific env files (kept **out** of root `.env`)

```bash
cd /opt/app//rag-service && \
mkdir -p env && \
cat > env/project.env << 'ENV'
OPENAI_API_KEY=${OPENAI_API_KEY}
VOYAGE_API_KEY=${VOYAGE_API_KEY}
QDRANT_URL=${QDRANT_URL}
REDIS_URL=redis://127.0.0.1:6379/0
REPO=project
MQ_REWRITES=2
RERANKER_MODEL=jinaai/jina-reranker-v2-base-multilingual
EMBEDDING_TYPE=voyage
COLLECTION_SUFFIX=voyage-c3-d512
ENV

cat > env/project.env << 'ENV'
OPENAI_API_KEY=${OPENAI_API_KEY}
VOYAGE_API_KEY=${VOYAGE_API_KEY}
QDRANT_URL=${QDRANT_URL}
REDIS_URL=redis://127.0.0.1:6379/1
REPO=project
MQ_REWRITES=2
RERANKER_MODEL=jinaai/jina-reranker-v2-base-multilingual
EMBEDDING_TYPE=voyage
COLLECTION_SUFFIX=voyage-c3-d512
ENV
```

### 6.2 Dedicated entry points

```bash
cd /opt/app//rag-service && \
cat > project_rag.py << 'PY'
import os
from dotenv import load_dotenv
load_dotenv('env/project.env')
from serve_rag import app
if __name__ == '__main__':
    import uvicorn
    os.environ['COLLECTION_NAME'] = os.environ.get('COLLECTION_NAME', f"{os.environ['REPO']}_{os.environ.get('COLLECTION_SUFFIX','default')}")
    uvicorn.run(app, host='127.0.0.1', port=8012)
PY

cat > project_rag.py << 'PY'
import os
from dotenv import load_dotenv
load_dotenv('env/project.env')
from serve_rag import app
if __name__ == '__main__':
    import uvicorn
    os.environ['COLLECTION_NAME'] = os.environ.get('COLLECTION_NAME', f"{os.environ['REPO']}_{os.environ.get('COLLECTION_SUFFIX','default')}")
    uvicorn.run(app, host='127.0.0.1', port=8013)
PY
```

### 6.3 Run

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
python project_rag.py & disown && \
python project_rag.py & disown && \
curl -s "http://127.0.0.1:8012/answer?q=TBAC%20traits&repo=project" | head && \
curl -s "http://127.0.0.1:8013/answer?q=webhook%20verification&repo=project" | head
```

---

## Phase 7 — Benchmark (10 min)

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
cat > benchmark_improvements.py << 'PY'
import os
from hybrid_search import search_routed_multi

TESTS = [
    ('project','ai studio','easy'),
    ('project','TBAC trait system','easy'),
    ('project','plugin builder','easy'),
    ('project','webhook verification','easy'),
    ('project','three lane gateway','medium'),
    ('project','plugin sandbox isolation','medium'),
    ('project','provider adapter traits','medium'),
    ('project','canonical event normalization','medium'),
    ('project','how does TBAC prevent PHI access','hard'),
    ('project','what is the general purpose of project','hard'),
    ('project','how do different providers interact','hard'),
]

os.environ.setdefault('EMBEDDING_TYPE', 'voyage')

by_diff = {}
for repo, q, d in TESTS:
    docs = search_routed_multi(q, repo_override=repo, final_k=5)
    s = (docs or [{}])[0].get('rerank_score', 0.0)
    by_diff.setdefault(d, []).append(s)

print('\n' + '='*80)
print('FINAL PERFORMANCE METRICS')
print('='*80)

TARGET = {'easy':0.80, 'medium':0.70, 'hard':0.65}
all_scores = []
for d, arr in by_diff.items():
    avg = sum(arr)/max(1,len(arr))
    all_scores.extend(arr)
    status = '✓' if avg >= TARGET[d] else '✗'
    print(f"{status} {d.upper():7} | Avg: {avg:.3f} | Target: {TARGET[d]:.3f}")

overall = sum(all_scores)/max(1,len(all_scores))
print(f"\n{'Overall Average:':20} {overall:.3f}")
print('='*80)
PY && \
python benchmark_improvements.py
```

---

## Helper: One‑shot tuner script (optional)

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
cat > rag_tuner.sh << 'SH'
#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")"

: "${REPO:=project}"
: "${EMBEDDING_TYPE:=voyage}"
: "${COLLECTION_SUFFIX:=voyage-c3-d512}"
export COLLECTION_NAME="${REPO}_${COLLECTION_SUFFIX}"

printf "\n[1/3] Reindexing %s into %s (EMBEDDING_TYPE=%s)\n" "$REPO" "$COLLECTION_NAME" "$EMBEDDING_TYPE"
python index_repo.py

printf "\n[2/3] Smoke test queries...\n"
python - << 'PY'
import os
from hybrid_search import search_routed_multi
for repo, q in [(os.environ.get('REPO','project'), 'ai studio'), (os.environ.get('REPO','project'), 'plugin builder')]:
    docs = search_routed_multi(q, repo_override=repo, final_k=3)
    s = (docs or [{}])[0].get('rerank_score', 0.0)
    print(f"{repo:9} | {q:20} => {s:.3f}")
PY

printf "\n[3/3] Benchmark...\n"
python benchmark_improvements.py
SH && \
chmod +x rag_tuner.sh
```

Run it (Qwen3 + Cohere, MXBAI @512 dims):

```bash
cd /opt/app//rag-service && . .venv/bin/activate && \
# Guards: ensure keys exist without leaking
python - <<'PY'
import os, sys
for k in ("COHERE_API_KEY",):
    assert os.getenv(k), f"Missing required env: {k}"
print("✓ env ok")
PY && \
# Enrichment ON with Qwen3
export ENRICH_CODE_CHUNKS=true ENRICH_MODEL="qwen3-coder:30b" OLLAMA_URL="http://127.0.0.1:11434/api/generate" && \
# Best reranker default
export RERANK_BACKEND=cohere COHERE_RERANK_MODEL=rerank-v3.5 && \
# Index PROJECT (MXBAI, 512)
export EMBEDDING_TYPE=mxbai EMBEDDING_DIM=512 REPO=project COLLECTION_SUFFIX=mxbai-d512-qwen3-cohere && \
export COLLECTION_NAME="${REPO}_${COLLECTION_SUFFIX}" && python index_repo.py && \
# Index PROJECT (MXBAI, 512)
export REPO=project COLLECTION_SUFFIX=mxbai-d512-qwen3-cohere && \
export COLLECTION_NAME="${REPO}_${COLLECTION_SUFFIX}" && python index_repo.py && \
# Benchmark
python benchmark_improvements.py
```

---

## Rollback

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
export EMBEDDING_TYPE=openai && \
export RERANKER_MODEL=BAAI/bge-reranker-v2-m3 && \
git checkout -- ast_chunker.py rerank.py hybrid_search.py || true && \
REPO=project COLLECTION_SUFFIX=baseline python index_repo.py && \
REPO=project   COLLECTION_SUFFIX=baseline python index_repo.py
```

---

## Notes

* Voyage `voyage-code-3` is specifically optimized for **code retrieval** and supports smaller output dimensions; using 512 dims is a good balance of quality/cost. If you undershoot targets, retry at 1024 dims.
* `rerankers` returns raw scores that can be logits; we normalize with sigmoid for a consistent 0–1 scale.
* Versioning Qdrant collections keeps migrations painless when changing models/dimensions.
* Keep per‑repo Redis DBs to prevent cache cross‑talk.
* All changes are incremental; benchmark after each phase before moving on.

---

# Addendum — Code Retrieval Upgrades (MXBAI + Nomic + Qwen2.5 + AST + Lightweight Rerankers)

> This addendum folds in your points: **mxbai-embed-large**, **nomic-embed-text**, a **code-specialized LLM (Qwen‑2.5‑Coder)** to enrich chunks, **semantic/AST chunking**, and a **lightweight reranker option**. It keeps the "no `.env` writes" rule and uses runtime exports only.

## A0 — Install extras (once)

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
pip install -U sentence-transformers torch requests && \
pip install -U rerankers && \
pip install -U tree_sitter tree_sitter_languages
```

---

## A1 — Embeddings: add **MXBAI** and **Nomic** with retrieval‑aware prompts

Both models support *Matryoshka* (resize dims). We default to **512‑dim** for speed/size and consistency with the rest of the runbook.

### Patch `hybrid_search.py` (embedding section)

> Extends `EMBEDDING_TYPE` with `mxbai` and `nomic`, adds retrieval‑aware prompts.

```python
# --- hybrid_search.py (embedding addendum: MXBAI / Nomic) ---
import os
from typing import List

_local_embed_model = None

QUERY_PREFIXES = {
    # MXBAI: query uses a special retrieval prompt; docs are raw
    "mxbai": "Represent this sentence for searching relevant passages: ",
    # Nomic v1.5: explicit task instruction prefixes for retrieval
    "nomic_query": "search_query: ",
    "nomic_doc": "search_document: ",
}


def _load_st_model(model_id: str, truncate_dim: int | None = None):
    from sentence_transformers import SentenceTransformer
    kwargs = {}
    if truncate_dim is not None:
        kwargs["truncate_dim"] = truncate_dim  # supported by MXBAI wrappers
    # Nomic requires trust_remote_code=True for their prompt helpers; harmless for MXBAI
    kwargs["trust_remote_code"] = True
    return SentenceTransformer(model_id, **kwargs)


def _normalize(v):
    try:
        import numpy as np
        v = np.asarray(v, dtype="float32")
        n = np.linalg.norm(v)
        return (v / n).tolist() if n else v.tolist()
    except Exception:
        return v


def _get_embedding(text: str, kind: str = "document") -> List[float]:
    """Return an embedding vector for `text`.
    kind: "query" | "document". Controlled by EMBEDDING_TYPE env.
    Recognized values: openai | voyage | local | mxbai | nomic
    """
    et = os.getenv("EMBEDDING_TYPE", "openai").lower()
    dim = int(os.getenv("EMBEDDING_DIM", "512"))  # for MXBAI/Nomic Matryoshka

    if et == "mxbai":
        model = _load_st_model("mixedbread-ai/mxbai-embed-large-v1", truncate_dim=dim)
        if kind == "query":
            emb = model.encode(QUERY_PREFIXES["mxbai"] + text, normalize_embeddings=True)
        else:
            emb = model.encode(text, normalize_embeddings=True)
        return emb.tolist()

    if et == "nomic":
        model = _load_st_model("nomic-ai/nomic-embed-text-v1.5")
        # Nomic recommends task prefixes + optional Matryoshka truncation
        if kind == "query":
            emb = model.encode(QUERY_PREFIXES["nomic_query"] + text)
        else:
            emb = model.encode(QUERY_PREFIXES["nomic_doc"] + text)
        return _normalize(emb)[:dim]

    if et == "local":  # code‑optimized local baseline
        from sentence_transformers import SentenceTransformer
        global _local_embed_model
        if _local_embed_model is None:
            _local_embed_model = SentenceTransformer("jinaai/jina-embeddings-v2-base-code")
        return _normalize(_local_embed_model.encode(text, convert_to_numpy=True))

    if et == "voyage":
        import voyageai
        client = voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))
        out = client.embed([text], model="voyage-code-3", input_type=kind, output_dimension=dim)
        return out.embeddings[0]

    # default: OpenAI text-embedding-3-large
    from openai import OpenAI
    client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
    resp = client.embeddings.create(input=text, model="text-embedding-3-large")
    return resp.data[0].embedding
```

### Reindex with MXBAI (512‑dim)

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
export EMBEDDING_TYPE=mxbai && \
export EMBEDDING_DIM=512 && \
export REPO=project && \
export COLLECTION_SUFFIX=mxbai-d512 && \
export COLLECTION_NAME="${REPO}_${COLLECTION_SUFFIX}" && \
python index_repo.py && \
export REPO=project && \
export COLLECTION_SUFFIX=mxbai-d512 && \
export COLLECTION_NAME="${REPO}_${COLLECTION_SUFFIX}" && \
python index_repo.py
```

### Reindex with Nomic v1.5 (512‑dim)

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
export EMBEDDING_TYPE=nomic && \
export EMBEDDING_DIM=512 && \
export REPO=project && \
export COLLECTION_SUFFIX=nomic-v1.5-d512 && \
export COLLECTION_NAME="${REPO}_${COLLECTION_SUFFIX}" && \
python index_repo.py && \
export REPO=project && \
export COLLECTION_SUFFIX=nomic-v1.5-d512 && \
export COLLECTION_NAME="${REPO}_${COLLECTION_SUFFIX}" && \
python index_repo.py
```

> **Note:** Changing dims creates a new Qdrant collection via `COLLECTION_SUFFIX`, avoiding errors from mismatched vector sizes.

---

## A2 — Enrich code chunks with **Qwen3‑Coder (30B)** via **Ollama**

Use a local code LLM to generate *keywords + function/class summaries* that we append to each chunk prior to embedding. This dramatically improves recall on terse code.

### Start Qwen3‑Coder (one time)

````bash
# Pull & warm up Qwen3‑Coder (30B). Requires recent Ollama.
ollama pull qwen3-coder:30b && \
ollama run qwen3-coder:30b "ready"
```bash
# Ensure Ollama is running; then pull a quantized 14B coder model
ollama pull qwen2.5-coder:14b && \
ollama run qwen2.5-coder:14b "ready"
````

### Add `metadata_enricher.py`

```bash
cd /opt/app//rag-service && \
cat > metadata_enricher.py << 'PY'
import os, json, requests

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://127.0.0.1:11434/api/generate")
MODEL = os.getenv("ENRICH_MODEL", "qwen3-coder:30b")

SYSTEM = (
    "You are a senior code analyst. Extract: 1) concise summary of purpose, "
    "2) key APIs/classes/functions referenced, 3) inputs/outputs/side-effects, "
    "4) 8-15 retrieval keywords (snake_case). Keep under 120 tokens."
)

PROMPT_TMPL = (
    "<system>" + SYSTEM + "</system>
"
    "<analyze file='{file}' lang='{lang}'>
{code}
</analyze>
"
    "<format>JSON with keys: summary, keywords</format>"
)

def enrich(file_path: str, lang: str, code: str) -> dict:
    prompt = PROMPT_TMPL.format(file=file_path, lang=lang, code=code[:4000])
    resp = requests.post(OLLAMA_URL, json={"model": MODEL, "prompt": prompt, "stream": False, "options": {"temperature": 0.1, "num_ctx": 4096}})
    resp.raise_for_status()
    txt = resp.json().get("response", "{}")
    try:
        data = json.loads(txt)
        if isinstance(data, dict):
            return {"summary": data.get("summary", ""), "keywords": data.get("keywords", [])}
    except Exception:
        pass
    return {"summary": txt[:300], "keywords": []}
PY
```

### Wire the enricher into your indexer (opt‑in by env)

```bash
cd /opt/app//rag-service && \
sed -n '1,160p' index_repo.py > /tmp/index_repo_head.py || true && \
cat > /tmp/index_repo_patch.py << 'PY'
# --- index_repo.py (snippet) ---
import os
ENRICH = os.getenv("ENRICH_CODE_CHUNKS", "false").lower() == "true"
if ENRICH:
    from metadata_enricher import enrich

# inside your chunk loop where you build the doc record:
#   record = { 'file_path': fp, 'lang': lang, 'code': code_text, ... }
if ENRICH:
    meta = enrich(fp, lang, code_text)
    record['summary'] = meta.get('summary', '')
    record['keywords'] = meta.get('keywords', [])
    # Concatenate enriched text for embedding
    enriched_text = f"{record['file_path']}
{record.get('summary','')}
{' '.join(record.get('keywords', []))}
{code_text}"
    record['embed_text'] = enriched_text
else:
    record['embed_text'] = code_text

# then call your embedding on record['embed_text'] instead of raw code
PY
```

Reindex with enrichment on:

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
export ENRICH_CODE_CHUNKS=true && \
export EMBEDDING_TYPE=mxbai && \
export EMBEDDING_DIM=512 && \
export REPO=project && \
export COLLECTION_SUFFIX=mxbai-d512-enriched && \
export COLLECTION_NAME="${REPO}_${COLLECTION_SUFFIX}" && \
python index_repo.py
```

---

## A3 — SOTA reranker (default **Cohere Rerank 3.5**, multilingual)

Use **Cohere `rerank-v3.5`** as the default (high‑accuracy cross‑encoder; multilingual). Keep Jina v2 and Voyage as alternates.

### Install & wire Cohere

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
pip install -U cohere
```

### Patch `rerank.py` to use Cohere by default

```python
# --- rerank.py (Cohere default) ---
import os
from typing import List, Dict

_RERANK_BACKEND = os.getenv("RERANK_BACKEND", "cohere").lower()  # cohere|jina|voyage|local

# Lazies

def _cohere():
    import cohere
    return cohere.Client(os.getenv("COHERE_API_KEY"))

def _jina_model():
    from rerankers import Reranker
    name = os.getenv('RERANKER_MODEL', 'jinaai/jina-reranker-v2-base-multilingual')
    return Reranker(name, model_type='cross-encoder')


def rerank_results(query: str, results: List[Dict], top_k: int = 10) -> List[Dict]:
    if not results:
        return []
    texts = []
    for r in results:
        fp = r.get('file_path', '')
        code = (r.get('code') or r.get('text') or '')[:1200]
        texts.append(f"{fp}

{code}")

    if _RERANK_BACKEND == "cohere":
        co = _cohere()
        model = os.getenv("COHERE_RERANK_MODEL", "rerank-v3.5")
        # Cohere expects list of dicts or strings
        docs = [{"text": t} for t in texts]
        out = co.rerank(model=model, query=query, documents=docs, top_n=min(top_k, len(docs)))
        # out.results has (index, relevance_score)
        for item in out.results:
            idx = item.index
            results[idx]['rerank_score'] = float(item.relevance_score)
    elif _RERANK_BACKEND == "jina":
        rer = _jina_model()
        ranked = rer.rank(query=query, docs=texts, doc_ids=list(range(len(texts))))
        for res in ranked.results:
            results[res.document.doc_id]['rerank_score'] = float(res.score)
    else:
        # passthrough if no reranker (not recommended)
        for i, _ in enumerate(results):
            results[i]['rerank_score'] = results[i].get('score', 0.0)

    results.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)
    return results[:top_k]
```

**Env knobs**

```bash
export RERANK_BACKEND=cohere
export COHERE_RERANK_MODEL=rerank-v3.5
# alt: export RERANK_BACKEND=jina && export RERANKER_MODEL=jinaai/jina-reranker-v2-base-multilingual
```

---

## A4 — Structure‑aware **AST chunking** with overlap (semantic > fixed lines)

Switch from pure line windows to **AST‑bounded chunks** so functions/classes remain intact. Keep the earlier overlap of 20 lines.

### Drop‑in helper `ast_semantic_chunker.py`

```bash
cd /opt/app//rag-service && \
cat > ast_semantic_chunker.py << 'PY'
from __future__ import annotations
from typing import List, Dict, Tuple
from tree_sitter import Parser
from tree_sitter_languages import get_language

OVERLAP_LINES = 20
MAX_LINES = 300

LANG_MAP = {
    ".py": "python", ".ts": "typescript", ".tsx": "tsx", ".js": "javascript",
    ".java": "java", ".go": "go", ".rs": "rust", ".cpp": "cpp", ".c": "c"
}

NODE_TYPES = {"function_definition", "method_definition", "class_definition"}


def _lang_for(path: str) -> str | None:
    for ext, lang in LANG_MAP.items():
        if path.endswith(ext):
            return lang
    return None


def _nodes_for(root, source_lines) -> List[Tuple[int,int]]:
    spans = []
    stack = [root]
    while stack:
        n = stack.pop()
        if n.type in NODE_TYPES:
            s = n.start_point[0]
            e = n.end_point[0]
            spans.append((s, e))
        # DFS
        for i in range(n.child_count):
            stack.append(n.child(i))
    # sort and cap by MAX_LINES
    spans.sort()
    clipped = []
    for s, e in spans:
        if e - s + 1 > MAX_LINES:
            e = s + MAX_LINES - 1
        clipped.append((s, e))
    return clipped or [(0, min(len(source_lines)-1, MAX_LINES))]


def chunk_code_ast(file_path: str, code: str, lang_hint: str | None = None) -> List[Dict]:
    language = get_language(lang_hint or _lang_for(file_path) or "python")
    parser = Parser()
    parser.set_language(language)
    tree = parser.parse(code.encode("utf-8"))
    root = tree.root_node
    lines = code.splitlines()

    spans = _nodes_for(root, lines)
    chunks: List[Dict] = []
    last_end = -1
    for s, e in spans:
        # apply overlap
        s2 = max(0, s - (OVERLAP_LINES if last_end >= 0 else 0))
        text = "
".join(lines[s2:e+1])
        chunks.append({
            "start_line": s2 + 1,
            "end_line": e + 1,
            "code": text,
        })
        last_end = e
    return chunks
PY
```

**Wire it in** (replace your line‑based chunker call when `AST_CHUNKING=true`):

```bash
cd /opt/app//rag-service && \
sed -n '1,200p' ast_chunker.py > /tmp/ast_chunker_backup.py || true && \
cat >> ast_chunker.py << 'PY'
# --- AST chunking toggle ---
import os
from ast_semantic_chunker import chunk_code_ast as _chunk_code_ast

USE_AST = os.getenv("AST_CHUNKING", "false").lower() == "true"

# inside your existing chunk_code(...) implementation, inject:
# if USE_AST:
#     return _chunk_code_ast(file_path, code, lang)
PY
```

Reindex with AST chunking on (MXBAI shown):

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
export AST_CHUNKING=true && \
export EMBEDDING_TYPE=mxbai && \
export EMBEDDING_DIM=512 && \
export REPO=project && \
export COLLECTION_SUFFIX=mxbai-d512-ast && \
export COLLECTION_NAME="${REPO}_${COLLECTION_SUFFIX}" && \
python index_repo.py
```

---

## A5 — Quick bake‑off script across embeddings (OpenAI vs Voyage vs MXBAI vs Nomic) + Qwen3 enrichment

```bash
cd /opt/app//rag-service && \
. .venv/bin/activate && \
cat > bakeoff_embeddings.py << 'PY'
import os
from hybrid_search import search_routed_multi

EMBEDS = [
    ("openai", 0),
    ("voyage", 512),
    ("mxbai", 512),
    ("nomic", 512),
]
TESTS = [
    ('project','ai studio'),
    ('project','TBAC trait system'),
    ('project','plugin builder'),
    ('project','webhook verification'),
]

for et, dim in EMBEDS:
    os.environ['EMBEDDING_TYPE'] = et
    if dim:
        os.environ['EMBEDDING_DIM'] = str(dim)
    print(f"
=== {et.upper()} (dim={dim or 'native'}) ===")
    for repo, q in TESTS:
        docs = search_routed_multi(q, repo_override=repo, final_k=5)
        s = (docs or [{}])[0].get('rerank_score', 0.0)
        fp = (docs or [{}])[0].get('file_path', 'n/a')
        print(f"{repo:9} | {q:28} | {s:.3f} | {fp}")
PY && \
python bakeoff_embeddings.py
```

---

## A6 — Notes & gotchas (so you don’t get burned)

* **Retrieval vs storage prompts** matter: MXBAI uses a special *query* prompt; Nomic uses `search_query:`/`search_document:` prefixes. Skipping these can crater retrieval quality.
* **Dims must match the collection.** Always vary `COLLECTION_SUFFIX` when changing `EMBEDDING_TYPE` or `EMBEDDING_DIM`.
* **LLM enrichment is optional** and bounded (`code[:4000]`) to keep the pipeline snappy on Mac.
* **Heavier listwise rerankers** (e.g., First‑Mistral 7B) are great for quality but are slower; start with **Jina v2** or **MXBAI xsmall/base** for day‑to‑day use.
* **AST chunking** wins most for code; you can still retain the earlier line‑based overlap as a fallback (`AST_CHUNKING=false`).
