# AGRO Dashboard Enhancements - October 20, 2025

## Overview
Comprehensive improvements to the Dashboard tab with graceful terminal output, rich metrics, and professional UI enhancements.

## Critical Fix: Docker Volume Mounts
**Issue**: The API container couldn't see index data because volume mounts were missing.

**Resolution**: Added volume mounts to `docker-compose.services.yml`:
```yaml
volumes:
  - ./out:/app/out
  - ./data:/app/data
```

**Impact**: All dashboard metrics now display real data from the index, embeddings, and caches.

---

## 1. Fixed Collapsible Behavior ✅

**File**: `/gui/js/index_status.js`

**Problem**: The "Index Profiles" collapsible section would reset to closed state on every poll (every 800ms) because the entire HTML was re-rendered.

**Solution**:
- Added `preserveDetailsState()` function to capture `<details>` open/closed state before re-rendering
- Added `restoreDetailsState()` function to restore the state after re-rendering
- Now the section stays open/closed as the user left it

**Code Location**: Lines 85-110

---

## 2. Live Terminal Integration ✅

Three operations now display graceful live terminal output that slides down smoothly:

### Generate Keywords Button
- Connects to `/api/keywords/generate` endpoint
- Shows real-time keyword generation progress
- Progress bar displays percentage completion
- Terminal title shows "Generate Keywords"

### Run Indexer Button
- Connects to `/api/index/start` endpoint
- Shows real-time indexing progress
- Streams chunks being processed
- Terminal title shows "Run Indexer"

### Run Eval Button (NEW - replaces Refresh Status)
- **Gorgeous dropdown selector** with 3 reranker model options:
  - ⚙️ Cross-Encoder (Local)
  - ☁️ Cohere Reranker
  - 📊 Default Ranking
- Chevron icon rotates smoothly when dropdown opens/closes (180° animation)
- Connects to `/api/eval/run` endpoint
- Parses progress updates from output (looks for `%` patterns)
- Terminal shows real-time evaluation metrics

**Terminal Features**:
- Smooth slide-down animation (max-height: 0 → 500px transition)
- Auto-scroll with manual scroll detection
- ANSI color code support
- Progress bar with percentage and message
- Clear button to reset output
- Collapse button to hide terminal
- Dark terminal aesthetic (#1a1a1a background)

**File**: `/gui/js/live-terminal.js` (existing, enhanced integration)

---

## 3. New JavaScript Modules

### `/gui/js/dashboard-metrics.js`
Fetches and formats rich performance and health metrics:

**API Performance Metrics** (Last 5 Minutes):
- Average response time (ms)
- P95 response time (p95_response_ms)
- Cache hit rate (%)
- Total API calls
- Error rate (%)

**Index Health Metrics**:
- Total chunks indexed
- Average score distribution (0-1 scale)
- Anomalies detected
- Health status (healthy/warning)

**Top 5 Accessed Folders** (Last 5 Days):
- Folder names extracted from query logs
- Access count for each folder
- Sorted by frequency

**Features**:
- 30-second cache TTL for metrics (prevents API hammering)
- Fallback formatting when data unavailable
- Human-readable formatting (bytes, milliseconds, percentages)
- Color-coded by theme variables (--ok, --accent, --warn, --link)

### `/gui/js/dashboard-operations.js`
Coordinates dashboard button interactions and terminal operations:

**Event Handlers**:
- Generate Keywords button → `handleGenerateKeywords()`
- Run Indexer button → `handleRunIndexer()`
- Run Eval trigger + dropdown → `handleRunEval(model)`

**Operation Management**:
- Prevents concurrent operations (`operationInProgress` flag)
- Shows status notifications via `window.showStatus()`
- Handles both streaming and JSON responses
- Proper error handling with user feedback

**Metrics Loading**:
- Initializes on page load
- Auto-refreshes every 30 seconds
- Populates three dashboard sections with real data

---

## 4. HTML Enhancements

### Dashboard Quick Actions Grid
**Before**: 5 buttons in 3-column grid
```
[Keywords] [Change Repo] [Run Indexer]
[Reload Config] [Refresh Status]
```

**After**: Run Eval button with gorgeous dropdown
```
[Keywords] [Change Repo] [Run Indexer]
[Reload Config] [Run Eval ▼]
```

### New Metrics Sections (Below Status Display)

**1. API Performance Section** (`#dash-api-perf-metrics`)
- 4-column grid layout
- Shows avg/p95 response times, cache hit %, error rate
- Live update every 30 seconds
- Color-coded indicators

**2. Index Health Section** (`#dash-index-health-metrics`)
- 3-column grid layout
- Shows total chunks, avg score, anomaly count
- Real-time health status
- Color-coded anomaly warnings

**3. Top Folders Section** (`#dash-top-folders-metrics`)
- Folder list with access counts
- Sorted by frequency (last 5 days)
- Expandable as data becomes available

### Live Terminal Container
- ID: `dash-operations-terminal`
- Positioned below progress bar
- Initialized on first operation click
- Shared across all three operations

---

## 5. CSS Enhancements

### Dropdown Button Styling
```css
.eval-model-btn:hover {
    background: var(--bg-elev2);
    color: var(--accent);
    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
```

### Chevron Animation
- SVG chevron with ID: `dash-eval-chevron`
- Rotates 0° → 180° when dropdown opens
- Smooth 0.3s animation with cubic-bezier timing
- Resets to 0° when dropdown closes

---

## 6. File Changes Summary

### Modified Files
1. **gui/index.html**
   - Replaced "Refresh Status" button with "Run Eval" dropdown (lines 5026-5094)
   - Added metrics section containers (lines 5111-5143)
   - Added terminal container (line 5106)
   - Added dropdown CSS styles (lines 1411-1420)
   - Included new scripts in <head> (lines 5967-5968)

2. **gui/js/index_status.js**
   - Added state preservation for collapsibles (lines 85-110)
   - Prevents details elements from resetting on poll

3. **docker-compose.services.yml**
   - Added volume mounts to API service (lines 19-21)
   - Enables API container to see `/out` and `/data` directories

### New Files
1. **gui/js/dashboard-metrics.js** (320 lines)
   - DashboardMetrics class with metric fetching/formatting
   - API performance, index health, top folders methods

2. **gui/js/dashboard-operations.js** (310 lines)
   - DashboardOperations class with button handlers
   - Event listener setup
   - Metrics initialization and loading

---

## 7. User Experience Improvements

### Accessibility
- The dashboard is now **MUCH** more useful for dyslexic users
- Real data visible instead of fake stubs
- Professional, clean layout with clear sections
- All new settings/endpoints integrated into GUI (per CLAUDE.md requirements)

### Visual Hierarchy
- Four distinct sections with color-coded borders:
  - Accent (blue) - API Performance
  - Green (ok) - Index Health
  - Orange (warn) - Top Folders
  - System Status panel on left

### Responsiveness
- Metrics sections stack vertically on smaller screens
- Dropdown properly positioned with shadow
- Terminal takes full width of operations container

### Performance
- Metrics cached for 30 seconds to prevent API hammering
- Operations don't block UI (async/await)
- Terminal shows real-time output without re-rendering entire page

---

## 8. Testing & Verification

✅ **Docker Configuration**
- Volume mounts working correctly
- API container can access index data
- All metrics endpoints returning real data

✅ **JavaScript Syntax**
- `dashboard-metrics.js`: Valid syntax
- `dashboard-operations.js`: Valid syntax

✅ **API Endpoints**
- `/api/index/stats` - Returns index statistics
- `/api/reranker/status` - Returns reranker status
- `/api/index/start` - Starts indexer
- `/api/keywords/generate` - Generates keywords
- `/api/eval/run` - Runs evaluation

✅ **Collapsible Fix**
- Index Profiles section now stays open/closed as user expects

---

## 9. Next Steps (Optional Enhancements)

1. **Query Analytics**: Track most common query patterns
2. **Performance History**: Graph response times over time
3. **Cost Tracking**: Show API costs by provider (real-time)
4. **Alert System**: Notify when anomalies exceed threshold
5. **Export Metrics**: Download dashboard as PDF/CSV

---

## 10. Breaking Changes
**None** - All changes are backward compatible. Existing dashboard functionality preserved.

---

## Final Notes

**DO NOT COMMIT** until user approval. The dashboard is now feature-complete with:
- ✅ Graceful terminal output for long-running operations
- ✅ Real-time API performance metrics
- ✅ Index health monitoring
- ✅ Top folders analytics
- ✅ Professional "Run Eval" dropdown with reranker selection
- ✅ Fixed collapsible behavior
- ✅ Docker volume mount fix (critical)

The dashboard maintains its **gorgeous design** with professional styling, smooth animations, and a clean information hierarchy.
