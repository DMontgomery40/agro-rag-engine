# Indexer Path Resolution Fix

**Date**: 2025-10-22
**Issue**: Indexer crashing with "Discovered 0 source files" error
**Root Cause**: Hard-coded local machine path in repos.json doesn't exist inside Docker container
**Status**: ✅ **FIXED**

---

## Problem Summary

The indexer was crashing when run inside the Docker container:

```
Starting indexer...
Discovered 0 source files.
...
ValueError: max() arg is an empty sequence
```

**Root Cause**: `repos.json` had a hard-coded path:
```json
"path": "/Users/davidmontgomery/agro-rag-engine"
```

This path exists on the local machine but **NOT inside the Docker container**, where the code lives at `/app`.

---

## Understanding Docker Path Mapping

### What is `/app`?

`/app` is the **working directory inside the Docker container**, not a directory on your local machine.

### Volume Mounts (docker-compose.services.yml)

```yaml
volumes:
  - ./gui:/app/gui              # Local gui/ → Container /app/gui
  - ./server:/app/server        # Local server/ → Container /app/server
  - ./data:/app/data            # Local data/ → Container /app/data
  - ./out:/app/out              # Local out/ → Container /app/out
  - ./.env:/app/.env            # Local .env → Container /app/.env
```

**Key Point**: `common/` and `indexer/` are **NOT** mounted as volumes. They're copied into the Docker image at build time with `COPY . .` in the Dockerfile.

---

## The Solution (Both Environments)

### 1. Environment Variable Expansion Support

Added `_expand_env_vars()` function to `common/config_loader.py`:

```python
def _expand_env_vars(path_str: str) -> str:
    """Expand environment variables in path string.
    Supports ${VAR}, ${VAR:-default}, and $VAR syntax."""
    import re

    def replace_var(match):
        # Handle ${VAR:-default} syntax (bash-style)
        if ':-' in match.group(0):
            var_part = match.group(0)[2:-1]  # Remove ${ and }
            var_name, default = var_part.split(':-', 1)
            return os.getenv(var_name.strip(), default.strip())
        # Handle ${VAR} or $VAR
        var_name = match.group(1) or match.group(2)
        return os.getenv(var_name, match.group(0))

    # Replace ${VAR:-default}, ${VAR}, and $VAR patterns
    path_str = re.sub(r'\$\{([^}]+)\}|\$([A-Za-z_][A-Za-z0-9_]*)', replace_var, path_str)
    return path_str
```

Updated `get_repo_paths()` to use it:

```python
def get_repo_paths(name: str) -> List[str]:
    r = _find_repo(name)
    if not r:
        raise ValueError(f"Unknown repo: {name}. Known: {', '.join(list_repos()) or '[]'}")
    p = r.get("path")
    if isinstance(p, list):
        return [str(Path(_expand_env_vars(x)).expanduser()) for x in p]
    if isinstance(p, str):
        return [str(Path(_expand_env_vars(p)).expanduser())]
    raise ValueError(f"Repo `{name}` missing 'path' in repos.json")
```

### 2. Updated repos.json

Changed from hard-coded path to environment variable with default:

```json
{
  "default_repo": "agro",
  "repos": [
    {
      "name": "agro",
      "slug": "agro",
      "path": "${REPO_ROOT:-/app}",
      ...
    }
  ]
}
```

**How it works**:
- `${REPO_ROOT:-/app}` means "use environment variable REPO_ROOT if set, otherwise use `/app`"
- **Docker environment**: REPO_ROOT not set → uses `/app` ✅
- **Local environment**: Set `REPO_ROOT=/Users/davidmontgomery/agro-rag-engine` → uses local path ✅

### 3. .env Configuration

Added comment-only documentation (not active by default):

```bash
# REPO_ROOT - Repository root path (defaults to /app in Docker, set for local use)
# For local development outside Docker, set: REPO_ROOT=/Users/davidmontgomery/agro-rag-engine
```

**Why commented out?**
The `.env` file is mounted into Docker, so if we set `REPO_ROOT=/Users/davidmontgomery/agro-rag-engine` in there, Docker would try to use the local path (which doesn't exist in the container).

**For local development**: Set REPO_ROOT as an environment variable before running Python:
```bash
export REPO_ROOT=/Users/davidmontgomery/agro-rag-engine
python indexer/index_repo.py
```

---

## Testing

Created comprehensive test: `tests/test_repo_path_resolution.py`

```python
# Test environment variable expansion
assert _expand_env_vars('${TEST_VAR:-/default}') == '/test/path'  # VAR set
assert _expand_env_vars('${NONEXISTENT_VAR:-/default}') == '/default'  # VAR not set

# Test Docker mode (REPO_ROOT not set)
del os.environ['REPO_ROOT']
paths = get_repo_paths('agro')
assert paths[0] == '/app'  # ✅

# Test local mode (REPO_ROOT set)
os.environ['REPO_ROOT'] = '/Users/davidmontgomery/agro-rag-engine'
paths = get_repo_paths('agro')
assert paths[0] == '/Users/davidmontgomery/agro-rag-engine'  # ✅
```

**Test Results**: ✅ All tests pass

---

## Verification

### Before Fix (Docker):
```bash
$ docker exec agro-api python3 -c "from common.config_loader import get_repo_paths; print(get_repo_paths('agro'))"
['/Users/davidmontgomery/agro-rag-engine']

$ docker exec agro-api python3 -c "import os; print(os.path.exists('/Users/davidmontgomery/agro-rag-engine'))"
False  # ❌ Path doesn't exist in container!

$ docker exec agro-api python3 -c "import glob; print(len(glob.glob('/Users/davidmontgomery/agro-rag-engine/**/*.py', recursive=True)))"
0  # ❌ 0 files found!
```

### After Fix (Docker):
```bash
$ docker exec agro-api python3 -c "from common.config_loader import get_repo_paths; print(get_repo_paths('agro'))"
['/app']

$ docker exec agro-api python3 -c "import os; print(os.path.exists('/app'))"
True  # ✅ Path exists!

$ docker exec agro-api python3 -c "import glob; print(len(glob.glob('/app/**/*.py', recursive=True)))"
127  # ✅ 127 Python files found!
```

---

## Files Modified

### Code Changes
1. **common/config_loader.py** - Added `_expand_env_vars()` function and updated `get_repo_paths()`
2. **repos.json** - Changed path from hard-coded to `${REPO_ROOT:-/app}`
3. **.env** - Added documentation comments (no active config)

### Testing
4. **tests/test_repo_path_resolution.py** - New comprehensive test suite

### Documentation
5. **agent_docs/INDEXER_PATH_FIX_2025-10-22.md** - This document

---

## Rebuild Requirements

**When to rebuild Docker image**:

The `common/` directory is **NOT** mounted as a volume, so changes to `config_loader.py` require rebuilding:

```bash
docker-compose -f docker-compose.services.yml build api
docker-compose -f docker-compose.services.yml up -d api
```

**When changes take effect immediately** (no rebuild needed):
- Changes to `gui/`, `server/`, `data/`, `out/`, `.env` (these are mounted volumes)
- Changes to `repos.json` (it's at the root, which is mounted)

---

## Future Considerations

### Option 1: Mount common/ as Volume (Simplest)

Add to `docker-compose.services.yml`:
```yaml
volumes:
  - ./common:/app/common  # Add this line
```

**Pros**: No rebuild needed for common/ changes
**Cons**: Slight startup overhead reading from host filesystem

### Option 2: Use Environment Variables Only

Remove repos.json entirely, configure via environment:
```bash
REPO=agro
REPO_PATH=/app
```

`config_loader.py` already supports this as a fallback (lines 36-41).

**Pros**: More container-native, 12-factor app compliant
**Cons**: Loses repos.json's rich configuration (keywords, path_boosts, layer_bonuses)

### Option 3: Template repos.json at Container Start

Use `envsubst` or similar to generate repos.json from a template at container startup.

**Pros**: Best of both worlds
**Cons**: More complexity, potential race conditions

---

## Related Issues Fixed

This fix also resolves:
- ❌ "BM25S ValueError: max() arg is an empty sequence"
- ❌ "Mean of empty slice" warnings
- ❌ Any indexer operation that needs to discover source files

---

## Summary

**Problem**: Hard-coded local path in repos.json doesn't exist in Docker
**Solution**: Environment variable expansion with sensible defaults
**Result**: Works in both Docker (`/app`) and local development (custom path)
**Status**: ✅ Fixed, tested, and verified

**Key Learning**: Docker containers have their own filesystem. Paths on your local machine don't automatically exist inside containers unless explicitly mounted as volumes.
