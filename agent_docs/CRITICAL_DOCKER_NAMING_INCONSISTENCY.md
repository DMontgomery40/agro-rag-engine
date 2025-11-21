# CRITICAL: Docker Service vs Container Naming Confusion

**Date**: 2025-10-23
**Severity**: HIGH - Affects all docker operations, builds, debugging
**Status**: UNFIXED - This is a landmine waiting to break things

---

## How I Hit This

I was trying to rebuild the API container after fixing a BM25 retrieval bug in `retrieval/hybrid_search.py`. I ran:

```bash
docker-compose -f docker-compose.services.yml build agro-api
```

**Result**: `no such service: agro-api`

This revealed a critical naming inconsistency that affects the entire codebase.

---

## The Core Problem

Docker Compose has TWO different names for the same container:

1. **Service Name** (in docker-compose.yml): `api`
2. **Container Name** (actual runtime name): `agro-api`

### From docker-compose.services.yml:

```yaml
services:
  api:                          # ← SERVICE NAME (used in docker-compose commands)
    build:
      context: .
      dockerfile: Dockerfile
    container_name: agro-api    # ← CONTAINER NAME (used in docker exec/logs/inspect)
    ports:
      - "8012:8012"
```

### Current Runtime State:

```bash
$ docker ps --format "{{.Names}}\t{{.Image}}"
agro-api	agro-rag-engine-api     # ← Container is named agro-api
```

---

## When to Use Which Name

### Use SERVICE NAME `api` for:
- `docker-compose build api`
- `docker-compose up -d api`
- `docker-compose down api`
- `docker-compose restart api`
- `docker-compose logs -f api`

### Use CONTAINER NAME `agro-api` for:
- `docker exec agro-api <command>`
- `docker logs agro-api`
- `docker inspect agro-api`
- `docker restart agro-api`
- `docker stop agro-api`

---

## Where This Breaks (Audit Results)

### ✅ CORRECT Usage (Scripts)

These scripts correctly use SERVICE NAME `api`:

1. **scripts/api_up.sh:10**
   ```bash
   docker compose -f "$ROOT_DIR/docker-compose.services.yml" up -d api
   ```

2. **scripts/dev_up.sh:43**
   ```bash
   docker compose -f "$ROOT_DIR/docker-compose.services.yml" up -d api
   ```

3. **scripts/down.sh:17**
   ```bash
   docker compose -f "$ROOT_DIR/docker-compose.services.yml" down api
   ```

### ✅ CORRECT Usage (Documentation)

These docs correctly use CONTAINER NAME `agro-api` for `docker exec`:

1. **agent_docs/_CRITICAL INFO_INDEXER_PATH_FIX_2025-10-22.md:164**
   ```bash
   docker exec agro-api python3 -c "..."
   ```

2. **agent_docs/HANDOFF-2025-10-21.md:119**
   ```bash
   docker exec agro-api python3 -c "..."
   ```

### ❌ WRONG/INCONSISTENT Usage

1. **scripts/dev_up.sh:70** - WRONG FILE PATH
   ```bash
   log "Done. View API logs: docker compose -f infra/docker-compose.yml logs -f api"
   ```
   **Problem**: Says `infra/docker-compose.yml` but should be `docker-compose.services.yml`
   **Impact**: Users get "no such service" error when following instructions

2. **gui/js/autotune.js:43** - Hardcoded container name
   ```javascript
   console.warn('  • Check server logs: docker logs agro-api');
   ```
   **Problem**: This is correct for manual execution, but if container name ever changes, this breaks
   **Impact**: Error messages show outdated/incorrect commands

3. **public/agro/*.js** - API path references
   Multiple files reference `/agro-api` path prefix (for routing, not docker)
   **Problem**: Mixes concerns - these are URL paths, not docker names
   **Impact**: Cognitive overload - "agro-api" means different things in different contexts

---

## Who Else Will Hit This

### Human Developers
- **Debugging**: See error message "check docker logs agro-api", try to rebuild with `docker-compose build agro-api` → fails
- **CI/CD**: Build scripts might use wrong name → pipeline failures
- **Onboarding**: New developers see two names, don't know which to use when

### AI Agents
- **Critical**: AI agents trying to rebuild containers will hit `no such service: agro-api`
- **Confusion**: When searching codebase, see both `api` and `agro-api`, don't know which is correct
- **Documentation**: Agent docs show `docker exec agro-api` but compose commands need `api`

### Example Failure Scenario

1. Agent sees error in RAG endpoint
2. Agent reads gui/js/autotune.js error message: "docker logs agro-api"
3. Agent decides to rebuild to fix issue
4. Agent runs: `docker-compose build agro-api` (using container name from error message)
5. **FAILS**: `no such service: agro-api`
6. Agent wastes time debugging docker-compose, doesn't realize it's a naming issue
7. THIS IS EXACTLY WHAT HAPPENED TO ME

---

## Impact Analysis

### Files Referencing Container Operations

**Scripts using SERVICE name `api`** (CORRECT):
- scripts/api_up.sh:10
- scripts/dev_up.sh:43
- scripts/down.sh:17

**Docs using CONTAINER name `agro-api`** (CORRECT for exec/logs):
- agent_docs/_CRITICAL INFO_INDEXER_PATH_FIX_2025-10-22.md (multiple lines)
- agent_docs/docker-port-issue-2025-10-21.md (multiple lines)
- agent_docs/DOCKER_CONTAINER_IMPACT_ANALYSIS.md (multiple lines)
- agent_docs/HANDOFF-2025-10-21.md (multiple lines)
- agent_docs/2025-10-23-notes.md:5
- gui/js/autotune.js:43

**Prometheus config** (uses label, separate concern):
- infra/prometheus.yml:22 - `service: "agro-api"` (metric label, not docker name)

**API URL paths** (NOT docker names, separate concern):
- public/agro/fetch-shim.js (8 references to `/agro-api` URL path)
- public/agro/api-base-override.js (9 references to `/agro-api` URL path)

---

## Where This Came From

This is a standard Docker Compose pattern, but it creates confusion:

```yaml
services:
  api:                    # Short, simple service name for compose commands
    container_name: agro-api  # Descriptive container name to distinguish in `docker ps`
```

**Why it exists**:
- Service name `api` is simple for compose commands
- Container name `agro-api` is descriptive when listing containers (avoids confusion with other projects)

**Why it's problematic**:
- Two names for the same thing
- Different commands need different names
- No clear documentation of which to use when
- Error messages and docs mix the names

---

## What Will Break

### Immediate Breakage Scenarios

1. **Rebuild Commands**
   ```bash
   # WRONG (what I tried)
   docker-compose build agro-api
   # ERROR: no such service: agro-api

   # RIGHT
   docker-compose build api
   ```

2. **Restart Commands**
   ```bash
   # WRONG
   docker-compose restart agro-api
   # ERROR: no such service: agro-api

   # RIGHT
   docker-compose restart api
   # OR
   docker restart agro-api  # (without docker-compose)
   ```

3. **Log Following**
   ```bash
   # Following scripts/dev_up.sh:70 instruction
   docker compose -f infra/docker-compose.yml logs -f api
   # ERROR: wrong file path (should be docker-compose.services.yml)

   # RIGHT
   docker logs agro-api
   # OR
   docker compose -f docker-compose.services.yml logs -f api
   ```

### Cascading Failures

1. **Build → Deploy Pipeline**
   - CI script uses `docker-compose build agro-api` → fails
   - Deploy blocked, production down

2. **Emergency Hotfix**
   - Critical bug found
   - Agent tries to rebuild: `docker-compose build agro-api` → fails
   - Wastes 10+ minutes debugging docker instead of fixing bug
   - User frustrated, system down longer

3. **Documentation Confusion**
   - User reads agent_docs showing `docker exec agro-api`
   - Tries to rebuild: `docker-compose build agro-api`
   - Fails, loses trust in documentation

---

## How to Fix (Recommendations)

### Option 1: Standardize on Container Name Everywhere (RECOMMENDED)

Change service name to match container name:

```yaml
services:
  agro-api:                     # Match container name
    container_name: agro-api
```

**Pros**:
- Single name to remember
- No confusion
- Error messages and docs align with compose commands

**Cons**:
- Requires updating all scripts (low risk, scripts are isolated)
- Breaking change for anyone with muscle memory

**Files to Update**:
- docker-compose.services.yml:2
- scripts/api_up.sh:10
- scripts/dev_up.sh:43, 70
- scripts/down.sh:17

### Option 2: Add Comprehensive Documentation

Keep current setup but add clear documentation everywhere:

1. **Add to docker-compose.services.yml**:
   ```yaml
   services:
     api:  # SERVICE NAME for: docker-compose build/up/down/restart/logs
       container_name: agro-api  # CONTAINER NAME for: docker exec/logs/inspect/restart
   ```

2. **Add to README.md**:
   ```markdown
   ## Docker Commands

   The API has TWO names:
   - **Service name** (docker-compose): `api`
   - **Container name** (runtime): `agro-api`

   Use service name for compose commands:
   - docker-compose build api
   - docker-compose up -d api

   Use container name for direct docker commands:
   - docker exec agro-api python -c "..."
   - docker logs agro-api
   ```

3. **Fix scripts/dev_up.sh:70**:
   ```bash
   log "Done. View API logs:"
   log "  docker compose -f docker-compose.services.yml logs -f api"
   log "  OR: docker logs agro-api"
   ```

4. **Update gui/js/autotune.js:43**:
   ```javascript
   console.warn('  • Check server logs: docker logs agro-api');
   console.warn('  • Rebuild API: docker compose -f docker-compose.services.yml build api && docker compose -f docker-compose.services.yml up -d api');
   ```

**Pros**:
- No breaking changes
- Preserves current pattern
- Clear guidance

**Cons**:
- Still two names to remember
- Requires vigilance in all docs
- Future confusion likely

### Option 3: Remove container_name (Use Auto-Generated)

Let Docker Compose generate container name automatically:

```yaml
services:
  api:
    # container_name: agro-api  # REMOVED
```

Container will be named: `agro-rag-engine_api_1` (or similar)

**Pros**:
- Single service name to remember
- Standard compose behavior

**Cons**:
- Ugly auto-generated names
- All existing docs showing `agro-api` break
- Harder to identify in `docker ps` output

---

## Immediate Action Items

1. **FIX scripts/dev_up.sh:70**
   - Wrong file path: says `infra/docker-compose.yml`, should be `docker-compose.services.yml`
   - This is a direct user-facing bug

2. **DOCUMENT in README.md**
   - Add clear section explaining service name vs container name
   - Show examples of both

3. **UPDATE agent_docs/bug-resolution.md**
   - Add entry for this issue
   - Prevent future agents from hitting this

4. **DECIDE on long-term fix**
   - Option 1 (standardize) vs Option 2 (document) vs Option 3 (auto-generate)
   - Get user approval before changing service name

---

## Prevention for Future Agents

### When you need to rebuild the API:

```bash
# ✅ CORRECT
docker compose -f docker-compose.services.yml build api
docker compose -f docker-compose.services.yml up -d api

# ❌ WRONG
docker-compose build agro-api  # no such service
docker-compose -f infra/docker-compose.yml build api  # wrong file
```

### When you need to execute commands in the container:

```bash
# ✅ CORRECT
docker exec agro-api python3 -c "..."
docker logs agro-api

# ❌ WRONG (these will fail)
docker exec api python3 -c "..."  # container not found
```

### Quick Reference Card

| Task | Command |
|------|---------|
| Build | `docker compose -f docker-compose.services.yml build api` |
| Start | `docker compose -f docker-compose.services.yml up -d api` |
| Stop | `docker compose -f docker-compose.services.yml down api` |
| Restart | `docker compose -f docker-compose.services.yml restart api` |
| Logs (compose) | `docker compose -f docker-compose.services.yml logs -f api` |
| Logs (direct) | `docker logs agro-api` |
| Exec | `docker exec agro-api <command>` |
| Inspect | `docker inspect agro-api` |

---

## Related Files

- docker-compose.services.yml - Service definition
- scripts/api_up.sh - Correct usage of service name
- scripts/dev_up.sh - Correct usage but WRONG instruction at line 70
- scripts/down.sh - Correct usage
- gui/js/autotune.js:43 - Hardcoded container name in error message
- All agent_docs/*.md - Mixed usage (correct for their context)

---

## Status

**UNFIXED** - The underlying inconsistency remains. This document is a workaround.

**User Decision Required**: Which fix option to implement?
- Option 1: Standardize on `agro-api` everywhere (RECOMMENDED)
- Option 2: Keep split, improve documentation
- Option 3: Remove container_name, use auto-generated

Until fixed, **ALL AGENTS** must be aware of this split naming and use the correct name for each context.
