===================================================================
RUNBOOK (UPDATED): Production RAG on macOS — Apple Silicon (non‑CUDA)
Mac mini M4 Pro • 48 GB unified memory • 16‑core ANE • 10‑core GPU
Preference: Docker Compose > docker run / Docker Desktop
Paths:
project:    /opt/app//project
project:  /opt/app//project
rag svc:   /opt/app//rag-service
===========================================================

## WHAT CHANGED (at a glance)

• Replaced `docker run` with **Docker Compose** for Qdrant + Redis.
• **Removed Xcode/CLT steps** (brew and uv already installed).
• **Externalized RAG** to /opt/app//rag-service.
• Fixed path typos (project path) and updated all references.
• Kept PyTorch **MPS** acceleration for Apple Silicon (no CUDA).

Prereqs (expected present): Homebrew, uv. This runbook avoids Xcode.

## PHASE 0 — Verify Docker Engine (prefer Colima over Docker Desktop)

/bin/bash -lc 'eval "$(/opt/homebrew/bin/brew shellenv)" && 
( command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1 ) || 
( brew install colima docker && colima start && docker version && docker compose version )'

## PHASE 1 — Infra via Docker Compose (Qdrant + Redis Stack)

mkdir -p /opt/app//{infra,data/qdrant,data/redis} && \
cat > /opt/app//infra/docker-compose.yml <<'YAML'
version: "3.8"
services:
  qdrant:
    image: qdrant/qdrant:v1.15.5
    container_name: qdrant
    restart: unless-stopped
    ports:
      - "6333:6333"
      - "6334:6334"
    environment:
      - QDRANT__STORAGE__USE_MMAP=false
      - QDRANT__STORAGE__ON_DISK_PERSISTENCE=true
    volumes:
      - /opt/app//data/qdrant:/qdrant/storage
  redis:
    image: redis/redis-stack:7.2.0-v10
    container_name: rag-redis
    restart: unless-stopped
    ports:
      - "6379:6379"
    environment:
      - REDIS_ARGS=--appendonly yes
    volumes:
      - /opt/app//data/redis:/data
YAML
&& cd /opt/app//infra && \
docker compose up -d && sleep 3 && docker compose ps && \
( curl -sf http://127.0.0.1:6333/collections >/dev/null && echo "Qdrant up." ) || ( echo "Qdrant not responding" && exit 1 ) && \
docker exec rag-redis redis-cli ping

## PHASE 2 — Directory Layout & Repos (exact paths)

mkdir -p /opt/app/ && 
cd /opt/app/ && 
[ -d project/.git ] || git clone -b auto-tunnel --single-branch [https://github.com/project-author/PROJECT.git](https://github.com/project-author/PROJECT.git) project && 
[ -d project/.git ] || git clone -b claude-test --single-branch [https://github.com/project-author/project.git](https://github.com/project-author/project.git) project && 
echo "Repos ready at: $(pwd)/project  and  $(pwd)/project"

## PHASE 3 — Create rag-service (outside repos) + venv

mkdir -p /opt/app//rag-service && 
cd /opt/app//rag-service && 
uv venv && 
. .venv/bin/activate && 
python -V && 
echo "rag-service venv ready"

## PHASE 4 — Requirements for RAG stack (Apple Silicon / MPS)

cd /opt/app//rag-service && 
cat > requirements-rag.txt <<'EOF'

# Orchestration (eval libs removed to avoid conflicts)

langgraph>=1.0.0
langchain>=0.3.0
langchain-openai>=0.2.0
python-dotenv>=1.0.1
tenacity>=8.4.2
openai>=1.52.0,<3.0

# Vector DB & hybrid search

qdrant-client>=1.9.0
bm25s>=0.2.14
PyStemmer>=2.2.0.1

# Chunking / parsing

tree_sitter_languages>=1.10.2

# Reranking & Torch (MPS support on Apple Silicon)

sentence-transformers>=3.0.1
transformers>=4.44.0
accelerate>=0.33.0
torch>=2.4.0

# API & server

fastapi>=0.112.0
uvicorn[standard]>=0.30.0
redis>=5.0.0

# Utils

numpy>=1.26.0
scipy>=1.13.0
pandas>=2.2.0
EOF
&& 
uv pip install -r requirements-rag.txt && 
uv pip freeze > requirements.lock && 
python - <<'PY'
import torch
print('MPS available:', torch.backends.mps.is_available())
PY

## PHASE 5 — .env (local keys + service URLs)

cd /opt/app//rag-service && 
read -s -p "Enter OpenAI API key (will be written to .env): " OPENAI_API_KEY && echo && 
printf "OPENAI_API_KEY=%s\nQDRANT_URL=[http://127.0.0.1:6333\nREDIS_URL=redis://127.0.0.1:6379/0\nLANGCHAIN_TRACING_V2=false\nLANGCHAIN_PROJECT=project-rag\nRERANKER_MODEL=BAAI/bge-reranker-v2-m3\n](http://127.0.0.1:6333\nREDIS_URL=redis://127.0.0.1:6379/0\nLANGCHAIN_TRACING_V2=false\nLANGCHAIN_PROJECT=project-rag\nRERANKER_MODEL=BAAI/bge-reranker-v2-m3\n)" "$OPENAI_API_KEY" > .env && 
echo "Wrote $(pwd)/.env"

## PHASE 6 — Code: ast_chunker.py (syntax‑aware chunking)

cd /opt/app//rag-service && 
cat > ast_chunker.py <<'EOF'
import os, re, hashlib
from typing import Dict, List, Optional
from tree_sitter_languages import get_parser

LANG_MAP = {
".py": "python", ".js": "javascript", ".jsx": "javascript",
".ts": "typescript", ".tsx": "typescript",
".go": "go", ".java": "java", ".rs": "rust",
".c": "c", ".h": "c", ".cpp": "cpp", ".cc": "cpp", ".hpp": "cpp",
}

FUNC_NODES = {
"python": {"function_definition", "class_definition"},
"javascript": {"function_declaration", "class_declaration", "method_definition", "arrow_function"},
"typescript": {"function_declaration", "class_declaration", "method_signature", "method_definition", "arrow_function"},
"go": {"function_declaration", "method_declaration"},
"java": {"class_declaration", "method_declaration"},
"rust": {"function_item", "impl_item"},
"c": {"function_definition"},
"cpp": {"function_definition", "class_specifier"},
}

IMPORT_NODES = {
"python": {"import_statement", "import_from_statement"},
"javascript": {"import_declaration"},
"typescript": {"import_declaration"},
"go": {"import_declaration"},
"java": {"import_declaration"},
"rust": {"use_declaration"},
"c": set(), "cpp": set(),
}

def lang_from_path(path:str)->Optional[str]:
_, ext = os.path.splitext(path)
return LANG_MAP.get(ext.lower())

def nonws_len(s:str)->int:
return len(re.sub(r"\s+", "", s))

def extract_imports(src:str, lang:str)->List[str]:
try:
parser = get_parser(lang)
tree = parser.parse(bytes(src, "utf-8"))
imports = []
def walk(n):
if n.type in IMPORT_NODES.get(lang, set()):
imports.append(src[n.start_byte:n.end_byte])
for c in n.children:
walk(c)
walk(tree.root_node)
return imports
except Exception:
if lang == "python":
return re.findall(r"^(?:from\s+[^\n]+|import\s+[^\n]+)$", src, flags=re.M)
if lang in {"javascript","typescript"}:
return re.findall(r"^import\s+[^\n]+;$", src, flags=re.M)
return []

def greedy_fallback(src:str, fpath:str, lang:str, target:int)->List[Dict]:
sep = r"(?:\nclass\s+|\ndef\s+)" if lang=="python" else r"(?:\nclass\s+|\nfunction\s+)"
parts = re.split(sep, src)
if len(parts) < 2:
out, cur, acc = [], [], 0
for line in src.splitlines(True):
cur.append(line); acc += nonws_len(line)
if acc >= target:
out.append("".join(cur)); cur, acc = [], 0
if cur: out.append("".join(cur))
return [{
"id": int(hashlib.md5((fpath+str(i)+s[:80]).encode()).hexdigest()[:12],16),
"file_path": fpath, "language": lang, "type":"blob","name":None,
"start_line": 1, "end_line": s.count("\n")+1, "imports": extract_imports(src, lang), "code": s
} for i,s in enumerate(out)]
else:
rejoined, buf, acc = [], [], 0
for p in parts:
if acc + nonws_len(p) > target and buf:
s = "".join(buf); rejoined.append(s); buf, acc = [], 0
buf.append(p); acc += nonws_len(p)
if buf: rejoined.append("".join(buf))
return [{
"id": int(hashlib.md5((fpath+str(i)+s[:80]).encode()).hexdigest()[:12],16),
"file_path": fpath, "language": lang, "type":"section","name":None,
"start_line": 1, "end_line": s.count("\n")+1, "imports": extract_imports(s, lang), "code": s
} for i,s in enumerate(rejoined)]

def collect_files(roots:List)->List[str]:
out=[]
skip_dirs = {".git","node_modules",".venv","venv","dist","build","**pycache**",".next",".turbo",".parcel-cache",".pytest_cache"}
for root in roots:
for dp, dns, fns in os.walk(root):
dns[:] = [d for d in dns if d not in skip_dirs]
for fn in fns:
p = os.path.join(dp, fn)
if lang_from_path(p):
out.append(p)
return out
EOF

## PHASE 7 — Code: index_repo.py (BM25S + OpenAI embeddings + Qdrant)

cd /opt/app//rag-service && 
cat > index_repo.py <<'EOF'
import os, json, hashlib
from typing import List, Dict
from dotenv import load_dotenv
from ast_chunker import lang_from_path, collect_files, chunk_code
import bm25s
from bm25s.tokenization import Tokenizer
from Stemmer import Stemmer
from qdrant_client import QdrantClient, models
from openai import OpenAI

load_dotenv()
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
QDRANT_URL = os.getenv("QDRANT_URL","[http://127.0.0.1:6333](http://127.0.0.1:6333)")

BASES = [
"/opt/app//project",
"/opt/app//project"
]
OUTDIR = "/opt/app//rag-service/out"
COLLECTION = "code_chunks"

os.makedirs(OUTDIR, exist_ok=True)

def embed_texts(client:OpenAI, texts:List, batch:int=64)->List[List[float]]:
embs=[]
for i in range(0, len(texts), batch):
sub = texts[i:i+batch]
r = client.embeddings.create(model="text-embedding-3-large", input=sub)
for d in r.data:
embs.append(d.embedding)
return embs

def main():
files = collect_files(BASES)
print(f"Discovered {len(files)} source files.")
all_chunks: List[Dict] = []
for fp in files:
lang = lang_from_path(fp)
if not lang: continue
try:
with open(fp, "r", encoding="utf-8", errors="ignore") as f:
src = f.read()
except Exception:
continue
ch = chunk_code(src, fp, lang, target=900)
all_chunks.extend(ch)

```
# De-duplicate identical code blobs by content hash
seen = set()
chunks=[]
for c in all_chunks:
    h = hashlib.md5(c["code"].encode()).hexdigest()
    if h in seen: continue
    seen.add(h)
    c["hash"]=h
    chunks.append(c)

print(f"Prepared {len(chunks)} chunks.")

# ---------- BM25S ----------
corpus: List[str] = []
for c in chunks:
    pre = []
    if c.get("name"): pre += [c["name"]]*2
    if c.get("imports"): pre += [imp for imp in c["imports"] for _ in (0,)]
    body = c["code"]
    if c["language"]=="python":
        import re as _re
        m=_re.match(r'^\s*[ru]?"""(.*?)"""', body, flags=_re.S)
        if m: pre += [m.group(1)]
    corpus.append((" ".join(pre)+"\n"+body).strip())

stemmer = Stemmer("english")
tokenizer = Tokenizer(stemmer=stemmer, stopwords="en")
corpus_tokens = tokenizer.tokenize(corpus)
retriever = bm25s.BM25(method="lucene", k1=1.2, b=0.65)
retriever.index(corpus_tokens)
os.makedirs(os.path.join(OUTDIR, "bm25_index"), exist_ok=True)
retriever.save(os.path.join(OUTDIR, "bm25_index"), corpus=corpus)
tokenizer.save_vocab(save_dir=os.path.join(OUTDIR, "bm25_index"))
tokenizer.save_stopwords(save_dir=os.path.join(OUTDIR, "bm25_index"))
print("BM25 index saved.")

# ---------- Dense embeddings (OpenAI) ----------
client = OpenAI(api_key=OPENAI_API_KEY)
texts = [c["code"] for c in chunks]
embs = embed_texts(client, texts, batch=64)
assert len(embs)==len(chunks)

# ---------- Qdrant upsert ----------
q = QdrantClient(url=QDRANT_URL)
q.recreate_collection(
    collection_name=COLLECTION,
    vectors_config={"dense": models.VectorParams(size=len(embs[0]), distance=models.Distance.COSINE)},
    optimizers_config=models.OptimizersConfigDiff(memmap_threshold=20000),
)

points=[]
for c,v in zip(chunks, embs):
    points.append(models.PointStruct(
        id=int(c["id"]),
        vector={"dense": v},
        payload={
            "file_path": c["file_path"],
            "language": c["language"],
            "type": c["type"],
            "name": c["name"],
            "start_line": c["start_line"],
            "end_line": c["end_line"],
            "hash": c["hash"],
            "code": c["code"]
        }
    ))
    if len(points)==512:
        q.upsert(COLLECTION, points=points); points=[]
if points:
    q.upsert(COLLECTION, points=points)

with open(os.path.join(OUTDIR,"chunks.jsonl"),"w",encoding="utf-8") as f:
    for c in chunks:
        f.write(json.dumps(c, ensure_ascii=False)+"\n")
print(f"Indexed {len(chunks)} chunks to Qdrant and BM25S.")
```

if **name**=="**main**":
main()
EOF

## PHASE 8 — Code: rerank.py (Cross‑Encoder with MPS if available)

cd /opt/app//rag-service && 
cat > rerank.py <<'EOF'
import os
from typing import List, Dict
import torch
from sentence_transformers import CrossEncoder
from dotenv import load_dotenv
load_dotenv()

_DEVICE = "mps" if torch.backends.mps.is_available() else ("cuda" if torch.cuda.is_available() else "cpu")
_MODEL = os.getenv("RERANKER_MODEL","BAAI/bge-reranker-v2-m3")
_ce = CrossEncoder(_MODEL, max_length=512, device=_DEVICE)

def rerank(query:str, docs:List, top_k:int=10)->List[Dict]:
if not docs: return []
pairs = [(query, d.get("code","")) for d in docs]
scores = _ce.predict(pairs, batch_size=32)
import numpy as np
sig = 1/(1+np.exp(-scores))
ranked = sorted(zip(docs, sig.tolist()), key=lambda x: x[1], reverse=True)
out=[]
for d, s in ranked[:top_k]:
d = dict(d)
d["rerank_score"] = float(s)
out.append(d)
return out
EOF

## PHASE 9 — Code: hybrid_search.py (BM25S + Qdrant + RRF + rerank)

cd /opt/app//rag-service && 
cat > hybrid_search.py <<'EOF'
import os, collections
from typing import List, Dict
from dotenv import load_dotenv
from qdrant_client import QdrantClient
import bm25s
from bm25s.hf import BM25HF
from bm25s.tokenization import Tokenizer
from rerank import rerank as ce_rerank

load_dotenv()
QDRANT_URL = os.getenv("QDRANT_URL","[http://127.0.0.1:6333](http://127.0.0.1:6333)")
COLLECTION = "code_chunks"

# RRF fuse

def rrf(dense:List, sparse:List, k:int=10, kdiv:int=60)->List[int]:
score = collections.defaultdict(float)
for rank, pid in enumerate(dense, start=1):
score[pid] += 1.0/(kdiv+rank)
for rank, pid in enumerate(sparse, start=1):
score[pid] += 1.0/(kdiv+rank)
ranked = sorted(score.items(), key=lambda x:x, reverse=True)
return [pid for pid,_ in ranked[:k]]

def search(query:str, topk_dense:int=75, topk_sparse:int=75, final_k:int=10)->List[Dict]:
# ---- Dense (Qdrant) ----
qc = QdrantClient(url=QDRANT_URL)
from openai import OpenAI
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
e = client.embeddings.create(model="text-embedding-3-large", input=[query]).data[0].embedding
dres = qc.search(collection_name=COLLECTION, query_vector=("dense", e), limit=topk_dense, with_payload=True)
dense = [(int(p.id), p.payload) for p in dres]

```
# ---- Sparse (BM25S) ----
idx_dir = os.path.join(os.path.dirname(__file__), "out", "bm25_index")
retriever = BM25HF.load(idx_dir) if os.path.exists(idx_dir+".npz") else bm25s.BM25.load(idx_dir)
query_tokens = bm25s.tokenize(query, stopwords="en")
ids, scores = retriever.retrieve(query_tokens, k=topk_sparse)
ids = ids.tolist()[0] if hasattr(ids, "tolist") else list(ids[0])

# Quick join by prefix of code payload
dense_by_code = {p.get("code","")[:256]: (pid,p) for pid,p in dense}
sparse_ids=[]
# Need the original corpus strings for prefix mapping
corpus = getattr(retriever, 'corpus', None)
if corpus is None:
    # If using pure BM25, load from files saved alongside index
    import json
    with open(os.path.join(idx_dir, 'corpus.json'), 'r') as f:
        corpus = json.load(f)
for i in ids:
    code = corpus[i]
    key = code[:256]
    if key in dense_by_code:
        sparse_ids.append(dense_by_code[key][0])

# ---- RRF fusion ----
dense_ids = [pid for pid,_ in dense]
fused_ids = rrf(dense_ids, sparse_ids, k=max(final_k, 20))

# ---- Collect docs ----
keep = []
dense_lookup = {pid: payload for pid, payload in dense}
for pid in fused_ids:
    if pid in dense_lookup:
        payload = dense_lookup[pid]
        keep.append({"id": pid, **payload})

# ---- Diversity: max 2 per directory ----
out, seen = [], collections.Counter()
for d in keep:
    dirkey = os.path.dirname(d.get("file_path",""))
    if seen[dirkey] < 2:
        out.append(d); seen[dirkey]+=1
    if len(out)>=max(final_k, 20):
        break

# ---- Cross-encoder rerank to final_k ----
reranked = ce_rerank(query, out, top_k=final_k)
return reranked
```

if **name**=="**main**":
import sys, json
q = " ".join(sys.argv[1:]) if len(sys.argv)>1 else "where is oauth token validated"
res = search(q, final_k=10)
print(json.dumps([{k:v for k,v in r.items() if k!='code'} for r in res], indent=2))
EOF

## PHASE 10 — Code: langgraph_app.py (iterative retrieval w/ Redis)

cd /opt/app//rag-service && 
cat > langgraph_app.py <<'EOF'
from typing import TypedDict, Annotated, List, Dict
import operator, os
from dotenv import load_dotenv
load_dotenv()

from langgraph.graph import StateGraph, END
from langgraph.checkpoint.redis import RedisSaver
from hybrid_search import search as hybrid_search
from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

class RAGState(TypedDict):
question: str
documents: Annotated[List[Dict], operator.add]
generation: str
iteration: int
confidence: float

def retrieve_node(state:RAGState)->Dict:
q = state["question"]
docs = hybrid_search(q, final_k=10)
conf = float(sum(d.get("rerank_score",0.0) for d in docs)/max(1,len(docs)))
return {"documents": docs, "confidence": conf, "iteration": state.get("iteration",0)+1}

def route_after_retrieval(state:RAGState)->str:
conf = state.get("confidence",0.0)
it = state.get("iteration",0)
if conf >= 0.70:
return "generate"
if it >= 3:
return "fallback"
return "rewrite_query"

def rewrite_query(state:RAGState)->Dict:
q = state["question"]
prompt = f"Rewrite this developer question to be maximally searchable against code (expand CamelCase, add likely API names) without changing meaning:\n\n{q}\n\nRewritten:"
r = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role":"user","content":prompt}], temperature=0.2)
newq = r.choices[0].message.content.strip()
return {"question": newq}

def generate_node(state:RAGState)->Dict:
q = state["question"]
ctx = state["documents"][:5]
citations = "\n".join([f"- {d['file_path']}:{d['start_line']}-{d['end_line']}" for d in ctx])
context_text = "\n\n".join([d["code"] for d in ctx])
sys = "You answer strictly from the provided code context. Always cite file paths and line ranges you used."
user = f"Question:\n{q}\n\nContext:\n{context_text}\n\nCitations (paths and line ranges):\n{citations}\n\nAnswer:"
r = client.chat.completions.create(model="gpt-4o-mini", messages=[{"role":"system","content":sys},{"role":"user","content":user}], temperature=0.2)
return {"generation": r.choices[0].message.content}

def fallback_node(state:RAGState)->Dict:
return {"generation": "I don't have high confidence from local code. Try refining the question or expanding context."}

def build_graph():
builder = StateGraph(RAGState)
builder.add_node("retrieve", retrieve_node)
builder.add_node("rewrite_query", rewrite_query)
builder.add_node("generate", generate_node)
builder.add_node("fallback", fallback_node)

```
builder.set_entry_point("retrieve")
builder.add_conditional_edges("retrieve", route_after_retrieval, {
    "generate": "generate",
    "rewrite_query": "rewrite_query",
    "fallback": "fallback"
})
builder.add_edge("rewrite_query", "retrieve")
builder.add_edge("generate", END)
builder.add_edge("fallback", END)

DB_URI = os.getenv("REDIS_URL","redis://127.0.0.1:6379/0")
with RedisSaver.from_conn_string(DB_URI) as checkpointer:
    graph = builder.compile(checkpointer=checkpointer)
return graph
```

if **name**=="**main**":
import sys
q = " ".join(sys.argv[1:]) if len(sys.argv)>1 else "Where is OAuth token validated?"
graph = build_graph()
cfg = {"configurable": {"thread_id": "dev"}}
result = graph.invoke({"question": q, "documents": [], "generation":"", "iteration":0, "confidence":0.0}, cfg)
print(result["generation"])
EOF

## PHASE 11 — Code: serve_rag.py (FastAPI wrapper)

cd /opt/app//rag-service && 
cat > serve_rag.py <<'EOF'
from fastapi import FastAPI, Query
from pydantic import BaseModel
from typing import Optional
from langgraph_app import build_graph

app = FastAPI(title="PROJECT/PROJECT RAG")

_graph = None

def get_graph():
global _graph
if _graph is None:
_graph = build_graph()
return _graph

CFG = {"configurable": {"thread_id": "http"}}

class Answer(BaseModel):
answer: str

@app.get("/health")
def health():
try:
g = get_graph()
return {"status": "healthy", "graph_loaded": g is not None}
except Exception as e:
return {"status": "error", "detail": str(e)}

@app.get("/answer", response_model=Answer)
def answer(q: str = Query(..., description="Question")):
g = get_graph()
state = {"question": q, "documents": [], "generation":"", "iteration":0, "confidence":0.0}
res = g.invoke(state, CFG)
return {"answer": res["generation"]}
EOF

## PHASE 12 — Build the Index (first run)

cd /opt/app//rag-service && 
. .venv/bin/activate && 
python index_repo.py

## PHASE 13 — Smoke Tests (CLI + HTTP)

# 1) Hybrid search JSON preview (no code bodies)

cd /opt/app//rag-service && 
. .venv/bin/activate && 
python -c 'from hybrid_search import search; import json; print(json.dumps([{k:v for k,v in search("where is oauth validated", final_k=10)[i].items() if k!="code"} for i in range(10)], indent=2))'

# 2) LangGraph end-to-end

cd /opt/app//rag-service && 
. .venv/bin/activate && 
python langgraph_app.py "Explain the admin diagnostics handler flow and where auth checks occur"

# 3) REST API

cd /opt/app//rag-service && 
. .venv/bin/activate && 
uvicorn serve_rag:app --host 127.0.0.1 --port 8012

## PHASE 14 — Retrieval quality improvements (applied)

- Path-aware rerank: hybrid_search applies a small bonus for file paths containing `/identity/`, `/auth/`, `/server`, `/backend`, `/api/` before the final sort.
- Gate heuristic: generation triggers when top‑1 ≥ 0.62 OR avg(top‑5) ≥ 0.55 (with a 3‑iteration cap). Retrieval uses `final_k=20`.

## PHASE 15 — Verification (post-index)

Counts aligned (Qdrant vs BM25 corpus):

cd /opt/app//rag-service && \
. .venv/bin/activate && \
python - <<'PY'
import os, json
from qdrant_client import QdrantClient
q = QdrantClient(url=os.getenv("QDRANT_URL","http://127.0.0.1:6333"))
c = q.count("code_chunks", exact=True).count
corpus_txt = 'out/bm25_index/corpus.txt'
print({"qdrant_points": c, "bm25_corpus_len": sum(1 for _ in open(corpus_txt, 'r', encoding='utf-8'))})
PY

Hybrid returns results:

python - <<'PY'
from hybrid_search import search
print("hybrid_len", len(search("Where is OAuth token validated in the server?", final_k=5)))
PY

One UUID round-trip (BM25 index → Qdrant via map):

python - <<'PY'
import os, json, random
from qdrant_client import QdrantClient
mp = json.load(open('out/bm25_index/bm25_point_ids.json'))
point_id = random.choice(list(mp.values()))
cli = QdrantClient(url=os.getenv('QDRANT_URL','http://127.0.0.1:6333'))
res = cli.retrieve(collection_name='code_chunks', ids=[point_id], with_payload=True)
p = res[0] if res else None
print({"ok": bool(p), "point_id": point_id, "file_path": p.payload.get("file_path") if p else None})
PY

## PHASE 14 — Daily Ops (re-index & services)

# Re-index after code changes

cd /opt/app//rag-service && 
. .venv/bin/activate && 
python index_repo.py

# Restart infra

cd /opt/app//infra && 
docker compose restart qdrant redis

## OPTIONAL — Migrate an existing in-repo rag/ to rag-service

# Only run this if you previously had /project/rag/** files.

# It safely copies out (including dotfiles) then removes the old rag/.

[ -d /opt/app//project/rag ] && 
mkdir -p /opt/app//rag-service && 
rsync -av --delete --exclude '**pycache**' /opt/app//project/rag/ /opt/app//rag-service/ && 
rm -rf /opt/app//project/rag && 
cd /opt/app//rag-service && 
uv venv && 
. .venv/bin/activate && 
uv pip install -r requirements-rag.txt && 
uv pip freeze > requirements.lock && \

# (No sed needed because OUTDIR and BASES are already correct in this runbook)

python index_repo.py

## NOTES & TUNING

• Hybrid search: RRF fusion of BM25S and Qdrant dense; rerank with BAAI/bge-reranker-v2-m3.
• Iterations & confidence: 3‑iteration cap; generate when top‑1 ≥ 0.62 OR avg(top‑5) ≥ 0.55.
• Dense embeddings: OpenAI `text-embedding-3-large` (3072 dims); upsert batches of 64 for stability.
• IDs & mapping: chunk IDs are string hex (md5[:12]); Qdrant point IDs are stable UUIDv5; mapping files `chunk_ids.txt` and `bm25_point_ids.json` are written.
• Path-aware rerank: small bonus for file paths containing `/identity/`, `/auth/`, `/server`, `/backend`, `/api/`.
• Checkpointing: Redis (via compose) backs LangGraph checkpoints.
• Performance: Cross‑encoder uses PyTorch MPS when available; batch size 32.
• Security: Secrets live only in rag-service/.env; never checked into repos.
• Apple Silicon: No CUDA; MPS handles GPU acceleration. ANE is not directly targeted by PyTorch; models run on GPU via MPS.

• Answer header: All generated answers include a leading header indicating the active repo, e.g. `[repo: project]` or `[repo: project]`.

## Repo‑Scoped Indexing & Switching (PROJECT vs PROJECT)

This RAG can index/search each repo independently. Control which repo is active via `REPO` in `.env`:

- `REPO=project` → BASES: `/opt/app//project`, OUTDIR: `out/project`, Qdrant collection: `code_chunks_project`.
- `REPO=project` → BASES: `/opt/app//project`, OUTDIR: `out/project`, Qdrant collection: `code_chunks_project`.

Switch and index:

cd /opt/app//rag-service && \
. .venv/bin/activate && \
awk 'BEGIN{d=0} /^REPO=/{print "REPO=project"; d=1; next} {print} END{if(!d) print "REPO=project"}' .env > .env.tmp && mv .env.tmp .env && \
python index_repo.py && \
python - <<'PY'
import os
from qdrant_client import QdrantClient
q=QdrantClient(url=os.getenv('QDRANT_URL','http://127.0.0.1:6333'))
print({'qdrant_points_project': q.count('code_chunks_project', exact=True).count})
PY

awk 'BEGIN{d=0} /^REPO=/{print "REPO=project"; d=1; next} {print} END{if(!d) print "REPO=project"}' .env > .env.tmp && mv .env.tmp .env && \
python index_repo.py && \
python - <<'PY'
import os
from qdrant_client import QdrantClient
q=QdrantClient(url=os.getenv('QDRANT_URL','http://127.0.0.1:6333'))
print({'qdrant_points_project': q.count('code_chunks_project', exact=True).count})
PY

Note: To keep the PROJECT index clean, consider excluding large vendor directories (e.g., `vendor/`, `vendor/bundle/`, `.bundle/`, `tmp/`, `log/`). Add these to the skip list in `ast_chunker.collect_files` if needed.

## PHASE 17 — Embedding Cache (saves credits)

Purpose: Avoid re-embedding unchanged chunks. Reindex anytime; unchanged vectors are reused.

- Where: `embed_cache.py`, used automatically by `index_repo.py`.
- Cache path: `out/<REPO>/embed_cache.jsonl` (hash → vector).
- Behavior: On reindex, only new/changed hashes are embedded; the rest load from the cache.

## PHASE 18 — Slim Qdrant Payload + Local Code Hydration

Purpose: Prevent Qdrant 500s by avoiding large payloads and loading code bodies locally.

- Qdrant payload includes only: `file_path`, `start_line`, `end_line`, `language`, `layer`, `repo`, `hash`, `id`.
- Code bodies are hydrated from `out/<REPO>/chunks.jsonl` by `hash`/`id` before rerank/generation.

## PHASE 19 — Multi‑Query Retrieval (cheap recall boost)

Purpose: Expand a query into 2–4 phrasings (4o‑mini) and re‑rank the union per‑repo (never fused).

- API:
  - `search_routed_multi(q, repo_override=None, m=4, final_k=10)` (Python)
  - Generation auto‑uses this as a second pass if confidence < 0.55.
- CLI example (PROJECT):

cd /opt/app//rag-service && \
. .venv/bin/activate && \
python - <<'PY'
from hybrid_search import search_routed_multi
R = search_routed_multi('Where is ProviderSetupWizard rendered?', repo_override='project', m=4, final_k=5)
print([d['file_path'] for d in R])
PY

## PHASE 20 — Codebook “Cards” (structured summaries)

Purpose: 1–3 line JSON per chunk (symbols, purpose, routes) to aid retrieval, especially UI/integrations.

- Build (per repo):

cd /opt/app//rag-service && \
. .venv/bin/activate && \
REPO=project python build_cards.py

- PROJECT cards (can be large, use a cap first):

REPO=project CARDS_MAX=300 python build_cards.py

Notes: CARDS_MAX limits how many chunks to summarize on a first pass. Omit to build all.

- Artifacts:
  - JSONL: `out/<REPO>/cards.jsonl`
  - BM25: `out/<REPO>/bm25_cards`

## PHASE 21 — Eval Harness (golden questions)

Purpose: Track retrieval hit‑rate (top‑1/top‑k) and correctness.

- Create `golden.json` (example):

[
  {"q": "Where is ProviderSetupWizard rendered?", "repo": "project", "expect_paths": ["core/admin_ui/src/components/ProviderSetupWizard.tsx"]},
  {"q": "Where do we mask PHI in events?", "repo": "project", "expect_paths": ["app/"]}
]

- Run:

cd /opt/app//rag-service && \
. .venv/bin/activate && \
REPO=project EVAL_MULTI=1 EVAL_FINAL_K=5 python eval_rag.py

## PHASE 22 — Strict Per‑Repo Routing & Answer Header

- Routing: `search_routed(q, repo_override=None)` always targets exactly one repo (PROJECT or PROJECT). `?repo=project|project` overrides via API.
- No fusion: router never combines repos.
- Answer header: All generated answers include `[repo: project]` or `[repo: project]` on the first line.

## PHASE 23 — PROJECT‑Only Path Boosts (env‑tunable)

Purpose: Nudge scoring toward first‑party app code without hiding vendor content.

- Env: `project_PATH_BOOSTS` (comma‑separated substrings; default: `app/,lib/,config/,scripts/,server/,api/,api/app,app/services,app/routers`).
- Applied only when `repo=project`. Each match adds a small bonus; capped.

## PHASE 17 — Embedding Cache (saves credits)

Purpose: Avoid re-embedding unchanged chunks. Reindex anytime; unchanged vectors are reused.

- Where: `embed_cache.py`, used automatically by `index_repo.py`.
- Cache path: `out/<REPO>/embed_cache.jsonl` (hash → vector).
- Behavior: On reindex, only new/changed hashes are embedded; the rest load from the cache.

## PHASE 18 — Slim Qdrant Payload + Local Code Hydration

Purpose: Prevent Qdrant 500s by avoiding large payloads and loading code bodies locally.

- Qdrant payload includes only: `file_path`, `start_line`, `end_line`, `language`, `layer`, `repo`, `hash`, `id`.
- Code bodies are hydrated from `out/<REPO>/chunks.jsonl` by `hash`/`id` before rerank/generation.

## PHASE 19 — Multi‑Query Retrieval (cheap recall boost)

Purpose: Expand a query into 2–4 phrasings (4o‑mini) and re‑rank the union per‑repo (never fused).

- API:
  - `search_routed_multi(q, repo_override=None, m=4, final_k=10)` (Python)
  - Generation auto‑uses this as a second pass if confidence < 0.55.
- CLI example (project):

cd /Users/davidmontgomery//rag-service && \
. .venv/bin/activate && \
python - <<'PY'
from hybrid_search import search_routed_multi
R = search_routed_multi('Where is ProviderSetupWizard rendered?', repo_override='project', m=4, final_k=5)
print([d['file_path'] for d in R])
PY

## PHASE 20 — Codebook “Cards” (structured summaries)

Purpose: 1–3 line JSON per chunk (symbols, purpose, routes) to aid retrieval, especially UI/integrations.

- Build (per repo):

cd /Users/davidmontgomery//rag-service && \
. .venv/bin/activate && \
REPO=project python build_cards.py

- project cards (can be large, use a cap first):

REPO=project CARDS_MAX=300 python build_cards.py

Notes: CARDS_MAX limits how many chunks to summarize on a first pass. Omit to build all.

- Artifacts:
  - JSONL: `out/<REPO>/cards.jsonl`
  - BM25: `out/<REPO>/bm25_cards`

## PHASE 21 — Eval Harness (golden questions)

Purpose: Track retrieval hit‑rate (top‑1/top‑k) and correctness.

- Create `golden.json` (example):

[
  {"q": "Where is ProviderSetupWizard rendered?", "repo": "project", "expect_paths": ["core/admin_ui/src/components/ProviderSetupWizard.tsx"]},
  {"q": "Where do we mask PHI in events?", "repo": "project", "expect_paths": ["app/"]}
]

- Run:

cd /Users/davidmontgomery//rag-service && \
. .venv/bin/activate && \
REPO=project EVAL_MULTI=1 EVAL_FINAL_K=5 python eval_rag.py

## PHASE 22 — Strict Per‑Repo Routing & Answer Header

- Routing: `search_routed(q, repo_override=None)` always targets exactly one repo (project or project). `?repo=project|project` overrides via API.
- No fusion: router never combines repos.
- Answer header: All generated answers include `[repo: project]` or `[repo: project]` on the first line.

## PHASE 23 — project‑Only Path Boosts (env‑tunable)

Purpose: Nudge scoring toward first‑party app code without hiding vendor content.

- Env: `project_PATH_BOOSTS` (comma‑separated substrings; default: `app/,lib/,config/,scripts/,server/,api/,api/app,app/services,app/routers`).
- Applied only when `repo=project`. Each match adds a small bonus; capped.

===================================================================
END OF UPDATED RUNBOOK
======================
