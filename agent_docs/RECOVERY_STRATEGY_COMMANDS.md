# Recovery Strategy - Git Commands

## Current State

```bash
Branch: development
HEAD: 8e52dac (merged, contains bugs)
Origin: 8e52dac (same, already pushed)
Working State: 420d205 (before merge, everything worked)
```

## RECOMMENDED: Option 1 - Surgical Fix

### Step 1: Verify Current State

```bash
# Confirm we're on development
git branch --show-current

# Confirm HEAD is at merge commit
git log --oneline -1

# Check for uncommitted changes
git status
```

### Step 2: Create Backup Branch (Safety)

```bash
# Create backup of current state
git branch backup-before-fix-8e52dac

# Verify backup created
git branch -a | grep backup
```

### Step 3: Fix Dashboard Grid Layout

The issue is in `gui/index.html` around line 5041. Here's the exact fix needed:

**FIND** (lines 5039-5043):
```html
                    </div>
                </div>

            <div>
                <!-- Quick Actions -->
```

**REPLACE WITH**:
```html
                    </div>
                </div>

                <!-- Right: Quick Actions -->
```

**EXPLANATION**: Remove the line `<div>` that appears BEFORE the comment. The comment should be at the same level as the closing `</div></div>`, not wrapped in an extra div.

### Step 4: Remove Duplicate Index Health Section

**FIND** (lines 5172-5184):
```html


                <!-- Index Health Section -->
                <div class="settings-section" style="background: var(--panel); border-left: 3px solid var(--accent);">
                    <h3 style="font-size: 14px; margin-bottom: 16px; color: var(--accent); display: flex; align-items: center; gap: 8px;">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                        </svg>
                        Index Health
                    </h3>
                    <div id="dash-index-health-metrics" style="color: var(--fg-muted); font-size: 12px;">Loading health data...</div>
                </div>

```

**DELETE**: The entire block from the blank lines before `<!-- Index Health Section -->` through the closing `</div>` and blank line after.

### Step 5: Investigate Chat Tab

```bash
# Compare chat sections between working and broken states
git diff 420d205 HEAD -- gui/index.html | grep -B 10 -A 10 "chat-messages"

# Check if JavaScript changed
git diff 420d205 HEAD -- gui/js/chat.js
git diff 420d205 HEAD -- gui/app.js | grep -i chat

# Check CSS changes
git diff 420d205 HEAD -- gui/css/
```

**If chat looks identical**, the issue may be from EARLIER commits (between 790317f and 420d205). In that case:

```bash
# Compare to known-working chat state
git diff 790317f HEAD -- gui/index.html | grep -B 20 -A 20 "chat-ui"
```

### Step 6: Investigate VS Code Editor

```bash
# Compare vscode sections
git diff 420d205 HEAD -- gui/index.html | grep -B 10 -A 10 "vscode\|editor"

# Check if iframe configuration changed
git diff 420d205 HEAD -- gui/index.html | grep -i "iframe"

# Compare to known-working vscode state (b2d5b53 claimed working)
git diff b2d5b53 HEAD -- gui/index.html | grep -B 20 -A 20 "vscode"
```

### Step 7: Test the Fixes

```bash
# After making edits, verify syntax
npx playwright test tests/dashboard_layout.spec.js --headed

# Test chat
npx playwright test tests/chat_interface.spec.js --headed

# Test vscode
npx playwright test tests/vscode_editor.spec.js --headed
```

### Step 8: Commit the Fix

```bash
# Stage the changes
git add gui/index.html

# Commit with detailed message
git commit -m "$(cat <<'EOF'
fix: Repair dashboard layout and remove duplicate Index Health section

The merge at 8e52dac introduced HTML structural errors:

1. Extra <div> tag broke dashboard grid layout
   - Dashboard lost 2-column structure (300px | 1fr)
   - Quick Actions stretched full width instead of right column
   - Fixed by removing extraneous wrapper div at line 5041

2. Duplicate Index Health section
   - Merge added a second Index Health display
   - Showing duplicate/placeholder data
   - Fixed by removing duplicate section at line 5172

Root cause: Manual merge conflict resolution introduced structural
issues when restoring System Status section that was incorrectly
deleted in commit 9a38dfa.

Backend changes from merge are preserved:
- server/index_stats.py: total_chunks metric exposure
- gui/js/index-display.js: Total Chunks display

Verified with Playwright dashboard tests.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"
```

### Step 9: Push the Fix

```bash
# Push to origin
git push origin development
```

---

## ALTERNATIVE: Option 2 - Reset HTML, Keep Backend

If the surgical fix doesn't work or Chat/VS Code issues are too complex:

### Step 1: Reset HTML to Working State

```bash
# Create backup first
git branch backup-before-reset-html

# Reset ONLY gui/index.html to pre-merge working state
git checkout 420d205 -- gui/index.html

# Verify what changed
git diff --cached
```

### Step 2: Verify Backend Changes Preserved

```bash
# These should still show the new total_chunks code:
git diff 420d205 HEAD -- server/index_stats.py
git diff 420d205 HEAD -- gui/js/index-display.js

# If they don't, you'll need to re-apply them manually
```

### Step 3: Test and Commit

```bash
# Test
npx playwright test tests/dashboard_layout.spec.js
npx playwright test tests/chat_interface.spec.js
npx playwright test tests/vscode_editor.spec.js

# Commit
git add gui/index.html
git commit -m "$(cat <<'EOF'
fix: Restore working GUI structure from pre-merge state

Merge 8e52dac introduced multiple HTML structural issues:
- Extra <div> broke dashboard grid layout
- Duplicate Index Health section
- Broke Chat tab interface
- Broke VS Code embedded editor

Resetting gui/index.html to 420d205 (last working state) while
preserving beneficial backend changes:
- server/index_stats.py: total_chunks metric
- gui/js/index-display.js: Total Chunks display

System Status section restored correctly.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

# Push
git push origin development
```

---

## DANGER ZONE: Option 3 - Revert Entire Merge

**ONLY USE IF**: You've confirmed no one else has pulled 8e52dac

### Check if Merge is Public

```bash
# Check remote
git fetch origin
git log origin/development --oneline | head -5

# If 8e52dac is on origin/development, DO NOT REVERT
# Others may have pulled it
```

### Revert the Merge (Safe Method)

```bash
# Create revert commit (safe, doesn't rewrite history)
git revert -m 1 8e52dac

# This creates a NEW commit that undoes the merge
# Git history shows: 8e52dac (merge) → new commit (revert)

# Push
git push origin development
```

### After Reverting, Re-apply Good Changes

```bash
# Manually restore System Status section
# (copy from 420d205:gui/index.html)

# Cherry-pick backend improvements
git show 9a38dfa:server/index_stats.py > /tmp/new_index_stats.py
git show 9a38dfa:gui/js/index-display.js > /tmp/new_index_display.js

# Review and manually apply the good parts:
# - total_chunks exposure in server/index_stats.py
# - Total Chunks display in gui/js/index-display.js

# Commit
git add server/index_stats.py gui/js/index-display.js gui/index.html
git commit -m "feat: Add total_chunks metric with properly restored System Status

Re-applying beneficial changes from reverted merge 8e52dac:
- Backend: Expose total_chunks count in /api/index/stats
- Frontend: Display Total Chunks instead of Keywords count

System Status section properly restored without structural errors.

🤖 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>
"

# Push
git push origin development
```

### Revert the Merge (DANGEROUS - Force Push)

**WARNING**: This WILL break anyone who has pulled the merge!

```bash
# DANGER: Only if you're certain no one else has this
git reset --hard 420d205

# DANGER: Force push (breaks team workflow)
git push --force origin development

# Notify team immediately that they need to:
git fetch origin
git reset --hard origin/development
```

---

## Quick Reference: Specific Diffs

### Dashboard Grid Layout Issue

```bash
# See the exact problem
git show HEAD:gui/index.html | sed -n '5038,5045p'
```

**Output shows**:
```html
                        </div>
                    </div>
                </div>

            <div>  ← PROBLEM: Extra div here
                <!-- Quick Actions -->
                <div>
```

**Should be**:
```html
                        </div>
                    </div>
                </div>

                <!-- Right: Quick Actions -->  ← No wrapper div
                <div>
```

### Duplicate Index Health

```bash
# See the duplicate
git show HEAD:gui/index.html | sed -n '5170,5185p'
```

### Compare Working vs Broken

```bash
# Dashboard structure comparison
diff <(git show 420d205:gui/index.html | sed -n '5000,5200p') \
     <(git show HEAD:gui/index.html | sed -n '5000,5200p')

# Chat section comparison
diff <(git show 420d205:gui/index.html | grep -A 50 "chat-messages") \
     <(git show HEAD:gui/index.html | grep -A 50 "chat-messages")
```

---

## Post-Fix Verification

### Required Checks

```bash
# 1. Verify git state is clean
git status

# 2. Verify commit in history
git log --oneline -5

# 3. Verify pushed to remote
git log origin/development --oneline -5

# 4. Run full test suite
npx playwright test

# 5. Manual verification in browser
# - Open http://localhost:8012
# - Check Dashboard tab: 2-column layout, System Status on left
# - Check Chat tab: Interface loads, not black screen
# - Check VS Code tab: Editor loads, no false "disabled" message
# - Check Index Health: Appears ONCE, shows real data
```

### Rollback Plan (If Fix Fails)

```bash
# If surgical fix made things worse
git reset --hard backup-before-fix-8e52dac
git push --force origin development  # Only if needed and safe

# Or create revert commit
git revert HEAD
git push origin development
```

---

## Summary of Recommendations

| Option | Use When | Risk | Time | Clean History |
|--------|----------|------|------|---------------|
| **Option 1: Surgical Fix** | You want to fix specific bugs | LOW | 30-60 min | YES |
| **Option 2: Reset HTML** | Chat/VS Code fixes unclear | LOW | 15 min | YES |
| Option 3: Revert Merge | Merge is too broken to fix | MED | 60+ min | OKAY |
| Option 3: Force Reset | You're alone, need clean slate | HIGH | 5 min | BEST (but dangerous) |

**RECOMMENDED**: Start with Option 1. If Chat/VS Code issues persist after fixing the obvious bugs, fall back to Option 2.

**NEVER USE** force push without confirming no one else has pulled the bad merge.
