---
sidebar_position: 1
---

# Deployment

Deploy AGRO to production with Docker Compose, environment configuration, and scaling strategies.

## Prerequisites

- **Docker Desktop** 20.10+ or Docker Engine + Docker Compose V2
- **Python 3.11+**
- **4GB RAM minimum** (8GB recommended for production)
- **10GB disk space** (varies with index size)
- **Linux/macOS** (Windows via WSL2)

## Quick Production Deploy

```bash
# Clone repository
git clone https://github.com/DMontgomery40/agro-rag-engine.git
cd agro-rag-engine

# Create production .env
cp .env.example .env
nano .env  # Configure production settings

# Start infrastructure
docker compose up -d

# Install Python dependencies
python3.11 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt

# Run indexing
python scripts/full_index.py --repo your-repo --source-dir /path/to/code

# Start server (production mode)
gunicorn server.app:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8012 \
  --access-logfile - \
  --error-logfile -
```

Server runs at http://0.0.0.0:8012 (accessible on LAN).

---

## Environment Configuration

### Critical Variables

```bash
# Repository
REPO=your-repo-name
SOURCE_DIR=/absolute/path/to/your/code

# Models (choose cloud or local)
EMBEDDING_TYPE=openai  # openai|voyage|local
GENERATION_MODEL=gpt-4o
RERANK_BACKEND=local  # local|cohere

# API Keys (if using cloud)
OPENAI_API_KEY=sk-proj-...
VOYAGE_API_KEY=pa-...
COHERE_API_KEY=...

# Infrastructure
QDRANT_URL=http://127.0.0.1:6333
REDIS_URL=redis://127.0.0.1:6379/0

# Performance
TOPK_SPARSE=75
TOPK_DENSE=75
QUERY_EXPANSION_COUNT=4
HYDRATION_MODE=lazy

# Observability
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=...
LANGCHAIN_PROJECT=agro-prod

# Security (optional)
AGRO_API_KEY=your-secret-key
AGRO_CORS_ORIGINS=https://yourdomain.com
```

### Local-Only Deploy (Zero API Cost)

```bash
# Use local models exclusively
EMBEDDING_TYPE=local
EMBEDDING_MODEL_LOCAL=BAAI/bge-small-en-v1.5
GENERATION_MODEL=ollama:qwen3-coder:30b
RERANK_BACKEND=local
RERANK_MODEL_LOCAL=cross-encoder/ms-marco-MiniLM-L-12-v2

# No API keys needed
# OPENAI_API_KEY not set
# VOYAGE_API_KEY not set
# COHERE_API_KEY not set
```

**Requirements:**
- Ollama installed locally
- Models downloaded: `ollama pull qwen3-coder:30b`
- 16GB+ RAM for large generation models

---

## Docker Compose Services

### Infrastructure Stack

```yaml
services:
  # Vector database
  qdrant:
    image: qdrant/qdrant:v1.15.5
    ports:
      - "6333:6333"  # HTTP API
      - "6334:6334"  # gRPC
    volumes:
      - ../data/qdrant:/qdrant/storage
    restart: unless-stopped

  # State management
  redis:
    image: redis/redis-stack:7.2.0-v10
    ports:
      - "6379:6379"
    restart: unless-stopped

  # Metrics
  prometheus:
    image: prom/prometheus:latest
    ports:
      - "9090:9090"
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml:ro
    restart: unless-stopped

  # Dashboards
  grafana:
    image: grafana/grafana:latest
    ports:
      - "3000:3000"
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=your-password
      - GF_SECURITY_ALLOW_EMBEDDING=true
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana/provisioning:/etc/grafana/provisioning:ro
    restart: unless-stopped
```

### Start/Stop Services

```bash
# Start all services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f qdrant
docker compose logs -f redis

# Stop services
docker compose down

# Stop and remove volumes (wipes data)
docker compose down -v
```

---

## Production Server Setup

### Option 1: Gunicorn (Recommended)

```bash
# Install gunicorn
pip install gunicorn uvicorn[standard]

# Run with multiple workers
gunicorn server.app:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8012 \
  --timeout 120 \
  --access-logfile /var/log/agro/access.log \
  --error-logfile /var/log/agro/error.log \
  --log-level info
```

**Worker count:** `(2 * CPU_cores) + 1`

### Option 2: Systemd Service

Create `/etc/systemd/system/agro.service`:

```ini
[Unit]
Description=AGRO RAG Server
After=network.target docker.service
Requires=docker.service

[Service]
Type=notify
User=agro
Group=agro
WorkingDirectory=/opt/agro-rag-engine
Environment="PATH=/opt/agro-rag-engine/.venv/bin"
ExecStart=/opt/agro-rag-engine/.venv/bin/gunicorn server.app:app \
  --workers 4 \
  --worker-class uvicorn.workers.UvicornWorker \
  --bind 0.0.0.0:8012 \
  --timeout 120
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

Enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable agro
sudo systemctl start agro
sudo systemctl status agro
```

---

## Reverse Proxy (Nginx)

### TLS Termination

```nginx
# /etc/nginx/sites-available/agro
server {
    listen 443 ssl http2;
    server_name agro.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/agro.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/agro.yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8012;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        # WebSocket support (for SSE/WS transports)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";

        # Timeouts for long-running queries
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;
    }

    # Grafana iframe embedding
    location /grafana/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_set_header Host $host;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name agro.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

Enable:

```bash
sudo ln -s /etc/nginx/sites-available/agro /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

---

## Scaling Strategies

### Vertical Scaling (Single Machine)

**For `\<10klt;10k` chunks:**
- 2 CPU cores, 4GB RAM
- Local BM25 + OpenAI embeddings

**For 10k-50k chunks:**
- 4 CPU cores, 8GB RAM
- Gunicorn with 4 workers

**For 50k+ chunks:**
- 8+ CPU cores, 16GB+ RAM
- Consider horizontal scaling

### Horizontal Scaling (Multi-Machine)

**Architecture:**

```
Load Balancer (HAProxy/Nginx)
  ↓
┌────────────┬────────────┬────────────┐
│  AGRO-1    │  AGRO-2    │  AGRO-3    │
│  (API)     │  (API)     │  (API)     │
└────┬───────┴────┬───────┴────┬───────┘
     │            │            │
     └────────────┼────────────┘
                  ↓
  ┌───────────────────────────────┐
  │  Shared Infrastructure        │
  │  ┌─────────┐  ┌──────────┐   │
  │  │ Qdrant  │  │  Redis   │   │
  │  └─────────┘  └──────────┘   │
  └───────────────────────────────┘
```

**HAProxy config:**

```
backend agro_api
    mode http
    balance roundrobin
    option httpchk GET /health
    server agro1 10.0.0.10:8012 check
    server agro2 10.0.0.11:8012 check
    server agro3 10.0.0.12:8012 check
```

**Shared Qdrant:**

```bash
# On each API server, point to central Qdrant
QDRANT_URL=http://10.0.0.20:6333
```

---

## Backup & Recovery

### Backup Strategy

```bash
#!/bin/bash
# /opt/agro/backup.sh

BACKUP_DIR=/backups/agro/$(date +%Y-%m-%d)
mkdir -p $BACKUP_DIR

# Backup data directory (chunks, BM25 indexes)
tar -czf $BACKUP_DIR/data.tar.gz data/

# Backup Qdrant collection
curl -X POST http://127.0.0.1:6333/collections/code_chunks_agro/snapshots \
  -H 'Content-Type: application/json'

# Export Redis state (LangGraph checkpoints)
docker exec rag-redis redis-cli --rdb /data/dump.rdb
cp data/redis/dump.rdb $BACKUP_DIR/

# Backup configs
cp .env $BACKUP_DIR/
cp gui/profiles/*.json $BACKUP_DIR/profiles/

echo "Backup complete: $BACKUP_DIR"
```

**Cron schedule:**

```cron
# Daily backups at 2 AM
0 2 * * * /opt/agro/backup.sh
```

### Restore from Backup

```bash
# Stop services
docker compose down

# Restore data
tar -xzf /backups/agro/2025-01-19/data.tar.gz

# Restore Redis
cp /backups/agro/2025-01-19/dump.rdb data/redis/

# Restore Qdrant (upload snapshot via API)
curl -X PUT http://127.0.0.1:6333/collections/code_chunks_agro/snapshots/upload \
  -F 'snapshot=@/backups/agro/2025-01-19/qdrant-snapshot.tar'

# Restart
docker compose up -d
```

---

## Monitoring & Alerts

### Prometheus Alerts

Configure in `infra/prometheus-alert-rules.yml`:

```yaml
groups:
  - name: agro_alerts
    rules:
      - alert: HighErrorRate
        expr: rate(agro_requests_total{success="false"}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "High error rate detected"

      - alert: SlowQueries
        expr: histogram_quantile(0.95, agro_request_duration_seconds) > 5
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: "95th percentile latency > 5s"

      - alert: QdrantDown
        expr: up{job="qdrant"} == 0
        for: 2m
        labels:
          severity: critical
        annotations:
          summary: "Qdrant is down"
```

### Grafana Dashboards

Pre-configured dashboards in `infra/grafana/provisioning/dashboards/`:

- **AGRO Overview**: Request rates, latency, errors
- **Retrieval Quality**: MRR, Hit@K, confidence scores
- **Cost Tracking**: Token usage, API costs
- **Infrastructure**: Docker container health, resource usage

Access at: `http://your-domain:3000`

---

## Health Checks

### Endpoint Health

```bash
# Basic health
curl http://127.0.0.1:8012/health

# Expected:
{
  "status": "healthy",
  "graph_loaded": true,
  "ts": "2025-01-19T12:34:56.789Z",
  "checks": {
    "qdrant": "healthy",
    "redis": "healthy",
    "prometheus": "healthy",
    "grafana": "healthy"
  }
}
```

### Docker Health

```bash
# Check container status
docker compose ps

# Expected: all services "Up" and "healthy"
```

### Index Health

```bash
# Check index stats
curl http://127.0.0.1:8012/api/index/stats

# Expected:
{
  "agro": {
    "chunk_count": 3420,
    "file_count": 287,
    "last_indexed": "2025-01-19T10:00:00Z"
  }
}
```

---

## Security Hardening

### API Key Authentication

Add to `.env`:

```bash
AGRO_API_KEY=your-random-secret-key-here
```

Middleware auto-enabled if set. Clients must include:

```bash
curl http://127.0.0.1:8012/search?q=test \
  -H 'X-API-Key: your-random-secret-key-here'
```

### CORS Configuration

```bash
# Restrict origins (comma-separated)
AGRO_CORS_ORIGINS=https://yourdomain.com,https://app.yourdomain.com

# Or allow all (dev only)
AGRO_CORS_ORIGINS=*
```

### Firewall Rules

```bash
# Allow only necessary ports
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 443/tcp   # HTTPS
sudo ufw deny 8012/tcp   # Direct API access (use Nginx only)
sudo ufw deny 6333/tcp   # Qdrant (internal only)
sudo ufw deny 6379/tcp   # Redis (internal only)
sudo ufw enable
```

---

## Performance Tuning

### Qdrant Optimization

```bash
# Increase memory limit (docker-compose.yml)
environment:
  - QDRANT__STORAGE__USE_MMAP=false  # Use RAM (faster)
  - QDRANT__SERVICE__MAX_REQUEST_SIZE_MB=32
```

### Redis Persistence

```bash
# Enable AOF persistence (safer for production)
environment:
  - REDIS_ARGS=--appendonly yes --appendfsync everysec
volumes:
  - ../data/redis:/data
```

### Gunicorn Workers

```bash
# Calculate optimal workers
python3 -c "import multiprocessing; print(2 * multiprocessing.cpu_count() + 1)"

# Set in systemd service or run command
--workers 9  # For 4-core machine
```

---

## Troubleshooting Deployment

### "Qdrant connection refused"

```bash
# Check if Qdrant is running
docker ps | grep qdrant

# If not, start it
docker compose up -d qdrant

# Check logs
docker logs qdrant
```

### "Redis LOADING error"

```bash
# Wait for Redis to finish loading AOF
docker logs rag-redis

# Or disable persistence (faster, riskier)
# In docker-compose.yml: REDIS_ARGS=--save ""
```

### "ModuleNotFoundError"

```bash
# Ensure virtual environment is activated
source .venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall
```

### "Permission denied" errors

```bash
# Fix data directory permissions
sudo chown -R $(whoami):$(whoami) data/
chmod -R 755 data/
```

---

## Next Steps

- **[Monitoring](monitoring.md)** - Set up Grafana dashboards
- **[Troubleshooting](troubleshooting.md)** - Common issues and solutions
- **[API Reference](../api/endpoints.md)** - HTTP endpoints for automation
