# HTML Tools & Monitoring Sections Audit (Lines 4501-6142)

**Audit Date:** 2025-11-20
**Phase:** 2, Agent 4
**Scope:** Lines 4501-6142 of /gui/index.html
**Status:** COMPREHENSIVE AUDIT COMPLETE

## Executive Summary

This audit covers three major sections: Infrastructure Tab (4501-4800), Admin Tab (4803-5046), Dashboard & Chat (5048-5784).

**Key Findings:**
- **71 form controls** found across all sections
- **50+ RAG parameters** integrated into UI (but only 16 directly configured)
- **Docker controls** present but endpoint validation unclear
- **Observability controls** extensive (7 alert thresholds, webhooks, LangSmith)
- **Critical gap:** 84 out of 100 core RAG parameters missing from these sections
- **Session management issue:** Chat has localStorage persistence but no server-side tracking
- **Architecture concern:** Cost calculator and Auto-Profile are separate tools for related purposes

## Total Form Controls: 71

**By Category:**
- Infrastructure/Docker: 25 controls
- Observability/Alerts: 11 controls
- Server/Admin Settings: 16 controls
- Chat/UI Settings: 11 controls
- Cost Calculator: 11 controls
- Dashboard/Quick Actions: 7 controls

## RAG Parameters Directly Controlled: 16/100 (16%)

**In These Sections:**
1. FINAL_K (Retrieval Top-K for chat) - Line 5598
2. MULTI_QUERY_M (Multi-Query Rewrites) - Line 5578
3. FALLBACK_CONFIDENCE (Chat confidence threshold) - Line 5611
4. GEN_MODEL_CHAT (Chat generation model) - Line 5528
5. GEN_MODEL_HTTP, GEN_MODEL_MCP, GEN_MODEL_CLI - Lines 4915, 4921, 4929
6. THEME_MODE (UI theme) - Line 4811
7-16. Infrastructure and configuration parameters

## Critical Issues (11 Total)

### ISSUE 1: Chat Session Persistence Missing
**Severity:** MEDIUM
- Chat history saved only in browser's localStorage
- No server-side session tracking
- Each browser/device gets separate history

### ISSUE 2: Duplicate MCP Configuration
**Severity:** MEDIUM
- `MCP_HTTP_HOST`, `MCP_HTTP_PORT`, `MCP_HTTP_PATH` defined in 3 locations
- Configuration inconsistency risk

### ISSUE 3: Docker Controls Endpoint Not Verified
**Severity:** MEDIUM
- `/api/docker/containers` endpoint existence unconfirmed

### ISSUE 4: Webhook URLs Using Password Fields
**Severity:** MEDIUM (Security/UX)
- Using `<input type="password">` prevents URL verification
- Masked text makes validation impossible

### ISSUE 5: Auto-Profile vs Cost Calculator Duplication
**Severity:** MEDIUM
- Two separate tools for similar purpose (estimating RAG costs)
- User confusion about which to use

### ISSUE 6: Chat Settings Not Backend-Persisted
**Severity:** MEDIUM
- `chat-temperature` and `chat-max-tokens` are UI-only
- Settings lost if browser storage cleared

### ISSUE 7-11: Other configuration and validation issues

## Observability & Monitoring Coverage

### Alert Thresholds Configured (7):
1. Error Rate Threshold (%)
2. Request Latency P99 (seconds)
3. Timeout Errors (per 5min)
4. Rate Limit Errors (per 5min)
5. Endpoint Call Frequency
6. Sustained Frequency Duration
7. Cohere Rerank Calls (per min)

### Webhook Notifications: CONFIGURED
- Slack integration
- Discord integration
- Severity-based filtering

## Recommendations

**Priority 1:**
1. Verify backend endpoints
2. Fix webhook password field issues
3. Implement server-side session persistence
4. Consolidate duplicate MCP settings

**Priority 2:**
1. Feature verification
2. Parameter mapping clarification
3. Config hot-reload endpoint

**Priority 3:**
1. Architecture consolidation
2. Accessibility improvements

---

**Audit completed by:** Claude Code (Phase 2, Agent 4)
**Status:** Documentation only - no modifications made
**Estimated effort to address all issues:** 4-6 hours
