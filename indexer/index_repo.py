import os
import json
import hashlib
from typing import List, Dict
from pathlib import Path
from dotenv import load_dotenv, find_dotenv
import fnmatch
import pathlib
from datetime import datetime
import time as _time
import common.qdrant_utils as qdrant_recreate_fallback  # make recreate_collection 404-safe
from common.config_loader import get_repo_paths, out_dir, exclude_paths
from common.paths import data_dir
from common.filtering import _prune_dirs_in_place, _should_index_file, PRUNE_DIRS
from retrieval.ast_chunker import lang_from_path, collect_files, chunk_code
import bm25s  # type: ignore
from bm25s.tokenization import Tokenizer  # type: ignore
from Stemmer import Stemmer  # type: ignore
from qdrant_client import QdrantClient, models
import uuid
from openai import OpenAI
from retrieval.embed_cache import EmbeddingCache
import tiktoken
# Lazy import heavy models only when needed (avoid memory spikes on BM25-only runs)
def _load_st_model(model_name: str):
    from sentence_transformers import SentenceTransformer  # type: ignore
    return SentenceTransformer(model_name)

# --- global safe filters (avoid indexing junk) ---
# Patch os.walk to prune noisy dirs and skip junk file types
_os_walk = os.walk
def _filtered_os_walk(top, *args, **kwargs):
    for root, dirs, files in _os_walk(top, *args, **kwargs):
        _prune_dirs_in_place(dirs)
        files[:] = [f for f in files if _should_index_file(f)]
        yield root, dirs, files
os.walk = _filtered_os_walk  # type: ignore

# Patch Path.rglob as well (if code uses it)
_Path_rglob = Path.rglob
def _filtered_rglob(self, pattern):
    for p in _Path_rglob(self, pattern):
        # skip if any pruned dir appears in the path
        if any(part in PRUNE_DIRS for part in p.parts):
            continue
        if not _should_index_file(p.name):
            continue
        yield p
Path.rglob = _filtered_rglob  # type: ignore
# --- end filters ---


# Load local env and also repo-root .env if present (no hard-coded paths)
try:
    load_dotenv(override=False)
    repo_root = Path(__file__).resolve().parent
    env_path = repo_root / ".env"
    if env_path.exists():
        load_dotenv(dotenv_path=env_path, override=False)
    else:
        alt = find_dotenv(usecwd=True)
        if alt:
            load_dotenv(dotenv_path=alt, override=False)
except Exception:
    pass

# Initialize config registry for tunable parameters
from server.services.config_registry import get_config_registry
_config = get_config_registry()

OPENAI_API_KEY = os.getenv('OPENAI_API_KEY')
if OPENAI_API_KEY and OPENAI_API_KEY.strip().upper() in {"SK-REPLACE", "REPLACE"}:
    OPENAI_API_KEY = None
QDRANT_URL = os.getenv('QDRANT_URL','http://127.0.0.1:6333')
# Repo scoping
REPO = os.getenv('REPO', 'project').strip()
# Resolve repo paths and outdir from config (repos.json or env)
try:
    BASES = get_repo_paths(REPO)
except Exception:
    # Fallback to current directory when no config present (best-effort)
    BASES = [str(Path(__file__).resolve().parent)]
OUTDIR = out_dir(REPO)
# Allow explicit collection override (for versioned collections per embedding config)
COLLECTION = os.getenv('COLLECTION_NAME', f'code_chunks_{REPO}')


# Centralized file indexing gate (extensions, excludes, heuristics)
SOURCE_EXTS = {
    ".py", ".rb", ".ts", ".tsx", ".js", ".jsx", ".go", ".rs", ".java",
    ".cs", ".c", ".h", ".cpp", ".hpp", ".m", ".mm", ".kt", ".kts", ".swift",
    ".sql", ".yml", ".yaml", ".toml", ".ini", ".json", ".txt", ".sh", ".bash"
    # Note: .md excluded per user requirement - filtering.py blocks it
}
EXCLUDE_GLOBS_FILE = str((data_dir() / "exclude_globs.txt").resolve())

def _load_exclude_globs() -> list[str]:
    p = pathlib.Path(EXCLUDE_GLOBS_FILE)
    if not p.exists():
        return []
    return [ln.strip() for ln in p.read_text().splitlines() if ln.strip() and not ln.startswith("#")]

_EXCLUDE_GLOBS = _load_exclude_globs()

def should_index_file(path: str, repo_exclude_patterns: List[str] = None) -> bool:
    """Check if a file should be indexed.

    Args:
        path: Absolute file path
        repo_exclude_patterns: List of exclude patterns from repo config (glob patterns)
    """
    p = pathlib.Path(path)
    # 1) fast deny: extension must look like source
    if p.suffix.lower() not in SOURCE_EXTS:
        return False

    # 2) repo-specific exclude patterns (from repos.json)
    if repo_exclude_patterns:
        as_posix = p.as_posix()
        for pat in repo_exclude_patterns:
            # Support both absolute paths from repo root and glob patterns
            # Pattern can be: /path/to/dir, *.ext, or /path/*.ext
            if fnmatch.fnmatch(as_posix, pat) or fnmatch.fnmatch(as_posix, f"*{pat}*"):
                return False

    # 3) global glob excludes (vendor, caches, images, minified, etc.)
    as_posix = p.as_posix()
    for pat in _EXCLUDE_GLOBS:
        if fnmatch.fnmatch(as_posix, pat):
            return False

    # 4) quick heuristic to skip huge/minified one-liners
    try:
        text = p.read_text(errors="ignore")
        if len(text) > 2_000_000:  # ~2MB
            return False
        lines = text.splitlines()
        if lines:
            avg = sum(len(x) for x in lines) / max(1, len(lines))
            if avg > 2500:
                return False
    except Exception:
        return False
    return True


"""Repo-aware layer tagging for AGRO.

Maps files to one of the engine's actual layers:
  gui, server, retrieval, indexer, eval, scripts, common, infra
Defaults to 'server' when no match.
"""
def detect_layer(fp: str) -> str:
    f = (fp or '').lower()
    if '/gui/' in f or '/public/' in f:
        return 'gui'
    if '/server/' in f:
        return 'server'
    if '/retrieval/' in f:
        return 'retrieval'
    if '/indexer/' in f:
        return 'indexer'
    if '/eval/' in f or '/tests/' in f:
        return 'eval'
    if '/scripts/' in f:
        return 'scripts'
    if '/common/' in f:
        return 'common'
    if '/infra/' in f:
        return 'infra'
    return 'server'

VENDOR_MARKERS = (
    "/vendor/","/third_party/","/external/","/deps/","/node_modules/",
    "/Pods/","/Godeps/","/.bundle/","/bundle/"
)
def detect_origin(fp: str) -> str:
    low = (fp or '').lower()
    for m in VENDOR_MARKERS:
        if m in low:
            return 'vendor'
    try:
        with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
            head = ''.join([next(f) for _ in range(12)])
        if any(k in head.lower() for k in (
            'apache license','mit license','bsd license','mozilla public license'
        )):
            return 'vendor'
    except Exception:
        pass
    return 'first_party'
os.makedirs(OUTDIR, exist_ok=True)

def _clip_for_openai(text: str, enc, max_tokens: int = 8000) -> str:
    toks = enc.encode(text)
    if len(toks) <= max_tokens:
        return text
    return enc.decode(toks[:max_tokens])

def embed_texts(client: OpenAI, texts: List[str], model: str = 'text-embedding-3-large', batch: int = 64) -> List[List[float]]:
    embs = []
    enc = tiktoken.get_encoding('cl100k_base')
    for i in range(0, len(texts), batch):
        sub = [_clip_for_openai(t, enc) for t in texts[i:i+batch]]
        r = client.embeddings.create(model=model, input=sub)
        for d in r.data:
            embs.append(d.embedding)
    return embs

def embed_texts_local(texts: List[str], model_name: str = 'BAAI/bge-small-en-v1.5', batch: int = 128) -> List[List[float]]:
    model = _load_st_model(model_name)
    out = []
    for i in range(0, len(texts), batch):
        sub = texts[i:i+batch]
        v = model.encode(sub, normalize_embeddings=True, show_progress_bar=False)
        out.extend(v.tolist())
    return out

def _renorm_truncate(vecs: List[List[float]], dim: int) -> List[List[float]]:
    out: List[List[float]] = []
    import math as _m
    for v in vecs:
        w = v[:dim] if dim and dim < len(v) else v
        n = _m.sqrt(sum(x*x for x in w)) or 1.0
        out.append([x / n for x in w])
    return out

def embed_texts_mxbai(texts: List[str], dim: int = 512, batch: int = 128) -> List[List[float]]:
    model = _load_st_model('mixedbread-ai/mxbai-embed-large-v1')
    out: List[List[float]] = []
    for i in range(0, len(texts), batch):
        sub = texts[i:i+batch]
        v = model.encode(sub, normalize_embeddings=True, show_progress_bar=False)
        out.extend(v.tolist())
    return _renorm_truncate(out, dim)

def embed_texts_voyage(texts: List[str], model: str = 'voyage-code-3', batch: int = 128, output_dimension: int = 512) -> List[List[float]]:
    import voyageai  # type: ignore
    client = voyageai.Client(api_key=os.getenv('VOYAGE_API_KEY'))
    out: List[List[float]] = []
    for i in range(0, len(texts), batch):
        sub = texts[i:i+batch]
        r = client.embed(sub, model=model, input_type='document', output_dimension=output_dimension)
        out.extend(r.embeddings)
    return out

def main() -> None:
    # Prepare tracking output dir
    tracking_dir = Path(os.getenv('TRACKING_DIR', str(Path(__file__).resolve().parents[1] / 'data' / 'tracking')))
    tracking_dir.mkdir(parents=True, exist_ok=True)
    indexing_log = tracking_dir / 'indexing_events.jsonl'

    # Load repo-specific exclude patterns from repos.json
    repo_exclude_patterns = exclude_paths(REPO)
    if repo_exclude_patterns:
        print(f'Loaded {len(repo_exclude_patterns)} exclude patterns for repo "{REPO}": {repo_exclude_patterns}')

    t_collect0 = _time.time()
    files = collect_files(BASES)
    print(f'Discovered {len(files)} source files.')
    t_collect = _time.time() - t_collect0
    all_chunks: List[Dict] = []
    t_chunk0 = _time.time()
    for fp in files:
        if not should_index_file(fp, repo_exclude_patterns):
            continue
        lang = lang_from_path(fp)
        if not lang:
            continue
        try:
            with open(fp, 'r', encoding='utf-8', errors='ignore') as f:
                src = f.read()
        except Exception:
            continue

        # Convert absolute path to relative path (for portability)
        # Try to make it relative to one of the repo base paths
        relative_fp = fp
        for base in BASES:
            try:
                relative_fp = str(Path(fp).relative_to(Path(base)))
                break
            except ValueError:
                # fp is not relative to this base, try next one
                continue

        ch = chunk_code(src, relative_fp, lang, target=900)
        all_chunks.extend(ch)

    seen, chunks = set(), []
    for c in all_chunks:
        c['repo'] = REPO
        try:
            c['layer'] = detect_layer(c.get('file_path',''))
        except Exception:
            c['layer'] = 'server'
        try:
            c['origin'] = detect_origin(c.get('file_path',''))
        except Exception:
            c['origin'] = 'first_party'
        h = hashlib.md5(c['code'].encode()).hexdigest()
        if h in seen:
            continue
        seen.add(h)
        c['hash'] = h
        chunks.append(c)
    t_chunk = _time.time() - t_chunk0
    print(f'Prepared {len(chunks)} chunks.')

    ENRICH = _config.get_bool('ENRICH_CODE_CHUNKS', False)
    enrich = None  # type: ignore[assignment]
    gen_model = _config.get_str('GEN_MODEL', _config.get_str('ENRICH_MODEL', ''))
    enrich_stats = {"count": 0, "seconds": 0.0, "tokens": 0, "cost_usd": 0.0, "model": gen_model}
    if ENRICH:
        try:
            from common.metadata import enrich  # type: ignore
        except Exception:
            pass
        if enrich is not None:
            _t0 = _time.time()
            # Mark time window to correlate with API tracker logs for true tokens/cost
            from datetime import datetime as _dt
            _win_start = _dt.utcnow()
            for c in chunks:
                try:
                    meta = enrich(c.get('file_path',''), c.get('language',''), c.get('code',''))
                    c['summary'] = meta.get('summary','')
                    c['keywords'] = meta.get('keywords', [])
                    enrich_stats["count"] += 1
                except Exception:
                    c['summary'] = ''
                    c['keywords'] = []
            enrich_stats["seconds"] = round(_time.time() - _t0, 3)
            # Correlate with API tracker JSONL to get tokens + cost for enrichment window
            try:
                from pathlib import Path as _P
                import json as _json
                _tracker_path = _P(__file__).resolve().parents[1] / 'data' / 'tracking' / 'api_calls.jsonl'
                if _tracker_path.exists():
                    lines = _tracker_path.read_text(encoding='utf-8').splitlines()
                    # Parse minimal window
                    _win_end = _dt.utcnow()
                    def _parse_ts(s):
                        try:
                            return _dt.fromisoformat(s.replace('Z',''))
                        except Exception:
                            return None
                    for ln in lines[::-1]:  # reverse for recency
                        try:
                            o = _json.loads(ln)
                        except Exception:
                            continue
                        ts = _parse_ts(str(o.get('timestamp','')))
                        if not ts:
                            continue
                        if ts < _win_start:
                            break
                        # Only LLM calls (OpenAI responses/chat)
                        prov = str(o.get('provider','')).lower()
                        if prov in {'openai'}:
                            enrich_stats["tokens"] += int(o.get('tokens_estimated', 0) or 0)
                            try:
                                enrich_stats["cost_usd"] += float(o.get('cost_usd', 0.0) or 0.0)
                            except Exception:
                                pass
            except Exception:
                pass

    corpus: List[str] = []
    for c in chunks:
        pre = []
        if c.get('name'):
            pre += [c['name']]*2
        if c.get('imports'):
            pre += [i[0] or i[1] for i in c['imports'] if isinstance(i, (list, tuple))]
        body = c['code']
        corpus.append((' '.join(pre)+'\n'+body).strip())

    t_bm0 = _time.time()
    stemmer = Stemmer('english')
    tokenizer = Tokenizer(stemmer=stemmer, stopwords='en')
    corpus_tokens = tokenizer.tokenize(corpus)
    retriever = bm25s.BM25(method='lucene', k1=1.2, b=0.65)
    retriever.index(corpus_tokens)
    os.makedirs(os.path.join(OUTDIR, 'bm25_index'), exist_ok=True)
    try:
        retriever.vocab_dict = {str(k): v for k, v in retriever.vocab_dict.items()}
    except Exception:
        pass
    retriever.save(os.path.join(OUTDIR, 'bm25_index'), corpus=corpus)
    tokenizer.save_vocab(save_dir=os.path.join(OUTDIR, 'bm25_index'))
    tokenizer.save_stopwords(save_dir=os.path.join(OUTDIR, 'bm25_index'))
    with open(os.path.join(OUTDIR, 'bm25_index', 'corpus.txt'), 'w', encoding='utf-8') as f:
        for doc in corpus:
            f.write(doc.replace('\n','\\n')+'\n')
    chunk_ids = [str(c['id']) for c in chunks]
    with open(os.path.join(OUTDIR, 'bm25_index', 'chunk_ids.txt'), 'w', encoding='utf-8') as f:
        for cid in chunk_ids:
            f.write(cid+'\n')
    import json as _json
    _json.dump({str(i): cid for i, cid in enumerate(chunk_ids)}, open(os.path.join(OUTDIR,'bm25_index','bm25_map.json'),'w'))
    with open(os.path.join(OUTDIR,'chunks.jsonl'),'w',encoding='utf-8') as f:
        for c in chunks:
            f.write(json.dumps(c, ensure_ascii=False)+'\n')
    t_bm = _time.time() - t_bm0
    print('BM25 index saved.')

    try:
        meta = {
            'repo': REPO,
            'timestamp': datetime.utcnow().isoformat() + 'Z',
            'chunks_path': os.path.join(OUTDIR, 'chunks.jsonl'),
            'bm25_index_dir': os.path.join(OUTDIR, 'bm25_index'),
            'chunk_count': len(chunks),
            'collection_name': COLLECTION,
            'enrich': enrich_stats if ENRICH else None,
        }
        with open(os.path.join(OUTDIR, 'last_index.json'), 'w', encoding='utf-8') as mf:
            json.dump(meta, mf, indent=2)
    except Exception:
        pass

    embed_stats: Dict[str, any] = {"provider": None, "model": None, "tokens": 0, "cost_usd": 0.0, "cache_hits": 0, "fresh": 0}
    if _config.get_bool('SKIP_DENSE', False):
        print('Skipping dense embeddings and Qdrant upsert (SKIP_DENSE=1).')
        # Persist tracking event for BM25-only runs
        try:
            evt = {
                "type": "indexing_event",
                "repo": REPO,
                "ts": datetime.utcnow().isoformat() + 'Z',
                "mode": "bm25_only",
                "phases": {
                    "collect_s": round(t_collect, 3),
                    "chunk_s": round(t_chunk, 3),
                    "bm25_s": round(t_bm, 3),
                    "embed_s": 0.0,
                    "upsert_s": 0.0,
                },
                "chunk_count": len(chunks),
                "embedding": embed_stats,
            }
            with open(indexing_log, 'a', encoding='utf-8') as lf:
                lf.write(json.dumps(evt) + '\n')
        except Exception:
            pass
        return

    client = OpenAI(api_key=OPENAI_API_KEY) if OPENAI_API_KEY else None
    t_embed0 = _time.time()
    texts = []
    for c in chunks:
        if c.get('summary') or c.get('keywords'):
            kw = ' '.join(c.get('keywords', []))
            texts.append(f"{c.get('file_path','') }\n{c.get('summary','')}\n{kw}\n{c.get('code','')}")
        else:
            texts.append(c['code'])
    embs: List[List[float]] = []
    et = _config.get_str('EMBEDDING_TYPE', 'openai').lower()
    if et == 'voyage':
        try:
            voyage_model = _config.get_str('VOYAGE_MODEL', 'voyage-code-3')
            voyage_dim = _config.get_int('VOYAGE_EMBED_DIM', 512)
            embs = embed_texts_voyage(texts, model=voyage_model, batch=64, output_dimension=voyage_dim)
        except Exception as e:
            print(f"Voyage embedding failed ({e}); falling back to local embeddings.")
            embs = []
        if not embs:
            embs = embed_texts_local(texts)
        embed_stats.update({"provider": "voyage", "model": _config.get_str('VOYAGE_MODEL', 'voyage-code-3')})
    elif et == 'mxbai':
        try:
            dim = _config.get_int('EMBEDDING_DIM', 512)
            embs = embed_texts_mxbai(texts, dim=dim)
        except Exception as e:
            print(f"MXBAI embedding failed ({e}); falling back to local embeddings.")
            embs = embed_texts_local(texts)
        embed_stats.update({"provider": "local", "model": "mxbai-embed-large-v1"})
    elif et == 'local':
        embs = embed_texts_local(texts)
        embed_stats.update({"provider": "local", "model": "sentence-transformers"})
    else:
        if client is not None:
            try:
                cache = EmbeddingCache(OUTDIR)
                hashes = [c['hash'] for c in chunks]
                embedding_model = _config.get_str('EMBEDDING_MODEL', 'text-embedding-3-large')
                # Pre-count cache hits before embedding
                _hits = sum(1 for h in hashes if cache.get(h) is not None)
                from tiktoken import get_encoding
                enc = get_encoding('cl100k_base')
                # Estimate tokens for fresh texts only
                fresh_texts = [t for t, h in zip(texts, hashes) if cache.get(h) is None]
                embed_stats["tokens"] = sum(len(enc.encode(t)) for t in fresh_texts)
                # OpenAI embeddings pricing ~ $0.13 per 1K tokens for text-embedding-3-large
                embed_stats["cost_usd"] = round((embed_stats["tokens"] / 1000.0) * 0.13, 6)
                embed_stats.update({"provider": "openai", "model": embedding_model, "cache_hits": _hits, "fresh": len(fresh_texts)})
                embs = cache.embed_texts(client, texts, hashes, model=embedding_model, batch=64)
                pruned = cache.prune(set(hashes))
                if pruned > 0:
                    print(f'Pruned {pruned} orphaned embeddings from cache.')
                cache.save()
            except Exception as e:
                print(f'Embedding via OpenAI failed ({e}); falling back to local embeddings.')
        if not embs:
            embs = embed_texts_local(texts)
            embed_stats.update({"provider": "local", "model": "sentence-transformers"})
    t_embed = _time.time() - t_embed0
    point_ids: List[str] = []
    t_upsert0 = _time.time()
    try:
        q = QdrantClient(url=QDRANT_URL)
        qdrant_recreate_fallback.recreate_collection(
            q,
            collection_name=COLLECTION,
            vectors_config={'dense': models.VectorParams(size=len(embs[0]), distance=models.Distance.COSINE)}
        )
        points = []
        for c, v in zip(chunks, embs):
            cid = str(c['id'])
            pid = str(uuid.uuid5(uuid.NAMESPACE_DNS, cid))
            slim_payload = {
                'id': c.get('id'),
                'file_path': c.get('file_path'),
                'start_line': c.get('start_line'),
                'end_line': c.get('end_line'),
                'layer': c.get('layer'),
                'repo': c.get('repo'),
                'origin': c.get('origin'),
                'hash': c.get('hash'),
                'language': c.get('language')
            }
            slim_payload = {k: v for k, v in slim_payload.items() if v is not None}
            points.append(models.PointStruct(id=pid, vector={'dense': v}, payload=slim_payload))
            point_ids.append(pid)
            if len(points) == 64:
                q.upsert(COLLECTION, points=points)
                points = []
        if points:
            q.upsert(COLLECTION, points=points)
        import json as _json
        _json.dump({str(i): pid for i, pid in enumerate(point_ids)}, open(os.path.join(OUTDIR,'bm25_index','bm25_point_ids.json'),'w'))
        print(f'Indexed {len(chunks)} chunks to Qdrant (embeddings: {len(embs[0])} dims).')
        try:
            meta = {
                'repo': REPO,
                'timestamp': datetime.utcnow().isoformat() + 'Z',
                'chunks_path': os.path.join(OUTDIR, 'chunks.jsonl'),
                'bm25_index_dir': os.path.join(OUTDIR, 'bm25_index'),
                'chunk_count': len(chunks),
                'collection_name': COLLECTION,
                'embedding_type': _config.get_str('EMBEDDING_TYPE', 'openai').lower(),
                'embedding_dim': len(embs[0]) if embs and embs[0] else None,
            }
            with open(os.path.join(OUTDIR, 'last_index.json'), 'w', encoding='utf-8') as mf:
                json.dump(meta, mf, indent=2)
        except Exception:
            pass
    except Exception as e:
        print(f"Qdrant unavailable or failed to index ({e}); continuing with BM25-only index. Dense retrieval will be disabled.")
    t_upsert = _time.time() - t_upsert0

    # Persist high-level indexing event for Grafana/Loki
    try:
        evt = {
            "type": "indexing_event",
            "repo": REPO,
            "ts": datetime.utcnow().isoformat() + 'Z',
            "mode": "full",
            "phases": {
                "collect_s": round(t_collect, 3),
                "chunk_s": round(t_chunk, 3),
                "bm25_s": round(t_bm, 3),
                "embed_s": round(t_embed, 3),
                "upsert_s": round(t_upsert, 3),
            },
            "chunk_count": len(chunks),
            "embedding": embed_stats,
            "enrich": enrich_stats if ENRICH else None,
        }
        with open(indexing_log, 'a', encoding='utf-8') as lf:
            lf.write(json.dumps(evt) + '\n')
    except Exception:
        pass

if __name__ == '__main__':
    main()
