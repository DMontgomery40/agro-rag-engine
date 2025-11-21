# Architecture Decision: Strangler Pattern Merge Strategy
**Date**: October 24, 2025  
**Architect**: Opus (Refactor Architect)  
**Status**: APPROVED

## Decision: Option A - Parallel Entrypoints (Safest)

After reviewing both worktrees and the incident analysis, I'm implementing **Option A: Separate Entrypoints** for the strangler pattern refactor.

## Rationale

1. **Zero Production Risk**: Old monolithic app remains untouched
2. **Parallel Testing**: Can verify new code extensively before cutover
3. **Easy Rollback**: No changes to production path
4. **Clean Separation**: Clear boundary between old and new

## Implementation Plan

### Phase 1: Clean Merge (TODAY)
- Backend worktree: Discard uncommitted shim changes, keep monolithic app.py
- Frontend worktree: Merge as-is (already correct)
- Both merge to development branch

### Phase 2: Parallel Testing
- Production: `server.app:app` (monolithic)
- Testing: `server.asgi:app` (modular)
- Both coexist in same codebase

### Phase 3: Cutover (LATER)
- After 48-72 hours of parallel testing
- Separate PR to switch Docker CMD
- Keep monolithic as backup for one release cycle

## Technical Details

**Current State**:
- Backend commit fb41272: Has full monolithic + new modular code ✅
- Frontend commit 72b7721: Has React app with proper mounts ✅
- Docker mounts: Already fixed (`./web:/app/web` present) ✅

**Next Actions**:
1. Discard backend uncommitted changes
2. Merge both branches to development
3. Test integration
4. Prepare delegation instructions for tactical execution

## Success Metrics
- All existing endpoints remain functional
- New modular code importable and testable
- Both /gui and /web interfaces accessible
- Docker containers stable
- Zero production downtime

---
**Approved by**: Opus (Refactor Architect)
