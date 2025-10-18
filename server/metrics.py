# server/metrics.py
# AGRO Prometheus instrumentation (FastAPI-first).
# Exposes /metrics and provides helpers for RAG/canary metrics you asked for.

from contextlib import contextmanager
from typing import Optional
import time

from prometheus_client import (
    Counter, Histogram, Gauge, make_asgi_app
)

# Latency buckets tuned for LLM/RAG (seconds)
LATENCY_BUCKETS = (0.05, 0.1, 0.25, 0.5, 1, 2, 3, 5, 8, 13, 21, 34, 60)

# ---- Core request & latency ----
REQUESTS_TOTAL = Counter(
    "agro_requests_total",
    "Total requests processed by AGRO",
    labelnames=("route", "provider", "model", "success"),
)

REQUEST_DURATION = Histogram(
    "agro_request_duration_seconds",
    "Request/stage durations in seconds",
    labelnames=("stage",),  # e.g. 'request' | 'retrieve' | 'rerank' | 'generate'
    buckets=LATENCY_BUCKETS,
)

# ---- Tokens & cost ----
TOKENS_TOTAL = Counter(
    "agro_tokens_total",
    "Token counts by role/provider/model",
    labelnames=("role", "provider", "model"),  # role: prompt|completion
)

COST_USD_TOTAL = Counter(
    "agro_cost_usd_total",
    "Accumulated USD cost by provider/model",
    labelnames=("provider", "model"),
)

# ---- Retrieval quality ----
RETRIEVAL_HITS = Gauge(
    "agro_retrieval_hits",
    "Hits@K (set to the last evaluation value)",
    labelnames=("topk",),  # use string like "5", "10"
)

RR_MRR = Gauge(
    "agro_rr_mrr",
    "Mean Reciprocal Rank (0..1). Set to last evaluation value.",
)

# ---- Canary & reranker ----
CANARY_TOTAL = Counter(
    "agro_canary_total",
    "Total canary evaluations",
    labelnames=("provider", "model"),
)

CANARY_PASS_TOTAL = Counter(
    "agro_canary_pass_total",
    "Passing canary evaluations",
    labelnames=("provider", "model"),
)

# Prometheus histograms can't have negative buckets; record absolute margin.
RERANKER_MARGIN_ABS = Histogram(
    "agro_reranker_margin_abs",
    "Absolute reranker-vs-baseline margin (0..1)",
    labelnames=("provider", "model"),
    buckets=(0.0, 0.01, 0.02, 0.05, 0.1, 0.2, 0.3, 0.5, 0.75, 1.0),
)

RERANKER_WINNER_TOTAL = Counter(
    "agro_reranker_winner_total",
    "Which system won on canary (reranker|baseline|tie)",
    labelnames=("winner",),
)

# ---- Errors ----
ERRORS_TOTAL = Counter(
    "agro_errors_total",
    "Errors by type",
    labelnames=("type",),  # timeout | rate_limit | validation | provider | network | unknown
)

# ---- Outbound API calls (universal tracking) ----
API_CALLS_TOTAL = Counter(
    "agro_api_calls_total",
    "Total outbound API calls by provider",
    labelnames=("provider", "method", "status_code"),  # provider: cohere|openai|qdrant|etc
)

API_CALL_DURATION = Histogram(
    "agro_api_call_duration_seconds",
    "Outbound API call duration in seconds",
    labelnames=("provider",),
    buckets=LATENCY_BUCKETS,
)

API_CALL_COST_USD = Counter(
    "agro_api_call_cost_usd",
    "USD cost of outbound API calls by provider",
    labelnames=("provider",),
)

API_CALL_TOKENS = Counter(
    "agro_api_call_tokens",
    "Tokens consumed by outbound LLM API calls by provider",
    labelnames=("provider",),
)

def _classify_error(exc: BaseException) -> str:
    n = exc.__class__.__name__.lower()
    msg = str(exc).lower()
    if "timeout" in n or "timeout" in msg:
        return "timeout"
    if "rate" in n and "limit" in n or "rate limit" in msg:
        return "rate_limit"
    if "validation" in n or "pydantic" in n or "valueerror" in n:
        return "validation"
    if "connection" in n or "network" in n or "httpx" in n:
        return "network"
    if "openai" in n or "anthropic" in n or "vertex" in n or "bedrock" in n:
        return "provider"
    return "unknown"

# ---------- Stage timing (retrieve | rerank | generate) ----------
@contextmanager
def stage(name: str, provider: str = "", model: str = "", route: str = ""):
    """
    with stage("retrieve", provider=prov, model=mdl):
        ... retrieval work ...
    """
    start = time.perf_counter()
    try:
        yield
    except Exception as e:
        ERRORS_TOTAL.labels(_classify_error(e)).inc()
        REQUEST_DURATION.labels(stage=name).observe(time.perf_counter() - start)
        raise
    else:
        REQUEST_DURATION.labels(stage=name).observe(time.perf_counter() - start)

# ---------- Simple helpers you can call from your pipeline ----------
def record_tokens(role: str, provider: str, model: str, count: int):
    TOKENS_TOTAL.labels(role=role, provider=provider, model=model).inc(max(0, int(count)))

def record_cost(provider: str, model: str, usd: float):
    # Counters accept float increments.
    COST_USD_TOTAL.labels(provider=provider, model=model).inc(max(0.0, float(usd)))

def set_retrieval_quality(topk: int, hits: int, mrr: Optional[float] = None):
    RETRIEVAL_HITS.labels(topk=str(int(topk))).set(max(0, int(hits)))
    if mrr is not None:
        v = max(0.0, min(1.0, float(mrr)))
        RR_MRR.set(v)

def record_canary(provider: str, model: str, passed: bool, margin: Optional[float] = None, winner: Optional[str] = None):
    CANARY_TOTAL.labels(provider=provider, model=model).inc()
    if passed:
        CANARY_PASS_TOTAL.labels(provider=provider, model=model).inc()
    if margin is not None:
        RERANKER_MARGIN_ABS.labels(provider=provider, model=model).observe(abs(float(margin)))
    if winner:
        if winner not in ("reranker", "baseline", "tie"):
            winner = "unknown"
        RERANKER_WINNER_TOTAL.labels(winner=winner).inc()

def record_api_call(provider: str, status_code: int = 200, duration_seconds: float = 0.0,
                    cost_usd: float = 0.0, tokens: int = 0, method: str = "POST"):
    """Record metrics for an outbound API call."""
    API_CALLS_TOTAL.labels(provider=provider, method=method, status_code=str(status_code)).inc()
    if duration_seconds > 0:
        API_CALL_DURATION.labels(provider=provider).observe(duration_seconds)
    if cost_usd > 0:
        API_CALL_COST_USD.labels(provider=provider).inc(cost_usd)
    if tokens > 0:
        API_CALL_TOKENS.labels(provider=provider).inc(tokens)

# ---------- FastAPI integration ----------
# This middleware measures end-to-end request time and increments agro_requests_total.
# It reads provider/model from response headers that your endpoint sets: X-Provider / X-Model.
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response

class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        route_path = request.url.path
        start = time.perf_counter()
        success = "false"
        provider = ""
        model = ""
        try:
            response: Response = await call_next(request)
            success = "true" if response.status_code < 400 else "false"
            provider = response.headers.get("x-provider", "")
            model = response.headers.get("x-model", "")
            return response
        except Exception as e:
            ERRORS_TOTAL.labels(_classify_error(e)).inc()
            success = "false"
            raise
        finally:
            REQUEST_DURATION.labels(stage="request").observe(time.perf_counter() - start)
            REQUESTS_TOTAL.labels(route=route_path, provider=provider, model=model, success=success).inc()

def init_metrics_fastapi(app):
    # add middleware and mount /metrics
    app.add_middleware(MetricsMiddleware)
    app.mount("/metrics", make_asgi_app())

# Convenience alias
init_metrics = init_metrics_fastapi

# FASTAPI: add the middleware + /metrics mount (manual paste is safest).
# Open server/app.py and add:
#   from server.metrics import init_metrics, stage, record_tokens, record_cost, set_retrieval_quality, record_canary
#   init_metrics(app)