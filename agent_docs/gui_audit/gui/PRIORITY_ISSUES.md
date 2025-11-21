# Priority Issues List - /gui Frontend

**Generated:** 2025-11-20
**Based on:** Comprehensive 8-agent audit
**Total Issues:** 42 identified
**Status:** READY FOR IMPLEMENTATION

---

## Issue Classification

| Priority | Count | Description | Est. Hours |
|----------|-------|-------------|------------|
| **P0 - CRITICAL** | 8 | Blocking production, ADA violations | 80-100 |
| **P1 - HIGH** | 12 | Data integrity, functionality gaps | 50-60 |
| **P2 - MEDIUM** | 15 | UX degradation, performance | 30-40 |
| **P3 - LOW** | 7 | Polish, minor improvements | 10-15 |
| **TOTAL** | **42** | | **170-215 hours** |

---

## P0 - CRITICAL (Blocking Production)

### 1. **54 RAG Parameters Missing from GUI**
**Severity:** 🔴 CRITICAL - ADA Violation
**Location:** Entire frontend (HTML + JS)
**Impact:** Users cannot access 54% of system configuration
**ADA Compliance:** Violates accessibility requirements for dyslexic users

**Missing Categories:**
- Keywords (0/5 parameters) - 100% missing
- Embedding config (9/10 parameters) - 90% missing
- Generation tuning (5/10 parameters) - 50% missing
- Tracing (6/7 parameters) - 86% missing
- Advanced scoring (4/8 parameters) - 50% missing

**Files Affected:**
- `/gui/index.html` - Need to add form controls
- `/gui/js/config.js` - Need to add handlers

**Estimated Fix:** 40-50 hours
**Priority:** P0 (immediate)

---

### 2. **Type Conversion Bug - Numbers Sent as Strings**
**Severity:** 🔴 CRITICAL - Data Integrity
**Location:** `/gui/js/config.js` lines 726-729
**Impact:** Backend receives invalid types

**Bug:**
```javascript
} else if (field.type === 'number') {
  val = field.value;  // ❌ STILL STRING!
}
```

**Fix:**
```javascript
} else if (field.type === 'number') {
  val = parseFloat(field.value) || 0;
}
```

**Files Affected:**
- `/gui/js/config.js` (gatherConfigForm function)

**Estimated Fix:** 2 hours
**Priority:** P0 (immediate)

---

### 3. **6 Form Controls Missing `name` Attributes**
**Severity:** 🔴 CRITICAL - Cannot Submit
**Location:** `/gui/index.html` lines 3682, 3686, 3690, 4137, 4165, 4178
**Impact:** Form controls cannot be submitted to backend

**Affected Controls:**
- reranker-epochs (line 3682)
- reranker-batch (line 3686)
- reranker-maxlen (line 3690)
- eval-final-k (line 4137)
- eval-golden-path (line 4165)
- eval-baseline-path (line 4178)

**Fix:** Add `name="PARAM_NAME"` attribute to each

**Estimated Fix:** 1 hour
**Priority:** P0 (immediate)

---

### 4. **XSS Vulnerability in Repo Names**
**Severity:** 🔴 CRITICAL - Security
**Location:** `/gui/js/config.js` line 304
**Impact:** HTML injection attack vector

**Bug:**
```javascript
div.innerHTML = '<h4>Repo: ${repo.name}</h4>';  // ❌ XSS risk
```

**Fix:**
```javascript
const h4 = document.createElement('h4');
h4.textContent = `Repo: ${repo.name}`;  // ✅ Safe
div.appendChild(h4);
```

**Estimated Fix:** 2 hours
**Priority:** P0 (immediate)

---

### 5. **Search Module Has Zero RAG Integration**
**Severity:** 🔴 CRITICAL - Broken Feature
**Location:** `/gui/js/search.js` (254 lines)
**Impact:** "Search" feature completely non-functional

**Problem:** Search operates on DOM only, no `/api/search` calls

**Fix:** Implement RAG search backend integration

**Estimated Fix:** 10-15 hours
**Priority:** P0 (should fix before launch)

---

### 6. **No Client-Side Parameter Validation**
**Severity:** 🔴 CRITICAL - Data Integrity
**Location:** `/gui/js/config.js` (entire saveConfig flow)
**Impact:** Invalid data sent to backend, errors on server

**Missing Validation:**
- No type checking (int/float/bool/string)
- No range validation (min/max)
- No enum validation (allowed values)
- No format validation (URLs, paths)

**Fix:** Create parameter validation library

**Estimated Fix:** 12-16 hours
**Priority:** P0 (immediate)

---

### 7. **Grafana Auth Token Exposed in iframe URL**
**Severity:** 🔴 CRITICAL - Security
**Location:** `/gui/js/grafana.js` line 37
**Impact:** Auth token visible in browser history, network logs, referer headers

**Bug:**
```javascript
iframe.src = `${url}&auth_token=${token}`;  // ❌ Security risk
```

**Fix:** Use iframe postMessage API or backend proxy

**Estimated Fix:** 4-6 hours
**Priority:** P0 (security issue)

---

### 8. **Keyword Dialog Memory Leak**
**Severity:** 🔴 CRITICAL - Performance
**Location:** `/gui/js/config.js` lines 421-473
**Impact:** DOM elements accumulate, browser slows down

**Problem:** Creates dialog + backdrop without cleanup

**Fix:** Use singleton modal or proper cleanup function

**Estimated Fix:** 3-4 hours
**Priority:** P0 (performance degrades over time)

---

**P0 Total:** 8 issues, **80-100 hours** to fix

---

## P1 - HIGH (Data Integrity / Functionality)

### 9. **Display-Only Controls Appear Editable**
**Severity:** ⚠️ HIGH - User Confusion
**Location:** `/gui/js/reranker.js` lines 521-530, `/gui/js/config.js` lines 274-281
**Impact:** Users think they can edit but changes don't persist

**Affected:**
- AGRO_RERANKER_ALPHA, TOPN, BATCH, MAXLEN (reranker info panel)
- Cost panel fields

**Fix:** Add `readonly` attribute or make clearly labeled display-only

**Estimated Fix:** 2-3 hours

---

### 10. **No Unified Parameter Update Mechanism**
**Severity:** ⚠️ HIGH - Maintenance
**Location:** `/gui/js/config.js` (multiple sections)
**Impact:** Inconsistent state handling, hard to maintain

**Problem:** Each control type handled differently, no shared library

**Fix:** Create unified parameter update utility

**Estimated Fix:** 8-12 hours

---

### 11. **Secret Unmask API Visible in DevTools**
**Severity:** ⚠️ HIGH - Security
**Location:** `/gui/js/config.js` line 48
**Impact:** Secrets visible in browser DevTools Network tab

**Problem:** `GET /api/config?unmask=1` shows plaintext

**Fix:** Use POST-only or session-based approach

**Estimated Fix:** 3-4 hours

---

### 12. **CSV Parsing Without Escaping**
**Severity:** ⚠️ HIGH - Data Corruption
**Location:** `/gui/js/config.js` line 587
**Impact:** Keywords with commas split incorrectly

**Bug:**
```javascript
field.value.split(',').map(s => s.trim())  // ❌ No escaping
```

**Fix:** Use proper CSV parser or different delimiter

**Estimated Fix:** 2-3 hours

---

### 13. **Keyword Persistence Incomplete**
**Severity:** ⚠️ HIGH - Data Loss
**Location:** `/gui/js/config.js` lines 514-525, `/gui/js/keywords.js`
**Impact:** New keywords added locally but server sync unclear

**Fix:** Ensure `POST /api/keywords/add` confirms persistence

**Estimated Fix:** 2-4 hours

---

### 14. **Repo Selector Changes Don't Persist**
**Severity:** ⚠️ HIGH - UX
**Location:** `/gui/js/indexing.js` line 482
**Impact:** Switching repos resets on page reload

**Fix:** Save repo selection to localStorage or config

**Estimated Fix:** 1-2 hours

---

### 15. **No Timeout on Async Operations**
**Severity:** ⚠️ HIGH - Hang Risk
**Location:** All modules (25+ fetch calls)
**Impact:** Operations can hang indefinitely

**Fix:** Add AbortController with 30-60s timeout to all fetch()

**Estimated Fix:** 6-8 hours

---

### 16. **Chat No Streaming Response**
**Severity:** ⚠️ HIGH - UX
**Location:** `/gui/js/chat.js`
**Impact:** 1-3 second latency, poor user experience

**Fix:** Implement Server-Sent Events or WebSocket

**Estimated Fix:** 10-12 hours

---

### 17. **No Retry Logic on Transient Failures**
**Severity:** ⚠️ HIGH - Reliability
**Location:** All modules
**Impact:** Transient network errors require manual retry

**Fix:** Implement exponential backoff retry logic

**Estimated Fix:** 4-6 hours

---

### 18. **Docker Controls Endpoint Not Verified**
**Severity:** ⚠️ HIGH - Functionality
**Location:** `/gui/js/docker.js` line 4503
**Impact:** `/api/docker/containers` may not exist

**Fix:** Verify endpoint or add error handling

**Estimated Fix:** 1-2 hours

---

### 19. **Webhook URLs Using Password Fields**
**Severity:** ⚠️ HIGH - UX
**Location:** `/gui/index.html` lines 4951, 4959
**Impact:** Cannot verify URLs after entry

**Fix:** Use text input with show/hide toggle

**Estimated Fix:** 1-2 hours

---

### 20. **Chat Settings Not Backend-Persisted**
**Severity:** ⚠️ HIGH - Data Loss
**Location:** `/gui/js/chat.js` lines 5543, 5562
**Impact:** Settings lost if browser storage cleared

**Affected:**
- chat-temperature (UI-only, no backend param)
- chat-max-tokens (UI-only, no backend param)

**Fix:** Create CHAT_TEMPERATURE, CHAT_MAX_TOKENS backend params

**Estimated Fix:** 2-3 hours

---

**P1 Total:** 12 issues, **50-60 hours** to fix

---

## P2 - MEDIUM (UX Degradation / Performance)

### 21-35. Additional Medium Priority Issues

Including:
- Variable scope bug in cleanup (indexing.js:560)
- SSE error handling minimal (cards_builder.js)
- Status polling inefficient (multiple modules)
- Training params lack validation (reranker.js:996-998)
- Price data not cached (config.js:927)
- No polling for config changes
- API base hardcoded port (core-utils.js:16)
- Health checks only on page load (health.js)
- LangSmith integration incomplete
- Auto-Profile settings not persisted
- Cost calculator model lists unclear
- MCP configuration duplicated 3x
- Hard-coded IDs/selectors throughout (ui-helpers.js)
- Event bus lacks error propagation (core-utils.js:60)
- Tab aliases massive (tabs.js:41 entries)

**P2 Total:** 15 issues, **30-40 hours** to fix

---

## P3 - LOW (Polish / Minor Improvements)

### 36-42. Low Priority Issues

Including:
- Tooltip quality variance
- Hard-coded fallback repo 'agro'
- Job ID not persisted (cards_builder.js)
- Console error capture monkeypatched (test-instrumentation.js)
- Theme legacy normalization fragile (theme.js)
- error-helpers.js unused
- Documentation gaps

**P3 Total:** 7 issues, **10-15 hours** to fix

---

## Recommended Fix Order

### Week 1 (Critical Blockers)
1. Add missing 54 RAG parameters (40-50 hours)
2. Fix type conversion bug (2 hours)
3. Add missing `name` attributes (1 hour)
4. Fix XSS vulnerability (2 hours)
5. Implement parameter validation library (12 hours)

**Week 1 Total:** ~60 hours

### Week 2 (Security + Data Integrity)
6. Fix Grafana auth token exposure (4-6 hours)
7. Fix secret unmask visibility (3-4 hours)
8. Add timeout to all fetch() (6-8 hours)
9. Fix display-only controls (2-3 hours)
10. Fix CSV parsing (2-3 hours)

**Week 2 Total:** ~20 hours

### Week 3 (Functionality + UX)
11. Implement search RAG integration (10-15 hours)
12. Add chat streaming (10-12 hours)
13. Implement retry logic (4-6 hours)
14. Fix unified parameter updates (8-12 hours)

**Week 3 Total:** ~40 hours

### Week 4 (Polish + Remaining)
15-42. Fix remaining P1-P3 issues

**Week 4 Total:** ~50 hours

---

## Total Effort Estimate

- **P0 (Critical):** 80-100 hours
- **P1 (High):** 50-60 hours
- **P2 (Medium):** 30-40 hours
- **P3 (Low):** 10-15 hours

**Grand Total:** **170-215 hours** (~5-6 weeks for 1 developer)

With 2 developers working in parallel: **3-4 weeks**
With 3 developers: **2-3 weeks**

---

## Testing Requirements

After fixes, comprehensive testing required:
1. **Parameter Round-Trip:** Test all 100 parameters save/load
2. **Type Validation:** Verify all numeric/boolean conversions
3. **Security:** Penetration testing for XSS, auth token exposure
4. **Performance:** Load testing, memory leak detection
5. **Accessibility:** Screen reader testing, keyboard navigation
6. **Browser Compatibility:** Chrome, Firefox, Safari, Edge

**Testing Effort:** Additional 30-40 hours

---

**Document Prepared By:** Claude Code
**Last Updated:** 2025-11-20
**Status:** READY FOR IMPLEMENTATION
**Next Step:** Prioritize fixes with team, assign developers
