# Complete React Parity & Improvement Checklist

**Goal:** Every tab perfect, every feature working, every animation smooth, every backend endpoint tested

---

## Tab 1: Get Started (Onboarding Wizard)

### Layout
- [ ] Main wizard in center
- [ ] Help Q&A panel on right side
- [ ] Progress dots 1-5 at top (clickable)
- [ ] Back/Next buttons at bottom

### Welcome Step
- [ ] Welcome message
- [ ] Two big buttons: Folder / GitHub
- [ ] Smooth transition to Source step

### Source Step (Step 1)
- [x] Folder mode UI (picker, display, path input)
- [x] GitHub mode UI (URL, branch, token inputs)
- [ ] Mode toggle tabs functional
- [ ] File picker actually opens
- [ ] GitHub URL validation
- [ ] Backend: GitHub clone support on index/start

### Index Step (Step 2)
- [x] Progress bar with ID #onboard-index-bar
- [x] Status text #onboard-index-status
- [x] Log output #onboard-index-log
- [ ] **CRITICAL:** Live terminal dropdown for real indexing logs
- [ ] Progress stages: scan → chunk → embed → cards
- [ ] Real progress percentage from backend
- [ ] Auto-advance when complete

### Questions Step (Step 3)
- [x] 3 question inputs #onboard-q1, q2, q3
- [x] Answer divs #onboard-ans-1, ans-2, ans-3
- [ ] **CRITICAL:** Actually call /api/chat for each question
- [ ] Show real answers from backend
- [ ] Trace links #onboard-trace-1, trace-2, trace-3
- [ ] Expandable trace panels #onboard-trace-panel-1, 2, 3
- [ ] Save as Golden button functional

### Tune Step (Step 4)
- [x] Speed slider #onboard-slider-speed (1-4)
- [x] Quality slider #onboard-slider-quality (1-3)
- [x] Cloud slider #onboard-slider-cloud (1-2)
- [ ] **CRITICAL:** Sliders with micro-interaction polish
  - [ ] Smooth drag with cubic-bezier
  - [ ] Value labels update in real-time
  - [ ] Visual feedback on change
- [x] Settings summary #onboard-settings-summary
- [ ] Summary updates as sliders change
- [ ] Save Project button #onboard-save-project
  - [ ] Actually calls /api/profiles/save
  - [ ] Validates before saving
  - [ ] Shows success/error feedback
- [ ] Run Eval button #onboard-run-eval
  - [ ] Calls /api/eval/run
  - [ ] Progress bar #onboard-eval-bar
  - [ ] Status #onboard-eval-status
  - [ ] Results #onboard-eval-result

### Help Panel (Right Side)
- [ ] Always visible on right
- [ ] Question input
- [ ] Ask button
- [ ] Results display
- [ ] Uses /api/chat endpoint

---

## Tab 2: Dashboard

### System Status (Left Column)
- [x] 5 status boxes with IDs (dash-health, dash-repo, dash-branch, dash-cards, dash-mcp, dash-autotune)
- [x] Real data from /api/health, /api/index/stats, /api/config
- [x] Auto-refresh every 30s

### Quick Actions (Right Column)
- [x] 6 action buttons with green glow hover
- [ ] **CRITICAL:** Each button opens LiveTerminal dropdown
- [ ] **CRITICAL:** Real logs stream from backend
- [ ] Generate Keywords button
  - [ ] Calls /api/keywords/generate
  - [ ] Shows progress in terminal
  - [ ] Updates status
- [ ] Change Repo button
  - [ ] Prompt for repo name
  - [ ] Redirects with ?repo=
- [ ] Run Indexer button
  - [ ] Calls /api/index/start
  - [ ] Polls /api/index/status
  - [ ] Streams logs to terminal
  - [ ] Progress bar updates
- [ ] Reload Config button
  - [ ] Calls /api/config/reload
  - [ ] Shows confirmation
- [ ] Run Eval dropdown button
  - [x] Chevron rotates on click
  - [x] Dropdown fetches /api/reranker/available
  - [ ] Each option runs eval with that backend
  - [ ] Shows results in terminal
- [ ] Refresh Status button
  - [ ] Triggers dashboard reload

### Other Sections
- [x] agro repo info panel
- [x] Embedding Configuration (model, dimensions, precision)
- [x] Indexing Costs (tokens, cost)
- [x] Storage Breakdown (8 items + total)
- [x] Index Profiles toggle
- [x] Auto-Profile button
- [x] Monitoring Logs (alerts from Alertmanager)

---

## Tab 3: Chat

### Chat Interface
- [ ] Message input
- [ ] Send button
- [ ] Message history display
- [ ] Repo selector dropdown
- [ ] Model override dropdown
- [ ] Clear history button
- [ ] **CRITICAL:** Feedback buttons on each response
  - [ ] 👍👎 buttons
  - [ ] ⭐⭐⭐⭐⭐ rating
  - [ ] "What was missing?" note field
  - [ ] Calls /api/feedback endpoint
- [ ] **CRITICAL:** File link tracking
  - [ ] Calls /api/reranker/click when file clicked
- [ ] Streaming responses (SSE or polling)
- [ ] Copy button on code blocks

### Chat Settings
- [ ] Temperature slider
- [ ] Max tokens input
- [ ] System prompt textarea
- [ ] Save settings button

---

## Tab 4: VSCode

### Status Header
- [x] Health badge with color
- [x] Three buttons: Open Window, Copy URL, Restart
- [ ] Health badge actually checks /api/editor/health
- [ ] Buttons actually work

### iframe
- [x] #editor-iframe container
- [x] iframe with correct src
- [ ] **CRITICAL:** iframe src from EDITOR config
- [ ] Falls back gracefully if editor disabled
- [ ] Status banner shows errors if not running

---

## Tab 5: Grafana

### Config Subtab
- [ ] Grafana URL input
- [ ] Save button
- [ ] Settings from /api/config

### Dashboard Subtab
- [ ] iframe with Grafana dashboard
- [ ] Fullscreen mode
- [ ] iframe src from config

---

## Tab 6: RAG

### ALL 6 SUBTABS
- [x] Data Quality - 37/37 IDs ✅
- [x] Retrieval - All sections, all inputs ✅
- [x] External Rerankers - 10/10 IDs ✅
- [x] Learning Ranker - 33/33 IDs, LiveTerminal ✅
- [x] Indexing - 19/19 IDs ✅
- [x] Evaluate - 13+ IDs ✅

### Backend Connectivity
- [x] All /api/reranker/* endpoints tested
- [x] LiveTerminal streaming from status.live_output
- [x] All buttons call correct endpoints

---

## Tab 7: Profiles

### Budget Calculator
- [ ] Monthly/daily budget inputs
- [ ] Token estimates
- [ ] Cost projections

### Profile Management
- [ ] Load profiles list
- [ ] Edit profile
- [ ] Save profile
- [ ] Delete profile
- [ ] Apply profile

---

## Tab 8: Infrastructure

### Services Subtab
- [ ] Docker container status
- [ ] Start/stop/restart buttons
- [ ] Health checks

### MCP Subtab
- [ ] MCP server list
- [ ] Start/stop controls

### Paths Subtab
- [ ] All path configurations
- [ ] Validation

### Monitoring Subtab
- [ ] Prometheus metrics
- [ ] Alert thresholds
- [ ] Grafana link

---

## Tab 9: Admin

### General Subtab
- [x] Theme mode select ✅
- [x] All server settings ✅
- [x] Editor settings with correct names ✅

### Git Integration Subtab
- [ ] Git hooks configuration
- [ ] Commit metadata settings

### Secrets Subtab
- [ ] API keys (OpenAI, Anthropic, Google, etc.)
- [ ] Secrets ingestion
- [ ] Mask/unmask toggle

### Integrations Subtab
- [ ] LangSmith config
- [ ] Webhook config (Slack, Discord)
- [ ] MCP settings

---

## Universal Requirements (EVERY TAB)

### UI Polish
- [ ] All buttons: green glow hover (box-shadow)
- [ ] All buttons: icon drop-shadow filter
- [ ] All buttons: ripple click effect
- [ ] All buttons: lift on hover (translateY(-2px))
- [ ] All buttons: press on active (scale(0.98))
- [ ] All inputs: focus glow animation
- [ ] All progress bars: shimmer animation
- [ ] All selects: smooth transitions
- [ ] All tooltips: visible on hover
- [ ] Subtabs: underline animation
- [ ] Subtabs: cascade stagger (20ms delays)

### Backend Wiring
- [ ] Every input has name= attribute
- [ ] Every button calls correct endpoint
- [ ] Every form submits to /api/config
- [ ] Every action shows success/error feedback
- [ ] Every long operation has progress indicator
- [ ] Every terminal streams real logs

### Accessibility
- [ ] All element IDs from /gui present
- [ ] All ARIA labels
- [ ] Keyboard navigation
- [ ] Screen reader support
- [ ] Reduced motion support

---

**Current Status:** 33 commits, ~40% complete
**Remaining:** ~4-5 hours of systematic work
**Approach:** Go tab by tab, left to right, complete each 100% before moving on

