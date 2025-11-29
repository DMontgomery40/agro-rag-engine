# Monitoring & Observability

AGRO ships with a full monitoring stack: Prometheus, Alertmanager, Loki, and Grafana — wired into the app and the GUI. You can run AGRO “just local, no metrics” if you want, but if you care about cost, performance, or weird query patterns, the monitoring stack is worth turning on.

This page covers:

- Embedded Grafana in the AGRO UI
- Prometheus metrics and what they track
- Built‑in dashboards
- Slack/Discord/custom webhook alerts on **any** metric
- LangSmith tracing integration
- The local monitoring APIs AGRO exposes

---

## Architecture

```mermaid
flowchart LR
    subgraph AGRO[:material-cog: AGRO Server]
        API[FastAPI app<br/>/api/*]
        Alerts[Alert webhook<br/>& monitoring APIs]
        Logs[(data/logs/*<br/>data/tracking/*)]
    end

    subgraph Prometheus Stack
        Prom[Prometheus]
        AM[Alertmanager]
    end

    subgraph Logs Stack
        Loki[Loki]
        Promtail[Promtail]
    end

    subgraph UI[:material-monitor-dashboard: Grafana]
        Dash[Dashboards<br/>(embedded + native)]
    end

    API -->|/metrics, /health, etc.| Prom
    Prom --> AM
    AM -->|webhook| Alerts

    Logs -->|file tail| Promtail --> Loki

    Prom --> Dash
    Loki --> Dash

    subgraph External
        Slack[Slack]
        Discord[Discord]
        Webhook[Custom HTTP]
        LangSmith[LangSmith Traces]
    end

    Alerts -->|Slack/Discord/JSON| Slack
    Alerts --> Discord
    Alerts --> Webhook

    API -->|LangChain/OpenAI/etc.| LangSmith
    LangSmith -. dashboards .-> Dash
```

!!! note
    `infra/docker-compose.yml` in this repo is **deprecated**. The actual services are managed from the root‑level `docker-compose.yml`. The infra file is kept around as a reference.

---

## Embedded Grafana Dashboard

AGRO embeds Grafana directly into the UI via an `<iframe>`. You don’t have to remember another port, copy URLs, or juggle logins; you just click the **Monitoring** tab in the AGRO GUI and you’re looking at live dashboards.

Why this is actually useful:

- You can correlate “why is retrieval slow?” with token burn, error rates, and query patterns without context‑switching.
- Grafana is configured to allow embedding (`GF_SECURITY_ALLOW_EMBEDDING=true`) and anonymous editor access for local networks, so you can:
  - Clone and tweak the default dashboards
  - Add your own panels and alerts
  - Treat Grafana as a built‑in monitoring cockpit rather than another external thing

The Grafana container is configured with:

- Dark theme by default
- Infinity datasource plugin (`yesoreyeram-infinity-datasource`) for JSON/HTTP data sources
- Provisioned dashboards and datasources in `infra/grafana/provisioning` (see that directory for the exact dashboards)

---

## Prometheus Metrics

Prometheus scrapes AGRO (and the rest of the stack) and stores time‑series metrics. Those metrics are what power:

- The Grafana dashboards
- Alertmanager alerts (and then Slack/Discord/custom webhooks via AGRO)
- Any custom PromQL queries you want to run

At a high level, AGRO exports metrics for:

| Area                | Examples (not exhaustive)                                    |
|---------------------|--------------------------------------------------------------|
| Request performance | Request latency (p50/p95/p99), per‑route timings             |
| Throughput          | Requests per second, queries per route                       |
| Error rates         | 4xx/5xx counts, timeout counts, rate‑limit errors           |
| Token usage         | Tokens per request, per provider/model, rolling averages     |
| Cost                | Estimated cost per request, per provider, rolling windows    |
| Retrieval quality   | Canary query pass rate, MRR estimates if you enable them     |

!!! tip
    The exact metric names are visible in Grafana’s “Explore” tab by selecting the Prometheus datasource and starting to type `agro_…` in the metric selector.

---

## Built‑in Dashboards

AGRO ships with a small but focused set of dashboards. You can modify them freely; they’re just Grafana JSON that lives under `infra/grafana/provisioning`.

Typical dashboards include:

| Dashboard                     | What it shows                                                                                     |
|-------------------------------|----------------------------------------------------------------------------------------------------|
| **AGRO – Overview**          | High‑level health: request rate, latency, error rate, token usage, cost, basic host stats         |
| **AGRO – Retrieval & RAG**   | Query volumes, BM25 vs. vector hits, rerank usage, canary query performance                       |
| **AGRO – Cost & Tokens**     | Tokens per minute/hour, estimated cost per provider/model, spikes vs. baseline                    |
| **AGRO – Errors & Alerts**   | Error breakdown (timeouts, rate limits, 5xx), alert counts, recent alert events                   |
| **AGRO – Logs (Loki)**       | Searchable logs for AGRO + containers via Loki (if you mount Docker logs into promtail)          |

=== "From the AGRO GUI"

    1. Start AGRO with monitoring enabled (see the main `docker-compose.yml`).
    2. Open the AGRO web UI.
    3. Click the **Monitoring** / **Grafana** tab.
    4. Use the built‑in dashboards or duplicate them to customize.

=== "Direct Grafana access"

    - URL: `http://localhost:3000` (by default)
    - Default admin credentials:
      - `GF_SECURITY_ADMIN_USER=admin`
      - `GF_SECURITY_ADMIN_PASSWORD=Trenton2023`  
    - Once logged in, you can:
      - Import/export dashboards
      - Add datasources (e.g., LangSmith, other JSON APIs)
      - Configure advanced alert rules

!!! warning
    These Grafana credentials are for local/dev setups. If you expose Grafana beyond your local machine, change the password and disable anonymous access.

---

## Alerting: Slack, Discord & Custom Webhooks

### How alerting is wired

There are two layers:

1. **Prometheus + Alertmanager**  
   - You define alert rules in Prometheus config (for metrics like latency, error rate, cost, etc.).
   - When an alert fires or resolves, Alertmanager sends a webhook to AGRO:

     ```http
     POST /api/webhooks/alertmanager
     Content-Type: application/json
     ```

     The payload is the standard Alertmanager schema:

     ```json
     {
       "status": "firing",
       "alerts": [
         {
           "status": "firing",
           "labels": {
             "alertname": "HighLatency",
             "severity": "critical",
             "service": "agro-api"
           },
           "annotations": {
             "summary": "p99 latency > 10s",
             "description": "Requests to /api/query have p99 latency over 10s for 5m"
           },
           "startsAt": "2025-01-01T00:00:00.000Z",
           "endsAt": "0001-01-01T00:00:00Z"
         }
       ],
       "receiver": "critical"
     }
     ```

2. **AGRO’s alert webhook receiver** (`server/alerts.py`)  
   - Endpoint: `POST /api/webhooks/alertmanager`
   - It:
     - Logs each alert as JSONL to `data/logs/alerts.jsonl`
     - Logs a human‑readable summary to the app logger (shows up in container logs)
     - Dispatches notifications to:
       - Slack
       - Discord
       - Arbitrary HTTP webhooks (JSON payload)

The important part: **Alertmanager can fire on any metric** you have in Prometheus. AGRO doesn’t hard‑code which conditions are “alert‑worthy”; it just receives whatever Alertmanager sends and fans it out to your channels.

---

### Alert webhook internals

The key pieces in `server/alerts.py`:

- `alertmanager_webhook` – receives and logs alerts, then calls `_dispatch_notifications`.
- `_log_alert` – appends each alert to `data/logs/alerts.jsonl` with a UTC timestamp.
- `_dispatch_notifications` – filters alerts by severity and sends them to:
  - Slack (`cfg.slack_webhook_url`)
  - Discord (`cfg.discord_webhook_url`)
  - Generic webhooks (`ALERT_WEBHOOK_URLS`, `ALERT_WEBHOOK_HEADERS`)

The notification text is concise and chat‑friendly:

```text
[CRITICAL] HighLatency — p99 latency > 10s (agro-api) @ 2025-01-01T00:00:00Z
[WARNING] TokenBurnSpike — Token burn > 5000/min (openai-gpt-4o) @ 2025-01-01T00:02:00Z
```

Slack payload example:

```json
{
  "text": "*AGRO Alerts (firing)*\n[CRITICAL] HighLatency — p99 latency > 10s (agro-api) @ 2025-01-01T00:00:00Z"
}
```

Discord payload example:

```json
{
  "content": "**AGRO Alerts (firing)**\n[CRITICAL] HighLatency — p99 latency > 10s (agro-api) @ 2025-01-01T00:00:00Z"
}
```

Generic webhook payload example:

```json
{
  "title": "AGRO Alerts (firing)",
  "status": "firing",
  "count": 1,
  "lines": [
    "[CRITICAL] HighLatency — p99 latency > 10s (agro-api) @ 2025-01-01T00:00:00Z"
  ],
  "alerts": [
    {
      "...": "full Alertmanager alert object"
    }
  ]
}
```

---

### Configuring alert notifications

There are two config layers:

1. **AGRO webhook behavior** (`server/webhook_config.py` + env vars)
2. **Alert rules** (Prometheus/Alertmanager config)

#### 1. AGRO webhook behavior

AGRO reads notification config via `_get_webhook_config()` and a few helpers:

- `_notify_enabled()` → `cfg.alert_notify_enabled`
- `_notify_severities()` → `cfg.alert_notify_severities` (e.g. `"critical,warning"`)
- `_include_resolved()` → `cfg.alert_include_resolved`
- `_timeout_seconds()` → `cfg.alert_webhook_timeout_seconds`
- `_title_prefix()` → `ALERT_TITLE_PREFIX` (defaults to `AGRO`)
- `_generic_webhook_urls()` → `ALERT_WEBHOOK_URLS` (comma‑separated URLs)
- `_generic_webhook_headers()` → `ALERT_WEBHOOK_HEADERS` (JSON string)

??? example "Minimal Slack + Discord configuration (env vars)"

    ```bash
    export ALERT_TITLE_PREFIX="AGRO"
    export ALERT_WEBHOOK_URLS="https://example.com/my-monitoring-hook"

    # Optional: generic headers for custom webhooks
    export ALERT_WEBHOOK_HEADERS='{"X-AGRO-Env":"dev","X-AGRO-Source":"alertmanager"}'
    ```

    And in `server/webhook_config.py` (or via your config UI):

    ```python
    from pydantic import BaseModel

    class WebhookConfig(BaseModel):
        alert_notify_enabled: bool = True
        alert_notify_severities: str = "critical,warning"
        alert_include_resolved: bool = True
        alert_webhook_timeout_seconds: float = 3.0

        slack_webhook_url: str = "https://hooks.slack.com/services/..."
        discord_webhook_url: str = "https://discord.com/api/webhooks/..."
    ```

!!! tip
    If you only care about **critical** alerts, set `alert_notify_severities="critical"` and leave everything else alone.

#### 2. Alert rules (Prometheus/Alertmanager)

You define *what* to alert on in Prometheus rule files and Alertmanager config. The repo’s `infra/prometheus-alert-rules.yml` is a good starting point.

Examples of things you might alert on:

- **Cost & tokens**
  - Token burn spikes (tokens/min)
  - Sustained high token usage
  - Approaching monthly budget
- **API anomalies**
  - Endpoint call frequency per IP
  - Suspicious rerank usage
- **Errors & performance**
  - Error rate > 5%
  - Timeouts or rate‑limit bursts
  - p99 latency > threshold
- **Retrieval quality**
  - Canary query pass rate < 90%
  - MRR below threshold

The thresholds for many of these live in `server/alert_config.py`.

---

## Alert Threshold Configuration (`alert_config.py`)

`server/alert_config.py` is where I keep **user‑configurable thresholds** that can be used by metrics collection or by rules that generate alerts. It’s a `dataclass` persisted to JSON:

```python
@dataclass
class AlertThresholds:
    # Cost & Token Burn
    cost_burn_spike_usd_per_hour: float = 0.10
    token_burn_spike_per_minute: int = 5000
    token_burn_sustained_per_minute: int = 2000

    # API Anomalies
    endpoint_call_frequency_per_minute: int = 10
    endpoint_frequency_sustained_minutes: int = 2
    cohere_rerank_calls_per_minute: int = 20

    # Error Rates
    error_rate_threshold_percent: float = 5.0
    timeout_errors_per_5min: int = 10
    rate_limit_errors_per_5min: int = 5

    # Performance
    request_latency_p99_seconds: float = 10.0

    # Monthly Budget
    monthly_budget_usd: float = 50.0
    budget_warning_usd: float = 5.0
    budget_critical_usd: float = 40.0

    # Retrieval Quality
    retrieval_mrr_threshold: float = 0.6
    canary_pass_rate_threshold: float = 0.90
```

- Stored at: `data/config/alert_thresholds.json`
- Helper functions:
  - `load_thresholds()` → `AlertThresholds`
  - `save_thresholds(thresholds: AlertThresholds)` → writes JSON
  - `get_thresholds()` → `Dict[str, Any]`
  - `update_threshold(key: str, value: Any)` → bool
  - `update_multiple_thresholds(updates: Dict[str, Any])` → `Dict[str, bool]`

This is intentionally **simple and local‑first**: just a JSON file you can edit, backed by a small Python API.

??? example "Programmatic threshold update"

    ```python
    from server.alert_config import update_multiple_thresholds

    updates = {
        "monthly_budget_usd": 100.0,
        "error_rate_threshold_percent": 2.5,
        "request_latency_p99_seconds": 5.0,
    }

    results = update_multiple_thresholds(updates)
    # results: {"monthly_budget_usd": True, "error_rate_threshold_percent": True, ...}
    ```

You can wire these thresholds into:

- Metric exporters (e.g., emit `agro_budget_remaining` or `agro_latency_threshold` gauges)
- Prometheus rules (e.g., “if actual > threshold, fire alert”)

---

## Local Monitoring APIs (server/alerts.py)

AGRO exposes a few internal endpoints for the GUI and for troubleshooting.

### Alert history

#### `GET /api/webhooks/alertmanager/status`

Returns a lightweight view of recent alerts logged to `data/logs/alerts.jsonl`:

```json
{
  "total_alerts_logged": 42,
  "recent_alerts": [
    {
      "timestamp": "2025-01-01T00:00:00Z",
      "alert": { "...": "raw alertmanager alert" }
    }
  ],
  "log_file": "data/logs/alerts.jsonl"
}
```

#### `GET /api/monitoring/logs/alerts?limit=100`

Alias for the GUI; same log file, but returns exactly the last `limit` entries:

```json
{
  "total_alerts_logged": 100,
  "recent_alerts": [ { "...": "alert line" } ],
  "log_file": "data/logs/alerts.jsonl"
}
```

### API call logs

#### `GET /api/monitoring/logs/api-calls?limit=100`

Reads from `data/tracking/api_calls.jsonl`:

```json
{
  "count": 50,
  "entries": [
    {
      "ts": "...",
      "route": "/api/query",
      "model": "gpt-4o",
      "tokens": 123,
      "status": 200
    }
  ],
  "log_file": "data/tracking/api_calls.jsonl"
}
```

AGRO uses this for basic usage visualizations and for debugging.

### Health snapshot

#### `GET /api/monitoring/health/detailed`

Returns a **fast** health report without hitting external services:

```json
{
  "ok": true,
  "ts": "2025-01-01T00:00:00Z",
  "alerts_log": {
    "exists": true,
    "size": 12345,
    "recent": 42
  },
  "api_calls_log": {
    "exists": true,
    "size": 67890,
    "recent": 500
  }
}
```

This is what the dashboard uses to decide whether to show “monitoring looks healthy” vs. “your logs are missing”.

### Frequency stats & top queries

#### `GET /api/monitoring/frequency-stats`

```python
@monitoring_router.get("/frequency-stats")
async def get_frequency_monitoring() -> Dict[str, Any]:
    """Get endpoint call frequency statistics to detect anomalies."""
    from server.frequency_limiter import get_frequency_stats
    return get_frequency_stats()
```

This endpoint exposes **endpoint call frequency** and is used for:

- Detecting spammy clients
- Feeding into alert rules (e.g., “same IP hitting /api/query > N times per minute”)

#### `GET /api/monitoring/top-queries?limit=20`

Reads query logs from `AGRO_LOG_PATH` (defaults to `data/logs/queries.jsonl`) and aggregates:

- Total count per query
- By route
- By client IP

This is mainly for spotting:

- “test”, “hello”, or other spammy queries
- Abnormal patterns in what people (or bots) are asking

!!! note
    The implementation in the snippet is truncated in this doc, but in the repo it builds `counts`, `by_query_route`, and `by_query_ip` from the JSONL log.

---

## LangSmith Tracing Integration

AGRO can emit detailed traces for:

- Retrieval steps (BM25, vector search, rerank)
- Tool calls / MCP usage
- LLM calls (prompt, response, metadata)
- End‑to‑end request timelines

Those traces can be sent to **LangSmith** and then visualized in Grafana or LangSmith’s own UI.

Why this matters:

- Prometheus/Grafana are great at “how many” and “how fast”.
- LangSmith is good at “what exactly happened on this one weird query?”.

The combination lets you:

- Spot anomalies or regressions in Grafana (high latency, low canary pass rate).
- Jump into LangSmith traces to inspect:
  - Which docs were retrieved
  - How the prompt was built
  - Which tool calls were made
  - Where the time went

=== "Enabling LangSmith"

    1. Install LangSmith client (usually via LangChain or their SDK).
    2. Set the required env vars (`LANGCHAIN_TRACING_V2`, `LANGCHAIN_API_KEY`, etc.).
    3. AGRO’s LangChain‑based components will start emitting traces automatically.

=== "Using LangSmith with Grafana"

    - Option 1: Use Grafana’s JSON/Infinity datasource to call LangSmith’s APIs and plot:
      - Trace counts over time
      - Error rates per chain/tool
    - Option 2: Keep LangSmith as a separate UI and just correlate timestamps with Grafana’s graphs.

---

## Why this monitoring stack is worth using

- **Embedded Grafana**: You don’t have to glue together random dashboards; AGRO’s GUI already knows about your metrics and exposes them in one place. You can still go full Grafana power‑user if you want.
- **Alertmanager → AGRO → Slack/Discord/webhooks**: You define what “bad” means in Prometheus, and AGRO handles the last mile. All the formatting, filtering by severity, and multi‑channel fan‑out is in `server/alerts.py` — easy to read and modify.
- **Local‑first**: Logs are JSONL files under `data/`, thresholds are a JSON file under `data/config/`, metrics are Prometheus; nothing is hidden behind a SaaS.
- **Traces + metrics**: LangSmith for deep dives, Prometheus/Grafana for trends and budgets.

If you want to change or extend any of this, AGRO is indexed on itself — open the Chat tab and ask it about `server/alerts.py`, `server/alert_config.py`, or the Prometheus/Grafana config, and it will walk you through the code.