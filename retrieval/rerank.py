
import math
import os
from typing import List, Dict, Any, Optional
import time as _time

from rerankers import Reranker  # type: ignore[import-untyped]

from reranker.config import (
    load_settings,
    resolve_model_target,
    shared_loader_enabled,
    RerankerSettings,
)

try:
    from dotenv import load_dotenv
    load_dotenv(override=False)
except Exception:
    pass

_HF_PIPE = None
_RERANKER = None

_SHARED_LOADER = shared_loader_enabled()
if _SHARED_LOADER:
    _BOOT_SETTINGS = load_settings()
    DEFAULT_MODEL = resolve_model_target(_BOOT_SETTINGS)
    COHERE_MODEL = _BOOT_SETTINGS.cohere_model
else:
    # Default local/HF cross-encoder model for reranking
    # Upgraded to MiniLM-L-12-v2 per request
    DEFAULT_MODEL = os.getenv('RERANKER_MODEL', 'cross-encoder/ms-marco-MiniLM-L-12-v2')
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

_RERANKER_MODEL_ID: Optional[str] = None


def _load_settings_if_enabled() -> Optional[RerankerSettings]:
    if not shared_loader_enabled():
        return None
    return load_settings()


def get_reranker() -> Optional[Reranker]:
    global _RERANKER, _RERANKER_MODEL_ID

    settings = _load_settings_if_enabled()
    if settings:
        model_name = resolve_model_target(settings)
        max_length = settings.max_length
    else:
        model_name = os.getenv('RERANKER_MODEL', DEFAULT_MODEL)
        try:
            max_length = int(os.getenv('AGRO_RERANKER_MAXLEN', '512') or '512')
        except Exception:
            max_length = 512

    if _RERANKER is not None and _RERANKER_MODEL_ID != model_name:
        _RERANKER = None

    if _RERANKER is None:
        if _maybe_init_hf_pipeline(model_name):
            _RERANKER_MODEL_ID = model_name
            return None
        os.environ.setdefault('TRANSFORMERS_TRUST_REMOTE_CODE', '1')
        _RERANKER = Reranker(model_name, model_type='cross-encoder', trust_remote_code=True, max_length=max_length)
        _RERANKER_MODEL_ID = model_name
    return _RERANKER


def rerank_results(query: str, results: List[Dict[str, Any]], top_k: int = 10, trace: Any = None) -> List[Dict[str, Any]]:
    if not results:
        return []

    settings = _load_settings_if_enabled()

    if settings:
        backend = settings.backend
        enabled = settings.enabled and backend not in ("none", "off", "disabled")
        model_name = resolve_model_target(settings)
        metrics_label = settings.metrics_label
        snippet_local = settings.snippet_chars
        snippet_cohere = settings.snippet_chars
        cohere_model = settings.cohere_model or COHERE_MODEL
        cohere_top_n = settings.top_n_cloud
        cohere_key_present = settings.cohere_api_key_present
    else:
        backend = (os.getenv('RERANK_BACKEND', 'local') or 'local').lower()
        enabled = backend not in ('none', 'off', 'disabled')
        model_name = os.getenv('RERANKER_MODEL', DEFAULT_MODEL)
        metrics_label = f"cohere:{COHERE_MODEL}" if backend == 'cohere' else f"local:{model_name}"
        try:
            snippet_local = int(os.getenv('RERANK_INPUT_SNIPPET_CHARS', '600') or '600')
        except Exception:
            snippet_local = 600
        try:
            snippet_cohere = int(os.getenv('RERANK_INPUT_SNIPPET_CHARS', '700') or '700')
        except Exception:
            snippet_cohere = 700
        cohere_model = os.getenv('COHERE_RERANK_MODEL', COHERE_MODEL)
        try:
            cohere_top_n = int(os.getenv('COHERE_RERANK_TOP_N', '50') or '50')
        except Exception:
            cohere_top_n = 50
        cohere_key_present = bool(os.getenv('COHERE_API_KEY'))

    if not enabled:
        for i, r in enumerate(results):
            r['rerank_score'] = float(1.0 - (i * 0.01))
        return results[:top_k]

    # --- tracing: record input set size
    try:
        if trace is not None and hasattr(trace, 'add'):
            trace.add('reranker.rank', {
                'model': metrics_label,
                'input_topN': len(results or []),
                'output_topK': int(top_k),
            })
    except Exception:
        pass
    if backend == 'cohere':
        # DEBUG: print(f"  → Using Cohere API (no local processing)")
        try:
            # DEBUG: print(f"  → Importing cohere...")
            import cohere
            # DEBUG: print(f"  → Getting API key...")
            api_key = os.getenv('COHERE_API_KEY')
            if settings and not cohere_key_present:
                raise RuntimeError('COHERE_API_KEY not set')
            if not settings and not api_key:
                raise RuntimeError('COHERE_API_KEY not set')
            # DEBUG: print(f"  → Creating client...")
            client = cohere.Client(api_key=api_key)
            # DEBUG: print(f"  → Client created, building docs...")
            docs = []
            for r in results:
                file_ctx = r.get('file_path', '')
                # default snippet: 700 for cohere, configurable via env
                snip_len = snippet_cohere
                code_snip = (r.get('code') or r.get('text') or '')[:snip_len]
                docs.append(f"{file_ctx}\n\n{code_snip}")
            # Limit reranking to top 50 documents (configurable via env) to reduce token usage
            rerank_top_n = min(len(docs), cohere_top_n)

            # Instrument Cohere API call
            import time
            from server.api_tracker import track_api_call, APIProvider

            start = time.time()
            model_id = cohere_model
            rr = client.rerank(model=model_id, query=query, documents=docs, top_n=rerank_top_n)
            duration_ms = (time.time() - start) * 1000

            # Calculate cost - Cohere rerank is ~$0.002 per 1k searches
            # Each call is 1 search, so cost = $0.000002 per call
            cost_per_call = 0.000002
            tokens_est = len(docs) * 100  # Estimate based on doc count

            track_api_call(
                provider=APIProvider.COHERE,
                endpoint="https://api.cohere.ai/v1/rerank",
                method="POST",
                duration_ms=duration_ms,
                status_code=200,
                tokens_estimated=tokens_est,
                cost_usd=cost_per_call
            )

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
                        'model': metrics_label,
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
            snip_len = snippet_local
            code_snip = (r.get('code') or r.get('text') or '')[:snip_len]
            pairs.append({'text': query, 'text_pair': code_snip})
        try:
            t0 = _time.time()
            out = pipe(pairs, truncation=True)  # type: ignore[misc]
            duration_ms = (_time.time() - t0) * 1000
            # Track LOCAL model usage
            try:
                from server.api_tracker import track_api_call, APIProvider, track_trace
                track_api_call(provider=APIProvider.LOCAL, endpoint="hf_pipeline:text-classification", method="RUN",
                               duration_ms=duration_ms, status_code=200, tokens_estimated=0, cost_usd=0.0)
                track_trace(step="rerank_local_pipeline", provider="local", model=model_name, duration_ms=duration_ms,
                            extra={"candidates": len(results), "top_k": top_k})
            except Exception:
                pass
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
                        'model': metrics_label,
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
        code_snip = (r.get('code') or r.get('text') or '')[:snippet_local]
        docs.append(f"{file_ctx}\n\n{code_snip}")
    rr = get_reranker()
    if rr is None and _maybe_init_hf_pipeline(model_name) is not None:
        return results[:top_k]
    t0 = _time.time()
    ranked = rr.rank(query=query, docs=docs, doc_ids=list(range(len(docs))))  # type: ignore[attr-defined]
    duration_ms = (_time.time() - t0) * 1000
    try:
        from server.api_tracker import track_api_call, APIProvider, track_trace
        track_api_call(provider=APIProvider.LOCAL, endpoint="cross-encoder.rank", method="RUN",
                       duration_ms=duration_ms, status_code=200, tokens_estimated=0, cost_usd=0.0)
        track_trace(step="rerank_local_encoder", provider="local", model=model_name, duration_ms=duration_ms,
                    extra={"candidates": len(docs), "top_k": top_k})
    except Exception:
        pass
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
                'model': metrics_label,
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
