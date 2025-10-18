import os
import json
import collections
from typing import List, Dict
from pathlib import Path
from common.config_loader import choose_repo_from_query, get_default_repo, out_dir
from dotenv import load_dotenv, find_dotenv

# Load any existing env ASAP so downstream imports (e.g., rerank backend) see them
try:
    load_dotenv(override=False)
except Exception:
    pass

from qdrant_client import QdrantClient, models
import bm25s
from bm25s.tokenization import Tokenizer
from Stemmer import Stemmer
from .rerank import rerank_results as ce_rerank
from server.env_model import generate_text
from .synonym_expander import expand_query_with_synonyms, get_synonym_variants


def _classify_query(q: str) -> str:
    ql = (q or '').lower()
    if any(k in ql for k in ['ui', 'react', 'component', 'tsx', 'page', 'frontend', 'render', 'css']):
        return 'ui'
    if any(k in ql for k in ['notification', 'pushover', 'apprise', 'hubspot', 'provider', 'integration', 'adapter', 'webhook']):
        return 'integration'
    if any(k in ql for k in ['diagnostic', 'health', 'event log', 'phi', 'mask', 'hipaa', 'middleware', 'auth', 'token', 'oauth', 'hmac']):
        return 'server'
    if any(k in ql for k in ['sdk', 'client library', 'python sdk', 'node sdk']):
        return 'sdk'
    if any(k in ql for k in ['infra', 'asterisk', 'sip', 't.38', 'ami', 'freeswitch', 'egress', 'cloudflared']):
        return 'infra'
    return 'server'


def _project_layer_bonus(layer: str, intent: str) -> float:
    layer_lower = (layer or '').lower()
    intent_lower = (intent or 'server').lower()
    table = {
        'server': {'kernel': 0.10, 'plugin': 0.04, 'ui': 0.00, 'docs': 0.00, 'tests': 0.00, 'infra': 0.02},
        'integration': {'integration': 0.12, 'kernel': 0.04, 'ui': 0.00, 'docs': 0.00, 'tests': 0.00, 'infra': 0.00},
        'ui': {'ui': 0.12, 'docs': 0.06, 'kernel': 0.02, 'plugin': 0.02, 'tests': 0.00, 'infra': 0.00},
        'sdk': {'kernel': 0.04, 'docs': 0.02},
        'infra': {'infra': 0.12, 'kernel': 0.04}
    }
    return table.get(intent_lower, {}).get(layer_lower, 0.0)


def _project_layer_bonus(layer: str, intent: str) -> float:  # override for other repo profile
    layer_lower = (layer or '').lower()
    intent_lower = (intent or 'server').lower()
    table = {
        'server': {'server': 0.10, 'integration': 0.06, 'fax': 0.30, 'admin console': 0.10, 'sdk': 0.00, 'infra': 0.00, 'docs': 0.02},
        'integration': {'provider': 0.12, 'traits': 0.10, 'server': 0.06, 'ui': 0.00, 'sdk': 0.00, 'infra': 0.02, 'docs': 0.00},
        'ui': {'ui': 0.12, 'docs': 0.06, 'server': 0.02, 'hipaa': 0.20},
        'sdk': {'sdk': 0.12, 'server': 0.04, 'docs': 0.02},
        'infra': {'infra': 0.12, 'server': 0.04, 'provider': 0.04}
    }
    return table.get(intent_lower, {}).get(layer_lower, 0.0)


def _provider_plugin_hint(fp: str, code: str) -> float:
    fp = (fp or '').lower()
    code = (code or '').lower()
    keys = ['provider', 'providers', 'integration', 'adapter', 'webhook', 'pushover', 'apprise', 'hubspot']
    return 0.06 if any(k in fp or k in code for k in keys) else 0.0


def _origin_bonus(origin: str, mode: str) -> float:
    origin = (origin or '').lower()
    mode = (mode or 'prefer_first_party').lower()
    if mode == 'prefer_first_party':
        return 0.06 if origin == 'first_party' else (-0.08 if origin == 'vendor' else 0.0)
    if mode == 'prefer_vendor':
        return 0.06 if origin == 'vendor' else 0.0
    return 0.0


def _feature_bonus(query: str, fp: str, code: str) -> float:
    ql = (query or '').lower()
    fp = (fp or '').lower()
    code = (code or '').lower()
    bumps = 0.0
    if any(k in ql for k in ['diagnostic', 'health', 'event log', 'phi', 'hipaa']):
        if ('diagnostic' in fp) or ('diagnostic' in code) or ('event' in fp and 'log' in fp):
            bumps += 0.06
    return bumps


def _card_bonus(chunk_id: str, card_chunk_ids: set) -> float:
    """Boost chunks that matched via card-based retrieval."""
    return 0.08 if str(chunk_id) in card_chunk_ids else 0.0


def _path_bonus(fp: str, repo: str = None) -> float:
    fp = (fp or '').lower()
    bonus = 0.0
    
    # Use repos.json path_boosts if available
    if repo:
        try:
            from common.config_loader import path_boosts
            repo_boosts = path_boosts(repo)
            for boost_path in repo_boosts:
                if boost_path and boost_path.lower() in fp:
                    bonus += 0.06  # Same boost as _project_path_boost
        except Exception:
            pass
    
    # Fallback to hardcoded boosts if no repo-specific boosts found
    if bonus == 0.0:
        for sfx, b in [
            ('/identity/', 0.12),
            ('/auth/', 0.12),
            ('/server', 0.10),
            ('/backend', 0.10),
            ('/api/', 0.08),
        ]:
            if sfx in fp:
                bonus += b
    
    return min(bonus, 0.18)  # Cap at 0.18 like _project_path_boost


def _project_path_boost(fp: str, repo_tag: str) -> float:
    import os as _os
    if (repo_tag or '').lower() != 'project':
        return 0.0
    cfg = _os.getenv('project_PATH_BOOSTS', 'app/,lib/,config/,scripts/,server/,api/,api/app,app/services,app/routers,api/admin_ui,app/plugins')
    tokens = [t.strip().lower() for t in cfg.split(',') if t.strip()]
    s = (fp or '').lower()
    bonus = 0.0
    for tok in tokens:
        if tok and tok in s:
            bonus += 0.06
    return min(bonus, 0.18)


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

QDRANT_URL = os.getenv('QDRANT_URL', 'http://127.0.0.1:6333')
REPO = os.getenv('REPO', 'project')
VENDOR_MODE = os.getenv('VENDOR_MODE', 'prefer_first_party')
COLLECTION = os.getenv('COLLECTION_NAME', f'code_chunks_{REPO}')


def _lazy_import_openai():
    from openai import OpenAI
    return OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def _lazy_import_voyage():
    import voyageai
    return voyageai.Client(api_key=os.getenv("VOYAGE_API_KEY"))


_local_embed_model = None


def _get_embedding(text: str, kind: str = "query") -> list[float]:
    et = (os.getenv("EMBEDDING_TYPE", "openai") or "openai").lower()
    if et == "voyage":
        vo = _lazy_import_voyage()
        out = vo.embed([text], model="voyage-code-3", input_type=kind, output_dimension=512)
        return out.embeddings[0]
    if et == "local":
        global _local_embed_model
        if _local_embed_model is None:
            from sentence_transformers import SentenceTransformer
            _local_embed_model = SentenceTransformer('BAAI/bge-small-en-v1.5')
        return _local_embed_model.encode([text], normalize_embeddings=True, show_progress_bar=False)[0].tolist()
    client = _lazy_import_openai()
    resp = client.embeddings.create(input=text, model="text-embedding-3-large")
    return resp.data[0].embedding


def rrf(dense: list, sparse: list, k: int = 10, kdiv: int = 60) -> list:
    score: dict = collections.defaultdict(float)
    for rank, pid in enumerate(dense, start=1):
        score[pid] += 1.0 / (kdiv + rank)
    for rank, pid in enumerate(sparse, start=1):
        score[pid] += 1.0 / (kdiv + rank)
    ranked = sorted(score.items(), key=lambda x: x[1], reverse=True)
    return [pid for pid, _ in ranked[:k]]


def _load_chunks(repo: str) -> List[Dict]:
    p = os.path.join(out_dir(repo), 'chunks.jsonl')
    chunks: List[Dict] = []
    if os.path.exists(p):
        with open(p, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    o = json.loads(line)
                except Exception:
                    continue
                o.pop('code', None)
                o.pop('summary', None)
                o.pop('keywords', None)
                chunks.append(o)
    return chunks


def _load_bm25_map(idx_dir: str):
    pid_json = os.path.join(idx_dir, 'bm25_point_ids.json')
    if os.path.exists(pid_json):
        m = json.load(open(pid_json))
        return [m[str(i)] for i in range(len(m))]
    map_path = os.path.join(idx_dir, 'chunk_ids.txt')
    if os.path.exists(map_path):
        with open(map_path, 'r', encoding='utf-8') as f:
            ids = [line.strip() for line in f if line.strip()]
        return ids
    return None


def _load_cards_bm25(repo: str):
    idx_dir = os.path.join(out_dir(repo), 'bm25_cards')
    try:
        import bm25s
        retr = bm25s.BM25.load(idx_dir)
        return retr
    except Exception:
        return None


def _load_cards_map(repo: str) -> Dict:
    cards_file = os.path.join(out_dir(repo), 'cards.jsonl')
    cards_by_idx = {}
    cards_by_chunk_id = {}
    try:
        with open(cards_file, 'r', encoding='utf-8') as f:
            for idx, line in enumerate(f):
                card = json.loads(line)
                chunk_id = str(card.get('id', ''))
                if chunk_id:
                    cards_by_idx[idx] = chunk_id
                    cards_by_chunk_id[chunk_id] = card
        return {'by_idx': cards_by_idx, 'by_chunk_id': cards_by_chunk_id}
    except Exception:
        return {'by_idx': {}, 'by_chunk_id': {}}


def search(query: str, repo: str, topk_dense: int = 75, topk_sparse: int = 75, final_k: int = 10, trace: object | None = None) -> List[Dict]:
    chunks = _load_chunks(repo)
    if not chunks:
        return []
    
    # Apply synonym expansion if enabled
    use_synonyms = str(os.getenv('USE_SEMANTIC_SYNONYMS', '1')).strip().lower() in {'1', 'true', 'on'}
    expanded_query = expand_query_with_synonyms(query, repo, max_expansions=3) if use_synonyms else query
    
    dense_pairs = []
    qc = QdrantClient(url=QDRANT_URL)
    coll = os.getenv('COLLECTION_NAME', f'code_chunks_{repo}')
    try:
        # Use expanded query for embedding
        e = _get_embedding(expanded_query, kind="query")
    except Exception:
        e = []
    try:
        backend = (os.getenv('VECTOR_BACKEND','qdrant') or 'qdrant').lower()
        if backend == 'faiss':
            # Experimental FAISS backend (offline). If not present, fall back to sparse-only.
            dense_pairs = []
        else:
            dres = qc.query_points(
                collection_name=coll,
                query=e,
                using='dense',
                limit=topk_dense,
                with_payload=models.PayloadSelectorInclude(include=['file_path', 'start_line', 'end_line', 'language', 'layer', 'repo', 'hash', 'id'])
            )
            points = getattr(dres, 'points', dres)
            dense_pairs = [(str(p.id), dict(p.payload)) for p in points]
    except Exception:
        dense_pairs = []

    idx_dir = os.path.join(out_dir(repo), 'bm25_index')
    retriever = bm25s.BM25.load(idx_dir)
    tokenizer = Tokenizer(stemmer=Stemmer('english'), stopwords='en')
    # Use expanded query for BM25 sparse retrieval
    tokens = tokenizer.tokenize([expanded_query])
    ids, _ = retriever.retrieve(tokens, k=topk_sparse)
    ids = ids.tolist()[0] if hasattr(ids, 'tolist') else list(ids[0])
    id_map = _load_bm25_map(idx_dir)
    by_chunk_id = {str(c['id']): c for c in chunks}
    sparse_pairs = []
    for i in ids:
        if id_map is not None:
            if 0 <= i < len(id_map):
                pid_or_cid = id_map[i]
                key = str(pid_or_cid)
                if key in by_chunk_id:
                    sparse_pairs.append((key, by_chunk_id[key]))
                else:
                    if 0 <= i < len(chunks):
                        sparse_pairs.append((str(chunks[i]['id']), chunks[i]))
        else:
            if 0 <= i < len(chunks):
                sparse_pairs.append((str(chunks[i]['id']), chunks[i]))

    card_chunk_ids: set = set()
    cards_retr = _load_cards_bm25(repo)
    if cards_retr is not None:
        try:
            cards_map = _load_cards_map(repo)
            # Use expanded query for card retrieval too
            tokens = tokenizer.tokenize([expanded_query])
            c_ids, _ = cards_retr.retrieve(tokens, k=min(topk_sparse, 30))
            c_ids_flat = c_ids[0] if hasattr(c_ids, '__getitem__') else c_ids
            for card_idx in c_ids_flat:
                chunk_id = cards_map['by_idx'].get(int(card_idx))
                if chunk_id:
                    card_chunk_ids.add(str(chunk_id))
        except Exception:
            pass

    dense_ids = [pid for pid, _ in dense_pairs]
    sparse_ids = [pid for pid, _ in sparse_pairs]
    fused = rrf(dense_ids, sparse_ids, k=max(final_k, 2 * final_k)) if dense_pairs else sparse_ids[:final_k]
    by_id = {pid: p for pid, p in (dense_pairs + sparse_pairs)}
    docs = [by_id[pid] for pid in fused if pid in by_id]
    HYDRATION_MODE = (os.getenv('HYDRATION_MODE', 'lazy') or 'lazy').lower()
    if HYDRATION_MODE != 'none':
        _hydrate_docs_inplace(repo, docs)
    # tracing: pre-rerank candidate snapshot
    try:
        if trace is not None and hasattr(trace, 'add'):
            cands = []
            seen_pre = set()
            # Use union of bm25+dense by earliest rank observed
            rank_map_dense = {pid: i+1 for i, pid in enumerate(dense_ids[:max(final_k, 50)])}
            rank_map_sparse = {pid: i+1 for i, pid in enumerate(sparse_ids[:max(final_k, 50)])}
            for pid in list(rank_map_dense.keys()) + list(rank_map_sparse.keys()):
                if pid in seen_pre: continue
                seen_pre.add(pid)
                meta = by_id.get(pid, {})
                cands.append({
                    'path': meta.get('file_path'),
                    'start': meta.get('start_line'),
                    'end': meta.get('end_line'),
                    'card_hit': str(meta.get('id','')) in card_chunk_ids,
                    'bm25_rank': rank_map_sparse.get(pid),
                    'dense_rank': rank_map_dense.get(pid),
                })
            trace.add('retriever.retrieve', {
                'k_sparse': int(topk_sparse),
                'k_dense': int(topk_dense),
                'candidates': cands[:max(final_k, 50)],
            })
    except Exception:
        pass

    docs = ce_rerank(query, docs, top_k=final_k, trace=trace)

    intent = _classify_query(query)
    for d in docs:
        fp = d.get('file_path', '')
        layer = (d.get('layer') or '').lower()
        score = float(d.get('rerank_score', 0.0) or 0.0)
        # Card hit bonus (semantic cards retrieval via BM25 over summaries)
        try:
            cid = str(d.get('id', '') or '')
            if cid and cid in card_chunk_ids:
                d['card_hit'] = True
                score += _card_bonus(cid, card_chunk_ids)
        except Exception:
            pass
        score += _path_bonus(fp, repo)
        score += _project_layer_bonus(layer, intent)
        score += _provider_plugin_hint(fp, d.get('code', '') or '')
        score += _origin_bonus(d.get('origin', ''), os.getenv('VENDOR_MODE', VENDOR_MODE))
        score += _feature_bonus(query, fp, d.get('code', '') or '')
        d['rerank_score'] = score
    docs.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)
    return docs[:final_k]


def _hydrate_docs_inplace(repo: str, docs: list[dict]) -> None:
    needed_ids: set[str] = set()
    needed_hashes: set[str] = set()
    for d in docs:
        if d.get('code'):
            continue
        cid = str(d.get('id', '') or '')
        h = d.get('hash')
        if cid:
            needed_ids.add(cid)
        if h:
            needed_hashes.add(h)
    if not needed_ids and not needed_hashes:
        return
    jl = os.path.join(out_dir(repo), 'chunks.jsonl')
    max_chars = int(os.getenv('HYDRATION_MAX_CHARS', '2000') or '2000')
    found_by_id: dict[str, str] = {}
    found_by_hash: dict[str, str] = {}
    try:
        with open(jl, 'r', encoding='utf-8') as f:
            for line in f:
                try:
                    o = json.loads(line)
                except Exception:
                    continue
                cid = str(o.get('id', '') or '')
                h = o.get('hash')
                code = (o.get('code') or '')
                if max_chars > 0 and code:
                    code = code[:max_chars]
                if cid and cid in needed_ids and cid not in found_by_id:
                    found_by_id[cid] = code
                if h and h in needed_hashes and h not in found_by_hash:
                    found_by_hash[h] = code
                if len(found_by_id) >= len(needed_ids) and len(found_by_hash) >= len(needed_hashes):
                    break
    except FileNotFoundError:
        return
    for d in docs:
        if not d.get('code'):
            cid = str(d.get('id', '') or '')
            h = d.get('hash')
            d['code'] = found_by_id.get(cid) or (found_by_hash.get(h) if h else '') or ''


def _apply_filename_boosts(docs: list[dict], question: str) -> None:
    terms = set((question or '').lower().replace('/', ' ').replace('-', ' ').split())
    for d in docs:
        fp = (d.get('file_path') or '').lower()
        fn = os.path.basename(fp)
        parts = fp.split('/')
        score = float(d.get('rerank_score', 0.0) or 0.0)
        if any(t and t in fn for t in terms):
            score *= 1.5
        if any(t and t in p for t in terms for p in parts):
            score *= 1.2
        d['rerank_score'] = score
    docs.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)


def route_repo(query: str, default_repo: str | None = None) -> str:
    try:
        return choose_repo_from_query(query, default=(default_repo or get_default_repo()))
    except Exception:
        q = (query or '').lower().strip()
        if ':' in q:
            cand, _ = q.split(':', 1)
            cand = cand.strip()
            if cand:
                return cand
        return (default_repo or os.getenv('REPO', 'project') or 'project').strip()


def search_routed(query: str, repo_override: str | None = None, final_k: int = 10, trace: object | None = None):
    repo = (repo_override or route_repo(query, default_repo=os.getenv('REPO', 'project')) or os.getenv('REPO', 'project')).strip()
    return search(query, repo=repo, final_k=final_k, trace=trace)


def expand_queries(query: str, m: int = 4) -> list[str]:
    if m <= 1:
        return [query]
    try:
        sys = "Rewrite a developer query into multiple search-friendly variants without changing meaning."
        user = f"Count: {m}\nQuery: {query}\nOutput one variant per line, no numbering."
        text, _ = generate_text(user_input=user, system_instructions=sys, reasoning_effort=None)
        lines = [ln.strip('- ').strip() for ln in (text or '').splitlines() if ln.strip()]
        uniq = []
        for ln in lines:
            if ln and ln not in uniq:
                uniq.append(ln)
        return (uniq or [query])[:m]
    except Exception:
        return [query]


def search_routed_multi(query: str, repo_override: str | None = None, m: int = 4, final_k: int = 10, trace: object | None = None):
    repo = (repo_override or route_repo(query) or os.getenv('REPO', 'project')).strip()
    variants = expand_queries(query, m=m)
    try:
        if trace is not None and hasattr(trace, 'add'):
            trace.add('router.decide', {
                'policy': 'code',  # heuristic profile
                'intent': _classify_query(query),
                'query_original': query,
                'query_rewrites': variants[1:] if len(variants) > 1 else [],
                'knobs': {
                    'topk_sparse': int(os.getenv('TOPK_SPARSE', '75') or 75),
                    'topk_dense': int(os.getenv('TOPK_DENSE', '75') or 75),
                    'final_k': int(final_k),
                    'hydration_mode': (os.getenv('HYDRATION_MODE', 'lazy') or 'lazy'),
                },
            })
    except Exception:
        pass
    all_docs = []
    for qv in variants:
        docs = search(qv, repo=repo, final_k=final_k, trace=trace)
        all_docs.extend(docs)
    seen = set()
    uniq = []
    for d in all_docs:
        key = (d.get('file_path'), d.get('start_line'), d.get('end_line'))
        if key in seen:
            continue
        seen.add(key)
        uniq.append(d)
    try:
        from .rerank import rerank_results as _rr
        reranked = _rr(query, uniq, top_k=final_k)
        _apply_filename_boosts(reranked, query)
        return reranked
    except Exception:
        return uniq[:final_k]
