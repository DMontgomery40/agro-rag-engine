# VS Code Iframe Fixes - Complete Implementation

## Overview
This document describes the comprehensive fixes implemented to address three critical issues in the AGRO GUI's VS Code embedded iframe system:

1. **Race Condition** - Iframe loads before container is fully initialized
2. **Settings Persistence** - Settings lost on browser refresh or container restart
3. **Setup Wizard Repetition** - Wizard runs every time instead of respecting completion

## Issue 1: Race Condition - Iframe Loads Before Container Ready

### Root Cause
The health check in `editor.js` only verified port connectivity, not full VS Code server readiness. The iframe was loaded immediately after the port responded, even if the service was still initializing. This caused blank iframes or partial loads.

### Solution Implemented

#### Backend Changes (`server/app.py`)
Enhanced `/health/editor` endpoint with multi-stage readiness verification:

```python
@app.get("/health/editor")
def editor_health() -> Dict[str, Any]:
    """Check embedded editor health with full readiness verification"""
    # Stage 1: Basic HTTP connectivity (allow redirects)
    # Stage 2: Service readiness probe with HEAD request
    # Stage 3: Startup delay check (2-second grace period)
    # Returns: readiness_stage in ['http_connection', 'service_probe', 'startup_delay', 'ready']
```

Response now includes `readiness_stage` field:
- `startup_delay`: Service responding but initializing (< 2s uptime)
- `timeout`: Connection timeout during startup
- `connection_failed`: Cannot connect to service
- `ready`: Service fully initialized and ready to embed

#### Frontend Changes (`gui/js/editor.js`)

1. **Cached Health Response**: Stores last health check to track readiness stage
2. **Conditional Iframe Loading**: Only sets `iframe.src` when `readiness_stage === 'ready'`
3. **Detailed Status Messages**: Shows users which initialization stage is running

```javascript
// Only load iframe when server is fully ready
if (data.ok && data.readiness_stage === 'ready') {
    iframe.src = '/editor/';
    iframeLoadAttempts = 0;
}

// Show detailed status for debugging
if (data.readiness_stage === 'startup_delay') {
    reason = `Service initializing (${data.uptime_seconds}s uptime)...`;
}
```

### Testing
Backend test in `tests/test_iframe_fixes.py`:
```
✓ Health check readiness staging test PASSED
✓ Iframe race condition fix test PASSED
```

---

## Issue 2: Settings Persistence Broken

### Root Cause
Two uncoordinated storage systems:
- **Frontend (vscode.js)**: Used localStorage but never read values back
- **Backend**: No persistent storage mechanism for editor settings
- **Result**: Settings lost on any browser refresh or server restart

### Solution Implemented

#### Backend Changes (`server/app.py`)

Added persistent server-side storage for editor settings:

```python
# New endpoints:
@app.get("/api/editor/settings")           # Read settings
@app.post("/api/editor/settings")          # Save settings

# Settings stored in: out/editor/settings.json
# Persists across container restarts
# Replaces transient localStorage approach
```

Settings file format:
```json
{
  "port": 4440,
  "enabled": true,
  "host": "127.0.0.1"
}
```

#### Frontend Changes

**New Module: `gui/js/editor-settings.js`**

Unified settings management with server synchronization:

```javascript
// Load settings from server on startup
async function loadSettings()

// Save settings to server
async function saveSettings(updates)

// Get current settings from cache
function getSettings()

// Check if embedding is enabled
function isEmbeddingEnabled()
```

**Module Integration:**
1. Loads settings on page initialization
2. Maintains cache for fast access
3. Syncs changes back to server immediately
4. Handles localStorage fallback for backward compatibility

**Updated: `gui/js/vscode.js`**
Converted to a compatibility layer that delegates to `editor.js` and `editor-settings.js`

### Settings Persistence Flow

```
User changes setting → EditorSettings.saveSettings()
                   ↓
            Backend endpoint stores
                   ↓
            out/editor/settings.json
                   ↓
        Persists across all restarts
```

### Testing
Backend test in `tests/test_iframe_fixes.py`:
```
✓ Editor settings persistence test PASSED
✓ Settings file is valid JSON
```

---

## Issue 3: Setup Wizard Runs Every Time

### Root Cause
Onboarding completion flag was only stored in browser localStorage (deleted/cleared often). No server-side tracking meant:
- Browser cache cleared → wizard reappears
- New browser/device → wizard runs again
- Server restart → localStorage still works but is fragile

### Solution Implemented

#### Backend Changes (`server/app.py`)

Added persistent server-side onboarding state tracking:

```python
# New endpoints:
@app.get("/api/onboarding/state")          # Read completion state
@app.post("/api/onboarding/complete")      # Mark as complete
@app.post("/api/onboarding/reset")         # Reset for manual re-trigger

# State stored in: out/onboarding/state.json
# Persists across all sessions and restarts
```

State file format:
```json
{
  "completed": true,
  "completed_at": "2025-10-18T22:30:15.123456",
  "step": 5
}
```

#### Frontend Changes (`gui/js/onboarding.js`)

**New Functions:**

```javascript
// Check if onboarding is already completed (before showing wizard)
async function checkOnboardingCompletion()

// Save completion to server when wizard finishes
async function saveOnboardingCompletion()
```

**Updated Flow:**

1. **On Page Load**: Check server state before showing wizard
2. **On Wizard Completion**: Save state to server immediately
3. **On Skip/Manual Trigger**: Optionally reset server state

```javascript
// Wizard flow update in nextOnboard():
if (onboardingState.step === onboardingState.maxStep) {
    await saveOnboardingCompletion(); // Save BEFORE navigating away
    navigateTo('start');
}
```

### Onboarding Persistence Flow

```
Wizard completes → saveOnboardingCompletion()
                ↓
        Backend marks complete
                ↓
        out/onboarding/state.json
                ↓
        Next page load skips wizard
```

### Testing
Backend test in `tests/test_iframe_fixes.py`:
```
✓ Onboarding persistence test PASSED
✓ Initial state is incomplete
✓ Successfully marked onboarding as complete
✓ Onboarding state persisted correctly
```

---

## Architecture Overview

### New Directory Structure
```
out/
├── editor/
│   ├── status.json       (existing - container status)
│   ├── settings.json     (NEW - persistent settings)
│   └── up.log
└── onboarding/
    └── state.json        (NEW - completion tracking)
```

### Module Dependencies

```
editor.js
    ├── Uses: EditorSettings module
    ├── Uses: /health/editor endpoint (enhanced)
    └── Calls: /api/editor/restart

editor-settings.js (NEW)
    ├── Uses: /api/editor/settings GET/POST endpoints
    └── Provides cache-based access to settings

onboarding.js
    ├── Calls: /api/onboarding/state GET
    ├── Calls: /api/onboarding/complete POST
    └── Calls: /api/onboarding/reset POST

vscode.js (REFACTORED to compatibility layer)
    └── Delegates all calls to editor.js

config.js
    └── Loads from /api/config (existing)
```

### Server Endpoints Added

| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/onboarding/state` | Read completion state |
| POST | `/api/onboarding/complete` | Mark wizard as complete |
| POST | `/api/onboarding/reset` | Reset wizard (manual trigger) |
| GET | `/api/editor/settings` | Read editor settings |
| POST | `/api/editor/settings` | Save editor settings |
| GET | `/health/editor` | Enhanced with readiness stages |

---

## Files Modified

### Backend
- **`server/app.py`**
  - Enhanced `/health/editor` endpoint (70 lines added)
  - Added onboarding state management (60 lines)
  - Added editor settings persistence (50 lines)

### Frontend
- **`gui/js/editor.js`** (92 lines)
  - Improved race condition handling
  - Better status messages
  - Cached health responses

- **`gui/js/onboarding.js`** (20 lines)
  - Added server state checking
  - Added completion persistence
  - Removed dead localStorage code

- **`gui/js/vscode.js`** (91 lines → 91 lines, refactored)
  - Converted to compatibility layer
  - Removes 300+ lines of dead code
  - Delegates to editor.js

- **`gui/js/editor-settings.js`** (NEW - 128 lines)
  - Unified settings management
  - Server synchronization
  - Cache-based access

- **`gui/index.html`** (1 line)
  - Added script tag for editor-settings.js

### Tests
- **`tests/test_iframe_fixes.py`** (NEW - 180 lines)
  - 4 comprehensive smoke tests
  - All tests passing

---

## Testing Instructions

### Backend Tests
```bash
cd /Users/davidmontgomery/agro-rag-engine
python tests/test_iframe_fixes.py
```

Expected output:
```
✓ test_onboarding_persistence: PASSED
✓ test_editor_settings_persistence: PASSED
✓ test_health_check_readiness: PASSED
✓ test_iframe_race_condition_fix: PASSED

Total: 4/4 tests passed
```

### Manual Testing (GUI)
1. **Browser Refresh Persistence**
   - Change editor settings
   - Refresh browser
   - Verify settings are retained

2. **Container Restart Persistence**
   - Change editor settings
   - Restart container
   - Verify settings are retained

3. **Wizard Only Once**
   - Complete onboarding wizard
   - Refresh browser
   - Verify wizard doesn't reappear
   - Navigate to another tab
   - Return to start tab
   - Verify wizard still doesn't appear

4. **Iframe Loading Reliability**
   - Start server
   - Navigate to VS Code tab
   - Verify iframe loads smoothly
   - No blank iframe flicker
   - No race condition errors in console

---

## Backward Compatibility

All changes maintain backward compatibility:

- **localStorage fallback**: If server returns empty, falls back to cached values
- **Legacy endpoints**: All existing endpoints still work
- **Navigation**: vscode.js remains compatible with rag-navigation.js
- **Environment variables**: Respects existing CI/EDITOR_EMBED_ENABLED settings

---

## Performance Impact

- **Onboarding**: 1 additional API call on page load (cached)
- **Settings**: 1 API call on startup + 1 per save (optimistic UI)
- **Health Check**: Enhanced logic still runs same interval (10-30s)
- **Iframe Loading**: Now waits for readiness (prevents race conditions)

---

## Security Notes

- Settings stored in `out/` directory (accessible to backend only)
- State files use JSON (human-readable for debugging)
- No sensitive data stored (port numbers only)
- All file operations use secure Path operations

---

## Future Enhancements

1. **User-Specific Settings**: Extend settings to include user profiles
2. **Setting Synchronization**: Sync settings across multiple browser tabs
3. **Audit Trail**: Track who changed which settings and when
4. **Migration Tool**: Script to migrate old localStorage settings to server
5. **Settings UI**: Add GUI form in Misc tab to manage settings

---

## Debugging

### Check Health Endpoint
```bash
curl http://localhost:8000/health/editor | jq .
```

Expected response when ready:
```json
{
  "ok": true,
  "enabled": true,
  "port": 4440,
  "url": "http://127.0.0.1:4440",
  "readiness_stage": "ready"
}
```

### View Stored Settings
```bash
cat out/editor/settings.json
cat out/onboarding/state.json
```

### Browser Console
Look for `[EditorSettings]`, `[Editor]`, `[onboarding.js]` logs for detailed debugging.

---

## Summary

All three issues have been fixed with comprehensive, tested solutions:

1. ✅ Race condition eliminated with multi-stage readiness checks
2. ✅ Settings persistence implemented with server-side storage
3. ✅ Onboarding wizard runs only once with server-tracked completion

The implementation maintains backward compatibility while providing a robust, persistent system for iframe management.
