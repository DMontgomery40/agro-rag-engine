
import math
import os
from typing import List, Dict, Any
from rerankers import Reranker  # type: ignore[import-untyped]
from typing import Optional

try:
    from dotenv import load_dotenv
    load_dotenv(override=False)
except Exception:
    pass

_HF_PIPE = None
_RERANKER = None

DEFAULT_MODEL = os.getenv('RERANKER_MODEL', 'BAAI/bge-reranker-v2-m3')
# Note: Backend/model can change at runtime via GUI. Read env at call-time in rerank_results.
COHERE_MODEL = os.getenv('COHERE_RERANK_MODEL', 'rerank-3.5')

def _sigmoid(x: float) -> float:
    try:
        return 1.0 / (1.0 + math.exp(-float(x)))
    except Exception:
        return 0.0

def _normalize(score: float, model_name: str) -> float:
    if any(k in model_name.lower() for k in ['bge-reranker', 'cross-encoder', 'mxbai', 'jina-reranker']):
        return _sigmoid(score)
    return float(score)

def _maybe_init_hf_pipeline(model_name: str) -> Optional[Any]:
    global _HF_PIPE
    if _HF_PIPE is not None:
        return _HF_PIPE
    try:
        if 'jinaai/jina-reranker' in model_name.lower():
            os.environ.setdefault('TRANSFORMERS_TRUST_REMOTE_CODE', '1')
            from transformers import pipeline
            _HF_PIPE = pipeline(
                task='text-classification',
                model=model_name,
                tokenizer=model_name,
                trust_remote_code=True,
                device_map='auto'
            )
            return _HF_PIPE
    except Exception:
        _HF_PIPE = None
    return _HF_PIPE

def get_reranker() -> Reranker:
    global _RERANKER
    if _RERANKER is None:
        model_name = DEFAULT_MODEL
        if _maybe_init_hf_pipeline(model_name):
            return None
        os.environ.setdefault('TRANSFORMERS_TRUST_REMOTE_CODE', '1')
        _RERANKER = Reranker(model_name, model_type='cross-encoder', trust_remote_code=True)
    return _RERANKER

def rerank_results(query: str, results: List[Dict], top_k: int = 10, trace: Any = None) -> List[Dict]:
    if not results:
        return []
    # Read backend dynamically to respect GUI updates without server restart
    backend = (os.getenv('RERANK_BACKEND', 'local') or 'local').lower()
    print(f"🔧 Reranker backend: {backend}")  # DEBUG
    if backend in ('none', 'off', 'disabled'):
        for i, r in enumerate(results):
            r['rerank_score'] = float(1.0 - (i * 0.01))
        return results[:top_k]
    # Model names read dynamically with import-time defaults as fallback
    model_name = os.getenv('RERANKER_MODEL', DEFAULT_MODEL)
    # --- tracing: record input set size
    try:
        if trace is not None and hasattr(trace, 'add'):
            trace.add('reranker.rank', {
                'model': model_name,
                'input_topN': len(results or []),
                'output_topK': int(top_k),
            })
    except Exception:
        pass
    if backend == 'cohere':
        print(f"  → Using Cohere API (no local processing)")  # DEBUG
        try:
            print(f"  → Importing cohere...")  # DEBUG
            import cohere
            print(f"  → Getting API key...")  # DEBUG
            api_key = os.getenv('COHERE_API_KEY')
            if not api_key:
                raise RuntimeError('COHERE_API_KEY not set')
            print(f"  → Creating client...")  # DEBUG
            client = cohere.Client(api_key=api_key)
            print(f"  → Client created, building docs...")  # DEBUG
            docs = []
            for r in results:
                file_ctx = r.get('file_path', '')
                # default snippet: 700 for cohere, configurable via env
                try:
                    snip_len = int(os.getenv('RERANK_INPUT_SNIPPET_CHARS', '700') or '700')
                except Exception:
                    snip_len = 700
                code_snip = (r.get('code') or r.get('text') or '')[:snip_len]
                docs.append(f"{file_ctx}\n\n{code_snip}")
            # Limit reranking to top 50 documents (configurable via env) to reduce token usage
            max_rerank = int(os.getenv('COHERE_RERANK_TOP_N', '50') or '50')
            rerank_top_n = min(len(docs), max_rerank)
            rr = client.rerank(model=os.getenv('COHERE_RERANK_MODEL', COHERE_MODEL), query=query, documents=docs, top_n=rerank_top_n)
            scores = [getattr(x, 'relevance_score', 0.0) for x in rr.results]
            max_s = max(scores) if scores else 1.0
            for item in rr.results:
                idx = int(getattr(item, 'index', 0))
                score = float(getattr(item, 'relevance_score', 0.0))
                if idx < len(results):
                    results[idx]['rerank_score'] = (score / max_s) if max_s else 0.0
            results.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)
            top = results[:top_k]
            try:
                if trace is not None and hasattr(trace, 'add'):
                    trace.add('reranker.rank', {
                        'model': f'cohere:{COHERE_MODEL}',
                        'scores': [
                            {
                                'path': r.get('file_path'),
                                'start': r.get('start_line'),
                                'end': r.get('end_line'),
                                'rerank_score': float(r.get('rerank_score', 0.0) or 0.0),
                            } for r in top
                        ]
                    })
            except Exception:
                pass
            return top
        except Exception:
            pass
    pipe = _maybe_init_hf_pipeline(model_name)
    if pipe is not None:
        pairs = []
        for r in results:
            try:
                snip_len = int(os.getenv('RERANK_INPUT_SNIPPET_CHARS', '600') or '600')
            except Exception:
                snip_len = 600
            code_snip = (r.get('code') or r.get('text') or '')[:snip_len]
            pairs.append({'text': query, 'text_pair': code_snip})
        try:
            out = pipe(pairs, truncation=True)  # type: ignore[misc]
            raw = []
            for i, o in enumerate(out):
                score = float(o.get('score', 0.0))
                s = _normalize(score, model_name)
                results[i]['rerank_score'] = s
                raw.append(s)
            if raw:
                mn, mx = min(raw), max(raw)
                rng = (mx - mn)
                if rng > 1e-9:
                    for r in results:
                        r['rerank_score'] = (float(r.get('rerank_score', 0.0)) - mn) / rng
                elif mx != 0.0:
                    for r in results:
                        r['rerank_score'] = float(r.get('rerank_score', 0.0)) / abs(mx)
            results.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)
            top = results[:top_k]
            try:
                if trace is not None and hasattr(trace, 'add'):
                    trace.add('reranker.rank', {
                        'model': f'hf:{model_name}',
                        'scores': [
                            {
                                'path': r.get('file_path'),
                                'start': r.get('start_line'),
                                'end': r.get('end_line'),
                                'rerank_score': float(r.get('rerank_score', 0.0) or 0.0),
                            } for r in top
                        ]
                    })
            except Exception:
                pass
            return top
        except Exception:
            pass
    docs = []
    for r in results:
        file_ctx = r.get('file_path', '')
        code_snip = (r.get('code') or r.get('text') or '')[:600]
        docs.append(f"{file_ctx}\n\n{code_snip}")
    rr = get_reranker()
    if rr is None and _maybe_init_hf_pipeline(model_name) is not None:
        return results[:top_k]
    ranked = rr.rank(query=query, docs=docs, doc_ids=list(range(len(docs))))  # type: ignore[attr-defined]
    raw_scores = []
    for res in ranked.results:
        idx = res.document.doc_id
        s = _normalize(res.score, model_name)
        results[idx]['rerank_score'] = s
        raw_scores.append(s)
    if raw_scores:
        mn, mx = min(raw_scores), max(raw_scores)
        rng = (mx - mn)
        if rng > 1e-9:
            for r in results:
                r['rerank_score'] = (float(r.get('rerank_score', 0.0)) - mn) / rng
        elif mx != 0.0:
            for r in results:
                r['rerank_score'] = float(r.get('rerank_score', 0.0)) / abs(mx)
    results.sort(key=lambda x: x.get('rerank_score', 0.0), reverse=True)
    top = results[:top_k]
    try:
        if trace is not None and hasattr(trace, 'add'):
            trace.add('reranker.rank', {
                'model': f'local:{model_name}',
                'scores': [
                    {
                        'path': r.get('file_path'),
                        'start': r.get('start_line'),
                        'end': r.get('end_line'),
                        'rerank_score': float(r.get('rerank_score', 0.0) or 0.0),
                    } for r in top
                ]
            })
    except Exception:
        pass
    return top
