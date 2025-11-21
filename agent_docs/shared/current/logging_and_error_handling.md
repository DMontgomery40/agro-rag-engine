# Logging and Error Handling Guidelines

Robust logging and consistent JSON error handling are mandatory. This doc sets the standards used by all backend work.

## Principles
- Always return JSON responses for errors. Do not leak secrets or full tracebacks to clients.
- Attach a request ID to every response header: `X-Request-ID`. Accept inbound values; otherwise generate.
- Log unhandled exceptions with the request ID and a clear message.
- Prefer `logger = logging.getLogger('agro.api')` for API logs and `agro.reranker` for reranker logic.
- Keep logs structured (single-line, key=value or JSON) to be Loki/Promtail friendly.

## Implementation (current)
- Request ID + exception handler installed in app factory (worktree):
  - `.worktrees/feature-backend-modularization/server/asgi.py`
  - Behavior:
    - Adds `X-Request-ID` to all responses
    - Logs unhandled exceptions and returns `{ "error": "Internal Server Error", "request_id": "..." }` with status 500
- Smoke tests:
  - `.worktrees/feature-backend-modularization/tests/test_request_id_header.py`

## Error Responses
- For expected failures, return JSON like:
```
{ "ok": false, "error": "Validation failed", "code": "VALIDATION_ERROR", "request_id": "..." }
```
- For unhandled exceptions, central handler returns 500 with `{ error, request_id }`.
- Do not include secrets or stack traces in client responses.

## Logging Format
- Use single-line logs. Example:
```
logger.info("index status fetched | repo=%s items=%d request_id=%s", repo, count, req_id)
```
- Optionally switch to JSON logs later; initial priority is consistency and correlation.

## Loki/Promtail Integration (optional, later)
- We have Loki and Promtail containers available in infra. For now keep Python logging simple; when needed:
  - Send logs to stdout; Promtail can scrape container logs.
  - Expose labels via Docker service names; refine scrape configs in `infra/promtail-config.yml`.

## Metrics
- Keep existing Prometheus metrics via `server/metrics.py` (`init_metrics_fastapi`, `stage`, `record_*`).
- Increment error counters when appropriate (e.g., generic 500 handler can `ERRORS_TOTAL.inc()` if needed).

## Testing
- Direct-import tests verify `X-Request-ID` header presence on success and 404.
- Add targeted tests as routers move (e.g., config POST validation returns structured error JSON).
