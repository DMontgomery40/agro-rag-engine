---
sidebar_position: 2
---

# Monitoring

AGRO includes production-grade telemetry with **Grafana dashboards**, **Prometheus metrics**, **Loki log aggregation**, and **LangSmith tracing**. All monitoring components run in Docker and are accessible through the GUI.

## Quick Start

```bash
# Start monitoring stack
make up

# Access dashboards
make grafana  # Opens http://127.0.0.1:3000
make prom     # Opens http://127.0.0.1:9090

# Or via GUI
# Metrics tab → Opens embedded Grafana iframe
```

**Default credentials:**
- **Grafana:** `admin` / `Trenton2023`
- **Prometheus:** No authentication needed

---

## Architecture

```
┌─────────────────────────────────────────┐
│  AGRO FastAPI Server                    │
│  - /metrics endpoint (Prometheus)       │
│  - LangGraph instrumentation            │
│  - OpenTelemetry spans                  │
└──────────────┬──────────────────────────┘
               │
               ├──> Prometheus (scrapes every 5s)
               │    - Time-series DB
               │    - Alerting rules
               │    - http://127.0.0.1:9090
               │
               ├──> Promtail → Loki (log aggregation)
               │    - JSON structured logs
               │    - Query logs by repo, query type
               │    - http://127.0.0.1:3100
               │
               └──> LangSmith (LLM tracing)
                    - Full LangGraph traces
                    - Token usage tracking
                    - https://smith.langchain.com

               ↓
┌─────────────────────────────────────────┐
│  Grafana (Visualization)                │
│  - Pre-configured dashboards            │
│  - Alert notifications                  │
│  - Embedded in AGRO GUI                 │
│  - http://127.0.0.1:3000                │
└─────────────────────────────────────────┘
```

---

## Metrics Collected

### Request Metrics

**Counter:** `agro_requests_total{route, provider, model, success}`

Tracks all API requests by endpoint, model used, and success/failure.

**Example queries:**
```promql
# Request rate (per second)
rate(agro_requests_total[1m])

# Requests by route
sum by (route) (agro_requests_total)

# Error rate
rate(agro_requests_total{success="false"}[5m])
```

---

### Cost Metrics

**Counter:** `agro_cost_usd_total{provider, model}`

Tracks cumulative cost in USD by provider and model.

**Counter:** `agro_tokens_total{provider, model, role}`

Tracks token usage (role = prompt | completion).

**Example queries:**
```promql
# Cost per minute
rate(agro_cost_usd_total[1m]) * 60

# Total cost today
increase(agro_cost_usd_total[24h])

# Tokens by model
sum by (model) (agro_tokens_total)

# Cost per request
rate(agro_cost_usd_total[5m]) / rate(agro_requests_total[5m])
```

**Grafana panel:** Shows cost trending, top models by cost, cost per query.

---

### Retrieval Quality

**Gauge:** `agro_rr_mrr`

Mean Reciprocal Rank from golden question evaluations.

**Gauge:** `agro_retrieval_hits{topk}`

Hit@K accuracy (percentage of queries where expected file is in top K).

**Counter:** `agro_canary_pass_total` / `agro_canary_total`

Canary test pass rate (continuous eval of critical queries).

**Example queries:**
```promql
# Current MRR
agro_rr_mrr

# Canary pass rate
rate(agro_canary_pass_total[1h]) / rate(agro_canary_total[1h])

# MRR trend (1h avg)
avg_over_time(agro_rr_mrr[1h])
```

**Grafana panel:** Tracks retrieval quality over time, alerts if MRR drops below threshold.

---

### Request Duration

**Histogram:** `agro_request_duration_seconds{stage}`

Latency breakdown by stage (retrieve, rerank, generate).

**Example queries:**
```promql
# P50 latency (median)
histogram_quantile(0.50, rate(agro_request_duration_seconds_bucket[5m]))

# P99 latency
histogram_quantile(0.99, rate(agro_request_duration_seconds_bucket[5m]))

# Average retrieval time
rate(agro_request_duration_seconds_sum{stage="retrieve"}[5m]) /
rate(agro_request_duration_seconds_count{stage="retrieve"}[5m])
```

**Grafana panel:** Heatmap of latency distribution, P50/P90/P99 lines.

---

### Reranker Diagnostics

**Histogram:** `agro_reranker_margin_abs`

Absolute score margin between top-2 results (confidence signal).

**Counter:** `agro_reranker_winner_total{winner}`

Tracks which retrieval method "wins" after reranking (BM25, dense, or card).

**Example queries:**
```promql
# Average reranker margin
rate(agro_reranker_margin_abs_sum[5m]) /
rate(agro_reranker_margin_abs_count[5m])

# BM25 vs dense winner rate
sum by (winner) (rate(agro_reranker_winner_total[1h]))
```

**Grafana panel:** Shows which retrieval method is most effective, tracks confidence distribution.

---

### Error Metrics

**Counter:** `agro_errors_total{type}`

Tracks errors by type (indexing, retrieval, generation, API).

**Example queries:**
```promql
# Error rate
rate(agro_errors_total[5m])

# Errors by type
sum by (type) (agro_errors_total)

# Error ratio (% of requests)
rate(agro_errors_total[5m]) / rate(agro_requests_total[5m])
```

**Alert:** Fires if error rate > 10% for 5 minutes.

---

## Grafana Dashboards

### Pre-Configured Dashboards

1. **AGRO Overview** (`agro_overview.json`)
   - Request rate, latency, error rate
   - Cost tracking and token usage
   - Retrieval quality (MRR, Hit@K)
   - Reranker diagnostics

2. **LLM Performance**
   - Token usage by model
   - Cost per request
   - Generation latency
   - Top models by volume/cost

3. **Retrieval Deep Dive**
   - BM25 vs dense vs card hit rates
   - Reranker margin distribution
   - Query-by-query breakdown
   - Canary test results

4. **System Health**
   - Docker container status
   - Qdrant collection sizes
   - Redis memory usage
   - macOS system metrics (via macmon)

---

### Dashboard Location

**Auto-provisioned:**
- File: `/Users/davidmontgomery/agro-rag-engine/infra/grafana/provisioning/dashboards/agro_overview.json`
- Loaded automatically on Grafana startup

**Regenerate dashboard:**
```bash
make dash
# Generates: out/agro_overview_dashboard.json

# Import to Grafana
curl -X POST http://admin:Trenton2023@127.0.0.1:3000/api/dashboards/db \
  -H 'Content-Type: application/json' \
  -d @out/agro_overview_dashboard.json
```

---

### Embedded Dashboard (GUI)

**Metrics tab in AGRO GUI:**
- Embeds Grafana in an `<iframe>`
- Full interactivity (zoom, filter, export)
- Auto-login (anonymous editor access enabled)

**Configuration:**
```yaml
# infra/docker-compose.yml
grafana:
  environment:
    - GF_SECURITY_ALLOW_EMBEDDING=true
    - GF_AUTH_ANONYMOUS_ENABLED=true
    - GF_AUTH_ANONYMOUS_ORG_ROLE=Editor
```

---

## Log Aggregation (Loki)

### Architecture

```
┌─────────────────────────────────────────┐
│  AGRO Server (logs to stdout/stderr)    │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  Promtail (log collector)               │
│  - Scrapes container logs               │
│  - Parses JSON structured logs          │
│  - Labels: repo, query_type, user       │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  Loki (log storage)                     │
│  - Time-series log database             │
│  - Query via LogQL                      │
│  - http://127.0.0.1:3100                │
└──────────────┬──────────────────────────┘
               │
               ↓
┌─────────────────────────────────────────┐
│  Grafana (log viewer)                   │
│  - Explore → Loki data source           │
│  - Filter logs by label                 │
│  - Correlate logs with metrics          │
└─────────────────────────────────────────┘
```

---

### Structured Logging

**Format:**
```json
{
  "timestamp": "2025-01-19T12:34:56.789Z",
  "level": "info",
  "repo": "agro",
  "query": "How does hybrid search work?",
  "query_type": "retrieval",
  "confidence": 0.87,
  "top_file": "retrieval/hybrid_search.py",
  "latency_ms": 280,
  "user_id": "user_123"
}
```

**Querying logs (LogQL):**
```logql
# All logs for agro repo
{repo="agro"}

# Errors only
{level="error"}

# Low confidence queries
{query_type="retrieval"} | json | confidence < 0.5

# Slow queries
{query_type="retrieval"} | json | latency_ms > 1000
```

---

### Grafana Log Panels

**Pre-configured panels:**
1. **Recent Queries** - Last 100 queries with metadata
2. **Error Logs** - All errors with stack traces
3. **Slow Queries** - Queries >1s latency
4. **Low Confidence Queries** - Confidence <0.5 (potential hallucination)

**Navigate:** Grafana → Explore → Select Loki data source

---

## LangSmith Tracing

### Setup

```bash
# 1. Get LangSmith API key
# Sign up: https://smith.langchain.com

# 2. Configure environment
export LANGCHAIN_TRACING_V2=1
export LANGCHAIN_API_KEY=your-api-key
export LANGCHAIN_PROJECT=agro-dev

# 3. Restart server
make api
```

**Verify connection:**
```bash
curl http://127.0.0.1:8012/health/langsmith
```

**Response:**
```json
{
  "enabled": true,
  "installed": true,
  "project": "agro-dev",
  "can_connect": true,
  "identity": {
    "user_id": "user_abc123",
    "tenant_id": "tenant_xyz789"
  }
}
```

---

### Trace Features

**What's traced:**
- Full LangGraph execution (all nodes and edges)
- LLM calls (prompts, completions, tokens)
- Retrieval queries (BM25, dense, reranking)
- Tool calls (MCP rag_answer, rag_search)
- Errors and retries

**Example trace:**
```
agro_pipeline (6.2s)
  ├─ retrieve (280ms)
  │   ├─ bm25_search (30ms) → 75 results
  │   ├─ dense_search (50ms) → 75 results
  │   ├─ rrf_fusion (5ms) → 100 results
  │   └─ rerank (200ms) → 10 results
  ├─ generate (5.8s)
  │   ├─ llm_call (5.7s)
  │   │   ├─ prompt_tokens: 1,245
  │   │   ├─ completion_tokens: 387
  │   │   └─ cost: $0.000823
  │   └─ format_citations (100ms)
  └─ confidence_check (20ms) → 0.87
```

---

### Embedding Traces in GUI

**GUI Chat tab:**
- After each query, shows "View LangSmith Trace" link
- Opens public share URL (if `share=true`)
- Embedded iframe for inline viewing

**API endpoint:**
```bash
curl http://127.0.0.1:8012/api/langsmith/latest?share=true
```

**Response:**
```json
{
  "project": "agro-dev",
  "url": "https://smith.langchain.com/public/abc123/r/def456",
  "source": "remote"
}
```

---

## Alerting

### Alert Rules

**File:** `infra/prometheus-alert-rules.yml`

```yaml
groups:
  - name: agro_alerts
    interval: 30s
    rules:
      # High error rate
      - alert: HighErrorRate
        expr: rate(agro_errors_total[5m]) / rate(agro_requests_total[5m]) > 0.10
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Error rate above 10% for 5 minutes"
          description: "{{ $value | humanizePercentage }} of requests failing"

      # Low retrieval quality
      - alert: LowRetrievalQuality
        expr: agro_rr_mrr < 0.60
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "MRR dropped below 0.60"
          description: "Current MRR: {{ $value }}"

      # High cost
      - alert: HighCost
        expr: rate(agro_cost_usd_total[1h]) * 60 > 5.0
        for: 15m
        labels:
          severity: critical
        annotations:
          summary: "Cost over $5/hour"
          description: "Current rate: ${{ $value }}/hour"

      # Canary failure
      - alert: CanaryTestFailing
        expr: rate(agro_canary_pass_total[1h]) / rate(agro_canary_total[1h]) < 0.80
        for: 30m
        labels:
          severity: warning
        annotations:
          summary: "Canary pass rate below 80%"
```

---

### Alert Manager

**Configuration:** `infra/alertmanager.yml`

```yaml
route:
  receiver: 'slack'
  group_by: ['alertname', 'severity']
  group_wait: 10s
  group_interval: 5m
  repeat_interval: 3h

receivers:
  - name: 'slack'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK'
        channel: '#agro-alerts'
        title: 'AGRO Alert: {{ .GroupLabels.alertname }}'
        text: '{{ range .Alerts }}{{ .Annotations.description }}{{ end }}'
```

**Setup Slack webhook:**
1. Create Slack incoming webhook: https://api.slack.com/messaging/webhooks
2. Add URL to `alertmanager.yml`
3. Restart AlertManager:
   ```bash
   cd infra && docker compose restart alertmanager
   ```

---

### View Alerts

**Prometheus UI:**
```bash
# Open http://127.0.0.1:9090/alerts
make prom
# Navigate to: Alerts
```

**Via API:**
```bash
curl http://127.0.0.1:8012/api/monitoring/alerts
```

**Response:**
```json
{
  "alerts": [
    {
      "name": "HighErrorRate",
      "severity": "warning",
      "status": "firing",
      "value": 0.12,
      "threshold": 0.10,
      "description": "Error rate above 10% for 5 minutes"
    }
  ]
}
```

---

## System Metrics (macmon)

AGRO integrates with **[macmon-prometheus-exporter](https://github.com/DMontgomery40/macmon-prometheus-exporter)** for macOS system monitoring.

**Metrics exposed:**
- CPU usage (per core)
- Memory (active, wired, free)
- Disk I/O (reads/writes per second)
- Network traffic (bytes in/out)
- Battery level and charging status
- Temperature sensors

**Setup:**
```bash
# Install macmon
brew tap dmontgomery40/macmon
brew install macmon-prometheus-exporter

# Start exporter
macmon --port 9100

# Verify
curl http://127.0.0.1:9100/metrics
```

**Prometheus scrapes macmon automatically** (configured in `prometheus.yml`).

---

## Troubleshooting

### "Grafana dashboard empty"

**Cause:** Prometheus not scraping AGRO metrics

**Solution:**
```bash
# 1. Check API is exposing metrics
curl http://127.0.0.1:8012/metrics | head -20

# 2. Check Prometheus targets
# Open http://127.0.0.1:9090/targets
# Look for "agro" job - should be "UP"

# 3. Verify scrape config
cat infra/prometheus.yml | grep -A5 "job_name.*agro"

# 4. Wait for data (5s scrape interval)
# Metrics appear after 1-2 minutes
```

---

### "LangSmith traces not appearing"

**Cause:** API key not set, or tracing disabled

**Solution:**
```bash
# Check LangSmith health
curl http://127.0.0.1:8012/health/langsmith

# If disabled, set env vars
export LANGCHAIN_TRACING_V2=1
export LANGCHAIN_API_KEY=your-api-key

# Restart API
make api

# Test with query
curl http://127.0.0.1:8012/answer?q=test&repo=agro

# Check LangSmith UI
# https://smith.langchain.com → Select project
```

---

### "Loki logs not showing"

**Cause:** Promtail not reading container logs

**Solution:**
```bash
# Check Promtail status
docker logs agro-promtail

# Check Loki targets
curl http://127.0.0.1:3100/ready

# Verify Grafana Loki data source
# Grafana → Configuration → Data Sources → Loki
# Test connection
```

---

### "Alerts not firing"

**Cause:** Alert rules not loaded, or threshold not met

**Solution:**
```bash
# Check alert rules loaded
curl http://127.0.0.1:9090/api/v1/rules | jq

# Check Prometheus config
docker logs agro-prometheus | grep -i "alert"

# Manually test alert expression
# Prometheus → Graph → Enter alert expression
# Example: rate(agro_errors_total[5m]) / rate(agro_requests_total[5m])
```

---

## Performance Tuning

### Reduce Prometheus scrape frequency

**Default:** 5s (high resolution, high storage)

**For lower storage:**
```yaml
# infra/prometheus.yml
global:
  scrape_interval: 30s  # Was 5s
  evaluation_interval: 30s
```

**Restart:**
```bash
cd infra && docker compose restart prometheus
```

---

### Adjust Grafana retention

**Default:** 30 days

**Change:**
```yaml
# infra/docker-compose.yml
grafana:
  environment:
    - GF_PATHS_DATA=/var/lib/grafana
  volumes:
    - grafana_data:/var/lib/grafana
```

**Prune old data:**
```bash
# Stop Grafana
cd infra && docker compose stop grafana

# Clear data
docker volume rm infra_grafana_data

# Restart
docker compose up -d grafana
```

---

### Limit Loki log retention

**Default:** 7 days

**Change:**
```yaml
# infra/loki-config.yml
limits_config:
  retention_period: 168h  # 7 days (was default)
```

**Restart Loki:**
```bash
cd infra && docker compose restart loki
```

---

## Next Steps

- **[Alerting Configuration](../configuration/alerting.md)** - Set up custom alerts
- **[Deployment](deployment.md)** - Deploy monitoring to production
- **[Troubleshooting](troubleshooting.md)** - Debug monitoring issues
- **[API Endpoints](../api/endpoints.md)** - Metrics API reference
