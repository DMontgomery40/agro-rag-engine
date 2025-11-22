# Infrastructure Configuration Directory

This directory contains configuration files for observability and monitoring services.

## ⚠️ IMPORTANT: Compose File Status

**`infra/docker-compose.yml` is NOT USED.**

All Docker services are managed by the root `docker-compose.yml` file.

This directory is kept solely for organizing infrastructure configuration files:

- `prometheus.yml` - Prometheus scrape configuration
- `loki-config.yml` - Loki log aggregation config
- `alertmanager.yml` - Alertmanager routing rules
- `grafana/` - Grafana dashboards and data sources provisioning

## Service Management

To start/stop services, use from the **root directory**:

```bash
# Start all services
bash scripts/up.sh
# OR
docker compose up -d

# Stop all services (preserves data)
bash scripts/down.sh
# OR
docker compose down

# Check status
docker compose ps
```

## Why This Directory Exists

Originally, `infra/docker-compose.yml` was used to run observability services separately.
This was consolidated into root `docker-compose.yml` for simpler management.

The infra/ directory remains to organize configuration files that are mounted
into containers as read-only config volumes.
