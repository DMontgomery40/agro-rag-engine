# Request Storm Investigation (2025-10-21)

## Incident
- `/metrics/` endpoint: 3,475 req/s (208,500 req/min!)
- `/webhooks/alertmanager/status`: 2,883 req/s
- Overall error rate: 6.76%
- Duration: ~12 hours

## Root Causes

### 1. Aggressive Prometheus Scraping
```yaml
# infra/prometheus/prometheus.yml
global:
  scrape_interval: 5s  # ← TOO AGGRESSIVE!
```
- Scrapes `/metrics/` every 5 seconds = 12 times/min
- **Recommendation**: Change to 15-30s for local dev, 60s for prod

### 2. Grafana Dashboard Auto-Refresh
```json
{
  "refresh": "10s",  # ← Refreshes every 10 seconds!
  "panels": 26       # ← 26 panels querying Prometheus
}
```
- 26 panels × 6 refreshes/min = 156 Prometheus queries/min
- **Recommendation**: Change to 30s or 1m refresh

### 3. No Rate Limiting on Monitoring Endpoints
```python
# server/frequency_limiter.py
ALLOWED_HIGH_FREQUENCY = {
    "/health",
    "/metrics",  # ← Excluded from rate limiting!
    "/metrics/",
}
```
- Monitoring endpoints bypass anomaly detection
- No alerts even when hammered at 3,475 req/s
- **Recommendation**: Add separate monitoring for monitoring endpoints (meta-monitoring)

### 4. Alertmanager Webhook Health Checks
- Alertmanager likely polling `/webhooks/alertmanager/status` for health
- **Recommendation**: Check Alertmanager config for webhook health check interval

## Fixes Applied
None yet - storm has subsided on its own.

## Recommended Actions

### Immediate (Critical)
1. **Reduce Prometheus scrape interval** to 30s:
```yaml
# infra/prometheus/prometheus.yml
global:
  scrape_interval: 30s
  evaluation_interval: 30s
```

2. **Increase Grafana dashboard refresh** to 1 minute:
```json
{
  "refresh": "1m"
}
```

### Short-term (Important)
3. **Add metrics endpoint rate limiting**:
```python
# server/metrics.py
from slowapi import Limiter
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)

@app.get("/metrics/")
@limiter.limit("30/minute")  # Max 30 req/min per IP
async def metrics():
    ...
```

4. **Add meta-monitoring**: Alert when `/metrics/` exceeds 60 req/min
5. **Check Alertmanager webhook config**: Reduce health check frequency

### Long-term (Nice to have)
6. **Implement metrics caching**: Cache `/metrics/` response for 5-10s
7. **Use push-based metrics**: Push metrics to Prometheus instead of scraping
8. **Separate monitoring stacks**: Dev vs prod Prometheus/Grafana configs

## Current Status
- Storm has subsided (0 requests observed in last 2 minutes)
- No immediate action required
- Monitoring configurations remain vulnerable to future storms

## Prevention
To prevent future storms:
1. Always set scrape intervals ≥ 15s
2. Always set dashboard refresh ≥ 30s
3. Monitor the monitors (meta-monitoring)
4. Test monitoring configs in staging first
