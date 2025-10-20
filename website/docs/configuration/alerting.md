---
sidebar_position: 4
---

# Alerting System

AGRO's comprehensive alerting system catches incidents like orphaned loops before they cost hundreds of dollars. The system combines Prometheus for metrics, AlertManager for routing, and FastAPI webhooks for logging.

## Overview

The alerting system was built to catch the exact pattern of an orphaned Claude shell that consumed 2k tokens/sec for 2+ days, costing $200-300.

**Components**:
1. **Prometheus** - Metrics collection & alert rule evaluation
2. **AlertManager** - Alert routing & deduplication
3. **FastAPI Webhook** - Alert logging & external integration points

## Alert Rules (Priority 0-3)

### P0: Cost & Token Burn (CRITICAL)

These rules catch runaway processes and orphaned loops:

| Alert | Threshold | Fires After | What It Catches |
|-------|-----------|-------------|-----------------|
| `CostBurnSpike` | > $0.10/hour | 2 min | Runaway API calls, reranking all documents |
| `TokenBurnSpike` | > 5,000 tokens/min | 2 min | Rapid token consumption spikes |
| `TokenBurnSustained` | > 2,000 tokens/min | 15 min | **Orphaned loop pattern** (catches the 2-day incident) |

**Real-World Example**: The orphaned loop incident:
- Called `/api/chat` every 2 seconds
- Reranked 100-200 documents each call
- Each document ~175 tokens → **3,500 tokens/call**
- Every 2 seconds → **2,000+ tokens/min**
- **This alert would fire after 15 minutes** (orphaned loop ran 2+ DAYS)

### P1: API Anomalies (WARNING)

| Alert | Threshold | What It Catches |
|-------|-----------|-----------------|
| `EndpointCallFrequencyAnomaly` | `/api/chat` > 10/min | Bot, infinite retry loop, load test |
| `CohereRerankingSpike` | > 20 rerank calls/min | Reranking too many documents |
| `HighErrorRate` | > 5% errors | Provider issues, network problems |
| `CohereRateLimitExceeded` | > 5 rate limit errors | API quota hit |
| `TimeoutErrorSpike` | > 10 timeouts/5min | Network/provider latency issues |

### P2: Budget & Cost Control (INFO → CRITICAL)

| Alert | Threshold | Action |
|-------|-----------|--------|
| `MonthlyBudgetWarning` | > $5 | Monitor spend trend |
| `MonthlyBudgetCritical` | > $40 / $50 cap | **URGENT: Disable features or increase budget** |

### P3: Quality Metrics (INFO)

| Alert | Threshold | What It Means |
|-------|-----------|---------------|
| `RetrievalQualityDegraded` | MRR < 0.6 | Indexing may be stale |
| `CanaryPassRateLow` | Pass rate < 90% | Quality regression detected |

## Alert Lifecycle

```
Prometheus collects metrics (every 5s)
         ↓
Alert rules evaluated (every 30s)
         ↓
Firing alerts sent to AlertManager
         ↓
AlertManager deduplicates & groups (10-60s)
         ↓
Routes to receivers (critical → warning → info)
         ↓
Webhook sent to FastAPI → logged to data/logs/alerts.jsonl
```

## Notification Routing

### Critical Alerts

```
Severity: critical
├─ Wait: 30s before sending
├─ Repeat: every 1 hour
└─ Route: /webhooks/alertmanager (logged)
    [To add: Slack, PagerDuty, SMS]
```

### Warning Alerts

```
Severity: warning
├─ Wait: 1 min before sending
├─ Repeat: every 4 hours
└─ Route: /webhooks/alertmanager (logged)
```

### Info Alerts

```
Severity: info
├─ Wait: 5 min before sending
├─ Repeat: every 24 hours
└─ Route: /webhooks/alertmanager (logged)
```

## Configuration Files

### `/infra/prometheus-alert-rules.yml`

- 20+ alert rules covering cost, tokens, errors, performance
- Organized into 2 groups: `core_alerts` + `cohere_monitoring`
- Ready-to-use thresholds based on typical AGRO usage

### `/infra/alertmanager.yml`

- Alert routing rules (critical/warning/info)
- Inhibition rules (silence warnings if critical is firing)
- Webhook receiver points to `POST /webhooks/alertmanager`

### `/infra/docker-compose.yml`

- New `alertmanager` service (port 9093)
- Prometheus depends on AlertManager
- AlertManager stores state in volume `alertmanager_data`

### `/server/alerts.py`

- FastAPI webhook receiver (`POST /webhooks/alertmanager`)
- Logs all alerts to `data/logs/alerts.jsonl`
- Provides `/webhooks/alertmanager/status` endpoint for audit

## Viewing Alerts

### 1. Prometheus UI (Real-time)

```bash
# In browser: http://localhost:9090/alerts
# Shows:
# - Pending alerts (about to fire)
# - Firing alerts (active)
# - Alert rule evaluation status
```

### 2. AlertManager UI

```bash
# In browser: http://localhost:9093
# Shows:
# - Active alerts
# - Alert groups
# - Silences & inhibitions
# - Alert timeline
```

### 3. Alert Log File

```bash
# All alerts logged to JSONL for analysis
cat data/logs/alerts.jsonl | jq '.'

# Find critical alerts
cat data/logs/alerts.jsonl | jq 'select(.alert.labels.severity == "critical")'

# Alert timeline
cat data/logs/alerts.jsonl | jq '.timestamp, .alert.labels.alertname, .alert.labels.severity' | paste - - -
```

### 4. Grafana Dashboard

Can add alert status panels to existing dashboard (future work).

## Testing Alerts

### Test 1: Trigger TokenBurnSpike Alert

```bash
# Generate high token consumption
for i in {1..10}; do
  curl -s "http://localhost:8012/api/chat?query=test" &
done
wait

# Check alerts fired
curl http://localhost:9090/api/v1/alerts?state=firing | jq '.data[] | .labels.alertname'
```

### Test 2: Check Alert Webhook

```bash
# Trigger a test alert (create a Prometheus rule with 1s FOR clause)
# Then verify it was logged:

curl http://localhost:8012/webhooks/alertmanager/status | jq '.recent_alerts[0]'
```

### Test 3: View AlertManager Status

```bash
curl http://localhost:9093/api/v1/alerts | jq '.[] | {alertname: .labels.alertname, status: .status, severity: .labels.severity}'
```

## Extending Alerts

### Add a Slack Notification

Update `/infra/alertmanager.yml`:

```yaml
receivers:
  - name: 'critical'
    slack_configs:
      - api_url: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL'
        channel: '#alerts-critical'
        title: 'AGRO Critical Alert'
        text: '{{ .CommonAnnotations.description }}'
```

### Add a PagerDuty Integration

```yaml
receivers:
  - name: 'critical'
    pagerduty_configs:
      - service_key: 'YOUR-SERVICE-KEY'
        description: '{{ .GroupLabels.alertname }}'
        client: 'AGRO'
        details:
          alert: '{{ .GroupLabels.alertname }}'
          severity: '{{ .CommonLabels.severity }}'
```

### Add a Custom Webhook

```yaml
receivers:
  - name: 'critical'
    webhook_configs:
      - url: 'https://your-notification-service.com/alerts'
        send_resolved: true
```

Then update `/server/alerts.py` to call your custom integration.

## Baseline Metrics (For Tuning)

Typical AGRO usage when healthy:

- **Requests/min**: 10-50 (mostly /api/search, /api/rerank)
- **Tokens/min**: 200-1000 (embeddings + LLM calls)
- **Cost/hour**: $0.01-$0.05 (mostly Cohere reranking)
- **Error rate**: < 0.5%
- **Latency p99**: 1-3 seconds
- **Cohere reranking calls/min**: 2-10

If your metrics differ significantly, alert thresholds may need adjustment.

## Incident Response

### If CostBurnSpike or TokenBurnSustained Fires:

**1. Immediate: Check for orphaned processes**

```bash
ps aux | grep -E "curl.*api/chat|python.*agro"

# Kill if found
kill -9 <PID>
```

**2. Check server logs** for repeated /api/chat calls

```bash
tail -f data/logs/queries.jsonl | jq 'select(.route == "/api/chat")'
```

**3. Review Prometheus metrics**

```bash
# Query cost burn rate
rate(agro_cost_usd_total[5m]) * 3600

# Query token burn rate
rate(agro_tokens_total[5m]) * 60

# Query API call frequency
rate(agro_requests_total{route="/api/chat"}[5m])
```

Visit http://localhost:9090 and enter these queries.

**4. Check environment variables**

```bash
echo $COHERE_RERANK_TOP_N  # Should be <= 50
echo $RERANK_BACKEND       # Should not be "cohere" if disabled
```

**5. Review recent changes**

```bash
git log --oneline -20 | head -10
git diff HEAD~5..HEAD -- retrieval/rerank.py
```

## Common Alert Scenarios

### Scenario 1: CostBurnSpike

**Symptoms**: Alert fires, cost jumping unexpectedly

**Common Causes**:
- Orphaned process calling API in tight loop
- Misconfigured reranking (reranking all documents)
- Multi-query rewrites set too high (`MQ_REWRITES`)
- Expensive model accidentally selected

**Resolution**:
1. Check for orphaned processes (see Incident Response)
2. Review recent config changes in GUI
3. Check Prometheus for spike timing
4. Roll back changes if identified

### Scenario 2: TokenBurnSustained

**Symptoms**: Alert fires after 15+ minutes of high token usage

**Common Causes**:
- Background job stuck in loop
- Agent or script repeatedly calling `/answer`
- Large batch processing job running

**Resolution**:
1. Identify the source (check logs)
2. If intentional (batch job), silence the alert temporarily
3. If orphaned, kill the process
4. Consider rate limiting in reverse proxy

### Scenario 3: RetrievalQualityDegraded

**Symptoms**: MRR drops below 0.6

**Common Causes**:
- Index is stale (code changed but not re-indexed)
- Wrong repository selected
- Embedding model changed without re-indexing

**Resolution**:
```bash
# Re-index the repository
REPO=agro python index_repo.py

# Run evals to verify
python -m eval.eval_loop --compare
```

### Scenario 4: HighErrorRate

**Symptoms**: > 5% of requests failing

**Common Causes**:
- Provider API down (OpenAI, Cohere)
- Network issues
- Rate limits hit
- Invalid API keys

**Resolution**:
1. Check provider status pages
2. Verify API keys in `.env`
3. Check network connectivity
4. Review error logs for patterns

## Advanced Configuration

### Custom Alert Rules

Add to `/infra/prometheus-alert-rules.yml`:

```yaml
groups:
  - name: custom_alerts
    rules:
      - alert: HighLatency
        expr: agro_retrieval_latency_seconds > 5
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Retrieval latency is high"
          description: "Retrieval taking > 5s for {{ $value }}s"
```

Then reload Prometheus:

```bash
docker exec rag-prometheus kill -HUP 1
```

### Silence Alerts Temporarily

Via AlertManager UI (http://localhost:9093):
1. Click "Silences"
2. Click "New Silence"
3. Add matchers (e.g., `alertname=TokenBurnSustained`)
4. Set duration (e.g., 2 hours)
5. Add comment explaining why
6. Click "Create"

### Alert Thresholds via Environment Variables

You can make thresholds configurable:

```bash
# In .env
ALERT_TOKEN_BURN_THRESHOLD=2000
ALERT_COST_BURN_THRESHOLD=0.10
```

Then update Prometheus rules to use these (requires custom templating).

## Files Changed

When alerting was implemented, these files were modified:

- `/infra/prometheus-alert-rules.yml` - New alert rules
- `/infra/alertmanager.yml` - New AlertManager config
- `/infra/docker-compose.yml` - Added AlertManager service
- `/infra/prometheus.yml` - Added rule_files and alerting config
- `/server/alerts.py` - New webhook receiver
- `/server/app.py` - Integrated alerts router

## Next Steps

1. **Slack Integration**: Add Slack webhook to `alertmanager.yml`
2. **Email Alerts**: Configure SMTP in `alertmanager.yml`
3. **Custom Dashboard**: Add alert status panels to Grafana
4. **Alert Tuning**: Monitor baseline metrics for a few days, adjust thresholds
5. **Runbook Links**: Update alert annotations with runbook URLs
6. **Post-incident Review**: Document what alerts should have fired for past incidents

## Monitoring Best Practices

### 1. Start with Defaults

Don't over-customize initially. Run with defaults for 1-2 weeks to establish baselines.

### 2. Tune Based on Real Data

After baseline period, adjust thresholds based on actual usage patterns.

### 3. Document Alert Actions

For each alert, document:
- What it means
- How to investigate
- Common causes
- Resolution steps

### 4. Test Regularly

Run test scenarios monthly to verify alerts still fire:
```bash
# Monthly alert test
bash scripts/test_alerts.sh
```

### 5. Review Alert Logs

Weekly review of `data/logs/alerts.jsonl`:
- Are there false positives?
- Are thresholds too sensitive?
- Are any alerts never firing (maybe remove them)?

## Additional Resources

- **Prometheus Alerting**: https://prometheus.io/docs/alerting/latest/overview/
- **AlertManager Configuration**: https://prometheus.io/docs/alerting/latest/configuration/
- **Alert Best Practices**: https://prometheus.io/docs/practices/alerting/
- **Grafana Alerts**: https://grafana.com/docs/grafana/latest/alerting/

**Last Updated**: October 2025
