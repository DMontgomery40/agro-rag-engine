# Bug Resolution Log

**Purpose**: Document all verified bug fixes to prevent repeat issues across different AI agents/sessions.

**IMPORTANT**: Only add entries here AFTER the user has confirmed the fix works.

---

## How to Use This Document

When you fix a bug:
1. Fix the bug
2. Test it (Playwright for GUI, smoke test for backend)
3. **WAIT for user to verify it actually works**
4. Only then add an entry below

---

## Template

```markdown
### Bug: [Short Description]

**Date Fixed**: YYYY-MM-DD
**Reported By**: [User/Agent/Session]
**Severity**: [Critical/High/Medium/Low]

**Symptoms**:
- What the user saw/experienced
- Error messages
- Unexpected behavior

**Root Cause**:
- What was actually wrong
- Why it happened
- File(s) and line numbers involved

**Fix Applied**:
- What was changed
- Files modified
- Code changes (brief summary or diff)

**Verification**:
- How it was tested
- User confirmation: [Quote or summary]

**Prevention**:
- How to avoid this in the future
- Rules/checks to add
- Common mistakes to watch for

---
```

---

## Verified Bug Fixes

<!-- Add new entries below this line, most recent first -->

### Bug: Editor Badge Shows "Disabled" Despite Toggles Being ON

**Date Fixed**: 2025-10-23
**Reported By**: User
**Severity**: High

**Symptoms**:
- VS Code tab shows badge "○ Disabled"
- Admin tab has "Enable Embedded Editor" toggle turned ON
- Container `agro-openvscode` is running on port 4440
- GUI toggles don't reflect actual state

**Root Cause**:
- `.env` file had `EDITOR_ENABLED=True` and `EDITOR_EMBED_ENABLED=True` (Python-style booleans)
- Bash script `scripts/editor_up.sh:34` checks specifically for `"1"`: `if [[ "$EDITOR_ENABLED" != "1" ]]`
- Script wrote `out/editor/status.json` with `{"enabled": false, "error": "No Docker or Podman found"}`
- Backend health endpoint `/health/editor` reads from `status.json`, not directly from `.env`
- This caused health check to return `"enabled": false` even though container was running

**Files Involved**:
- `.env:30-31, 38` (boolean values)
- `scripts/editor_up.sh:34` (strict "1" check)
- `server/app.py:2095-2110` (reads status.json)
- `out/editor/status.json` (cached state)
- `gui/js/editor.js:61-79` (displays badge based on health check)

**Fix Applied**:
1. Changed `.env` boolean values:
   - `EDITOR_ENABLED=True` → `EDITOR_ENABLED=1`
   - `EDITOR_EMBED_ENABLED=True` → `EDITOR_EMBED_ENABLED=1`
   - `ENRICH_CODE_CHUNKS=true` → `ENRICH_CODE_CHUNKS=1`

2. Ran `./scripts/editor_up.sh` to regenerate `status.json` with correct state

3. Verified health endpoint returns `"enabled": true, "ok": true`

**Verification**:
- User confirmed: "vscode fixed!!"
- Health endpoint returns: `{"ok": true, "enabled": true, "port": 4440, "url": "http://127.0.0.1:4440", "started_at": "2025-10-23T06:07:53Z", "readiness_stage": "ready"}`
- Badge now shows "● Ready" instead of "○ Disabled"

**Prevention**:
- **CRITICAL RULE**: NEVER use `True`, `true`, `False`, `false` in `.env` files
- Bash scripts expect `"1"` or `"0"` for boolean checks
- Python-style booleans break shell script conditionals
- Always test with actual bash: `[[ "True" != "1" ]]` evaluates to true (fails check)
- Add pre-commit hook or linter to catch non-numeric boolean values in `.env`
- Document this in `.env.example` with comments

---

### Bug: Chat Settings Subtab Shows Black Empty Page

**Date Fixed**: 2025-10-23
**Reported By**: User
**Severity**: High

**Symptoms**:
- Chat tab → Settings subtab shows completely black/empty page
- No content visible despite settings existing in HTML
- Inspector shows all content elements have `height: 0px` and `scrollHeight: 0px`

**Root Cause**:
Multiple issues in combination:

1. **Critical HTML Structure Bug** (PRIMARY CAUSE):
   - `gui/index.html:5365` opened `<div id="tab-chat-ui">` but never closed it
   - This caused `#tab-chat-settings` to be **nested inside** `#tab-chat-ui` instead of being a sibling
   - When `#tab-chat-ui` was hidden, its child `#tab-chat-settings` was also hidden
   - DOM hierarchy was: `#tab-chat > #tab-chat-ui > #tab-chat-settings` (wrong)
   - Should be: `#tab-chat > #tab-chat-ui` and `#tab-chat > #tab-chat-settings` (siblings)

2. **Inconsistent Subtab Naming**:
   - Buttons had `data-subtab="chat-ui"` and `data-subtab="chat-settings"` (with "chat-" prefix)
   - But IDs were `#tab-chat-ui` and `#tab-chat-settings` (also with prefix)
   - JavaScript constructed: `#tab-${parent}-${subtab}` = `#tab-chat-chat-settings` (double prefix)
   - Other tabs like Grafana used `data-subtab="dashboard"` (no prefix) correctly

3. **JavaScript ID Lookup Bug**:
   - `gui/js/tabs.js:243` constructed `#tab-${subtab}` instead of `#tab-${parent}-${subtab}`
   - This worked accidentally for some tabs but failed for chat

4. **Missing CSS**:
   - `.section-subtab.active` had no `padding` or `overflow-y`, unlike `.tab-content.active`

**Files Involved**:
- `gui/index.html:5440` (missing closing div tag)
- `gui/index.html:2288-2289` (subtab button data-subtab values)
- `gui/index.html:377-385` (.section-subtab.active CSS)
- `gui/js/tabs.js:243` (ID construction)
- `gui/js/navigation.js:359` (default button selector)

**Fix Applied**:
1. **Fixed HTML structure**: Added missing `</div>` closing tag for `#tab-chat-ui` at line 5440
2. **Fixed subtab naming**: Changed button `data-subtab` from `"chat-ui"/"chat-settings"` to `"ui"/"settings"`
3. **Fixed JavaScript**: Updated `tabs.js:243` to construct `#tab-${parent}-${subtab}`
4. **Fixed navigation**: Updated `navigation.js:359` to match new button names
5. **Enhanced CSS**: Added `padding: 24px` and `overflow-y: auto` to `.section-subtab.active`

**Verification**:
- User confirmed: "yay!!" with screenshot showing all chat settings visible
- Playwright tests passing: height changed from `0px` to `1505px`
- All settings visible: Chat Model, Temperature, Max Tokens, Multi-Query, Retrieval Top-K, Confidence, Display Options, History Settings
- Save/Reset buttons visible and functional

**Prevention**:
- **CRITICAL RULE**: Every `<div>` must have a matching closing `</div>` - validate HTML structure
- **Subtab naming convention**: Either include parent prefix in BOTH button AND ID, or in NEITHER - be consistent
- **Test nested components**: When content has zero height despite correct CSS, check parent nesting
- Use HTML validator or linter to catch unclosed tags
- Test all subtab navigation after structural changes
- Playwright tests should check both `.active` class AND actual `offsetHeight > 0`

---

### Example Entry (DELETE THIS AFTER FIRST REAL BUG)

**Date Fixed**: 2025-10-23
**Reported By**: User
**Severity**: High

**Symptoms**:
- Editor badge showed "○ Disabled" even though toggles were ON in Admin
- Chat Settings subtab showed black empty page

**Root Cause**:
1. **Editor Issue**: `.env` had `EDITOR_ENABLED=True` but script required `EDITOR_ENABLED=1`
   - `scripts/editor_up.sh:34` checks for `"1"` specifically
   - Python-style boolean `True` caused script to write `status.json` with `"enabled": false`

2. **Chat Settings Issue**:
   - Subtab button had `data-subtab="chat-settings"` but ID was `#tab-chat-settings`
   - `tabs.js:243` constructed `#tab-${subtab}` → `#tab-chat-settings` (wrong)
   - Should be `#tab-${parent}-${subtab}` → `#tab-chat-chat-settings` OR button should be `data-subtab="settings"`

**Fix Applied**:
1. **Editor**:
   - `.env:30-31` changed `True` → `1`
   - `.env:38` changed `true` → `1`
   - Ran `./scripts/editor_up.sh` to regenerate `status.json`

2. **Chat Settings**:
   - `gui/index.html:2288-2289` changed `data-subtab="chat-ui"` → `data-subtab="ui"`, `data-subtab="chat-settings"` → `data-subtab="settings"`
   - `gui/js/navigation.js:359` changed selector from `chat-ui` → `ui`
   - `gui/js/tabs.js:243` changed `#tab-${subtab}` → `#tab-${parent}-${subtab}`

**Verification**:
- [User confirmation pending]

**Prevention**:
- **NEVER use `True`/`true` in `.env` files** - always use `1` or `0` for booleans
- **Bash scripts check for `"1"` explicitly**, not truthy values
- **Subtab naming must be consistent**: either include parent prefix in BOTH button AND ID, or in NEITHER
- **Test subtab navigation** after any tab/subtab changes

---

<!-- Add new bug fixes above this line -->
