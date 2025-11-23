# Qdrant macOS Enterprise Solution Research

## WEB RESEARCH FINDINGS

### CONFIRMED ISSUES ON macOS:
- ✅ **Vectors reset to zero** on container rebuild (Mac-specific, NOT on Ubuntu)
- ✅ **FUSE/osxfs filesystems cause corruption** (caching issues)
- ✅ **HFS/HFS+ are NOT fully POSIX-compliant**
- ✅ **Bind mounts `./data/qdrant:/qdrant/storage` - BROKEN on Mac**
- ✅ **Docker volumes** - RECOMMENDED by Qdrant, but you reported "didn't persist across container rebuilds"
- ✅ **Known Issue**: https://github.com/qdrant/qdrant/issues/6676

### QDRANT SNAPSHOT FEATURE (Enterprise Solution):
- ✅ **Built-in snapshot API**: `create_snapshot()`, `restore_snapshot()`
- ✅ **Tar archives** containing full collection data + config
- ✅ **Can store snapshots OUTSIDE Docker** (avoids FUSE entirely)
- ✅ **Scales to MILLIONS of vectors**
- ✅ **Used for backups, replication, disaster recovery**
- ✅ **Tutorial**: https://qdrant.tech/documentation/database-tutorials/create-snapshot/

### MEMORY REQUIREMENTS (Millions of Vectors):
- **1M vectors × 384 dims × 4 bytes** = ~1.5 GB (raw float32)
- **With Scalar Quantization (int8)**: ~400 MB
- **With Product Quantization**: ~100-200 MB
- **Qdrant supports on-disk storage** with memory-mapped indices (can handle billions of vectors)

---

## ENTERPRISE SOLUTIONS FOR macOS

### OPTION 1: SNAPSHOT-BASED PERSISTENCE ⭐ (RECOMMENDED)
**Best for your current setup - minimal changes, enterprise-ready**

#### How it works:
1. **Store Qdrant data as snapshots** on local disk (outside Docker, outside FUSE)
2. **Auto-restore from snapshot** on container startup if collection doesn't exist
3. **BM25 always available immediately** (already on disk in `out/`)
4. **Dense vectors restore from snapshot** (~2 min for 2575 chunks, scales linearly)
5. **Periodic snapshots** (e.g., after reindex, before shutdown)

#### Benefits:
- ✅ **Scales to MILLIONS of vectors** (snapshots are just .tar files)
- ✅ **No FUSE issues** (snapshots stored in regular filesystem)
- ✅ **Works with current Docker setup** (just add snapshot restore logic)
- ✅ **Fast recovery** (automatic on startup)
- ✅ **Backup-friendly** (snapshots can be versioned, archived)

#### Implementation:
- Add startup script that checks for snapshot and restores if needed
- Add post-index script that creates snapshot after successful index
- Store snapshots in `./data/snapshots/` (regular filesystem, not Docker volume)

---

### OPTION 2: REMOTE QDRANT (True Enterprise Deployment)
**Best for multi-user production with millions of users**

#### How it works:
1. **Run Qdrant on Linux server** (VM, cloud instance, remote host)
2. **Mac connects via `QDRANT_URL=http://remote-host:6333`**
3. **Zero macOS filesystem issues** (Qdrant runs on proper Linux)
4. **Production-grade for millions of users**

#### Benefits:
- ✅ **Zero macOS compatibility issues**
- ✅ **Unlimited scale** (proper Linux filesystem)
- ✅ **Multi-user ready** (central Qdrant server)
- ✅ **Managed option available** (Qdrant Cloud)

#### Implementation:
- Spin up Linux VM or cloud instance
- Deploy Qdrant with Docker on Linux
- Update `QDRANT_URL` in `.env` or `docker-compose.yml`

---

### OPTION 3: LIMA VM (Enterprise-grade Local Development)
**Best for local-only but enterprise-scale**

#### How it works:
1. **Run Qdrant inside Lima** (Linux VM on Mac)
2. **Real Linux filesystem** (ext4), fully POSIX-compliant
3. **No FUSE/osxfs corruption**
4. **Scales to millions of vectors**

#### Benefits:
- ✅ **Proper Linux environment on Mac**
- ✅ **No filesystem compatibility issues**
- ✅ **Production-like local dev**
- ✅ **Tutorial**: https://medium.com/@chynchwen/qdrant-vector-db-in-mac-with-lima-vm

#### Implementation:
- Install Lima: `brew install lima`
- Create Lima VM with Qdrant
- Connect from Mac via Lima's port forwarding

---

### OPTION 4: HYBRID ON-DISK + SNAPSHOTS
**Best of all worlds - current setup + safety net**

#### How it works:
1. **Keep current on-disk storage** with bind mount (works most of the time)
2. **Regular snapshot backups** (cron job) to survive corruption
3. **Auto-restore from snapshot** on startup if collection broken/missing
4. **Fast startup from disk** (when it works), fallback to snapshot

#### Benefits:
- ✅ **Fast when it works** (no restore delay)
- ✅ **Safe when it breaks** (snapshot fallback)
- ✅ **Minimal changes to current setup**
- ✅ **Scales indefinitely**

#### Implementation:
- Add snapshot creation after successful operations
- Add corruption detection on startup
- Auto-restore from latest snapshot if corrupted

---

## RECOMMENDATION

### For Your Current Setup:
**Start with OPTION 1 (Snapshots)** - least disruptive, enterprise-ready

### For True Enterprise (Millions of Users):
**Migrate to OPTION 2 (Remote Qdrant on Linux)** for production

### Why Snapshots Solve the Problem:
1. **Snapshots are .tar files** - regular filesystem, no FUSE/osxfs issues
2. **Qdrant's native feature** - officially supported, battle-tested
3. **Scales to any size** - millions of vectors, no RAM limit
4. **Fast restore** - 2-3 minutes for moderate collections
5. **Backup-friendly** - can version, archive, replicate

---

## NEXT STEPS

### Immediate Action (Option 1 Implementation):
1. Create `scripts/qdrant_snapshot_restore.py` - restore snapshot on startup
2. Update `docker-compose.yml` - add init script for Qdrant
3. Create `scripts/qdrant_snapshot_create.py` - create snapshot after index
4. Store snapshots in `./data/snapshots/` (regular filesystem)
5. Test full cycle: index → snapshot → container rebuild → restore

### Future Migration (Option 2):
1. Provision Linux VM or cloud instance
2. Deploy Qdrant with proper Linux filesystem
3. Update `QDRANT_URL` to remote host
4. Migrate data via snapshots

---

## SOURCES
- Qdrant GitHub Issue (Mac corruption): https://github.com/qdrant/qdrant/issues/6676
- Qdrant Troubleshooting (FUSE): https://qdrant.tech/documentation/guides/common-errors/
- Qdrant Snapshots Tutorial: https://qdrant.tech/documentation/database-tutorials/create-snapshot/
- Qdrant Concepts (Snapshots): https://qdrant.tech/documentation/concepts/snapshots/
- Lima VM Tutorial: https://medium.com/@chynchwen/qdrant-vector-db-in-mac-with-lima-vm

