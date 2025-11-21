# Root Cause Investigation: RAG Index Showing 0 Bytes

**Investigation Date**: 2025-10-20
**Investigator**: Claude Code (Forensics Mode)
**Issue**: GUI shows 0 bytes for all storage metrics; /api/index/status returns 0 values

---

## Executive Summary

**Root Cause**: Docker container cannot access the `/out` directory due to missing volume mounts in `docker-compose.services.yml`

**Impact**: High - GUI shows incorrect storage metrics (0 bytes) despite having a fully functional index with 933 chunks and 61MB of embeddings

**Data Loss**: **NONE** - All index data is intact and accessible both locally and via Qdrant

**Recommended Fix**: Add volume mounts to `docker-compose.services.yml` to bind `/out` and `/data` directories

---

## System Information

### Environment
- **OS**: Darwin 25.0.0 (macOS, ARM64)
- **Working Directory**: `/Users/davidmontgomery/agro-rag-engine`
- **Current Branch**: `development`
- **Disk Space**: 472 GB available (48% used)

### Service Status
- **Docker Containers**: Running (9 containers)
  - `agro-api` (container ID: fe2b64e2cab8_agro-api)
  - `qdrant` (v1.15.5)
  - `rag-redis` (7.2.0-v10)
  - Monitoring stack (Prometheus, Grafana, Loki, Promtail, Alertmanager)
- **API Endpoint**: http://127.0.0.1:8012 (responding, healthy)
- **Qdrant**: http://127.0.0.1:6333 (responding, healthy)

---

## Timeline

### Investigation Steps

1. **12:17 UTC** - Checked current directory and git status
2. **12:17 UTC** - Verified disk space (472 GB available)
3. **12:17 UTC** - Located index-related directories
4. **12:18 UTC** - Found `/out` directory with content
5. **12:18 UTC** - Discovered Qdrant has `.deleted` directory (empty)
6. **12:19 UTC** - Confirmed `/out/agro/` contains:
   - `chunks.jsonl` (1.9 MB, 933 lines)
   - `embed_cache.jsonl` (61 MB, 933 lines)
   - `bm25_index/` (3.9 MB)
   - `cards.jsonl` (32 KB, 100 lines)
7. **12:20 UTC** - Verified Qdrant collection `code_chunks_agro` exists (29 MB)
8. **12:21 UTC** - Tested `/api/index/status` endpoint → returned 0 values
9. **12:22 UTC** - Ran `get_index_stats()` directly → returned correct values (933 chunks, 448 MB total)
10. **12:23 UTC** - Identified server running in Docker container
11. **12:24 UTC** - Checked Docker container's `/app/out/` → **ONLY has `editor/`, missing `agro/`**
12. **12:25 UTC** - Inspected Docker volume mounts → **EMPTY (`[]`)**
13. **12:26 UTC** - Checked `.dockerignore` → **Found `out/` is excluded**
14. **12:27 UTC** - Verified `docker-compose.services.yml` → **NO volume mounts defined**
15. **12:28 UTC** - Confirmed via Qdrant API → **933 points present**

### Key Timestamps

- **Index Created**: 2025-10-19 19:29:15 (local time)
- **Container Created**: 2025-10-20 12:10:46 UTC (05:10 AM local)
- **Last Index Metadata**: 2025-10-20T01:29:18.393275Z

---

## Evidence

### 1. Local Filesystem (Host)

**Data Present and Intact:**

```bash
$ ls -lh /Users/davidmontgomery/agro-rag-engine/out/agro/
total 129576
drwxr-xr-x  11 davidmontgomery  staff   352B Oct 19 04:36 bm25_cards
drwxr-xr-x  15 davidmontgomery  staff   480B Oct 18 22:18 bm25_index
-rw-r--r--   1 davidmontgomery  staff    29K Oct 19 18:35 cards.jsonl
-rw-r--r--   1 davidmontgomery  staff    20K Oct 19 18:35 cards.txt
-rw-r--r--   1 davidmontgomery  staff   1.9M Oct 19 19:29 chunks.jsonl
-rw-r--r--   1 davidmontgomery  staff    61M Oct 19 19:29 embed_cache.jsonl
-rw-r--r--   1 davidmontgomery  staff   347B Oct 19 19:29 last_index.json
drwxr-xr-x  49 davidmontgomery  staff   1.5K Oct 20 05:11 traces
```

**Line Counts:**
```bash
$ wc -l /Users/davidmontgomery/agro-rag-engine/out/agro/*.jsonl
     100 cards.jsonl
     933 chunks.jsonl
     933 embed_cache.jsonl
    1966 total
```

**Qdrant Collection:**
```bash
$ du -sh /Users/davidmontgomery/agro-rag-engine/data/qdrant/collections/code_chunks_agro/
29M
```

**Last Index Metadata:**
```json
{
  "repo": "agro",
  "timestamp": "2025-10-20T01:29:18.393275Z",
  "chunks_path": "/Users/davidmontgomery/agro-rag-engine/out/agro/chunks.jsonl",
  "bm25_index_dir": "/Users/davidmontgomery/agro-rag-engine/out/agro/bm25_index",
  "chunk_count": 933,
  "collection_name": "code_chunks_agro",
  "embedding_type": "openai",
  "embedding_dim": 3072
}
```

### 2. Docker Container Filesystem

**Missing Data:**

```bash
$ docker exec fe2b64e2cab8_agro-api ls -la /app/out/
total 16
drwxr-xr-x 3 root root 4096 Oct 20 12:18 .
drwxr-xr-x 1 root root 4096 Oct 20 12:18 ..
drwxr-xr-x 2 root root 4096 Oct 20 12:18 editor
```

**Note**: The `agro/` directory is MISSING inside the container!

### 3. API Endpoint Response

**From Docker Container (Incorrect):**
```json
{
  "lines": [],
  "running": false,
  "metadata": {
    "timestamp": "2025-10-20T13:17:53.962868",
    "repos": [
      {
        "name": "editor",
        "profile": "default",
        "paths": {"chunks": null, "bm25": null, "cards": null},
        "sizes": {},
        "chunk_count": 0,
        "has_cards": false
      }
    ],
    "total_storage": 0,
    "storage_breakdown": {
      "chunks_json": 0,
      "bm25_index": 0,
      "cards": 0,
      "embeddings_raw": 0,
      "qdrant_overhead": 0,
      "reranker_cache": 0,
      "redis": 419430400
    }
  }
}
```

**Direct Python Execution (Correct):**
```json
{
  "timestamp": "2025-10-20T01:29:18.393275Z",
  "repos": [
    {
      "name": "agro",
      "profile": "default",
      "paths": {
        "chunks": "/Users/davidmontgomery/agro-rag-engine/out/agro/chunks.jsonl",
        "bm25": "/Users/davidmontgomery/agro-rag-engine/out/agro/bm25_index",
        "cards": "/Users/davidmontgomery/agro-rag-engine/out/agro/cards.jsonl"
      },
      "sizes": {
        "chunks": 1971307,
        "bm25": 3886765,
        "cards": 29794
      },
      "chunk_count": 933,
      "has_cards": true
    }
  ],
  "total_storage": 448247674.0,
  "storage_breakdown": {
    "chunks_json": 1971307,
    "bm25_index": 3886765,
    "cards": 29794,
    "embeddings_raw": 11464704,
    "qdrant_overhead": 5732352,
    "reranker_cache": 5732352,
    "redis": 419430400
  },
  "costs": {
    "total_tokens": 699750,
    "embedding_cost": 0.091
  }
}
```

### 4. Qdrant Status (Healthy)

```json
{
  "result": {
    "status": "green",
    "points_count": 933,
    "segments_count": 2,
    "config": {
      "params": {
        "vectors": {
          "dense": {
            "size": 3072,
            "distance": "Cosine"
          }
        }
      }
    }
  },
  "status": "ok"
}
```

**Qdrant has all 933 vectors!**

### 5. Docker Configuration Issues

**`.dockerignore` (Line 9):**
```
out/
```

**`docker-compose.services.yml` (No Volume Mounts):**
```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: agro-api
    env_file:
      - .env
    ports:
      - "8012:8012"
    profiles: ["api"]
    # ❌ NO VOLUMES DEFINED
```

**Docker Inspect (Volume Mounts):**
```bash
$ docker inspect fe2b64e2cab8_agro-api --format '{{.HostConfig.Binds}}'
[]
```

**Empty array = no volume mounts!**

---

## Analysis

### Root Cause Chain

1. **Dockerfile copies entire context** (`COPY . .` at line 19)
2. **`.dockerignore` excludes `out/`** (line 9) → `out/` directory not included in Docker image
3. **`docker-compose.services.yml` has no volume mounts** → Container cannot access host's `/out` directory
4. **Container only has empty `out/editor/` directory** (created during build or runtime)
5. **`get_index_stats()` scans `/app/out/` inside container** → Only finds `editor/` with no data
6. **API returns 0 values** for storage metrics

### Why Qdrant Works But GUI Shows 0

- **Qdrant**: Running as separate container with volume mount to `../data/qdrant:/qdrant/storage`
- **Qdrant data is accessible** because `infra/docker-compose.yml` line 14 mounts it properly
- **Search/retrieval works** because Qdrant has all 933 vectors
- **Storage stats fail** because API container cannot see `/out/agro/` to calculate sizes

### Git History Analysis

**No Recent Deletions:**
```bash
$ git log --all --full-history --oneline -- data/ out/ | head -20
```

- Most recent changes to `data/` and `out/` were from regular updates
- No force pushes, resets, or deletions in recent history
- Commit `bad929f` removed obsolete GUI files, not index data
- `.gitignore` line 223: `out/**` → `/out` directory is intentionally not tracked

**Volume Mounts Never Added:**
- `docker-compose.services.yml` created at commit `0254edc` without volume mounts
- File has never had volume definitions in git history
- This suggests the service was designed to work with data copied into the image OR volume mounts were intended but never added

---

## Reproduction Steps

**This is NOT an issue that can be "reproduced" - it's a configuration gap:**

1. Build Docker image with `.dockerignore` excluding `out/`
2. Run container via `docker-compose.services.yml` without volume mounts
3. Create index locally (outside container)
4. Access `/api/index/status` endpoint
5. Observe 0 values because container cannot see `/out/agro/`

---

## Root Cause

**Definitive Explanation:**

The `/api/index/status` endpoint executes `get_index_stats()` from `server/index_stats.py`, which scans the following base paths:

```python
base_paths = ["out", "out.noindex-shared", "out.noindex-gui", "out.noindex-devclean"]
```

Inside the Docker container, these paths resolve to `/app/out/`, `/app/out.noindex-shared/`, etc.

Because:
1. `.dockerignore` excludes `out/` during build
2. `docker-compose.services.yml` has no volume mounts

The container's `/app/out/` directory only contains subdirectories created at runtime (like `editor/`), not the indexed data in `/out/agro/`.

When `get_index_stats()` iterates through `/app/out/`, it finds `editor/` with no `chunks.jsonl`, so it reports:
- 0 chunks
- 0 total storage
- All storage_breakdown fields = 0

Meanwhile, on the **host filesystem**, `/Users/davidmontgomery/agro-rag-engine/out/agro/` has:
- 933 chunks (1.9 MB)
- 61 MB embeddings
- 3.9 MB BM25 index
- 32 KB cards

And **Qdrant** (running in a separate container with proper volume mounts) has all 933 vectors and works perfectly for search/retrieval.

---

## Recommended Fix

### Option 1: Add Volume Mounts (Recommended)

**Edit `docker-compose.services.yml`:**

```yaml
services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: agro-api
    env_file:
      - .env
    environment:
      - QDRANT_URL=${QDRANT_URL:-http://qdrant:6333}
      - REDIS_URL=${REDIS_URL:-redis://redis:6379/0}
      - OPENAI_API_KEY=${OPENAI_API_KEY:-}
      - GEN_MODEL=${GEN_MODEL:-qwen3-coder:30b}
      - OLLAMA_URL=${OLLAMA_URL:-}
      - OAUTH_ENABLED=${OAUTH_ENABLED:-false}
      - OAUTH_TOKEN=${OAUTH_TOKEN:-}
    ports:
      - "8012:8012"
    volumes:
      - ./out:/app/out                    # ✅ ADD THIS
      - ./data:/app/data                  # ✅ ADD THIS
      - ./out.noindex-shared:/app/out.noindex-shared  # ✅ ADD THIS (optional)
    profiles: ["api"]
```

**Then restart the container:**
```bash
docker compose -f docker-compose.services.yml down
docker compose -f docker-compose.services.yml up -d api
```

### Option 2: Remove `out/` from `.dockerignore` (Not Recommended)

This would include the `/out` directory in the Docker image, but:
- ❌ Makes images much larger (61 MB+ per index)
- ❌ Requires rebuilding image after every index update
- ❌ Cannot share index data between container and host easily

### Option 3: Hybrid Approach

Keep `.dockerignore` as-is but add volume mounts (Option 1). This is the cleanest solution:
- ✅ Small Docker images (no index data baked in)
- ✅ Live updates (host and container see same data)
- ✅ Consistent with how Qdrant is already configured

---

## Verification Steps

After applying the fix:

1. **Restart container:**
   ```bash
   docker compose -f docker-compose.services.yml down
   docker compose -f docker-compose.services.yml up -d api
   ```

2. **Check volume mounts:**
   ```bash
   docker inspect fe2b64e2cab8_agro-api --format '{{json .Mounts}}' | python3 -m json.tool
   ```

   Should show mounts for `/app/out` and `/app/data`.

3. **Verify container can see data:**
   ```bash
   docker exec <container-id> ls -la /app/out/agro/
   docker exec <container-id> wc -l /app/out/agro/chunks.jsonl
   ```

   Should show 933 lines in `chunks.jsonl`.

4. **Test API endpoint:**
   ```bash
   curl -s http://127.0.0.1:8012/api/index/status | python3 -m json.tool
   ```

   Should show:
   - `chunk_count`: 933
   - `total_storage`: ~448247674
   - `storage_breakdown.chunks_json`: 1971307
   - Etc.

5. **Check GUI:**
   - Navigate to http://127.0.0.1:8012/
   - Go to RAG tab → Index sub-tab
   - Verify storage metrics show non-zero values

---

## Data Integrity Confirmation

**✅ NO DATA LOSS - All index data is intact:**

| Component | Status | Evidence |
|-----------|--------|----------|
| Chunks JSONL | ✅ Intact | 933 lines, 1.9 MB |
| Embeddings Cache | ✅ Intact | 933 lines, 61 MB |
| BM25 Index | ✅ Intact | 3.9 MB |
| Cards | ✅ Intact | 100 lines, 32 KB |
| Qdrant Collection | ✅ Intact | 933 points, 29 MB |
| Qdrant Vectors | ✅ Intact | 3072-dim, Cosine distance |
| Search Functionality | ✅ Working | Qdrant API responds correctly |

**The issue is purely a display/metrics bug caused by missing volume mounts.**

---

## References

- **Code Files Examined:**
  - `/Users/davidmontgomery/agro-rag-engine/server/index_stats.py` (lines 53-198)
  - `/Users/davidmontgomery/agro-rag-engine/server/app.py` (lines 1618-1633)
  - `/Users/davidmontgomery/agro-rag-engine/docker-compose.services.yml`
  - `/Users/davidmontgomery/agro-rag-engine/.dockerignore`
  - `/Users/davidmontgomery/agro-rag-engine/.gitignore`
  - `/Users/davidmontgomery/agro-rag-engine/Dockerfile`

- **Docker Containers:**
  - `fe2b64e2cab8_agro-api` (API server)
  - `qdrant` (Vector database)

- **Git Commits Reviewed:**
  - `118ab04` - `bad929f` (recent commits)
  - `0254edc` - Initial docker-compose.services.yml

---

## Conclusion

This investigation confirms that:

1. **NO index data was deleted** - all files exist on the host filesystem
2. **NO git operations caused data loss** - `.gitignore` correctly excludes `/out`
3. **NO Qdrant issues** - collection has all 933 vectors and is healthy
4. **Root cause is purely configuration** - missing volume mounts in `docker-compose.services.yml`

The fix is straightforward: add volume mounts to bind the host's `/out` and `/data` directories into the container. This will immediately resolve the storage metrics issue without requiring any data recovery or re-indexing.

**Estimated Time to Fix**: 2 minutes (edit YAML, restart container)
**Risk Level**: Low (no data changes, only configuration)
**Data Recovery Needed**: None

---

**Investigation Complete**
**Next Step**: Apply recommended fix (add volume mounts) and verify with user approval before pushing changes upstream.
