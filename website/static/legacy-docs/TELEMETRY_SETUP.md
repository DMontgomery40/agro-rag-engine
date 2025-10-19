# Telemetry Setup - Prometheus & Grafana

## Quick Start

The full stack (Qdrant, Redis, Prometheus, Grafana) now starts with a single command:

```bash
# Start everything
make up
# or
bash scripts/up.sh

# Start dev environment (infra + API + browser)
make dev
# or
make makedev

# Check status
make status
```

## Services

After running `make up`, the following services are available:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Grafana** | http://127.0.0.1:3000 | admin / Trenton2023 |
| **Prometheus** | http://127.0.0.1:9090 | (none needed) |
| **Qdrant** | http://127.0.0.1:6333 | (none needed) |
| **Redis** | redis://127.0.0.1:6379 | (none needed) |

## Makefile Commands

### Infrastructure

```bash
make up          # Start all services (Qdrant, Redis, Prometheus, Grafana, MCP)
make down        # Stop all services
make status      # Check status of all services
make dev         # Start everything + API + open browser
make makedev     # Alias for dev
```

### Telemetry

```bash
make prom        # Open Prometheus UI in browser
make grafana     # Open Grafana UI in browser
make dash        # Generate Grafana dashboard JSON
```

### Development

```bash
make api         # Start API server (uvicorn)
make index REPO=agro     # Reindex a repository
make setup repo=/path/to/repo name=repo-name  # Add new repository
```

## Grafana Dashboard

### Generate Dashboard

The dashboard is defined in `telemetry/grafana_dash.py` and includes:

- **Request metrics**: RPS, errors, latency
- **Cost tracking**: Cost per request, cost per minute, top models by cost
- **Retrieval quality**: MRR, Hits@K, canary pass rate
- **Reranker diagnostics**: Margin distribution, winner counts

Generate and view the dashboard:

```bash
# Generate dashboard JSON
make dash

# Output: out/agro_overview_dashboard.json
```

### Import Dashboard into Grafana

1. Open Grafana: `make grafana` or http://127.0.0.1:3000
2. Login: `admin` / `Trenton2023`
3. Click "+" → "Import dashboard"
4. Upload `out/agro_overview_dashboard.json`
5. Select the Prometheus datasource

Or use the API:

```bash
curl -X POST http://admin:Trenton2023@127.0.0.1:3000/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @out/agro_overview_dashboard.json
```

## Prometheus Configuration

Prometheus is configured in `infra/prometheus.yml` to scrape:

1. **AGRO API** (port 8012): `/metrics` endpoint
2. **macmon** (port 9100): macOS system metrics via [macmon-prometheus-exporter](https://github.com/DMontgomery40/macmon-prometheus-exporter)
3. **Prometheus itself** (port 9090)

To add more scrape targets, edit `infra/prometheus.yml` and restart:

```bash
cd infra && docker compose restart prometheus
```

## Available Metrics

The AGRO API exposes the following metrics at `/metrics`:

### Request Metrics
- `agro_requests_total` - Total requests (labels: route, provider, model, success)
- `agro_errors_total` - Total errors (labels: type)
- `agro_request_duration_seconds` - Request latency histogram (labels: stage)

### Cost Metrics
- `agro_cost_usd_total` - Total cost in USD (labels: provider, model)
- `agro_tokens_total` - Token usage (labels: provider, model, role)

### Retrieval Quality
- `agro_rr_mrr` - Mean Reciprocal Rank gauge
- `agro_retrieval_hits` - Hits@K gauge
- `agro_canary_pass_total` - Canary test passes
- `agro_canary_total` - Total canary tests

### Reranker Diagnostics
- `agro_reranker_margin_abs` - Absolute margin histogram
- `agro_reranker_winner_total` - Winner counts (labels: winner)

## Architecture

```
┌─────────────────────────────────────────────────┐
│  AGRO API (FastAPI)                             │
│  - /metrics endpoint (Prometheus format)        │
│  - server/metrics.py                            │
└──────────────────┬──────────────────────────────┘
                   │ scrapes every 5s
                   ↓
┌─────────────────────────────────────────────────┐
│  Prometheus                                     │
│  - Time-series database                         │
│  - http://127.0.0.1:9090                        │
│  - infra/prometheus.yml config                  │
└──────────────────┬──────────────────────────────┘
                   │ queries
                   ↓
┌─────────────────────────────────────────────────┐
│  Grafana                                        │
│  - Visualization & dashboards                   │
│  - http://127.0.0.1:3000                        │
│  - admin / Trenton2023                          │
└─────────────────────────────────────────────────┘
```

## Troubleshooting

### Services not starting

```bash
# Check what's already running
docker ps -a

# Stop conflicting containers
docker stop $(docker ps -aq)

# Clean restart
make down
make up
```

### Port already in use

If ports 3000, 6333, 6379, or 9090 are already allocated:

```bash
# Find process using port
lsof -i :6333
lsof -i :3000

# Stop the process or container
docker stop <container_name>
```

### Prometheus not scraping AGRO

1. Ensure the API is running: `curl http://127.0.0.1:8012/health`
2. Check Prometheus targets: http://127.0.0.1:9090/targets
3. Verify `host.docker.internal` resolution (required for Docker → host access)

### Grafana dashboard empty

1. Check Prometheus datasource is configured
2. Verify metrics are being emitted: `curl http://127.0.0.1:8012/metrics`
3. Wait a few minutes for data to accumulate (5s scrape interval)

## Files Reference

- `infra/docker-compose.yml` - Service definitions (Qdrant, Redis, Prometheus, Grafana)
- `infra/prometheus.yml` - Prometheus scrape configuration
- `telemetry/grafana_dash.py` - Dashboard generator
- `server/metrics.py` - Metrics definitions and exporters
- `scripts/up.sh` - Start all services
- `scripts/dev_up.sh` - Start dev environment
- `scripts/status.sh` - Check service status
- `Makefile` - Convenient shortcuts

## Next Steps

1. **Customize the dashboard**: Edit `telemetry/grafana_dash.py` and run `make dash`
2. **Add more metrics**: Edit `server/metrics.py` and instrument your code
3. **Add alerting**: Configure Prometheus alerts in `infra/prometheus.yml`
4. **Export metrics**: Set up remote write to Grafana Cloud or similar
5. **System monitoring**: Install [macmon-prometheus-exporter](https://github.com/DMontgomery40/macmon-prometheus-exporter) for macOS system metrics

## References

- [Prometheus Documentation](https://prometheus.io/docs/)
- [Grafana Documentation](https://grafana.com/docs/)
- [Prometheus Python Client](https://github.com/prometheus/client_python)
- [macmon-prometheus-exporter](https://github.com/DMontgomery40/macmon-prometheus-exporter) - macOS system metrics exporter

