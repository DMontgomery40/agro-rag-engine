# server/metrics.py
# AGRO Prometheus instrumentation (FastAPI-first).
# Exposes /metrics and provides helpers for RAG/canary metrics you asked for.

from contextlib import contextmanager
from typing import Optional, Dict, List
import time

from prometheus_client import (
    Counter, Histogram, Gauge, make_asgi_app
)
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response
from server.services.config_registry import get_config_registry

# Module-level config caching
_config_registry = get_config_registry()
_METRICS_ENABLED = _config_registry.get_int('METRICS_ENABLED', 1)
_PROMETHEUS_PORT = _config_registry.get_int('PROMETHEUS_PORT', 9090)
_ALERT_INCLUDE_RESOLVED = _config_registry.get_int('ALERT_INCLUDE_RESOLVED', 1)
_ALERT_WEBHOOK_TIMEOUT = _config_registry.get_int('ALERT_WEBHOOK_TIMEOUT', 5)


def reload_config():
    """Reload cached config values from registry."""
    global _METRICS_ENABLED, _PROMETHEUS_PORT, _ALERT_INCLUDE_RESOLVED, _ALERT_WEBHOOK_TIMEOUT
    _METRICS_ENABLED = _config_registry.get_int('METRICS_ENABLED', 1)
    _PROMETHEUS_PORT = _config_registry.get_int('PROMETHEUS_PORT', 9090)
    _ALERT_INCLUDE_RESOLVED = _config_registry.get_int('ALERT_INCLUDE_RESOLVED', 1)
    _ALERT_WEBHOOK_TIMEOUT = _config_registry.get_int('ALERT_WEBHOOK_TIMEOUT', 5)


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

RERANKER_MARGIN_LATEST = Gauge(
    "agro_reranker_margin_latest",
    "Latest reranker minus baseline margin (signed)",
    labelnames=("provider", "model"),
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

# ---- RAG Evaluation Metrics ----
EVAL_RUN_ACCURACY = Gauge(
    "agro_eval_run_accuracy",
    "Eval run accuracy by run_id and topk",
    labelnames=("run_id", "topk"),
)

EVAL_RUN_DURATION = Gauge(
    "agro_eval_run_duration_seconds",
    "Total duration of eval run in seconds",
    labelnames=("run_id",),
)

EVAL_RUN_TOTAL_QUESTIONS = Gauge(
    "agro_eval_run_total_questions",
    "Total questions in eval run",
    labelnames=("run_id",),
)

EVAL_RUN_CONFIG = Gauge(
    "agro_eval_run_config",
    "Configuration parameter values for eval run",
    labelnames=("run_id", "param_name"),
)

EVAL_QUESTION_RESULT = Gauge(
    "agro_eval_question_result",
    "Per-question evaluation result (1=hit, 0=miss)",
    labelnames=("run_id", "question_idx", "topk"),
)

EVAL_QUESTION_DURATION = Gauge(
    "agro_eval_question_duration_seconds",
    "Per-question search duration",
    labelnames=("run_id", "question_idx"),
)

EVAL_MODALITY_TOP_RANK = Counter(
    "agro_eval_modality_top_rank_total",
    "How often each modality ranks #1 in final results",
    labelnames=("run_id", "modality"),  # modality: bm25 | vector | reranker
)

EVAL_SCORE_DISTRIBUTION = Histogram(
    "agro_eval_score_distribution",
    "Distribution of scores by modality and run",
    labelnames=("run_id", "modality"),  # modality: bm25 | vector | reranker
    buckets=(0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0),
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
        RERANKER_MARGIN_LATEST.labels(provider=provider, model=model).set(float(margin))
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

def record_eval_run(run_id: str, total: int, top1_hits: int, topk_hits: int,
                    duration_secs: float, config_params: Dict[str, float]):
    """Record aggregate metrics for a complete eval run.

    Args:
        run_id: Unique identifier for this eval run (timestamp-based)
        total: Total number of questions evaluated
        top1_hits: Number of questions where expected file was in top-1
        topk_hits: Number of questions where expected file was in top-k
        duration_secs: Total eval duration in seconds
        config_params: Dict of config parameter names -> values to record
    """
    EVAL_RUN_TOTAL_QUESTIONS.labels(run_id=run_id).set(total)
    EVAL_RUN_ACCURACY.labels(run_id=run_id, topk="1").set(top1_hits / max(1, total))
    EVAL_RUN_ACCURACY.labels(run_id=run_id, topk="k").set(topk_hits / max(1, total))
    EVAL_RUN_DURATION.labels(run_id=run_id).set(duration_secs)

    # Record all config parameters as labeled metrics
    for param_name, value in config_params.items():
        try:
            EVAL_RUN_CONFIG.labels(run_id=run_id, param_name=param_name).set(float(value))
        except (ValueError, TypeError):
            pass  # Skip non-numeric values

def record_eval_question(run_id: str, question_idx: int, top1_hit: bool,
                         topk_hit: bool, duration_secs: float):
    """Record metrics for a single question in an eval run.

    Args:
        run_id: Unique identifier for the parent eval run
        question_idx: Index of this question (0-based)
        top1_hit: Whether expected file was in top-1 results
        topk_hit: Whether expected file was in top-k results
        duration_secs: Search duration for this question
    """
    EVAL_QUESTION_RESULT.labels(run_id=run_id, question_idx=str(question_idx), topk="1").set(1.0 if top1_hit else 0.0)
    EVAL_QUESTION_RESULT.labels(run_id=run_id, question_idx=str(question_idx), topk="k").set(1.0 if topk_hit else 0.0)
    EVAL_QUESTION_DURATION.labels(run_id=run_id, question_idx=str(question_idx)).set(duration_secs)

def record_eval_modality_contribution(run_id: str, top1_modality: str, scores: Dict[str, List[float]]):
    """Record which modality ranked #1 and score distributions.

    Args:
        run_id: Unique identifier for the eval run
        top1_modality: Which modality ranked #1 ("bm25", "vector", or "reranker")
        scores: Dict mapping modality name -> list of scores for distribution tracking
    """
    if top1_modality:
        EVAL_MODALITY_TOP_RANK.labels(run_id=run_id, modality=top1_modality).inc()

    # Record score distributions
    for modality, score_list in scores.items():
        for score in score_list:
            try:
                EVAL_SCORE_DISTRIBUTION.labels(run_id=run_id, modality=modality).observe(float(score))
            except (ValueError, TypeError):
                pass

# ---------- FastAPI integration ----------
# This middleware measures end-to-end request time and increments agro_requests_total.
# It reads provider/model from response headers that your endpoint sets: X-Provider / X-Model.
class MetricsMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        route_path = request.url.path

        # Skip metrics for SSE streaming endpoints
        if route_path.startswith("/api/stream/") or route_path.startswith("/ws/"):
            return await call_next(request)

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
