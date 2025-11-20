# JavaScript Integration Modules Audit

**Audit Date:** 2025-11-20
**Phase:** 3, Agent 3
**Scope:** Integration modules in /gui/js/
**Status:** COMPREHENSIVE AUDIT COMPLETE

## Executive Summary

Analyzed **8 primary JavaScript integration modules** (3,522+ lines) that connect the frontend GUI to backend services and external systems.

## Modules Analyzed

1. **docker.js** (1,049 lines) - Docker container lifecycle, status monitoring
2. **mcp_server.js** (261 lines) - MCP HTTP server management
3. **chat.js** (793 lines) - RAG chat interface with settings
4. **grafana.js** (137 lines) - Grafana dashboard embedding
5. **health.js** (44 lines) - System health monitoring
6. **mcp_rag.js** (75 lines) - RAG search debug tool
7. **config.js** (1,032 lines) - Configuration management
8. **secrets.js** (131 lines) - Secrets file ingestion

## Architecture Strengths

- ✓ Clear separation of concerns by module
- ✓ Proper Navigation API view registration pattern
- ✓ Primary/secondary module coordination
- ✓ Graceful fallback mechanisms
- ✓ Comprehensive error handling

## Critical Issues Found

| Priority | Issue | Modules | Impact |
|----------|-------|---------|--------|
| **HIGH** | 100+ RAG parameters missing from GUI | config.js | ADA accessibility violation |
| **HIGH** | Auth token exposed in iframe URL | grafana.js | Security risk |
| **MEDIUM** | No timeout on async operations | All modules | Operations can hang |
| **MEDIUM** | No streaming responses | chat.js | 1-3 second latency |
| **MEDIUM** | No input parameter validation | All modules | Invalid config sent |
| **MEDIUM** | No retry logic on transient failures | All modules | Manual intervention required |
| **MEDIUM** | No periodic health checks | health.js | Status becomes stale |
| **LOW** | Service URLs hardcoded | docker.js | Custom ports not respected |

## Integration Points Mapped

**Backend API Endpoints:**
- 10 Docker operations endpoints (`/api/docker/*`)
- 6 MCP management endpoints (`/api/mcp/*`)
- 4 RAG/Chat endpoints (`/api/chat`, `/api/prices`, etc.)
- 6 Configuration endpoints (`/api/config`, `/api/secrets/ingest`, etc.)
- 2 Health monitoring endpoints (`/health`, `/health/editor`)

**External Service Integrations:**
- Docker daemon (local socket)
- Qdrant vector DB (6333)
- Redis cache (6379)
- Prometheus metrics (9090)
- Grafana dashboards (3000)
- LangSmith tracing (external API)
- OpenVSCode editor (8443)
- MCP HTTP server (5001+)

## Parameter Dependencies

**Critical Dependencies:**
- chat.js depends on config.js for RAG parameters
- config.js depends on /api/prices for model validation
- docker.js depends on window.LiveTerminal for logging
- All modules depend on window.CoreUtils

## Missing Integration Parameters

**Configuration Gaps:**
- FINAL_K, CONFIDENCE_THRESHOLD, MULTI_QUERY - Not fully surfaced
- ROUTER_INTENT_THRESHOLD, GATING_TOP1_THRESHOLD - Missing
- 40+ advanced RAG parameters hidden from GUI

**Connection Parameters:**
- No timeout configuration
- No retry policy
- No port override support

## Data Flow Issues

**Chat Flow:**
- User question → POST /api/chat (no streaming) → Full response → Display
- **Issue:** 1-3 second latency
- **Solution:** Implement Server-Sent Events

**Config Loading:**
- Page load → Fetch /api/config → Populate form → One-time
- **Issue:** Doesn't detect changes from other sessions
- **Solution:** Implement periodic polling

**Health Checks:**
- docker.js: Auto-refreshes every 10s ✓
- health.js: Only checked on load ✗
- **Solution:** Periodic polling every 30-60s

## Security Findings

**HIGH SEVERITY:**
- Grafana auth token exposed in iframe URL (Line 37)
  - Visible in browser history, network logs
  - **Solution:** Use iframe postMessage API

**MEDIUM SEVERITY:**
- Secret reveal fetches unmask via API call (Line 48 in config.js)
  - Secrets logged in network requests
- No CORS protection on Grafana iframe
- No file type validation on secrets upload

## Performance Findings

**Response Latency:**
- Chat responses: 1-3 seconds (no streaming) ❌
- Logs fetching: Can exceed 30s ❌
- Infrastructure operations: Can take 60s ❌

**Storage Issues:**
- Chat history in localStorage (5-10MB limit)
- After 100+ conversations, storage filled
- **Solution:** Migrate to IndexedDB

**Polling Overhead:**
- docker.js: Auto-refresh every 10s (battery drain)
- mcp_server.js: Auto-refresh every 10s
- **Could increase to 30-60s**

## Detailed Module Issues

### docker.js
1. No timeout on fetch()
2. Hardcoded service URLs
3. No retry logic
4. Container ID matching fragile

### chat.js
1. No streaming response
2. No parameter validation
3. History compression missing
4. Can't dismiss error messages

### grafana.js
1. Auth token exposed in URL (security)
2. No CORS error detection
3. No iframe sandboxing

### health.js
1. Only called once on load
2. No component-level breakdown
3. No connection pooling

## Recommendations by Priority

### Phase 4 (CRITICAL - Block Production)
- [ ] Add AbortController with timeout to ALL fetch() calls
- [ ] Implement complete RAG parameter GUI
- [ ] Add client-side validation for all parameters
- [ ] Implement periodic health checks
- [ ] Fix Grafana auth token handling

### Phase 5 (HIGH - Improve Reliability)
- [ ] Implement retry logic with exponential backoff
- [ ] Add streaming response support
- [ ] Implement configuration change detection
- [ ] Add CORS error handling

### Phase 6 (MEDIUM - UX Polish)
- [ ] Add timeout countdown UI indicators
- [ ] Implement parameter range hints
- [ ] Add real-time log viewer
- [ ] Support WebSocket log streaming

---

**Audit completed by:** Claude Code (Phase 3, Agent 3)
**Status:** Documentation only - no modifications made
**Ready for Phase 4:** High-priority fixes for timeout support, parameter expansion, security hardening
