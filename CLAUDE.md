 - AGRO Redesign Agent Orchestration

**work on redesing in your own branch, then push to development branch.  Final changes to gui get pushed to main on vivi-site which triggers netlify auto-deploy to vivified.dev/agro <-- this is where all your hard work will be publicly displayed**

you are in a repo that may go upstream to a repo called `vivi-site`; don't worry about it

you may run into some path issues; ***you live in /Users/davidmontgomery/faxbot_folder/vivi-site/agro_full_repo_for_web_dev***

do not go to /Users/davidmontgomery/agro - for paths that lead there and break things -- change them 

Critical: Use AGRO's RAG, Not Grep
THIS IS ESSENTIAL - READ FIRST:
AGRO is a RAG engine trained on its own codebase. The agents MUST use AGRO's API to search the code, not grep/ripgrep/find.
Why This Matters:

Saves ~20k tokens per task (massive context window savings)
More accurate - returns exact file and line numbers
Self-improving - every search makes the model better
Built-in feedback loop - agents improve the RAG while using it

How To Search Code:
Primary Methods (in order of preference):

MCP Tools (if agents support MCP):

bash# Search for relevant code
rag_search "navigation routing logic"

# Get full answer with context
rag_answer "how does the tab system work?"

HTTP API (always available):

bash# Chat endpoint (includes feedback loop)
curl -X POST http://127.0.0.1:8012/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "show me the navigation code"}'

# Returns: answer + file paths + line numbers + feedback prompt (1-5 rating)
# ALWAYS provide feedback - it trains the model

# Answer endpoint (direct)
curl -X POST http://127.0.0.1:8012/api/rag/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "where is the theme logic?"}'

Node MCP (if using Node environment):

javascript// Available transports: HTTP, STDIO
// See node_mcp/server.js for setup

Python MCP (if using Python environment):

python# Available transports: HTTP, STDIO, SSE, WebSocket
# See server/mcp/server.py for setup
The Feedback Loop
Every chat/answer response will ask: "Rate this answer 1-5"
Agents MUST respond - this trains the cross-encoder model:

5 = Perfect, exactly what I needed
4 = Good, mostly helpful
3 = Okay, somewhat relevant
2 = Weak, not very useful
1 = Bad, completely wrong

This feedback gets fed back into the RAG, making future searches better for all agents.
When Grep Is Allowed:
ONLY IF:

The API server is down (make dev failed)
You're debugging why the server won't start
You need to get the server running again

Once server is up: STOP USING GREP
Verify Server Health:
bash# Check if API is running
curl http://127.0.0.1:8012/health

# If down, bring it up
make dev

# Verify RAG is ready
curl -X POST http://127.0.0.1:8012/api/rag/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "test query"}'
```

---

## Agent Architecture

### Master Orchestrator: Sonnet 4
**Branch:** `redesign-shell`
**Role:** Architecture lead, integration manager, design approver

**Responsibilities:**
1. Build the navigation shell (sidebar, routing, layout)
2. Create all specs and integration contracts
3. Review and merge agent work
4. Make final design decisions
5. Run full integration tests

**Files Owned:**
```
gui/index-new.html
gui/js/navigation.js
gui/css/navigation.css
gui/views/ (directory structure)
REDESIGN_SPEC.md
INTEGRATION_CONTRACTS.md
```

**Must Create Before Agents Start:**
- `REDESIGN_SPEC.md` - Navigation hierarchy, file ownership, integration points
- `INTEGRATION_CONTRACTS.md` - APIs between modules
- Navigation shell working (empty but functional)

---

### Agent 1: Module Migrator (Haiku 4.5)
**Branch:** `redesign-migration`
**Role:** Port existing tabs to new navigation system

**Responsibilities:**
1. Create view templates in `gui/views/` for each existing tab
2. Update JS modules to use `window.Navigation.registerView()`
3. Remove old `window.Tabs` dependencies
4. Maintain all existing functionality
5. Test each view with Playwright before moving on

**Files Owned:**
```
gui/views/*.html (created by this agent)
```

**Files Modified (carefully):**
```
gui/js/*.js (existing modules - update registration only)
```

**Files FORBIDDEN:**
```
gui/index-new.html (Shell owns)
gui/js/navigation.js (Shell owns)
gui/css/* (Visual Polish owns)
How To Find Code:
bash# Example: Finding tab-dashboard code
curl -X POST http://127.0.0.1:8012/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "show me the dashboard tab implementation"}'

# Rate the response 1-5
# Use the file/line numbers in the response
Testing Protocol:
bash# After creating each view
npm run test:gui -- --grep "view-name"

# Smoke test
npm run test:gui
```

**Migration Order:**
1. Dashboard (simplest)
2. Chat (most used)
3. Configuration sections
4. Analytics sections
5. DevTools sections
6. Settings sections

---

### Agent 2: Grafana Fixer (Haiku 4.5)
**Branch:** `redesign-grafana`
**Role:** Fix dashboard persistence and edit permissions

**Responsibilities:**
1. Enable user editing of Grafana dashboard
2. Persist dashboard settings across restarts
3. Maintain "no login required" behavior
4. Integrate as embedded panel in new GUI
5. Document the solution

**Files Owned:**
```
infra/grafana/provisioning/**/*
gui/js/grafana.js (create this)
```

**Files Modified (carefully):**
```
docker-compose.yml (Grafana service ONLY)
infra/grafana/provisioning/dashboards/agro_overview.json
```

**Files FORBIDDEN:**
```
docker-compose.yml (other services)
gui/index-new.html
gui/js/navigation.js
How To Find Grafana Config:
bashcurl -X POST http://127.0.0.1:8012/api/rag/answer \
  -H "Content-Type: application/json" \
  -d '{"question": "how is grafana configured?"}'

# Always rate the response 1-5
Current Problem:

Dashboard shows as "shared with me" ✓
User cannot sign in (by design) ✓
User cannot edit dashboard ✗
Settings don't persist ✗

Research:

Grafana anonymous authentication
Dashboard provisioning with edit permissions
Persistent storage configuration

Testing Protocol:
bash# Test cycle
make down
make dev
# Open http://127.0.0.1:3000
# Edit dashboard, save
# Restart: make down && make dev
# Verify changes persisted
Integration with GUI:
javascript// Create gui/js/grafana.js
window.Grafana = {
  showDashboard() {
    // Embed iframe or open panel
  },
  hideDashboard() {
    // Hide panel
  }
};
```

---

### Agent 3: Visual Polish (Haiku 4.5)
**Branch:** `redesign-visual`
**Role:** Implement design system

**Responsibilities:**
1. **WAIT** for Sonnet 4 to approve design spec
2. Implement typography system (monospace + sans-serif)
3. Create dark and light themes (equal quality)
4. Build component styles (buttons, inputs, cards)
5. Ensure clear visual hierarchy (no "button soup")
6. Test both themes constantly

**Files Owned:**
```
gui/css/*.css (except navigation.css)
gui/assets/ (icons, graphics)
```

**Files FORBIDDEN:**
```
gui/js/*.js (no JavaScript)
gui/index-new.html (structure is set)
gui/css/navigation.css (Shell owns the structure)
Design Requirements:

Monospace/typewriter font for headers and technical elements
Clean sans-serif for body text
Terminal-style status indicators (like the green "healthy" badge)
Textured, slightly imperfect aesthetic (not sterile)
Dark mode = light mode in quality
Clear visual hierarchy
Professional but not corporate

How To Find Current Styles:
bashcurl -X POST http://127.0.0.1:8012/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "show me the current theme implementation"}'

# Rate 1-5
```

**Create These Files:**
```
gui/css/design-system.css  (variables, typography, spacing)
gui/css/components.css      (buttons, inputs, cards, etc)
gui/css/dark-theme.css      (dark mode)
gui/css/light-theme.css     (light mode)
Testing Protocol:
javascript// Test in browser console after every change
window.Theme.applyTheme('dark');
// Verify everything looks good

window.Theme.applyTheme('light');
// Verify everything looks good
Playwright Visual Tests:
bashnpm run test:visual

Integration Contracts
window.Navigation (created by Sonnet 4)
javascriptwindow.Navigation = {
  // Navigate to a view
  navigateTo(viewId: string): void,
  
  // Register a view with mount/unmount functions
  registerView(
    viewId: string, 
    mountFn: () => void, 
    unmountFn: () => void
  ): void,
  
  // Get current active view
  getCurrentView(): string,
  
  // Update breadcrumb trail
  updateBreadcrumb(items: string[]): void,
  
  // Show/hide special panels
  showPanel(panelId: 'grafana' | 'vscode'): void,
  hidePanel(panelId: 'grafana' | 'vscode'): void
};
window.Grafana (created by Agent 2)
javascriptwindow.Grafana = {
  showDashboard(): void,
  hideDashboard(): void,
  isVisible(): boolean
};
Existing Modules (keep these)
javascriptwindow.CoreUtils   // API, state, selectors
window.Theme       // Theme management
window.Chat        // Chat functionality
window.Config      // Configuration
// ... all 37 existing modules

Communication Protocol
Between Agents:
NONE - Agents do not talk to each other directly
Agent → Sonnet 4:

Questions about architecture
Conflicts or blockers
Integration issues
Design clarifications

Sonnet 4 → Agents:

Specs and contracts (via committed files)
Design approvals
Conflict resolution
Integration instructions

All Agents → AGRO RAG:

Code searches
Architecture questions
Implementation details
Always provide feedback (1-5 rating)


Merge Strategy
Order:

Shell (Sonnet 4) - Must be working first
Migration (Agent 1) - Port existing features
Grafana (Agent 2) - Can work parallel with Migration
Visual (Agent 3) - Must wait for design approval

Process:
bash# Sonnet 4 merges when ready
git checkout main
git merge redesign-shell
git push

# Agent 1 rebases and continues
git checkout redesign-migration
git rebase main
# Continue work...

# Repeat for other agents
Conflict Resolution:

Agent notifies Sonnet 4 of conflict
Sonnet 4 reviews both branches
Sonnet 4 makes decision
Agent implements solution


Testing Requirements
Every Agent Must:
Before every commit:
bash# Use RAG to verify changes
curl -X POST http://127.0.0.1:8012/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "review my changes to [file]"}'
# Rate the feedback 1-5

# Run relevant tests
npm run test:gui
After completing a feature:
bash# Full smoke test
make dev
npm run test:gui

# Visual check
open http://127.0.0.1:8012
Playwright Tests:

Agent 1: npm run test:gui -- --grep "migration"
Agent 2: npm run test:gui -- --grep "grafana"
Agent 3: npm run test:visual
Sonnet 4: npm test (full suite)


Emergency Procedures
If Server Goes Down:
bash# Check status
make status

# Restart everything
make down
make dev

# Verify
curl http://127.0.0.1:8012/health
```

**Only after server is confirmed up: Resume using RAG**

### If Agent Gets Stuck:

1. Stop the agent
2. Document the issue
3. Notify Sonnet 4
4. Wait for guidance

### If Branches Diverge Too Much:

1. Pause all agents
2. Sonnet 4 reviews all branches
3. Create new integration plan
4. Resume agents with updated instructions

---

## File Ownership Reference
```
Sonnet 4 (Shell):
├── gui/index-new.html
├── gui/js/navigation.js
├── gui/css/navigation.css
├── REDESIGN_SPEC.md
└── INTEGRATION_CONTRACTS.md

Agent 1 (Migration):
├── gui/views/*.html (created)
└── gui/js/*.js (modified - registration only)

Agent 2 (Grafana):
├── infra/grafana/**/*
├── docker-compose.yml (Grafana service only)
└── gui/js/grafana.js (created)

Agent 3 (Visual):
├── gui/css/*.css (except navigation.css)
└── gui/assets/

Success Criteria
Phase 1: Shell Complete (Sonnet 4)

 Navigation sidebar renders
 Routing works (switching between views)
 Empty views load correctly
 Theme system integrated
 Breadcrumbs working
 Specs documented

Phase 2: Migration Complete (Agent 1)

 All existing tabs converted to views
 No functionality lost
 All tests passing
 Old tab system removed

Phase 3: Grafana Fixed (Agent 2)

 User can edit dashboard
 Settings persist across restarts
 No login required (maintained)
 Embedded in GUI

Phase 4: Visual Complete (Agent 3)

 Design system implemented
 Dark and light themes working
 Clear visual hierarchy
 No "button soup"
 Typography system applied

Phase 5: Integration (Sonnet 4)

 All branches merged
 Full test suite passing
 Performance acceptable
 Documentation updated


Remember:

Use RAG, not grep (saves 20k tokens per task)
Provide feedback (trains the model)
Test constantly (Playwright is your friend)
Stay in your lane (respect file ownership)
When stuck, ask (Sonnet 4 is the architect)

This repo is disposable. Be aggressive. Use the RAG. Make it better while you use it.
Let's fucking go. 🚀
