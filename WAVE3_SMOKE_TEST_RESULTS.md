# Wave 3 Smoke Test Results

**Date:** 2025-10-18
**Executed by:** Agent 4 (Test Runner)
**Target:** Wave 3 GUI Migration
**Test Location:** http://127.0.0.1:8012/gui/index.html

---

## Overall Status: ❌ **FAIL**

**6 out of 6 tests FAILED**

---

## Test 1: All 9 Tabs Load Without Errors
**Status:** ❌ **FAIL**

### Issues Found:
1. **Tab "get-started" not found in DOM**
   - Expected tab with `data-tab="get-started"` does not exist

2. **Duplicate tab buttons (Strict Mode Violation)**
   - Multiple elements with `data-tab="dashboard"` exist:
     - Mobile nav drawer button
     - Desktop tab button
   - This affects ALL tabs, not just dashboard

3. **Cannot click tabs due to ambiguity**
   - Playwright strict mode requires unique selectors
   - Both mobile and desktop nav have same data attributes

### Details:
- **Tabs tested:** 0/9 (test failed before completion)
- **Errors:** Multiple selector conflicts
- **Root cause:** Duplicate navigation elements without proper scoping

---

## Test 2: Infrastructure Consolidation Worked
**Status:** ❌ **FAIL**

### Sections Found: 4/6

#### ✅ Found:
- Services
- Performance
- Usage
- Tracing

#### ❌ Missing:
- **MCP Servers** (expected from devtools-integrations merge)
- **Paths & Endpoints** (expected from devtools-paths merge)

### Root Cause:
Wave 3 Infrastructure consolidation did NOT include all expected sections. The merge was incomplete.

---

## Test 3: No Duplicate Form IDs
**Status:** ❌ **FAIL**

### Duplicates Found: **243**

#### Critical Examples:
1. `onboard-welcome` (appears 2+ times)
2. `onboard-source` (appears 2+ times)
3. `onboard-folder-mode` (appears 2+ times)
4. `onboard-folder-picker` (appears 2+ times)
5. `onboard-folder-btn` (appears 2+ times)
6. `onboard-folder-display` (appears 2+ times)
7. `onboard-folder-path` (appears 2+ times)
8. `onboard-github-mode` (appears 2+ times)
9. `onboard-github-url` (appears 2+ times)
10. `onboard-github-branch` (appears 2+ times)

**Total duplicate IDs:** 243

### Root Cause:
The "Get Started" onboarding content appears to be duplicated in multiple places:
- Likely in mobile nav drawer
- Likely in desktop main content
- Possibly in other tab containers

This violates HTML spec and breaks form functionality.

---

## Test 4: RAG Subtabs All Work
**Status:** ❌ **FAIL** (Test Timeout)

### Issue:
- RAG subtab buttons exist in DOM
- **Subtab buttons are NOT VISIBLE** (hidden by CSS or parent)
- Cannot click invisible elements
- Test timed out after 30 seconds trying to click `data-subtab="data-quality"`

### Subtabs Tested: 0/6

### Root Cause:
RAG subtab navigation is broken. The subtabs are rendered in HTML but:
- Not visible to user or automation
- Likely CSS display issue
- May be rendering inside collapsed/hidden container

---

## Test 5: Console Clean (No Red Errors)
**Status:** ❌ **FAIL**

### Red Errors: 3

#### Error Details:
1. **404 Not Found** (appears twice)
   - Failed to load resource
   - Server returned 404
   - Specific resource not identified in test output

2. **"Unexpected token 'export'"**
   - JavaScript syntax error
   - Likely attempting to use ES6 modules without proper setup
   - May indicate missing build step or incorrect script type

### Root Cause:
- Missing JavaScript files (404s)
- Incorrect JavaScript module configuration

---

## Test 6: Performance Check (Tab Switching)
**Status:** ❌ **FAIL**

### Issue:
Same as Test 1 - **Duplicate tab selectors** prevent tab clicking.

### Details:
- Could not measure performance
- Blocked by strict mode violation on dashboard tab
- Test aborted

---

## Critical Blockers Summary

### 🚨 Blocker 1: Duplicate Navigation (Affects Tests 1, 6)
**Severity:** CRITICAL
**Impact:** Cannot navigate between tabs
**Cause:** Mobile and desktop nav both use same `data-tab` attributes
**Fix Required:** Scope selectors or use unique attributes

### 🚨 Blocker 2: 243 Duplicate IDs (Affects Test 3)
**Severity:** CRITICAL
**Impact:**
- Violates HTML spec
- Breaks form submissions
- Breaks `getElementById()` calls
- Breaks accessibility (ARIA labels)
**Cause:** Onboarding content duplicated across mobile/desktop nav
**Fix Required:** Remove duplicates or dynamically generate unique IDs

### 🚨 Blocker 3: Incomplete Infrastructure Consolidation (Affects Test 2)
**Severity:** HIGH
**Impact:** Missing 2 of 6 expected sections
**Missing:**
- MCP Servers section
- Paths & Endpoints section
**Fix Required:** Agent 1 must complete the merge

### 🚨 Blocker 4: RAG Subtabs Not Visible (Affects Test 4)
**Severity:** HIGH
**Impact:** RAG configuration completely unusable
**Cause:** CSS hiding subtabs or parent container issue
**Fix Required:** Debug RAG tab rendering and visibility

### 🚨 Blocker 5: Console Errors (Affects Test 5)
**Severity:** MEDIUM
**Impact:**
- Missing resources (404s)
- JavaScript errors prevent functionality
**Fix Required:**
- Fix missing file references
- Fix ES6 module syntax errors

---

## Root Cause Analysis

### Mobile vs Desktop Navigation Conflict
The redesign introduced mobile navigation drawer that duplicates desktop navigation. Both use identical attributes (`data-tab`, `id`), creating conflicts.

**Evidence:**
```
Strict mode violation: locator('[data-tab="dashboard"]') resolved to 2 elements:
1) <button class="active" data-tab="dashboard"> (in #mobile-nav-drawer)
2) <button class="active" data-tab="dashboard" data-testid="tab-btn-dashboard"> (desktop)
```

### Incomplete Wave 3 Merge
Agent 1 reported Wave 3 complete, but Infrastructure tab is missing content that should have been merged from `devtools-integrations` and `devtools-paths`.

### Mass ID Duplication
243 duplicate IDs suggests large blocks of content (entire forms, onboarding flows) are being rendered multiple times without ID scoping.

---

## Recommendations

### Immediate Actions (Required Before Wave 4)

1. **Fix Duplicate Selectors (Blocker 1)**
   ```html
   <!-- Mobile nav -->
   <button data-tab="dashboard" data-nav="mobile">Dashboard</button>

   <!-- Desktop nav -->
   <button data-tab="dashboard" data-nav="desktop">Dashboard</button>
   ```
   Or use CSS to hide mobile nav by default and update selectors to target visible elements only.

2. **Fix Duplicate IDs (Blocker 2)**
   - Audit `index.html` for duplicate onboarding sections
   - Remove duplicates OR dynamically scope IDs:
     ```javascript
     // Example: prefix IDs with context
     onboard-welcome-mobile
     onboard-welcome-desktop
     ```

3. **Complete Infrastructure Consolidation (Blocker 3)**
   - Agent 1: Add missing MCP Servers section
   - Agent 1: Add missing Paths & Endpoints section
   - Re-verify all 6 sections present

4. **Fix RAG Subtabs Visibility (Blocker 4)**
   - Debug why subtabs are hidden
   - Check CSS display/visibility properties
   - Verify parent container is not collapsed
   - Test RAG tab navigation flow

5. **Fix Console Errors (Blocker 5)**
   - Identify 404 resources and fix paths
   - Fix ES6 module syntax (add `type="module"` or transpile)

---

## Testing Protocol Failed

**Expected:** Test after each wave, fix before next wave
**Actual:** Wave 3 completed without smoke tests
**Result:** 6 critical blockers discovered post-merge

### Lessons Learned:
- Smoke tests MUST run after each wave
- No wave proceeds until previous wave passes all tests
- Integration issues compound if not caught early

---

## Final Decision

### ❌ **WAVE 3 REJECTED - NOT APPROVED FOR WAVE 4**

### Actions Required:

1. **STOP Wave 4 work immediately**
2. **Agent 1 must fix all blockers:**
   - Blocker 1: Duplicate navigation selectors
   - Blocker 2: 243 duplicate IDs
   - Blocker 3: Missing Infrastructure sections
   - Blocker 4: RAG subtabs visibility
   - Blocker 5: Console errors (404s, syntax errors)
3. **Re-run Wave 3 smoke tests**
4. **Only proceed to Wave 4 when ALL tests PASS**

---

## Next Steps

### For Agent 1 (Migration):
```bash
# 1. Fix the GUI
# Edit /Users/davidmontgomery/agro-rag-engine/gui/index.html

# 2. Re-test
npx playwright test tests/gui/wave3-smoke.spec.ts --reporter=list

# 3. Report results
# All 6 tests must PASS
```

### For Orchestrator (Sonnet 4):
- Review blockers
- Prioritize fixes
- Assign to Agent 1
- Do NOT proceed to Wave 4 until Wave 3 passes

---

## Test Artifacts

**Test Script:** `/Users/davidmontgomery/agro-rag-engine/tests/gui/wave3-smoke.spec.ts`
**Test Command:** `npx playwright test tests/gui/wave3-smoke.spec.ts --reporter=list`
**Server URL:** http://127.0.0.1:8012/gui/index.html
**Test Duration:** ~40 seconds (timeouts included)
**Pass Rate:** 0/6 (0%)

---

## Appendix: Raw Test Output

### Test 1 Error:
```
Error: strict mode violation: locator('[data-tab="dashboard"]') resolved to 2 elements:
1) <button class="active" data-tab="dashboard" data-dopamine-bound="1">📊 Dashboard</button>
   (in #mobile-nav-drawer)
2) <button class="active" data-tab="dashboard" data-dopamine-bound="1" data-testid="tab-btn-dashboard">📊 Dashboard</button>
   (desktop)
```

### Test 2 Results:
```
✅ Found section: Services
❌ Missing section: MCP Servers
❌ Missing section: Paths & Endpoints
✅ Found section: Performance
✅ Found section: Usage
✅ Found section: Tracing
Sections found: 4/6
```

### Test 3 Results:
```
Duplicates found: 243
Examples: [
  'onboard-welcome',
  'onboard-source',
  'onboard-folder-mode',
  'onboard-folder-picker',
  'onboard-folder-btn'
]
```

### Test 4 Error:
```
Test timeout of 30000ms exceeded.
Error: locator.click: Test timeout
Cause: element is not visible (RAG subtab buttons hidden)
```

### Test 5 Results:
```
Red errors: 3
Samples: [
  'Failed to load resource: the server responded with a status of 404 (Not Found)',
  'Failed to load resource: the server responded with a status of 404 (Not Found)',
  "Unexpected token 'export'"
]
```

---

## Sign-off

**Tested by:** Agent 4 (Automated Test Runner)
**Date:** 2025-10-18
**Status:** FAILED
**Recommendation:** BLOCK WAVE 4 UNTIL FIXES COMPLETE

---

**This is a BLOCKING report. Wave 3 must be fixed before any Wave 4 work begins.** 🚨
