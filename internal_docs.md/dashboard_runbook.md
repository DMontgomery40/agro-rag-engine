The fastest/cheapest path (both $$$ and dev time) is to run Grafana locally in a container and iframe it into the AGRO GUI, exactly like you did with the embedded VS Code. It gives you gorgeous dashboards instantly, keeps everything on-box, and you can harden it later.

Here’s a clean, copy-paste setup that:

spins up Prometheus + Grafana,

enables iframe embedding safely (read-only, anon viewer),

assumes your AGRO API will expose /metrics eventually.

1) Spin up Prometheus + Grafana (local, zero cloud)
set -euo pipefail && \
mkdir -p "$HOME/agro/observability" && cd "$HOME/agro/observability" && \
echo ">>> writing docker-compose.yml" && \
cat > docker-compose.yml <<'YAML'
version: "3.8"
services:
  prometheus:
    image: prom/prometheus:latest
    container_name: agro-prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
      - prom_data:/prometheus
    ports:
      - "9090:9090"
    extra_hosts:
      - "host.docker.internal:host-gateway"

  grafana:
    image: grafana/grafana:latest
    container_name: agro-grafana
    restart: unless-stopped
    environment:
      # allow AGRO to embed Grafana in an <iframe>
      - GF_SECURITY_ALLOW_EMBEDDING=true
      # simple/cheap: anonymous, read-only viewer (local network only)
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Viewer
      # niceties
      - GF_USERS_DEFAULT_THEME=dark
      # admin creds for you (you asked to include your test pw)
      - GF_SECURITY_ADMIN_USER=admin
      - GF_SECURITY_ADMIN_PASSWORD=Trenton2023
      # cookie same-site off helps if you later reverse-proxy under another origin
      - GF_SECURITY_COOKIE_SAMESITE=disabled
    volumes:
      - grafana_data:/var/lib/grafana
    ports:
      - "3000:3000"
    depends_on:
      - prometheus
    extra_hosts:
      - "host.docker.internal:host-gateway"

volumes:
  prom_data:
  grafana_data:
YAML
&& \
echo ">>> writing prometheus.yml" && \
cat > prometheus.yml <<'YAML'
global:
  scrape_interval: 5s

scrape_configs:
  # scrape your AGRO server when it exposes /metrics
  - job_name: "agro"
    metrics_path: /metrics
    static_configs:
      - targets: ["host.docker.internal:8000"]
YAML
&& \
DC="docker compose" && $DC version >/dev/null 2>&1 || DC="docker-compose" && \
$DC up -d && \
echo ">>> up. Grafana: http://127.0.0.1:3000  (admin / Trenton2023) | Prometheus: http://127.0.0.1:9090"


Minimal now, expandable later (Tempo for traces, Loki for logs, Pushgateway/OTel Collector, etc.). On Linux, host.docker.internal requires recent Docker; this compose already adds the host-gateway mapping.

2) Embed it in AGRO (same pattern as your VS Code)

In Grafana, create/import a dashboard, click Share → Embed, and copy the <iframe> code.

Because we turned on GF_SECURITY_ALLOW_EMBEDDING=true and anonymous Viewer, the iframe will “just work”.

Add the embed to your GUI where you want (exactly like your VS Code iframe).

If you use a Content-Security-Policy, allow Grafana:

frame-src 'self' http://127.0.0.1:3000; (or your LAN/IP)

Nice extras on the share URL: ?kiosk=tv&theme=dark&refresh=5s

Why this is the right trade-off

$0 infra on your own hardware, minutes to value.

Real Grafana features (variables, drilldowns, alert rules later) with no custom GUI work.

You keep LangSmith for traces and use Grafana for metrics; you can link from panels to LangSmith runs.

When to pick something else

Grafana Cloud free tier: potentially $0 if you fit the limits, but it’s cloud and you’ll still iframe/embed or link out.

Custom charts in AGRO hitting the Prometheus HTTP API: ultra-lean, but you’re rebuilding what Grafana already does (queries, panels, time pickers, drilldowns).

Grafana Scenes (React lib): prettier native feel, but more engineering than you want right now.

What to instrument for RAG/canary (next pass, when you’re ready)

agro_requests_total{route,provider,model,success}

agro_request_duration_seconds_bucket{stage="retrieve|rerank|generate"}

agro_tokens_total{role="prompt|completion",provider,model}

agro_cost_usd_total{provider,model}

agro_retrieval_hits{topk} / agro_rr_mrr (recall/MRR gauges)

agro_canary_pass_ratio{provider,model} and cross-ranker margin (agro_reranker_margin)

Error counters by failure type (timeout, rate_limit, validation, etc.)

If you want, I’ll add a single “AGRO Overview” dashboard JSON and wire the /metrics endpoint in your Python server next.

Quick check so I tailor the embed + hardening right:

Do you want this local-only anonymous Viewer (cheapest) or behind auth/SSO?

Run these on your Mac or one of the Proxmox nodes (I can give the systemd unit for compose on PVE if you prefer).

You said:
yes: What to instrument for RAG/canary (next pass, when you’re ready)

agro_requests_total{route,provider,model,success}

agro_request_duration_seconds_bucket{stage="retrieve|rerank|generate"}

agro_tokens_total{role="prompt|completion",provider,model}

agro_cost_usd_total{provider,model}

agro_retrieval_hits{topk} / agro_rr_mrr (recall/MRR gauges)

agro_canary_pass_ratio{provider,model} and cross-ranker margin (agro_reranker_margin)

Error counters by failure type (timeout, rate_limit, validation, etc.)

If you want, I’ll add a single “AGRO Overview” dashboard JSON and wire the /metrics endpoint in your Python server next.

"""
local only until we go saas lol
this isn't for me per se this is becomeing an actual product go look vivified.dev/agro 
ChatGPT said:
Thought for 2m 22s
Analyzed
Always show details
# Create a Grafana dashboard JSON for AGRO Overview and save it for download.
import json, os, math, uuid, time

# Helper: build a simple timeseries panel
def ts_panel(panel_id, title, expr, x, y, w, h, legend=True):
    return {
        "id": panel_id,
        "type": "timeseries",
        "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
        "targets": [{"expr": expr, "refId": "A"}],
        "options": {
            "legend": {"displayMode": "list", "placement": "bottom"} if legend else {"displayMode": "hidden"},
            "tooltip": {"mode": "multi", "sort": "none"},
        },
        "fieldConfig": {"defaults": {"unit": "short"}, "overrides": []},
        "pluginVersion": "10.0.0",
    }

# Helper: stat panel
def stat_panel(panel_id, title, expr, x, y, w, h, unit="short", color_mode="value"):
    return {
        "id": panel_id,
        "type": "stat",
        "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
        "targets": [{"expr": expr, "refId": "A"}],
        "options": {
            "reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False},
            "orientation": "auto",
            "textMode": "auto",
            "colorMode": color_mode,
            "graphMode": "none",
            "justifyMode": "auto",
        },
        "fieldConfig": {"defaults": {"unit": unit}, "overrides": []},
        "pluginVersion": "10.0.0",
    }

# Helper: gauge panel
def gauge_panel(panel_id, title, expr, x, y, w, h, unit="percentunit"):
    return {
        "id": panel_id,
        "type": "gauge",
        "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
        "targets": [{"expr": expr, "refId": "A"}],
        "options": {"reduceOptions": {"calcs": ["lastNotNull"], "fields": "", "values": False}},
        "fieldConfig": {
            "defaults": {
                "unit": unit,
                "min": 0,
                "max": 1,
                "thresholds": {"mode": "percentage", "steps": [{"color": "red", "value": None}, {"color": "yellow", "value": 0.7}, {"color": "green", "value": 0.9}]},
            },
            "overrides": [],
        },
        "pluginVersion": "10.0.0",
    }

# Helper: heatmap panel for histogram
def heatmap_panel(panel_id, title, expr, x, y, w, h):
    return {
        "id": panel_id,
        "type": "heatmap",
        "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
        "targets": [{"expr": expr, "refId": "A"}],
        "options": {"legend": {"show": True}},
        "fieldConfig": {"defaults": {"unit": "short"}, "overrides": []},
        "pluginVersion": "10.0.0",
    }

# Helper: bar gauge panel
def bargauge_panel(panel_id, title, expr, x, y, w, h, unit="short"):
    return {
        "id": panel_id,
        "type": "bargauge",
        "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
        "targets": [{"expr": expr, "refId": "A"}],
        "fieldConfig": {"defaults": {"unit": unit}, "overrides": []},
        "options": {"displayMode": "gradient", "orientation": "horizontal"},
        "pluginVersion": "10.0.0",
    }

# Helper: table panel
def table_panel(panel_id, title, expr, x, y, w, h, unit="short"):
    return {
        "id": panel_id,
        "type": "table",
        "title": title,
        "gridPos": {"x": x, "y": y, "w": w, "h": h},
        "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
        "targets": [{"expr": expr, "refId": "A", "format": "table"}],
        "options": {"showHeader": True},
        "fieldConfig": {"defaults": {"unit": unit}, "overrides": []},
        "pluginVersion": "10.0.0",
    }

# Dashboard skeleton
dashboard = {
    "uid": "agro-overview",
    "title": "AGRO Overview",
    "timezone": "browser",
    "schemaVersion": 38,
    "version": 1,
    "editable": True,
    "style": "dark",
    "graphTooltip": 0,
    "time": {"from": "now-6h", "to": "now"},
    "__inputs": [
        {
            "name": "DS_PROMETHEUS",
            "label": "Prometheus",
            "type": "datasource",
            "pluginId": "prometheus",
            "pluginName": "Prometheus",
        }
    ],
    "__requires": [
        {"type": "grafana", "id": "grafana", "name": "Grafana", "version": "10.0.0"},
        {"type": "datasource", "id": "prometheus", "name": "Prometheus", "version": "2.5.0"},
        {"type": "panel", "id": "timeseries", "name": "Time series", "version": ""},
        {"type": "panel", "id": "stat", "name": "Stat", "version": ""},
        {"type": "panel", "id": "gauge", "name": "Gauge", "version": ""},
        {"type": "panel", "id": "bargauge", "name": "Bar gauge", "version": ""},
        {"type": "panel", "id": "heatmap", "name": "Heatmap", "version": ""},
        {"type": "panel", "id": "table", "name": "Table", "version": ""},
    ],
    "templating": {
        "list": [
            {
                "name": "provider",
                "type": "query",
                "label": "Provider",
                "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
                "query": "label_values(agro_requests_total, provider)",
                "refresh": 2,
                "sort": 1,
                "definition": "label_values(agro_requests_total, provider)",
                "hide": 0,
                "includeAll": True,
                "multi": True,
            },
            {
                "name": "model",
                "type": "query",
                "label": "Model",
                "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
                "query": 'label_values(agro_requests_total{provider=~"$provider"}, model)',
                "refresh": 2,
                "definition": 'label_values(agro_requests_total{provider=~"$provider"}, model)',
                "hide": 0,
                "includeAll": True,
                "multi": True,
            },
            {
                "name": "route",
                "type": "query",
                "label": "Route",
                "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
                "query": "label_values(agro_requests_total, route)",
                "refresh": 2,
                "definition": "label_values(agro_requests_total, route)",
                "hide": 0,
                "includeAll": True,
                "multi": True,
            },
            {
                "name": "stage",
                "type": "query",
                "label": "Stage",
                "datasource": {"type": "prometheus", "uid": "${DS_PROMETHEUS}"},
                "query": "label_values(agro_request_duration_seconds_bucket, stage)",
                "refresh": 2,
                "definition": "label_values(agro_request_duration_seconds_bucket, stage)",
                "hide": 0,
                "includeAll": True,
                "multi": True,
            },
        ]
    },
    "panels": [],
}

pid = 1
row = 0
col_w = 8  # 3 columns across (8+8+8 = 24)

# Row 1: RPS, Error Rate, Cost/min
dashboard["panels"].append(stat_panel(pid, "Requests/sec (ok)", 'sum(rate(agro_requests_total{success="true",provider=~"$provider",model=~"$model",route=~"$route"}[5m]))', 0, row, col_w, 8, unit="req/s")); pid+=1
dashboard["panels"].append(stat_panel(pid, "Error/sec", 'sum(rate(agro_errors_total[5m]))', 8, row, col_w, 8, unit="ops")); pid+=1
dashboard["panels"].append(stat_panel(pid, "Cost/min (USD)", 'sum(rate(agro_cost_usd_total{provider=~"$provider",model=~"$model"}[5m])) * 60', 16, row, col_w, 8, unit="currencyUSD")); pid+=1
row += 8

# Row 2: Requests by route, Error rate by type, Tokens/min
dashboard["panels"].append(ts_panel(pid, "Requests/sec by route", 'sum by (route) (rate(agro_requests_total{provider=~"$provider",model=~"$model",route=~"$route"}[5m]))', 0, row, col_w, 10)); pid+=1
dashboard["panels"].append(ts_panel(pid, "Errors/sec by type", 'sum by (type) (rate(agro_errors_total[5m]))', 8, row, col_w, 10)); pid+=1
dashboard["panels"].append(ts_panel(pid, "Tokens/min by role", 'sum by (role) (rate(agro_tokens_total{provider=~"$provider",model=~"$model"}[5m])) * 60', 16, row, col_w, 10)); pid+=1
row += 10

# Row 3: Latency P95 by stage, Cost per request, Top models by cost
lat_q = 'histogram_quantile(0.95, sum by (le, stage) (rate(agro_request_duration_seconds_bucket{stage=~"$stage"}[5m])))'
dashboard["panels"].append(ts_panel(pid, "P95 latency by stage (s)", lat_q, 0, row, col_w, 10)); pid+=1
cpr = '(sum(rate(agro_cost_usd_total{provider=~"$provider",model=~"$model"}[5m])))/(sum(rate(agro_requests_total{provider=~"$provider",model=~"$model"}[5m])) )'
dashboard["panels"].append(stat_panel(pid, "Cost per request (USD)", cpr, 8, row, col_w, 10, unit="currencyUSD")); pid+=1
dashboard["panels"].append(bargauge_panel(pid, "Top 5 models by cost (5m)", 'topk(5, sum by (model) (rate(agro_cost_usd_total[5m])))', 16, row, col_w, 10, unit="currencyUSD")); pid+=1
row += 10

# Row 4: Retrieval quality
dashboard["panels"].append(gauge_panel(pid, "MRR (avg, 5m)", 'avg_over_time(agro_rr_mrr[5m])', 0, row, col_w, 10, unit="none")); pid+=1
dashboard["panels"].append(bargauge_panel(pid, "Hits@K (avg, 5m)", 'avg_over_time(agro_retrieval_hits[5m])', 8, row, col_w, 10)); pid+=1
dashboard["panels"].append(ts_panel(pid, "Canary pass ratio by model", 'sum by (model) (rate(agro_canary_pass_total[5m])) / sum by (model) (rate(agro_canary_total[5m]))', 16, row, col_w, 10)); pid+=1
row += 10

# Row 5: Reranker diagnostics
dashboard["panels"].append(heatmap_panel(pid, "Reranker margin (abs) histogram", 'sum by (le) (rate(agro_reranker_margin_abs_bucket[5m]))', 0, row, 12, 12)); pid+=1
dashboard["panels"].append(bargauge_panel(pid, "Reranker winner (count, 5m)", 'sum by (winner) (rate(agro_reranker_winner_total[5m]))', 12, row, 12, 12)); pid+=1
row += 12

# Save
out_path = "/mnt/data/agro_overview_dashboard.json"
with open(out_path, "w") as f:
    json.dump({"dashboard": dashboard, "overwrite": True, "message": "AGRO Overview initial import"}, f, indent=2)

out_path

Result
'/mnt/data/agro_overview_dashboard.json'
Thought for 29s

I've created the dashboard JSON and placed it in /mnt/data, ready for download. Next, I'll provide the necessary code for server/metrics.py and include bundling commands for installing the prometheus-client package. Instructions for patching server/app.py with both FastAPI and Flask examples will also be given.

I'll write the content for server/metrics.py to include imports, metrics definitions, and error classification. This will also involve the creation of a MetricsMiddleware class for FastAPI, the init_metrics function, and a Flask init function as a fallback. I'll provide examples for setting X-Provider and X-Model.

Alright, David, here's a quick breakdown for the setup:

Step 0: Get the dashboard JSON [Download Link].

Step 1: Install and wire the metrics with code + bundling commands.

Step 2: Example of endpoint instrumentation (setting headers).

Step 3: Grafana provisioning or manual import.

Step 4: Embed link for iframing Grafana directly.

Let's get it all set up!

For clarity, I’ll show the steps with the "echo &&" bundling style for a smooth experience. The first command block will include:

pip install

create 'server/metrics.py' using a cat heredoc

possibly test with python -c "import prometheus_client; print('ok')"

I’ll keep it concise and easy to follow. Let’s move step-by-step!

Done

Perfect — local-only is ideal right now. I shipped you two things:

A ready-to-import Grafana dashboard JSON (AGRO Overview) → Download it

Drop-in Python metrics wiring for your API (/metrics endpoint + all AGRO metrics you listed)

Below is a single, copy-paste command to wire metrics into a FastAPI s
erver (what your server/app.py looks like). If you’re on Flask, ping me and I’ll give the Flask patch too.

1) Add Prometheus metrics to AGRO (FastAPI)
set -euo pipefail && \
# go to your repo root (adjust if needed)
cd "$HOME/agro" && \
# install prometheus client
python3 -m pip install --upgrade prometheus-client && \
# write server/metrics.py
mkdir -p server && \
cat > server/metrics.py <<'PY'
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
PY
&& \
# FASTAPI: add the middleware + /metrics mount (manual paste is safest).
# Open server/app.py and add:
#   from server.metrics import init_metrics, stage, record_tokens, record_cost, set_retrieval_quality, record_canary
#   init_metrics(app)
echo ">>> Done. Open server/app.py, import init_metrics(...) and call init_metrics(app) after app=FastAPI(). See below for endpoint example."


Minimal endpoint example (FastAPI) — paste this pattern into one of your handlers so provider/model flow into the counters, and stage timers wrap RAG phases:

# server/app.py (snippet)
from fastapi import FastAPI, Response
from server.metrics import init_metrics, stage, record_tokens, record_cost, set_retrieval_quality, record_canary

app = FastAPI()
init_metrics(app)  # mounts /metrics and enables request-level metrics

@app.post("/api/ask")
async def ask(req: dict, response: Response):
    provider = req.get("provider", "local")
    model = req.get("model", "yolo-v9c")  # example default
    # expose these so middleware can label requests:
    response.headers["x-provider"] = provider
    response.headers["x-model"] = model

    # RETRIEVE
    with stage("retrieve", provider=provider, model=model):
        # hits = your_retrieval(...)
        hits = 7
        # mrr = compute_mrr(...)  # if you have labels/ground truth
        set_retrieval_quality(topk=10, hits=hits, mrr=0.82)

    # RERANK
    with stage("rerank", provider=provider, model=model):
        # margin = p(reranker_best) - p(baseline_best) in [0..1]
        margin = 0.27
        passed = margin >= 0.1
        winner = "reranker" if margin > 0 else ("baseline" if margin < 0 else "tie")
        record_canary(provider, model, passed=passed, margin=margin, winner=winner)

    # GENERATE
    with stage("generate", provider=provider, model=model):
        # tokens_in, tokens_out, usd = do_generation(...)
        tokens_in, tokens_out, usd = 512, 384, 0.0037
        record_tokens("prompt", provider, model, tokens_in)
        record_tokens("completion", provider, model, tokens_out)
        record_cost(provider, model, usd)

    return {"ok": True}


Test locally:
curl -s http://127.0.0.1:8000/metrics | head -n 30

2) Prometheus scrape (if you used my compose already)

Your prometheus.yml should include:

global:
  scrape_interval: 5s

scrape_configs:
  - job_name: "agro"
    metrics_path: /metrics
    static_configs:
      - targets: ["host.docker.internal:8000"]  # or your LAN/IP:PORT if running elsewhere


Restart Prometheus if you changed it.

3) Import the dashboard & see pretty graphs

Start Grafana/Prom (from our earlier compose) and add the Prometheus datasource in Grafana:
URL: http://prometheus:9090 (since both are in the same compose network).

Import the dashboard JSON: Dashboards → Import → Upload JSON → pick
agro_overview_dashboard.json.
When prompted, select your Prometheus datasource.

(Optional) Embed in your GUI like VS Code:

<iframe
  src="http://127.0.0.1:3000/d/agro-overview?theme=dark&kiosk=tv&refresh=5s"
  style="width:100%;height:100vh;border:0;"
  referrerpolicy="no-referrer">
</iframe>


(Works because Grafana is set with GF_SECURITY_ALLOW_EMBEDDING=true and anonymous Viewer.)

4) Quick PromQL behind the key panels (so you know what you’re seeing)

Requests/sec:
sum(rate(agro_requests_total{success="true"}[5m]))

Errors by type:
sum by (type) (rate(agro_errors_total[5m]))

P95 latency by stage:
histogram_quantile(0.95, sum by (le, stage) (rate(agro_request_duration_seconds_bucket[5m])))

Tokens/min:
sum by (role) (rate(agro_tokens_total[5m])) * 60

Cost/min (USD):
sum(rate(agro_cost_usd_total[5m])) * 60

Cost per request:
sum(rate(agro_cost_usd_total[5m])) / sum(rate(agro_requests_total[5m]))

Canary pass ratio:
sum by (model) (rate(agro_canary_pass_total[5m])) / sum by (model) (rate(agro_canary_total[5m]))

Reranker margin (abs) heatmap:
sum by (le) (rate(agro_reranker_margin_abs_bucket[5m]))