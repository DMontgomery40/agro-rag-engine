# Monitoring

Observability for AGRO.

## Grafana Dashboards

Access at http://127.0.0.1:3000/

Dashboards include:

- Request rates and latency
- Cache hit rates
- Token usage
- Error rates

## Prometheus Metrics

Available at http://127.0.0.1:9090/

Key metrics:

- `agro_requests_total`
- `agro_request_latency_seconds`
- `agro_search_results_count`
- `agro_tokens_used_total`

## LangSmith Tracing

Enable tracing to see exactly what the LLM saw:

```bash
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=...
```

Then use `/trace` in CLI or check LangSmith dashboard.

## Alerts

Alertmanager configured at http://127.0.0.1:9093/

Default alerts:

- High error rate
- Slow response times
- Service down
