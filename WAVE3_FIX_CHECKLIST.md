# Wave 3 Fix Checklist - Agent 1

**Status:** 🚨 BLOCKING - Wave 4 cannot proceed until all items checked

---

## Quick Reference

**File to edit:** `/Users/davidmontgomery/agro-rag-engine/gui/index.html`
**Test command:** `npx playwright test tests/gui/wave3-smoke.spec.ts --reporter=list`
**Success criteria:** 6/6 tests PASS

---

## Blocker 1: Fix Duplicate Navigation ⏱️ 30 min

### Location
- Line 2209 (mobile nav)
- Line 2223 (desktop nav)

### Current Code
```html
<!-- Mobile -->
<button class="active" data-tab="dashboard">📊 Dashboard</button>

<!-- Desktop -->
<button class="active" data-tab="dashboard">📊 Dashboard</button>
```

### Fix: Add Scoping Attribute
```html
<!-- Mobile -->
<button class="active" data-tab="dashboard" data-nav="mobile">📊 Dashboard</button>

<!-- Desktop -->
<button class="active" data-tab="dashboard" data-nav="desktop">📊 Dashboard</button>
```

### Apply to ALL tabs:
- [ ] get-started (if it exists)
- [ ] dashboard
- [ ] chat
- [ ] vscode
- [ ] grafana
- [ ] rag
- [ ] profiles
- [ ] infrastructure
- [ ] admin

### Update JS selectors (if needed)
Search for: `querySelectorAll('[data-tab="`)
Update to: `querySelectorAll('[data-tab="'][data-nav="desktop"]')`

Or better, hide mobile nav by default and only show visible tabs.

### Test
```bash
npx playwright test tests/gui/wave3-smoke.spec.ts -g "Test 1"
npx playwright test tests/gui/wave3-smoke.spec.ts -g "Test 6"
```

✅ **DONE when:** Both Test 1 and Test 6 PASS

---

## Blocker 2: Fix 243 Duplicate IDs ⏱️ 60 min

### Problem
All onboarding form IDs appear twice (mobile + desktop)

### Examples
- `id="onboard-welcome"` (appears 2×)
- `id="onboard-source"` (appears 2×)
- `id="onboard-folder-mode"` (appears 2×)
- ... and 240 more

### Strategy 1: Remove Duplicates (Recommended if possible)
- [ ] Check if mobile nav needs full onboarding content
- [ ] If not, remove duplicate section from mobile nav
- [ ] Keep only desktop version

### Strategy 2: Scope IDs (If both needed)
```html
<!-- Mobile -->
<div id="mobile-onboard-welcome">...</div>

<!-- Desktop -->
<div id="desktop-onboard-welcome">...</div>
```

### Find all duplicates
```bash
# List all duplicate IDs
grep -o 'id="[^"]*"' /Users/davidmontgomery/agro-rag-engine/gui/index.html | \
  sort | uniq -d
```

### Fix systematically
- [ ] Search for each duplicate ID
- [ ] Decide: Remove or scope?
- [ ] Update all references in JavaScript (if any)
- [ ] Update label `for` attributes (if any)

### Test
```bash
npx playwright test tests/gui/wave3-smoke.spec.ts -g "Test 3"
```

✅ **DONE when:** Test 3 PASS (0 duplicates found)

---

## Blocker 3: Complete Infrastructure Consolidation ⏱️ 45 min

### Expected: 6 sections
✅ Services
❌ MCP Servers
❌ Paths & Endpoints
✅ Performance
✅ Usage
✅ Tracing

### Location
Line 4115:
```html
<!-- MCP Servers (from devtools-integrations) -->
<div class="settings-section">
    <h3>Git Hooks (Auto-Index)</h3>  ← WRONG CONTENT!
```

### Fix
- [ ] Find original MCP Servers content from devtools-integrations tab
- [ ] Replace "Git Hooks" section with MCP Servers content
- [ ] Add Paths & Endpoints section (from devtools-paths tab)
- [ ] Ensure all 6 sections visible in Infrastructure tab

### Where to find source content
Search old tab content:
```bash
# Find MCP Servers original content
grep -A50 "MCP Servers" /Users/davidmontgomery/agro-rag-engine/gui/index.html | head -60

# Find devtools-integrations tab (if still exists)
grep -A100 'data-tab="devtools-integrations"' /Users/davidmontgomery/agro-rag-engine/gui/index.html
```

### Test
```bash
npx playwright test tests/gui/wave3-smoke.spec.ts -g "Test 2"
```

✅ **DONE when:** Test 2 PASS (6/6 sections found)

---

## Blocker 4: Fix RAG Subtabs Visibility ⏱️ 30 min

### Location
Line 2235:
```html
<button data-subtab="data-quality" class="active">Data Quality</button>
```

### Problem
Subtabs exist but are invisible (Playwright error: "element is not visible")

### Debug Steps
1. [ ] Find parent container of RAG subtabs
2. [ ] Check CSS for:
   - `display: none`
   - `visibility: hidden`
   - `opacity: 0`
   - `height: 0`
3. [ ] Verify RAG tab activation shows subtabs

### Likely Causes
- RAG subtab container has `display: none` by default
- Needs JavaScript to show when RAG tab clicked
- CSS class missing to make visible

### Find the container
```bash
grep -B20 'data-subtab="data-quality"' /Users/davidmontgomery/agro-rag-engine/gui/index.html | head -25
```

### Check if JavaScript shows/hides
Search for: `subtab` in JavaScript files
```bash
grep -r "subtab" /Users/davidmontgomery/agro-rag-engine/gui/js/
```

### Test Manually
1. Open http://127.0.0.1:8012/gui/index.html
2. Click RAG tab
3. Check if subtabs appear
4. Open DevTools, inspect subtab buttons
5. Check computed CSS styles

### Test Automated
```bash
npx playwright test tests/gui/wave3-smoke.spec.ts -g "Test 4"
```

✅ **DONE when:** Test 4 PASS (6/6 subtabs working)

---

## Blocker 5: Fix Console Errors ⏱️ 15 min

### Errors Found
1. 404 Not Found (×2)
2. "Unexpected token 'export'" (ES6 syntax error)

### Find 404s
Open browser console:
1. Go to http://127.0.0.1:8012/gui/index.html
2. Open DevTools (F12)
3. Check Console and Network tabs
4. Look for red 404 errors
5. Identify missing files

### Fix 404s
- [ ] Check file paths in `<script src="...">`
- [ ] Check file paths in `<link href="...">`
- [ ] Verify files exist on disk
- [ ] Fix paths or add missing files

### Fix ES6 "export" Error
Find script with ES6 syntax:
```bash
grep -n "export " /Users/davidmontgomery/agro-rag-engine/gui/js/*.js
```

Fix by adding `type="module"`:
```html
<!-- Before -->
<script src="/gui/js/module.js"></script>

<!-- After -->
<script type="module" src="/gui/js/module.js"></script>
```

### Test
```bash
npx playwright test tests/gui/wave3-smoke.spec.ts -g "Test 5"
```

✅ **DONE when:** Test 5 PASS (0 console errors)

---

## Final Verification

### Run Full Test Suite
```bash
npx playwright test tests/gui/wave3-smoke.spec.ts --reporter=list
```

### Expected Output
```
✅ Test 1: All 9 Tabs Load Without Errors - PASS
✅ Test 2: Infrastructure Consolidation Worked - PASS
✅ Test 3: No Duplicate Form IDs - PASS
✅ Test 4: RAG Subtabs All Work - PASS
✅ Test 5: Console Clean (No Red Errors) - PASS
✅ Test 6: Performance Check (Tab Switching) - PASS

6 passed (6)
```

### Manual Smoke Test
1. [ ] Open http://127.0.0.1:8012/gui/index.html
2. [ ] Click each of 9 tabs - all load
3. [ ] Click Infrastructure - see 6 sections
4. [ ] Click RAG - see 6 subtabs, click each one
5. [ ] Check console - no red errors
6. [ ] Tab switching feels fast

---

## When All Tests Pass

### Update Status
Create file: `WAVE3_FIXED.md`
```markdown
# Wave 3 Fixes Complete

Date: [DATE]
Agent: Agent 1

All 5 blockers fixed:
✅ Blocker 1: Duplicate navigation - FIXED
✅ Blocker 2: 243 duplicate IDs - FIXED
✅ Blocker 3: Infrastructure incomplete - FIXED
✅ Blocker 4: RAG subtabs invisible - FIXED
✅ Blocker 5: Console errors - FIXED

Test results: 6/6 PASS

Ready for Wave 4.
```

### Commit Changes
```bash
git add gui/index.html
git commit -m "fix(wave3): resolve 5 critical blockers

- Add data-nav scoping to prevent duplicate selectors
- Remove/scope 243 duplicate form IDs
- Complete Infrastructure section (add MCP Servers, Paths)
- Fix RAG subtabs visibility
- Resolve console errors (404s, ES6 syntax)

All Wave 3 smoke tests now pass (6/6)

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### Notify Orchestrator
"Wave 3 fixes complete. All 6 smoke tests passing. Ready for Wave 4 approval."

---

## If Stuck

### Escalate to Sonnet 4
- Document what you tried
- Show test output
- Ask for guidance

### Need Help Debugging
Use AGRO RAG (save tokens!):
```bash
curl -X POST http://127.0.0.1:8012/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "how do I fix duplicate navigation in the GUI?"}'
```

Remember to rate the response 1-5!

---

**Good luck! Fix the foundation before building higher.** 🛠️
