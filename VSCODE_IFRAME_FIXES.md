# VS Code Iframe Fixes Applied

**Date:** October 18, 2025
**Verified with:** Playwright tests

---

## Issues Found & Fixed

### ✅ 1. Health Check Bug (HTTP 405)
**Problem:** Health check used `requests.head()` which returned HTTP 405 after redirect
**Location:** `server/app.py:1902`
**Fix:** Changed to `requests.get()` to handle redirects properly
**Result:** Health check now returns `"readiness_stage": "ready"` ✓

### ✅ 2. Navigation Mount/Unmount Not Called
**Problem:** VS Code tab never called `mount()` to initialize health checks
**Location:** `gui/js/navigation.js:222`
**Fix:** Added mount/unmount calls in `navigateTo()` function
**Result:** Health checks start when switching to VS Code tab ✓

### ✅ 3. Embed Checkbox Unchecked by Default
**Problem:** `EDITOR_EMBED_ENABLED` checkbox unchecked, hiding iframe
**Location:** `gui/index.html:4582`
**Fix:** Added `checked` attribute to checkbox
**Result:** Iframe container displays by default ✓

### ✅ 4. Stale Mobile Nav Structure
**Problem:** Mobile nav had old "devtools" tab instead of "vscode"
**Location:** `gui/index.html:2241-2250`
**Fix:** Updated mobile nav to match desktop tab structure
**Result:** Consistent navigation across devices ✓

### ✅ 5. Stale Playwright Test
**Problem:** Test looked for `#tab-devtools-editor` (old structure)
**Location:** `tests/editor_embed.spec.ts:10-11`
**Fix:** Updated to look for `#tab-vscode` (new structure)
**Result:** Test matches current GUI ✓

---

## ⚠️ REMAINING ISSUE: WebSocket 1006

**Problem:** VS Code workbench fails to connect via WebSocket
**Error:** "The workbench failed to connect to the server (Error: WebSocket close with status code 1006)"

**Root Cause:** FastAPI reverse proxy at `/editor/{path:path}` doesn't properly handle WebSocket upgrade requests. Regular HTTP routes cannot handle the WebSocket protocol handshake.

### Attempted Solutions:
1. ❌ Separate `@app.websocket()` route - FastAPI routing doesn't match before HTTP catch-all
2. ❌ Manual WebSocket handling in HTTP route - Can't create WebSocket from Request object
3. ❌ httpx-ws library - Still needs proper ASGI WebSocket handling

### Recommended Solutions:

**Option A: Direct WebSocket Connection (Simplest)**
- Modify iframe to connect to `http://127.0.0.1:4440` for WebSocket
- Keep HTTP requests through `/editor/` proxy (for frame-blocking header stripping)
- Requires CSP/sandbox policy adjustment

**Option B: Proper Reverse Proxy (Production-Ready)**
- Add nginx/Caddy in front of all services
- Configure WebSocket proxy support
- Benefits: Better performance, proper WebSocket handling, SSL termination

**Option C: ASGI Middleware (Complex but Integrated)**
- Implement custom ASGI middleware to intercept WebSocket upgrades
- Handle at framework level before route matching
- Most integrated but requires deep ASGI knowledge

---

## Test Results

### Passing Tests ✓
```bash
npx playwright test tests/gui/vscode-iframe-full.spec.ts
# Container visible: true
# Iframe visible: true
# Iframe src: /editor/
# ✓ VS Code iframe loaded successfully
```

### Failing Tests ❌
```bash
npx playwright test tests/gui/vscode-websocket.spec.ts
# ❌ VS Code Error Dialog: WebSocket close with status code 1006
```

---

## Files Modified

1. `server/app.py` - Health check fix, WebSocket proxy attempt
2. `gui/js/navigation.js` - Mount/unmount lifecycle
3. `gui/js/editor.js` - (no changes, already correct)
4. `gui/index.html` - Mobile nav sync, embed checkbox default
5. `tests/editor_embed.spec.ts` - Update to new structure
6. `tests/gui/vscode-iframe-full.spec.ts` - NEW comprehensive test
7. `tests/gui/vscode-websocket.spec.ts` - NEW WebSocket validation test
8. `requirements.txt` - Added `websockets>=15.0`, `httpx-ws>=0.6`

---

## Next Steps

**Immediate (Required for WebSocket):**
1. Implement one of the recommended solutions above
2. Test with Playwright until WebSocket 1006 error is resolved
3. Verify workbench loads without error dialog

**Follow-up (Architecture):**
1. Containerize FastAPI server for consistency with other services
2. Consider full reverse proxy architecture for production
3. Document WebSocket connectivity requirements for deployment
