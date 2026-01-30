---
paths: infra/**/*
---

# Infrastructure & Observability

Docker Compose services and monitoring stack.

## Service Architecture

```
Infrastructure (12 containers):
├─ Data Layer
│  ├─ qdrant:v1.15.5 (6333, 6334)
│  └─ redis/redis-stack:7.2.0-v10 (6379)
├─ Observability
│  ├─ prometheus (9090) → alertmanager
│  ├─ alertmanager (9093)
│  ├─ loki (3100)
│  ├─ promtail → loki
│  └─ grafana (3000) → prometheus + loki
└─ Application
   ├─ api (8012) → qdrant + redis
   ├─ mcp-http (8013) → api
   ├─ mcp-node (8014) → api
   └─ editor/code-server (4440)
```

## Key Files

| File | Purpose |
|------|---------|
| `docker-compose.yml` (root) | All service definitions |
| `infra/prometheus.yml` | Scrape targets |
| `infra/prometheus-alert-rules.yml` | Alert definitions (220 lines) |
| `infra/alertmanager.yml` | Alert routing |
| `infra/loki-config.yml` | Log aggregation |
| `infra/promtail-config.yml` | Log collection |
| `infra/grafana/provisioning/` | Dashboards & datasources |

**NOTE**: `infra/docker-compose.yml` is DEPRECATED - use root file only.

## Volume Mounts

### Observability
```yaml
prometheus:
  - ./infra/prometheus.yml → /etc/prometheus/prometheus.yml (ro)
  - ./infra/prometheus-alert-rules.yml → /etc/prometheus/prometheus-alert-rules.yml (ro)
  - prom_data → /prometheus

alertmanager:
  - ./infra/alertmanager.yml → /etc/alertmanager/alertmanager.yml (ro)
  - alertmanager_data → /alertmanager

loki:
  - ./infra/loki-config.yml → /etc/loki/local-config.yaml (ro)
  - loki_data → /loki

grafana:
  - ./infra/grafana/provisioning → /etc/grafana/provisioning (ro)
  - grafana_data → /var/lib/grafana
```

### Application
```yaml
api:
  - ./data → /app/data
  - ./agro_config.json → /app/agro_config.json
  - ./repos.json → /app/repos.json
  - /var/run/docker.sock → /var/run/docker.sock
```

## Prometheus Configuration

### Scrape Targets
```yaml
- agro (host.docker.internal:8012/metrics/)
  labels: service="agro-api"

- macmon (host.docker.internal:9100)
  labels: service="macmon" (macOS system metrics)

- prometheus (localhost:9090)
  Self-monitoring
```

Scrape interval: 30 seconds

### Alert Rules (prometheus-alert-rules.yml)

**P0 - Critical:**
- `CostBurnSpike` - Cost rate > $0.10/hour
- `TokenBurnSpike` - > 5000 tokens/minute
- `TokenBurnSustained` - High burn for 15+ minutes

**P1 - Warning:**
- `HighErrorRate` - Error rate > 5%
- `EndpointCallFrequencyAnomaly` - `/api/chat` > 10/min
- `TimeoutErrorSpike` - > 10 timeouts in 5 minutes
- `CanaryPassRateLow` - Pass rate < 90%

**P2 - Budget:**
- `MonthlyBudgetWarning` - Total cost > $5
- `MonthlyBudgetCritical` - Total cost > $40

**P3 - Performance:**
- `HighLatency` - p99 > 10 seconds
- `RetrievalQualityDegraded` - MRR < 0.6

## Alertmanager Routing

```yaml
Routes:
  severity: critical → repeat: 1h, wait: 30s
  severity: warning  → repeat: 4h, wait: 1m
  severity: info     → repeat: 24h, wait: 5m

Inhibition:
  critical fires → suppresses warning/info
  HighErrorRate → suppresses HighLatency

Webhook: http://host.docker.internal:8012/webhooks/alertmanager
```

## Grafana Configuration

```yaml
Environment:
  GF_SECURITY_ALLOW_EMBEDDING=true      # iframe in AGRO GUI
  GF_AUTH_ANONYMOUS_ENABLED=true        # Local network access
  GF_AUTH_ANONYMOUS_ORG_ROLE=Editor
  GF_USERS_DEFAULT_THEME=dark
  GF_INSTALL_PLUGINS=yesoreyeram-infinity-datasource

Datasources (auto-provisioned):
  - Prometheus (default, proxy to prometheus:9090)
  - Loki (proxy to loki:3100)
  - Alertmanager (prometheus:9093)
```

### Dashboards
- `agro_overview.json` - Main metrics
- `agro_rag_evaluation.json` - RAG evaluation
- `agro_rag_eval_complete.json` - Complete evaluation (4,547 lines)
- `agro_total_visibility.json` - High-level visibility

## Log Aggregation (Loki + Promtail)

### Loki
- Backend: boltdb-shipper (filesystem)
- Index period: 24 hours
- Reject samples older than 168 hours

### Promtail Sources
```yaml
docker:
  - All container logs
  - Extracts: container name, stream, compose service

system:
  - /var/log/*.log

agro-tracking:
  - /app/data/tracking/*.jsonl
  - Labels by type and repo
```

## Expected Metrics from API

```python
# Cost tracking
agro_cost_usd_total

# Token accounting
agro_tokens_total

# Request metrics
agro_requests_total{route="/api/chat"}
agro_request_duration_seconds_bucket  # p99 quantile
agro_errors_total{type="rate_limit|timeout|provider"}

# Quality
agro_rr_mrr  # Mean Reciprocal Rank

# Canary
agro_canary_total
agro_canary_pass_total
```

## Network Topology

```
Host Machine
├─ 8012 (API) ← Docker exposes FastAPI
├─ 3000 (Grafana) ← UI dashboard
├─ 9090 (Prometheus) ← Metrics
└─ 3100 (Loki) ← Log API

Inside Docker Network (agro):
├─ prometheus scrapes host.docker.internal:8012/metrics/
├─ grafana → prometheus:9090, loki:3100
├─ promtail → loki:3100
└─ alertmanager webhook → host.docker.internal:8012/webhooks/alertmanager
```

## Docker Patterns

All services use:
```yaml
restart: unless-stopped
extra_hosts:
  - host.docker.internal:host-gateway
```

Config mounts are read-only (`:ro`).
Named volumes for persistent data.
