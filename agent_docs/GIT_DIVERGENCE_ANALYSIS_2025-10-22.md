# Git Divergence Analysis - development branch
**Generated**: 2025-10-22
**Current Branch**: `development`
**Status**: Diverged from `origin/development` (3 commits ahead, 2 commits behind)

---

## Executive Summary

Your local `development` branch has **diverged** from the remote. The branches have different histories that conflict.

- **Local branch**: 3 unique commits (9f81c30, 2c47930, b2d5b53)
- **Remote branch**: 2 unique commits (cc91c2a, 9a38dfa)
- **Conflict zones**: GUI dashboard code, test files, documentation, API call logs

**Critical Finding**: The remote commits **REMOVED the System Status dashboard section** that your local commits are trying to restore. The remote also has new strict rules against removing broken GUI settings.

---

## Branch Status

```
Current branch: development
Local HEAD: 9f81c30 "Revert feat: Complete Priority 2 tooltip standardization..."
Remote HEAD: cc91c2a "docs(rules): enforce non-removal of broken GUI settings (ADA/contract)"

Git reports: "Your branch and 'origin/development' have diverged,
and have 3 and 2 different commits each, respectively."
```

---

## Remote Commits We're Behind (What's on origin/development)

### Commit 1: cc91c2a (Most Recent)
**Author**: DMontgomery40
**Date**: Wed Oct 22 10:48:24 2025 -0600
**Message**: `docs(rules): enforce non-removal of broken GUI settings (ADA/contract)`

**Changes**:
- **Files Modified**: 3 documentation files
  - `AGENTS.md` (+7 lines)
  - `CLAUDE.md` (+15 lines)
  - `cursor.rules` (+7 lines)

**What it Does**: Adds new policy rules to all agent instruction files:
```markdown
## Broken GUI Settings Must Not Be Removed
- Never remove or hide settings because they are "broken", "fake", or "simulated".
- Such cases are ADA and contractual compliance issues that must be FIXED quickly.
- Do not erase anything from the GUI; preserve and repair functionality.
- **BROKEN SETTINGS IN GUI MUST BE FIXED, THEY MUST NOT BE ERASED**
```

**Impact**: **POLICY ENFORCEMENT**
- This is a direct response to the dashboard deletion incident
- Adds legal/contractual language about ADA compliance
- Makes it explicit that broken features must be fixed, not deleted

---

### Commit 2: 9a38dfa
**Author**: DMontgomery40
**Date**: Tue Oct 21 20:37:23 2025 -0600
**Message**: `chore: Update GUI and backend audit documentation with bug fixes and performance metrics`

**Full Commit Message**:
```
- Updated the GUI backend audit document to reflect the current audit status,
  including an increase in audited elements from 11 to 18 and a total of 6 bugs
  fixed (2 critical security, 4 wiring).
- Removed placeholder "System Status" section from the GUI to comply with
  guidelines against stubs and placeholders.
- Enhanced the dashboard by adding a refresh button for stats and updating
  the display of total chunks in the index status.
- Exposed total chunks count in the index stats for better monitoring.
- Cleaned up API performance loading code in the dashboard operations script.
```

**Files Changed**: 13 files
- `AGENTS.md` (modified)
- `agent_docs/GUI_BACKEND_AUDIT_2025-10-21.md` (modified - major updates)
- `agent_docs/HANDOFF-SESSION-3-EVALUATION-RERANKER.md` (added)
- `cursor.rules` (modified)
- `data/logs/alerts.jsonl` (modified - added 1 entry)
- `data/tracking/api_calls.jsonl` (modified - added 609 lines)
- `gui/index.html` (modified - **REMOVED System Status section**)
- `gui/js/dashboard-operations.js` (modified - removed 7 lines)
- `gui/js/index-display.js` (modified - changed terminology)
- `server/index_stats.py` (modified - added 3 lines)
- `tests/dashboard_fake_metrics_removed.spec.js` (added - 95 lines)
- `tests/dashboard_total_chunks.spec.js` (added - 72 lines)
- `tests/refresh_stats_button.spec.js` (added - 85 lines)

**What it Does**:
1. **DELETED System Status dashboard section** from `gui/index.html`
   - Removed metrics: Health, Repo, Cards, MCP Servers, Auto-Tune
   - Left HTML comment explaining removal: "Fake 'System Status' section - all metrics were placeholders"

2. **Added new test** `dashboard_fake_metrics_removed.spec.js` to verify deletion
   - Tests that `#dash-health`, `#dash-repo`, `#dash-cards`, etc. are NOT attached

3. **Removed old test** `tests/dashboard_system_status_wired.spec.js` (130 lines deleted)
   - This test verified that metrics WERE populated with real data

4. **Added "Index Health" section** to replace System Status

5. **Changed terminology**: "Total Chunks" → "Keywords" in index display

6. **Cleaned up** duplicate code in `dashboard-operations.js`

7. **Updated audit docs** to reflect 18 audited elements, 6 bugs fixed

---

## Local Commits Not on Remote (Our Work)

### Commit 1: 9f81c30 (Current HEAD)
**Message**: `Revert "feat: Complete Priority 2 tooltip standardization with external links"`
**What it Does**: Reverts a previous tooltip standardization commit

### Commit 2: 2c47930
**Message**: `Update alert and query logs with new entries; enhance GUI for system status display`
**What it Does**:
- Added alert entries for retrieval quality monitoring
- Updated queries.jsonl with additional logs
- **Enhanced GUI with detailed system status section** (NOT placeholders)
- Modified index-display.js terminology
- Removed deprecated code in index_stats.py

### Commit 3: b2d5b53
**Message**: `grafana and vscode both working.. fow now`
**What it Does**: Integration fixes for Grafana and VSCode

---

## File-by-File Conflict Analysis

### High Conflict Risk Files

#### 1. `gui/index.html` - **SEVERE CONFLICT**
- **Remote**: Deleted System Status section (lines 5005-5036)
- **Local**: May have System Status section or modifications to it
- **Conflict Type**: Structural change (deletion vs modification)
- **Resolution Needed**: Manual merge - decide which version of dashboard to keep

#### 2. `data/tracking/api_calls.jsonl` - **SEVERE CONFLICT**
- **Remote**: Deleted 1259 lines, added 609 lines (massive cleanup)
- **Local**: 575 lines of uncommitted changes
- **Conflict Type**: Both sides modified extensively
- **Resolution Needed**: Keep remote version + reapply any critical local changes

#### 3. `tests/dashboard_system_status_wired.spec.js` - **DELETED ON REMOTE**
- **Remote**: Deleted entire file (was testing that metrics populate)
- **Local**: Likely has modifications or test results referencing it
- **Conflict Type**: Deletion vs modification
- **Resolution Needed**: File will be deleted - local changes lost

#### 4. `test-results/` directory - **CONFLICT**
- **Remote**: Modified `.last-run.json`, deleted error context files
- **Local**: Has uncommitted changes to error context files
- **Conflict Type**: Test result data mismatch
- **Resolution Needed**: Remote test results are newer, local results obsolete

### Medium Conflict Risk Files

#### 5. `gui/js/index-display.js` - **TERMINOLOGY CHANGE**
- **Remote**: Changed "Total Chunks" to "Keywords"
- **Local**: May have reverted this change
- **Conflict Type**: Competing terminology changes
- **Resolution Needed**: Decide on correct terminology

#### 6. `server/index_stats.py` - **FUNCTIONALITY CHANGE**
- **Remote**: Added 3 lines (total_chunks exposure)
- **Local**: May have removed or modified this
- **Conflict Type**: Feature addition vs removal
- **Resolution Needed**: Decide if total_chunks should be exposed

#### 7. `data/logs/alerts.jsonl` and `queries.jsonl` - **LOG CONFLICTS**
- **Remote**: Modified/cleaned up logs
- **Local**: May have different log entries
- **Conflict Type**: Append-only file conflicts
- **Resolution Needed**: Merge both sets of logs chronologically

### Low Conflict Risk Files

#### 8. `AGENTS.md`, `CLAUDE.md`, `cursor.rules` - **DOCUMENTATION**
- **Remote**: Added new policy section
- **Local**: No uncommitted changes to these files
- **Conflict Type**: Clean fast-forward possible for these files
- **Resolution Needed**: None - can accept remote changes

#### 9. `gui/js/tooltips.js` - **LARGE CHANGES**
- **Remote**: Modified 165 lines (changed URLs from internal docs to external)
- **Local**: No uncommitted changes
- **Conflict Type**: Clean fast-forward possible
- **Resolution Needed**: None - accept remote changes

### Files Only Modified Locally (No Remote Conflict)

- `gui/js/navigation.js` - Just added empty line
- `gui/js/rag-navigation.js` - Just added empty line
- `gui/js/vscode.js` - Just added empty line
- `tests/playwright.gui.config.ts` - Local changes only
- `agent_docs/model-updates-2025-10-20.md` - Local changes only

---

## Risk Analysis: What Breaks If We DON'T Pull

### Immediate Risks

1. **Policy Violation** (Severity: HIGH)
   - Missing new ADA compliance policy in AGENTS.md/CLAUDE.md
   - Future agents won't see the "don't delete GUI settings" rule
   - Could repeat the same dashboard deletion mistake
   - **Impact**: Legal/contractual exposure

2. **Documentation Divergence** (Severity: MEDIUM)
   - Missing GUI backend audit updates (11→18 audited elements)
   - Missing handoff document for evaluation/reranker work
   - Out of date with actual codebase state
   - **Impact**: Poor agent handoffs, confusion about system state

3. **Test Suite Mismatch** (Severity: HIGH)
   - Local tests expect System Status section to exist
   - Remote tests expect it to be deleted
   - Tests will fail inconsistently
   - **Impact**: CI/CD breakage, can't verify changes

4. **Tooltip Links Broken** (Severity: LOW)
   - Missing 165 lines of tooltip URL updates
   - Links point to internal docs that may not be published
   - **Impact**: User experience degraded in GUI

5. **API Call Log Bloat** (Severity: MEDIUM)
   - Missing 1259 line cleanup in api_calls.jsonl
   - File continues growing without cleanup
   - **Impact**: Disk space, slower git operations

### What Breaks If We DO Pull (Conflicts)

1. **System Status Dashboard Collision** (Severity: CRITICAL)
   - Remote deleted it, local may be restoring/modifying it
   - **Both approaches can't coexist**
   - Git will force a resolution choice
   - **Impact**: Manual merge required, hours of work to resolve

2. **Test Result Loss** (Severity: LOW)
   - Local test results in `test-results/` will be overwritten
   - Error context files will be deleted
   - **Impact**: Lost local debugging data (can regenerate)

3. **API Call Log Data Loss** (Severity: LOW)
   - 575 lines of local API call logs will conflict with remote cleanup
   - **Impact**: Lost some historical API call tracking (not critical)

4. **Uncommitted Local Changes** (Severity: MEDIUM)
   - 9 files with uncommitted changes will conflict
   - Git will refuse to pull until changes are committed/stashed
   - **Impact**: Forced to make commit decisions before seeing remote changes

---

## Benefit Analysis: What Improves If We DO Pull

### Improvements Gained

1. **Policy Protection** ✅
   - New ADA compliance documentation in place
   - Clear rules against deleting GUI features
   - Legal/contractual protection language
   - **Benefit**: Prevents future violations, protects Anthropic

2. **Cleaner Codebase** ✅
   - Removed "fake" System Status section (according to remote)
   - Added 3 new passing tests
   - Cleaned up 1259 lines of API call logs
   - Updated terminology (Total Chunks → Keywords)
   - **Benefit**: Less confusing code, better maintainability

3. **Better Documentation** ✅
   - GUI backend audit now shows 18 audited elements (up from 11)
   - Documents 6 bug fixes (2 critical security, 4 wiring)
   - New handoff doc for evaluation/reranker work
   - **Benefit**: Better agent continuity, clearer system state

4. **External Tooltip Links** ✅
   - 165 lines of tooltip URL updates
   - Changed from `/docs/` internal links to Wikipedia/official docs
   - **Benefit**: Links work for all users, not just internal team

5. **Audit Trail** ✅
   - New test files document what was removed and why
   - `dashboard_fake_metrics_removed.spec.js` proves placeholders are gone
   - **Benefit**: Clear record of decisions and changes

---

## The Core Conflict: Dashboard Philosophy

### Remote's Perspective (origin/development)
**Claim**: System Status section was "fake" and "placeholder"
- Metrics never populated with real data
- Violates CLAUDE.md rule against stubs/placeholders
- Should be deleted and replaced with "Index Health" section
- Added test to verify it stays deleted

**Evidence**:
- Commit message says "Removed placeholder 'System Status' section"
- HTML comment: "all metrics were placeholders that never got populated"
- Test file `dashboard_fake_metrics_removed.spec.js` enforces deletion

### Local's Perspective (Your Work)
**Claim**: System Status section is REAL and should be restored
- Metrics call actual backend APIs
- Code in `gui/app.js:1428-1484` (`refreshDashboard()`) populates them
- Delete was wrong - should have been fixed, not removed
- Violates new ADA accessibility policy (user needs visual dashboard)

**Evidence**:
- `DASHBOARD_METRICS_RESTORATION_HANDOFF.md` documents the issue
- Test results show metrics populated: "healthy", "agro (1 repos)", "100 cards", etc.
- `refreshDashboard()` function proves backend integration exists
- New policy in `cc91c2a` explicitly forbids deleting broken GUI features

### The Paradox
**The remote branch added a rule (cc91c2a) that forbids the action taken in its previous commit (9a38dfa)!**

Commit `cc91c2a` says: "BROKEN SETTINGS IN GUI MUST BE FIXED, THEY MUST NOT BE ERASED"
Commit `9a38dfa` did: "Removed placeholder 'System Status' section from the GUI"

**This is a self-contradiction in the remote branch's history.**

---

## Conflict Resolution Strategy Recommendations

### Option 1: Pull + Manual Merge (RECOMMENDED)
**Approach**: Accept remote changes, then reapply local dashboard work carefully

**Steps**:
1. **Commit local changes first**
   ```bash
   git add agent_docs/model-updates-2025-10-20.md
   git add gui/js/navigation.js gui/js/rag-navigation.js gui/js/vscode.js
   git add tests/playwright.gui.config.ts
   git commit -m "wip: Local changes before merge"
   ```

2. **Stash test results** (regeneratable)
   ```bash
   git checkout -- test-results/
   git checkout -- data/tracking/api_calls.jsonl
   ```

3. **Pull with merge**
   ```bash
   git pull origin development
   ```

4. **Resolve conflicts**:
   - Accept remote version of `gui/index.html` (System Status deleted)
   - Accept remote version of `gui/js/tooltips.js` (external links)
   - Accept remote documentation changes (AGENTS.md, CLAUDE.md)

5. **THEN restore System Status** in a new commit
   - Cherry-pick or manually restore the dashboard section
   - Reference new policy from `cc91c2a` as justification
   - Write commit message citing ADA compliance requirement

**Pros**: Clean history, respects remote work, can restore dashboard with policy backing
**Cons**: Manual conflict resolution, takes time, requires understanding of changes
**Risk**: Medium - requires careful merge but straightforward

---

### Option 2: Force Push Local Changes (NOT RECOMMENDED)
**Approach**: Overwrite remote with local history

```bash
git push --force-with-lease origin development
```

**Pros**: Keeps local work intact, no merge conflicts
**Cons**:
- Destroys remote commits (9a38dfa, cc91c2a)
- Loses policy updates and documentation
- Breaks for anyone else working on development
- Violates git collaboration best practices
- **User explicitly forbids force push to main/master in CLAUDE.md**

**Risk**: VERY HIGH - data loss, team disruption
**Verdict**: ❌ DON'T DO THIS

---

### Option 3: Rebase Local on Remote (RISKY)
**Approach**: Replay local commits on top of remote

```bash
git pull --rebase origin development
```

**Pros**: Linear history, clean commit graph
**Cons**:
- Complex conflict resolution for dashboard changes
- May need to resolve same conflict multiple times (once per commit)
- Can get messy with 3 local commits vs 2 remote commits
- Harder to undo if something goes wrong

**Risk**: HIGH - complex, error-prone
**Verdict**: ⚠️ Only if you're experienced with rebase

---

### Option 4: Create Merge Branch (SAFEST)
**Approach**: Do the merge in a separate branch first

```bash
git checkout -b merge-development-origin
git pull origin development
# Resolve conflicts
# Test everything
# Then merge into development
```

**Pros**: Can abort without affecting current work, test merge before committing
**Cons**: Extra branch management, still need to resolve conflicts
**Risk**: LOW - safest approach
**Verdict**: ✅ Best for testing merge strategy

---

## Detailed Merge Conflict Predictions

When you run `git pull origin development`, Git will likely halt with conflicts in:

### Automatic Merge Failures

1. **`gui/index.html`** - CONFLICT
   ```
   <<<<<<< HEAD (local)
   [Your System Status section HTML]
   =======
   <!-- REMOVED: Fake "System Status" section -->
   >>>>>>> origin/development
   ```
   **Resolution**: Choose whether to keep or delete System Status section

2. **`data/tracking/api_calls.jsonl`** - CONFLICT
   ```
   [Massive diff - both sides modified heavily]
   ```
   **Resolution**: Accept remote version (cleaner), lose local API logs

3. **`test-results/` files** - CONFLICT
   ```
   [Different test results]
   ```
   **Resolution**: Accept remote, regenerate tests locally

### Files That Will Auto-Merge

- `AGENTS.md` - Remote adds section, local has no changes → Clean merge
- `CLAUDE.md` - Remote adds section, local has no changes → Clean merge
- `cursor.rules` - Remote adds section, local has no changes → Clean merge
- `gui/js/tooltips.js` - Remote modifies, local has no changes → Clean merge

### Files Git Will Ask About

- `tests/dashboard_system_status_wired.spec.js` - Remote deleted, local may reference
  - Git will say: "deleted by them"
  - Resolution: Accept deletion or keep file (manual decision)

---

## Specific File Diffs

### `gui/index.html` Changes

**Remote removed (lines 5005-5036)**:
```html
<!-- System Status section with 5 metrics -->
<div style="display: grid; grid-template-columns: 300px 1fr;">
  <!-- Health, Repo, Cards, MCP Servers, Auto-Tune metrics -->
  <span id="dash-health">—</span>
  <span id="dash-repo">—</span>
  <span id="dash-cards">—</span>
  <div id="dash-mcp">—</div>
  <span id="dash-autotune">—</span>
</div>
```

**Remote added**:
```html
<!-- HTML comment explaining removal -->
<!-- Index Health Section (replacement) -->
<div id="dash-index-health-metrics">Loading health data...</div>
```

### `gui/js/tooltips.js` Changes

**165 lines modified** - Changed internal doc links to external:
- `/docs/RETRIEVAL.md` → `https://en.wikipedia.org/wiki/...`
- `/docs/CARDS.md` → `https://www.pinecone.io/learn/semantic-search/`
- `/docs/MCP_README.md` → `https://github.com/modelcontextprotocol/specification`

### `data/tracking/api_calls.jsonl` Changes

**Remote cleanup**:
- Deleted: Lines with old API call logs (1259 lines removed)
- File went from ~35k lines to ~34k lines
- Kept only recent logs

**Local additions**:
- 575 lines of new uncommitted changes
- Recent API calls from local testing

### `tests/` Directory Changes

**Remote added**:
- `dashboard_fake_metrics_removed.spec.js` (95 lines) - Tests deletion
- `dashboard_total_chunks.spec.js` (72 lines) - Tests new total chunks display
- `refresh_stats_button.spec.js` (85 lines) - Tests refresh functionality

**Remote deleted**:
- `tests/dashboard_system_status_wired.spec.js` (130 lines) - Tested metric population

---

## Uncommitted Local Changes Analysis

### Files Modified Locally (Uncommitted)

1. `agent_docs/model-updates-2025-10-20.md` - Documentation
2. `data/tracking/api_calls.jsonl` - 575 lines of logs
3. `gui/js/navigation.js` - Added 1 empty line
4. `gui/js/rag-navigation.js` - Added 1 empty line
5. `gui/js/vscode.js` - Added 1 empty line
6. `test-results/.last-run.json` - Test metadata
7. `test-results/.../error-context.md` - Test error logs (2 files)
8. `tests/playwright.gui.config.ts` - Test configuration

### Untracked Files

- `agent_docs/DASHBOARD_METRICS_RESTORATION_HANDOFF.md` - Your handoff doc

**Impact**: Git will refuse to pull until you:
- Commit these changes, OR
- Stash these changes, OR
- Discard these changes

---

## Timeline Reconstruction

### Remote Timeline (origin/development)

```
Oct 21 20:37 - Commit 9a38dfa
├─ Agent decided System Status was "fake"
├─ Deleted System Status section from GUI
├─ Added test to verify it stays deleted
├─ Updated audit docs: 18 audited, 6 bugs fixed
└─ Message: "Removed placeholder System Status section"

Oct 22 10:48 - Commit cc91c2a
├─ User upset about deletions
├─ Added strict policy: NEVER delete GUI features
├─ Policy: "BROKEN SETTINGS MUST BE FIXED, NOT ERASED"
└─ This forbids what 9a38dfa did!
```

### Local Timeline (Your Branch)

```
Oct 22 09:41 - Commit b2d5b53
├─ "grafana and vscode both working.. fow now"
└─ Integration work

Oct 22 09:41 - Commit 2c47930
├─ "Update alert and query logs; enhance GUI for system status"
├─ Restored/enhanced System Status section
└─ Populated metrics with real data

Oct 22 09:53 - Commit 9f81c30 (HEAD)
├─ Reverted tooltip standardization work
└─ Current state

[Uncommitted changes]
├─ Test results from dashboard verification
├─ Documentation about restoration
└─ API call logs
```

### The Divergence Point

Both branches diverged **after** some common ancestor (before Oct 21 20:37).
- Remote went: Delete dashboard → Add policy against deletions
- Local went: Restore dashboard → Verify it works → Document it

---

## Decision Matrix

| Factor | Pull Remote | Keep Local | Merge Branch |
|--------|-------------|------------|--------------|
| **Policy Compliance** | ✅ Gets new policy | ❌ Missing policy | ✅ Gets policy + can restore |
| **Dashboard State** | ❌ Loses System Status | ✅ Keeps System Status | ✅ Can have both (staged) |
| **Documentation** | ✅ Updated audit docs | ❌ Outdated docs | ✅ Gets both sets |
| **Test Suite** | ⚠️ Tests expect deletion | ⚠️ Tests expect presence | ✅ Can reconcile tests |
| **Tooltip Links** | ✅ External links work | ❌ Internal links may break | ✅ Gets external links |
| **Work Preservation** | ❌ Local work lost | ✅ Local work kept | ✅ Both preserved |
| **Conflict Resolution** | ⚠️ Manual conflicts | ✅ None needed | ⚠️ Manual but isolated |
| **Team Sync** | ✅ Up to date with team | ❌ Out of sync | ✅ Syncs + preserves work |
| **Risk Level** | Medium | Low (short term) | Low |

**Recommendation**: **Merge Branch** approach (Option 4)
- Safest: Test merge in isolation
- Preserves: Both remote updates AND local dashboard work
- Allows: Verification before committing to merge
- Aligns: With new policy from cc91c2a (fix, don't delete)

---

## Recommended Action Plan

### Phase 1: Safety Backup (Do This First)

```bash
# Create backup branch from current state
git branch backup-before-merge-$(date +%s)

# Verify backup
git branch | grep backup
```

### Phase 2: Create Merge Testing Branch

```bash
# Create new branch for testing merge
git checkout -b merge-origin-development-test

# Commit local changes first
git add agent_docs/model-updates-2025-10-20.md
git add agent_docs/DASHBOARD_METRICS_RESTORATION_HANDOFF.md
git add gui/js/navigation.js gui/js/rag-navigation.js gui/js/vscode.js
git add tests/playwright.gui.config.ts
git commit -m "wip: Preserve local changes before merge test"

# Discard regeneratable test artifacts
git checkout -- test-results/
git checkout -- data/tracking/api_calls.jsonl
```

### Phase 3: Attempt Merge

```bash
# Pull remote into test branch
git pull origin development

# Git will stop here with conflicts
# Read the conflict markers carefully
```

### Phase 4: Resolve Conflicts (Manual)

**For `gui/index.html`**:
- Accept remote deletion initially (remove System Status section)
- Make note: "Will restore in follow-up commit with policy justification"

**For any other conflicts**:
- Accept remote version (cleaner, more up-to-date)
- Document what was lost in commit message

```bash
# After resolving conflicts
git add <conflicted-files>
git commit -m "merge: Resolve conflicts with origin/development

Conflicts resolved:
- gui/index.html: Accepted remote deletion of System Status section
- Will restore dashboard in follow-up commit per ADA policy (cc91c2a)
- Accepted remote tooltip URL updates
- Accepted remote documentation updates
"
```

### Phase 5: Restore Dashboard (New Commit)

```bash
# Now restore System Status section with policy backing
# Edit gui/index.html to add back the dashboard

git add gui/index.html
git commit -m "fix: Restore System Status dashboard per ADA compliance policy

Restoring the System Status dashboard section that was removed in 9a38dfa.

Per policy added in cc91c2a: 'BROKEN SETTINGS IN GUI MUST BE FIXED,
THEY MUST NOT BE ERASED'. The System Status metrics are NOT placeholders -
they are populated by refreshDashboard() in gui/app.js:1428-1484 with real
backend data from:
- /health (system health)
- /api/config (repo info)
- /api/cards (card count)
- /api/mcp/status (MCP server states)
- /api/autotune/status (auto-tune status)

This restoration is required for ADA accessibility compliance as the user
relies on visual dashboard for system monitoring (dyslexia accommodation).

Tests verified metrics populate with real data. See
DASHBOARD_METRICS_RESTORATION_HANDOFF.md for details.
"
```

### Phase 6: Test Merged Branch

```bash
# Run full test suite
cd /Users/davidmontgomery/agro-rag-engine
npm test  # or whatever your test command is

# Manually test dashboard in GUI
# Verify metrics populate correctly

# Check that new policy docs are present
cat AGENTS.md | grep -A 5 "Broken GUI Settings"
```

### Phase 7: Merge to Development (If Tests Pass)

```bash
# Switch back to development
git checkout development

# Merge the tested branch
git merge merge-origin-development-test

# Push to remote (AFTER USER APPROVAL per CLAUDE.md)
# git push origin development
```

---

## Files You'll Need to Review/Edit During Merge

1. **`gui/index.html`** - Restore System Status section HTML
2. **`tests/dashboard_system_status_wired.spec.js`** - Restore test file (deleted by remote)
3. **`tests/dashboard_fake_metrics_removed.spec.js`** - May need to delete (conflicts with restoration)
4. **`gui/js/dashboard-operations.js`** - Verify refresh logic still works
5. **`server/index_stats.py`** - Check if total_chunks exposure is correct

---

## Post-Merge Verification Checklist

- [ ] All policy docs present (AGENTS.md, CLAUDE.md, cursor.rules have new section)
- [ ] Tooltip links point to external URLs (gui/js/tooltips.js updated)
- [ ] System Status dashboard section exists in GUI (gui/index.html)
- [ ] Dashboard metrics populate with real data (run refreshDashboard() test)
- [ ] Tests pass: `dashboard_system_status_wired.spec.js` shows metrics working
- [ ] No placeholder/stub code in System Status section
- [ ] API call logs cleaned up (file size reasonable)
- [ ] Audit documentation accurate (GUI_BACKEND_AUDIT reflects current state)
- [ ] No git conflict markers remaining in any files
- [ ] Git history shows both lineages merged cleanly

---

## Emergency Rollback Procedures

### If Merge Goes Wrong

```bash
# Abort merge in progress
git merge --abort

# OR if merge completed but broken
git reset --hard backup-before-merge-<timestamp>

# Verify you're back to safe state
git log --oneline -5
git status
```

### If You Pushed Bad Merge

```bash
# Create revert commit (preferred)
git revert HEAD -m 1

# OR force reset remote (DANGEROUS, requires user approval)
git reset --hard origin/development~2
git push --force-with-lease origin development
```

---

## Questions to Ask User Before Proceeding

1. **Do you want to pull the remote changes?**
   - Pulling gets you new policy docs, cleaner logs, external tooltip links
   - BUT requires resolving dashboard deletion conflict

2. **Do you want to keep the System Status dashboard?**
   - If YES: We'll merge remote, then restore dashboard with policy justification
   - If NO: We'll accept remote deletion and keep it removed

3. **Are your uncommitted local changes important?**
   - Test results: Can regenerate
   - API call logs: Can discard or keep
   - Navigation.js empty lines: Can discard
   - model-updates-2025-10-20.md: Should commit if important

4. **Do you want to do the merge yourself or have me do it?**
   - I can create the merge branch and attempt auto-resolution
   - You may want to handle dashboard restoration manually

5. **Should we wait for ongoing work in other branches to finish?**
   - feature/tooltip-standardization-v2 branch exists
   - Other agents may be working - check if merge will disrupt them

---

## Summary: What You Need to Know

### The Bottom Line

**Your local branch and remote branch have completely different ideas about what the dashboard should be:**
- Remote thinks: "Dashboard was fake, we deleted it, good riddance"
- Local thinks: "Dashboard was real, it got deleted by mistake, we must restore it"

**The remote ALSO added a new policy that says dashboards shouldn't be deleted.**

This is a **self-contradictory remote branch** - it deleted a feature, then added a rule forbidding feature deletion.

### The Resolution

**You can merge successfully by:**
1. Accepting remote changes (deletion + new policy)
2. THEN immediately restoring dashboard citing the new policy
3. This makes your restoration "legal" under the new rules

The remote's policy change (cc91c2a) actually **validates your restoration work** - you're following the new rule that forbids deletion of GUI features.

### The Irony

The commit that added the "don't delete GUI features" policy is currently sitting behind the commit that deleted a GUI feature. By pulling and then restoring, you're actually **enforcing the policy that the remote branch added**.

---

## Metadata

**Analysis Date**: 2025-10-22
**Branch Analyzed**: `development` (local) vs `origin/development` (remote)
**Divergence**: 3 commits ahead, 2 commits behind
**Conflict Severity**: HIGH (dashboard code, tests, documentation)
**Recommended Strategy**: Merge branch approach (safest)
**Risk Level**: Medium (manageable with careful merge)
**Estimated Resolution Time**: 2-3 hours (including testing)

**Files Created**:
- This analysis: `/Users/davidmontgomery/agro-rag-engine/agent_docs/GIT_DIVERGENCE_ANALYSIS_2025-10-22.md`

---

**END OF ANALYSIS**
