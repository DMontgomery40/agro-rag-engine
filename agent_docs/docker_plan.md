# Plan: Fix Docker Settings Zustand/Pydantic Compliance

---

## BLOCKER: Docker API Architecture Issue (Added 2025-12-04 02:45)

### Current Symptom
Docker API returns `{"running":false,"runtime":"Unknown","containers_count":0}` despite Docker being fully operational with 10+ containers.

### Root Cause: The "HOME" Identity Crisis

The `.env` file contains `HOME=/root` (generated from inside a Docker container), which gets loaded by `config_registry.py` with `override=True`, overwriting the real user HOME.

When `docker.py` runs `subprocess.run(["docker", "info", ...])`, the subprocess inherits `HOME=/root` and cannot find `~/.docker/config.json` which contains the Docker context configuration (e.g., Colima socket location).

### Three Competing Definitions of HOME

| Context | HOME Value | Purpose |
|---------|-----------|---------|
| **User's macOS shell** | `/Users/davidmontgomery` | Contains `~/.docker/config.json` with `"currentContext": "colima"` |
| **`.env` file** | `/root` | Intended for Docker container's root user |
| **Docker container** | `/root` or `/app` | Ephemeral container filesystem |

### Why This Matters for Data Persistence

**Permanent data (mounted volumes):**
- Vector database: `./data/qdrant:/qdrant/storage`
- Redis: `redis_data:/data`
- User config: `./agro_config.json:/app/agro_config.json`

**Ephemeral data (lost on restart):**
- Container HOME (`/root`)
- Anything not in mounted volumes

The `.env` file IS permanent (mounted), but was generated INSIDE a container, so it has container-specific values that break host execution.

### Platform Considerations

| Platform | Docker Socket Location | Context Config |
|----------|----------------------|----------------|
| **macOS + Colima** | `~/.colima/default/docker.sock` | `~/.docker/config.json` |
| **macOS + Docker Desktop** | `/var/run/docker.sock` | Auto-detected |
| **macOS + Rancher Desktop** | `~/.rd/docker.sock` | `~/.docker/config.json` |
| **Linux native** | `/var/run/docker.sock` | Not needed |

### Proposed Solutions (In Order of Preference)

#### Solution A: Protect System Env Vars (Quick Fix)
In `config_registry.py`, save and restore HOME/USER/PATH before loading .env:
```python
_PROTECTED = {'HOME', 'USER', 'PATH', 'SHELL'}
_saved = {k: os.environ.get(k) for k in _PROTECTED}
load_dotenv(override=True)
for k, v in _saved.items():
    if v: os.environ[k] = v
```

#### Solution B: Use Python Docker SDK (Recommended)
Replace subprocess calls with `docker` Python package (already in requirements.txt):
```python
import docker
client = docker.from_env()  # Auto-discovers socket
info = client.info()
containers = client.containers.list()
```

#### Solution C: Make DOCKER_HOST Configurable
Add to Pydantic model and GUI:
```python
class DockerConfig(BaseModel):
    docker_host: Optional[str] = None  # e.g., unix:///var/run/docker.sock
```

### Steps Already Tried (Chronological)

| Step | What | Result |
|------|------|--------|
| 1 | Added `_DOCKER_BIN` path resolution for macOS | Fixed "docker not found", but still 0 containers |
| 2 | Created debug endpoint `/api/docker/debug` | Revealed `HOME=/root` from .env |
| 3 | Proposed `_SUBPROCESS_ENV` with `pwd.getpwuid()` | User rejected: "not every user is colima" |
| 4 | Proposed Colima socket auto-detection | User rejected: platform-specific |
| 5 | Colima crashed and restarted | Docker works, API still broken |
| 6 | Proposed passing `env=_SUBPROCESS_ENV` to subprocess | User paused: requested architectural plan |

### The Unified Solution: Python Docker SDK

**Why this is the right answer:**

1. **Already a dependency** - `docker>=6.1.0` in requirements.txt
2. **Handles ALL platforms automatically** - SDK discovers socket location
3. **Works identically in container AND on host** - No HOME confusion
4. **No subprocess PATH/HOME issues** - Pure Python API
5. **Better error handling** - Typed exceptions

**Implementation approach:**
```python
# server/routers/docker.py
import docker

def _get_client():
    """Get Docker client - works in container or on host."""
    return docker.from_env()

@router.get("/api/docker/status")
def docker_status():
    try:
        client = _get_client()
        info = client.info()
        running = client.containers.list()
        return {
            "running": True,
            "runtime": f"Docker {info['ServerVersion']}",
            "containers_count": len(running),
        }
    except docker.errors.DockerException as e:
        return {"running": False, "runtime": "Unknown", "error": str(e), "containers_count": 0}
```

**Why subprocess approach was doomed:**
- Subprocess inherits corrupted `os.environ` (HOME=/root)
- Docker CLI reads `~/.docker/config.json` for context
- With HOME=/root, it looks for `/root/.docker/config.json` which doesn't exist
- Even if we fix HOME, different platforms have different socket locations

**Why SDK approach succeeds:**
- SDK checks DOCKER_HOST env var first
- Then checks multiple socket locations in order
- Doesn't depend on `~/.docker/config.json` for socket discovery
- Works transparently across Colima, Docker Desktop, native Linux

### Files to Modify for Docker SDK Migration

| File | Change |
|------|--------|
| `server/routers/docker.py` | Rewrite all endpoints to use `docker` SDK |
| (none others needed) | SDK handles everything else |

### Recommended Path Forward
1. **Rewrite `docker.py`** to use Python Docker SDK (15 endpoints, ~30min)
2. **Test locally** with uvicorn
3. **Test in container** with rag-service-api
4. **Verify DockerSubtab** shows containers correctly
5. **Playwright smoke test**

---

## Problem Summary

The `/web/src/components/Settings/Docker.tsx` component is out of compliance:

| Issue | Status | Location |
|-------|--------|----------|
| Docker Pydantic model | COMPLETE | `server/models/agro_config_model.py:1390-1440` |
| Docker in AgroConfigRoot | COMPLETE | `server/models/agro_config_model.py:1467` |
| to_flat_dict mapping | COMPLETE | `server/models/agro_config_model.py:1690-1696` |
| from_flat_dict mapping | COMPLETE | `server/models/agro_config_model.py:1929-1935` |
| AGRO_CONFIG_KEYS | COMPLETE | `server/models/agro_config_model.py:2143-2150` |
| agro_config.json docker section | COMPLETE | `agro_config.json:280-288` |
| Backend uses config | COMPLETE | `server/routers/docker.py:13-24` (_get_docker_config) |
| config_store.py schema | MISSING | `server/services/config_store.py:526-713` - No docker section |
| Docker.tsx settings UI | MISSING | Only shows container management, no config settings |
| useConfigStore integration | MISSING | Docker.tsx doesn't use Zustand config store |
| useTooltips integration | MISSING | No tooltips on any elements |
| useErrorHandler integration | MISSING | Uses raw alert() instead |
| useNotification integration | MISSING | No toast notifications |
| useUIHelpers integration | MISSING | No collapsible sections |
| TooltipIcon usage | MISSING | No tooltip icons |
| Tooltips in tooltips.js | MISSING | No DOCKER_* keys defined |

**7 Docker settings exist in backend but are invisible to users (ADA violation):**
- `DOCKER_STATUS_TIMEOUT` (1-30s)
- `DOCKER_CONTAINER_LIST_TIMEOUT` (1-60s)
- `DOCKER_CONTAINER_ACTION_TIMEOUT` (5-120s)
- `DOCKER_INFRA_UP_TIMEOUT` (30-300s)
- `DOCKER_INFRA_DOWN_TIMEOUT` (10-120s)
- `DOCKER_LOGS_TAIL` (10-1000 lines)
- `DOCKER_LOGS_TIMESTAMPS` (0/1)

## Available Infrastructure to Use

**Stores (Zustand):**
- `useConfigStore` (`web/src/stores/useConfigStore.ts:29`) - config, loadConfig, saveEnv, saving
- `useDockerStore` (`web/src/stores/useDockerStore.ts:24`) - already used for containers
- `useTooltipStore` (`web/src/stores/useTooltipStore.ts:67`) - tooltips map

**Hooks:**
- `useTooltips` (`web/src/hooks/useTooltips.ts:34`) - getTooltip, tooltips
- `useErrorHandler` (`web/src/hooks/useErrorHandler.ts:29`) - showAlert, handleApiError, createInline
- `useNotification` (`web/src/hooks/useNotification.ts:33`) - success, error, info notifications
- `useUIHelpers` (`web/src/hooks/useUIHelpers.ts:30`) - bindCollapsibleSections, showToast

**Components:**
- `TooltipIcon` (`web/src/components/ui/TooltipIcon.tsx:14`) - renders ? icon with tooltip bubble

**CSS/Styling (MUST USE):**
- `web/src/styles/tokens.css` - CSS variables (--bg, --fg, --accent, --line, --ring, etc.)
- `web/src/styles/micro-interactions.css` - hover/focus/active transitions, animations
- `web/src/styles/style.css` - `.settings-section`, `.input-group`, `.small-button`, etc.

**Key CSS Classes to Apply:**
- `.settings-section` - panel styling with hover shadow
- `.input-group` - label + input wrapper
- `.input-row` - grid layout for form fields
- `.small-button` - action buttons with hover lift
- `.loading-spinner` - for saving state
- `.toggle` / `.toggle-track` / `.toggle-thumb` - for boolean settings
- CSS variables: `--timing-fast`, `--ease-out`, `--shadow-sm`, `--ring`

**Micro-interactions from micro-interactions.css:**
- Button hover: `transform: translateY(-1px) scale(1.02)` + `box-shadow: var(--shadow-sm)`
- Button active: `transform: translateY(0) scale(0.98)`
- Input focus: `box-shadow: 0 0 0 3px var(--ring)` + `border-color: var(--accent)`
- Collapsible: smooth height/opacity transitions
- Success/error states: `.valid`, `.invalid` classes with animations

---

## Implementation Plan

### Step 1: Add Docker section to config_store.py schema

**File:** `server/services/config_store.py`

**Location:** Inside `config_schema()` function (lines 526-713)

**Changes:**
1. Add "docker" to schema["properties"] after line 628
2. Add "docker" to ui["order"] array at line 633
3. Add "docker" to ui["titles"] dict at lines 634-642
4. Add docker values from registry in values dict after line 699

---

### Step 2: Add Docker tooltips to tooltips.js

**File:** `web/src/modules/tooltips.js`

**Location:** Inside `buildTooltipMap()` function (line 37+)

**Add using L() function pattern for all 7 Docker config keys + UI elements:**
- `DOCKER_STATUS_TIMEOUT` - timeout for status check
- `DOCKER_CONTAINER_LIST_TIMEOUT` - timeout for container list
- `DOCKER_CONTAINER_ACTION_TIMEOUT` - timeout for start/stop/restart
- `DOCKER_INFRA_UP_TIMEOUT` - timeout for infra up command
- `DOCKER_INFRA_DOWN_TIMEOUT` - timeout for infra down command
- `DOCKER_LOGS_TAIL` - number of log lines to tail
- `DOCKER_LOGS_TIMESTAMPS` - whether to include timestamps
- `DOCKER_INFRASTRUCTURE_SERVICES` - section header tooltip
- `DOCKER_STATUS` - section header tooltip
- `DOCKER_ALL_CONTAINERS` - section header tooltip

---

### Step 3: Rewrite Docker.tsx with proper hooks/stores

**File:** `web/src/components/Settings/Docker.tsx`

**Required imports:**
```typescript
import { useState, useEffect } from 'react';
import { useDockerStore, useConfigStore } from '@/stores';
import { useTooltips } from '@/hooks/useTooltips';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { useNotification } from '@/hooks/useNotification';
import { TooltipIcon } from '@/components/ui/TooltipIcon';
```

**Store usage:**
```typescript
// Docker runtime state (containers, status)
const { status, containers, fetchStatus, fetchContainers, ... } = useDockerStore();

// Config state (settings from agro_config.json)
const { config, loadConfig, saveEnv, saving } = useConfigStore();

// Tooltips
const { getTooltip } = useTooltips();

// Error handling (replace raw alert())
const { handleApiError } = useErrorHandler();

// Notifications (toast feedback)
const { success, error } = useNotification();
```

**Config sync pattern:**
```typescript
// Load config on mount
useEffect(() => {
  if (!config) loadConfig();
}, [config, loadConfig]);

// Sync local form state from config.env
useEffect(() => {
  if (config?.env) {
    setStatusTimeout(Number(config.env.DOCKER_STATUS_TIMEOUT) || 5);
    // ... all 7 settings
  }
}, [config]);
```

**Save handler:**
```typescript
const handleSaveSettings = async () => {
  try {
    await saveEnv({
      DOCKER_STATUS_TIMEOUT: statusTimeout,
      DOCKER_CONTAINER_LIST_TIMEOUT: containerListTimeout,
      DOCKER_CONTAINER_ACTION_TIMEOUT: containerActionTimeout,
      DOCKER_INFRA_UP_TIMEOUT: infraUpTimeout,
      DOCKER_INFRA_DOWN_TIMEOUT: infraDownTimeout,
      DOCKER_LOGS_TAIL: logsTail,
      DOCKER_LOGS_TIMESTAMPS: logsTimestamps,
    });
    success('Docker settings saved');
    setHasChanges(false);
  } catch (err) {
    error('Failed to save Docker settings');
  }
};
```

**Error handling (replace all alert() calls):**
```typescript
// BEFORE:
alert(`Failed to ${action} ${serviceName}: ${error.message}`);

// AFTER:
error(`Failed to ${action} ${serviceName}: ${err instanceof Error ? err.message : 'Unknown error'}`);
```

**Tooltip usage on ALL elements:**
```typescript
// Section headers
<h3>
  Infrastructure Services <TooltipIcon name="DOCKER_INFRASTRUCTURE_SERVICES" />
</h3>

// Settings fields
<label>
  Status Timeout <TooltipIcon name="DOCKER_STATUS_TIMEOUT" />
</label>
```

**Collapsible Docker Settings section (user requested):**
- Collapsed by default
- Chevron toggle to expand/collapse
- Contains all 7 timeout/log settings
- Save button with saving state feedback

---

### Step 4: Verification

1. **Backend smoke test:** `tests/smoke/test_docker_api_smoke.py` - verify config-schema endpoint
2. **Playwright smoke test:** Verify Docker page renders, settings section expands
3. **Human verification:** Screenshot to confirm settings visible and tooltips work

---

## Files to Modify

| File | Line Reference | Changes |
|------|----------------|---------|
| `server/services/config_store.py` | 526-713 | Add docker to schema, ui, values |
| `web/src/modules/tooltips.js` | 37+ | Add 10 docker tooltips using L() |
| `web/src/components/Settings/Docker.tsx` | 1-641 | Full rewrite with proper hooks/stores |

---

## Critical Requirements (from CLAUDE.md)

- [ ] NO stubs, placeholders, TODOs
- [ ] All settings go to agro_config.json via Pydantic
- [ ] All UI elements have tooltips (ADA compliance)
- [ ] Use Zustand stores, NOT local useState for config
- [ ] Use useErrorHandler, NOT raw alert()
- [ ] Use useNotification for feedback
- [ ] Playwright smoke test before reporting done
- [ ] NEVER commit without user approval

## CSS/Styling Verification (MANDATORY)

- [ ] Use `.settings-section` class for Docker Settings panel
- [ ] Use `.input-group` + `.input-row` for form layout
- [ ] Use `.small-button` class for Save button
- [ ] Use `.toggle` pattern for DOCKER_LOGS_TIMESTAMPS boolean
- [ ] Use `.loading-spinner` when saving is true
- [ ] Apply CSS variables from tokens.css (--accent, --line, --ring, etc.)
- [ ] Micro-interactions working: button hover lift, input focus ring
- [ ] Collapsible section has smooth expand/collapse transition
- [ ] Success/error feedback uses proper CSS states
