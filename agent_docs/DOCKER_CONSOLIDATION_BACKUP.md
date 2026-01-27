# Docker Consolidation Safety Backups
**Created**: 2025-11-22 13:18 UTC
**Purpose**: Safety backups before Docker Compose consolidation

## Phase 1: CRITICAL FIXES ✅ COMPLETE
1. ✅ Removed `-v` flag from `scripts/down.sh` - prevents volume deletion
2. ✅ Fixed `docker_infra_down` in `server/routers/docker.py` - GUI button now works

## Phase 2: SAFETY BACKUPS ✅ COMPLETE

### Current Container State
**Backup File**: `_archived/docker/backup-containers.txt`
**Active Containers**: 11 containers running
**Split Brain**:
- `rag-service-api` (Exited) - from root compose
- `agro-api` (Created) - from services compose

### Named Volumes Discovered
**Backup File**: `_archived/docker/backup-volumes.txt`
**Volumes Found**:
- `agro_alertmanager_data`
- `agro_grafana_data`
- `agro_loki_data`
- `agro_prom_data`
- `agro_redis_data` ← CRITICAL: Contains embedding cache, checkpoints
- `infra_alertmanager_data` (duplicate from infra compose)
- `infra_grafana_data` (duplicate from infra compose)
- `infra_loki_data` (duplicate from infra compose)
- `infra_prom_data` (duplicate from infra compose)

### Data Backups Created

#### Qdrant Vector Database
- **Location**: `data/backups/qdrant_20251122_131832/`
- **Size**: 14 MB
- **Contains**: 2575 indexed code chunks from agro-rag-engine
- **Status**: ✅ Complete backup

#### Eval Results
- **Location**: `data/backups/evals_20251122_131850/`
- **Files**: 29 JSON files
- **Contains**: All historical eval runs including config snapshots
- **Status**: ✅ Complete backup

#### Redis Cache
- **Location**: `data/backups/redis_20251122_131850/`
- **Contains**: Embedding cache, LangGraph checkpoints
- **Status**: ✅ Data copied (ownership warnings OK)

### Docker Compose Configuration
**Backup File**: `_archived/docker/backup-docker-compose-config.yml`
**Contains**: Complete merged configuration of current root `docker-compose.yml`

## Rollback Procedure
If anything breaks during consolidation:

```bash
# 1. Stop current services (NO -v flag!)
docker compose down

# 2. Restore Qdrant if needed
rm -rf data/qdrant
cp -r data/backups/qdrant_20251122_131832 data/qdrant

# 3. Restore evals if needed
rm -rf data/evals
cp -r data/backups/evals_20251122_131850 data/evals

# 4. Restart services
docker compose up -d

# 5. Verify health
curl http://127.0.0.1:6333/collections  # Qdrant
curl http://127.0.0.1:8012/health        # API
```

## What's Protected
- ✅ Qdrant data (bind mount + backup)
- ✅ Eval results (bind mount + backup)
- ✅ Index files (bind mount to ./out*)
- ✅ Models (bind mount to ./models)
- ✅ Checkpoints (bind mount to ./checkpoints)
- ✅ Redis cache (named volume + backup)
- ✅ Observability data (named volumes - backed up in backup file list)

## Next Steps: Phase 3
- Enhance root `docker-compose.yml` with dev features
- Add source code mounts for hot reload
- Add Docker socket for GUI control
- Test thoroughly before proceeding to Phase 4
