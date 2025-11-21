# GUI-Backend Audit Handoff - Session 3
**Date**: 2025-10-21 22:40 MDT
**Focus**: Evaluation + Learning Reranker Tabs (RAG Subtabs)
**Status**: 18/972 elements audited (1.9%)
**Bugs Fixed This Session**: 2 (total: 6)

---

## Session 2 Summary

### Elements Audited: 18/972 (1.9%)

**All Working** ✅:
1-7. API Keys (OPENAI, ANTHROPIC, COHERE, VOYAGE, LANGSMITH, LANGCHAIN) + Tracing V2
8. LANGCHAIN_ENDPOINT
9. LANGCHAIN_PROJECT
10. LANGTRACE_API_HOST (fixed)
11. LANGTRACE_PROJECT_ID (fixed + SDK installed)
12. GEN_MODEL
13. ENRICH_MODEL
14. FINAL_K (fixed)
15. LANGGRAPH_FINAL_K
16. TOPK_DENSE
17. TOPK_SPARSE
18. RERANKER_MODEL

### Bugs Fixed This Session

**Bug #5**: "Open in LangSmith" button not wired
- **File**: `gui/js/tabs.js:167-183`
- **Issue**: Button existed but had no click handler
- **Fix**: Added async fetch to `/api/langsmith/latest` + window.open()
- **Test**: `tests/langsmith_button_smoke.spec.js` ✅ PASSED

**Bug #6**: FINAL_K not used by /search endpoint
- **File**: `server/app.py:568-581`
- **Issue**: Hardcoded default instead of reading env var
- **Fix**: Read from `FINAL_K` env var with fallback
- **Verified**: Endpoint now respects FINAL_K setting

---

## NEXT PRIORITY: RAG Tab Subtabs

Per user directive: **Evaluation** and **Learning Reranker** subtabs need complete audit with **sub-actions** verified.

---

## 🎓 Learning Reranker Tab - Complete Audit List

**Location**: RAG Tab → Learning Reranker subtab

### Status Display Elements (Read-Only)
| Element ID | Type | Purpose | Backend API | Expected Behavior |
|------------|------|---------|-------------|-------------------|
| `reranker-enabled-status` | Display | Show ON/OFF status | GET `/api/reranker/info` | Updates on page load |
| `reranker-query-count` | Display | Count of logged queries | GET `/api/reranker/logs` | Shows query log size |
| `reranker-triplet-count` | Display | Count of training triplets | GET `/api/reranker/triplets` | Shows triplet file size |
| `reranker-info-enabled` | Display | Server reranker status | GET `/api/reranker/info` | Shows actual server state |
| `reranker-info-path` | Display | Current model path | GET `/api/reranker/info` | Shows loaded model |
| `reranker-info-device` | Display | Device (CPU/GPU/MPS) | GET `/api/reranker/info` | Shows hardware used |
| `reranker-info-alpha` | Display | Blend weight | GET `/api/reranker/info` | Shows current alpha |
| `reranker-info-topn` | Display | Top N candidates | GET `/api/reranker/info` | Shows rerank scope |
| `reranker-info-batch` | Display | Batch size | GET `/api/reranker/info` | Shows inference batch |
| `reranker-info-maxlen` | Display | Max sequence length | GET `/api/reranker/info` | Shows tokenization limit |

### Training Workflow Buttons (Action)
| Button ID | Label | Backend API | Sub-Actions | Expected Behavior |
|-----------|-------|-------------|-------------|-------------------|
| `reranker-mine-btn` | Mine Triplets | POST `/api/reranker/mine` | **1. Show status in `#reranker-status`**<br>**2. Stream logs to `#reranker-terminal-container`**<br>**3. Update result in `#reranker-mine-result`**<br>**4. Refresh triplet count** | Extracts training data from query logs. Should show terminal output with progress (like "Extracted 150 triplets from 500 queries"). Updates triplet count live. |
| `reranker-train-btn` | Train Model | POST `/api/reranker/train` | **1. Show "Training..." status**<br>**2. Create live terminal with streaming logs**<br>**3. Show training progress (epoch 1/2, loss, etc.)**<br>**4. Update model path when done**<br>**5. Enable evaluation button** | Fine-tunes cross-encoder (5-15 min). MUST show live training logs (loss curves, epoch progress). Terminal should auto-scroll. When done, model should be loadable. |
| `reranker-eval-btn` | Evaluate | POST `/api/reranker/evaluate` | **1. Show "Evaluating..." status**<br>**2. Stream evaluation progress**<br>**3. Display metrics in `#reranker-metrics-display`**<br>**4. Show MRR, Hit@K metrics**<br>**5. Enable comparison buttons** | Runs evaluation on test set. Shows metrics like MRR@10, Hit@1, Hit@5. Should format as table/cards. |

### Metrics Display Actions
| Button ID | Label | Backend API | Expected Behavior |
|-----------|-------|-------------|-------------------|
| `reranker-save-baseline` | Save as Baseline | POST `/api/reranker/baseline/save` | Saves current metrics as baseline for future comparisons. Shows confirmation. |
| `reranker-compare-baseline` | Compare vs Baseline | GET `/api/reranker/baseline/compare` | Fetches baseline + current, shows delta (e.g., "+5.2% MRR"). Color-coded (green=better, red=worse). |
| `reranker-rollback` | Rollback Model | POST `/api/reranker/rollback` | Restores previous model version. Shows confirmation dialog BEFORE action. |

### Log Management Buttons
| Button ID | Label | Backend API | Expected Behavior |
|-----------|-------|-------------|-------------------|
| `reranker-view-logs` | View Logs | GET `/api/reranker/logs` | Loads query logs into `#reranker-logs-viewer`, shows last 100 entries with syntax highlighting |
| `reranker-download-logs` | Download Logs | GET `/api/reranker/logs?download=1` | Triggers browser download of full JSONL log file |
| `reranker-clear-logs` | Clear Logs | DELETE `/api/reranker/logs` | Shows confirmation dialog, then clears logs. Refreshes count to 0. |

### Automation Buttons
| Button ID | Label | Backend API | Expected Behavior |
|-----------|-------|-------------|-------------------|
| `reranker-setup-cron` | Setup Nightly Job | POST `/api/reranker/cron/setup` | Creates cron job for nightly training at time in `#reranker-cron-time`. Shows cron expression in status. |
| `reranker-remove-cron` | Remove Nightly Job | DELETE `/api/reranker/cron` | Removes cron job. Clears status message. |

### Configuration Settings (Form Inputs)
| Input Name | Type | Backend Env Var | Purpose | Must Be Wired |
|------------|------|-----------------|---------|---------------|
| AGRO_RERANKER_ENABLED | `<select>` | AGRO_RERANKER_ENABLED | Enable/disable reranker | ✅ Via POST /api/config |
| AGRO_RERANKER_MODEL_PATH | `<input>` | AGRO_RERANKER_MODEL_PATH | Path to trained model | ✅ Via POST /api/config |
| AGRO_LOG_PATH | `<input>` | AGRO_LOG_PATH | Telemetry log location | ✅ Via POST /api/config |
| AGRO_TRIPLETS_PATH | `<input>` | AGRO_TRIPLETS_PATH | Training data output | ✅ Via POST /api/config |
| AGRO_RERANKER_MINE_MODE | `<select>` | AGRO_RERANKER_MINE_MODE | append vs replace | ✅ Via POST /api/config |
| AGRO_RERANKER_MINE_RESET | `<select>` | AGRO_RERANKER_MINE_RESET | Reset before mine | ✅ Via POST /api/config |
| AGRO_RERANKER_ALPHA | `<input>` | AGRO_RERANKER_ALPHA | Blend weight (0-1) | ✅ Via POST /api/config |
| AGRO_RERANKER_MAXLEN | `<input>` | AGRO_RERANKER_MAXLEN | Max sequence length | ✅ Via POST /api/config |
| AGRO_RERANKER_BATCH | `<input>` | AGRO_RERANKER_BATCH | Inference batch size | ✅ Via POST /api/config |
| reranker-epochs | `<input>` | (Not saved) | Training epochs (transient) | Local only, passed to train API |
| reranker-batch | `<input>` | (Not saved) | Training batch (transient) | Local only, passed to train API |
| reranker-cron-time | `<input>` | (Not saved) | Cron schedule time | Local only, passed to cron API |

---

## 📊 Evaluation Runner Section - Complete Audit List

**Location**: RAG Tab → Evaluation subtab (or inline section)

### Configuration Settings
| Element ID | Type | Purpose | Backend API | Must Be Wired |
|------------|------|---------|-------------|---------------|
| `eval-use-multi` | `<select>` | Enable multi-query expansion | Passed to POST `/api/eval/run` | ✅ Sent as JSON param |
| `eval-final-k` | `<input>` | Results count per question | Passed to POST `/api/eval/run` | ✅ Sent as JSON param |
| `eval-sample-size` | `<select>` | Quick/Medium/Full run | Passed to POST `/api/eval/run` | ✅ Sent as JSON param |
| `eval-golden-path` | `<input>` | Path to golden.json | Saved to env via POST `/api/config` | ✅ GOLDEN_PATH env var |
| `eval-baseline-path` | `<input>` | Path to baseline results | Saved to env via POST `/api/config` | ✅ BASELINE_PATH env var |

### Action Buttons
| Button ID | Label | Backend API | Sub-Actions | Expected Behavior |
|-----------|-------|-------------|-------------|-------------------|
| `btn-eval-save-settings` | Save Eval Settings | POST `/api/config` | Updates GOLDEN_PATH and BASELINE_PATH | Saves paths to .env, shows confirmation |
| `btn-eval-run` | Run Full Evaluation | POST `/api/eval/run` | **1. Show progress bar (`#eval-progress`)**<br>**2. Update status text (`#eval-status`)**<br>**3. Increment progress as questions complete**<br>**4. Display results in `#eval-results`**<br>**5. Populate metrics (`#eval-top1-acc`, `#eval-topk-acc`, `#eval-duration`)**<br>**6. Show per-question details in `#eval-details`** | Runs full evaluation suite. Progress must be REAL (not fake). Shows live question-by-question results. Updates history table when done. |
| `btn-eval-save-baseline` | Save as Baseline | POST `/api/eval/baseline/save` | Writes current results to BASELINE_PATH | Confirmation + success message |
| `btn-eval-compare` | Compare to Baseline | GET `/api/eval/baseline/compare` | **1. Fetch baseline**<br>**2. Calculate deltas**<br>**3. Display in `#eval-comparison`**<br>**4. Color-code improvements/regressions** | Shows side-by-side with delta columns (green +, red -) |
| `btn-eval-export` | Export Results | GET `/api/eval/results/latest?download=1` | Triggers JSON download of latest eval run | Browser downloads eval_results.json |
| `btn-eval-history-refresh` | Refresh History | GET `/api/eval/history` | **1. Fetches all historical runs**<br>**2. Populates `#eval-history-tbody`**<br>**3. Shows timestamp, config, metrics, delta** | Table shows last 10-20 runs with sortable columns |
| `btn-eval-history-clear` | Clear History | DELETE `/api/eval/history` | Shows confirmation, then clears all history | Confirmation dialog → clear → refresh table |

### Display Elements (Auto-Updated)
| Element ID | Type | Source | Update Trigger |
|------------|------|--------|----------------|
| `eval-progress-bar` | Progress bar | POST `/api/eval/run` (streaming) | As evaluation runs |
| `eval-status` | Text | POST `/api/eval/run` (streaming) | Live updates (e.g., "Question 5/50") |
| `eval-top1-acc` | Metric | POST `/api/eval/run` response | When eval completes |
| `eval-topk-acc` | Metric | POST `/api/eval/run` response | When eval completes |
| `eval-duration` | Metric | POST `/api/eval/run` response | When eval completes |
| `eval-details` | Table | POST `/api/eval/run` response | Shows per-question pass/fail |
| `eval-comparison` | Comparison | GET `/api/eval/baseline/compare` | When compare clicked |
| `eval-history-table` | Table | GET `/api/eval/history` | On page load + refresh |

---

## CRITICAL AUDIT REQUIREMENTS

### For Each Button Above:

1. **Find HTML Element**
   - Verify button exists with correct ID
   - Check if button is in correct section

2. **Trace JavaScript Handler**
   - Search for `getElementById('button-id')` in JS files
   - Verify click event listener exists
   - Check what API it calls

3. **Verify Backend Endpoint**
   - Confirm endpoint exists in `server/app.py`
   - Check HTTP method matches (GET/POST/DELETE)
   - Verify request/response structure

4. **Test Sub-Actions** (CRITICAL - NOT OPTIONAL)
   - **Terminal Output**: If button says it shows logs, VERIFY terminal container gets populated
   - **Progress Updates**: If button shows progress, VERIFY progress bar/status updates
   - **Live Streaming**: If task takes >5 seconds, VERIFY it streams results (not just shows spinner)
   - **Success/Error Handling**: Click button, VERIFY both success and error states work

5. **End-to-End Test**
   ```bash
   # Example for "Mine Triplets" button:
   # 1. Click button in GUI
   # 2. Verify API call: POST /api/reranker/mine
   # 3. Verify terminal shows: "Extracting triplets from logs..."
   # 4. Verify result updates: "Extracted 150 triplets"
   # 5. Verify triplet count refreshes: "150 triplets"
   ```

6. **Categorize**
   - ✅ **WORKING**: Button calls API, API works, sub-actions execute, user sees results
   - ⚠️ **PARTIAL**: Button calls API but terminal/progress doesn't update
   - ❌ **BROKEN**: Button has no handler OR API doesn't exist
   - 🚫 **FAKE**: Button appears to work but does nothing (shows fake progress)

---

## Backend Endpoints to Verify

### Learning Reranker APIs

| Endpoint | Method | Purpose | Expected Response | Critical Sub-Actions |
|----------|--------|---------|-------------------|----------------------|
| `/api/reranker/info` | GET | Get reranker status | `{enabled, model_path, device, alpha, topn, batch, maxlen}` | None |
| `/api/reranker/logs` | GET | Get query logs | `{logs: [...], count: 500}` | None |
| `/api/reranker/triplets` | GET | Get triplet count | `{count: 150}` | None |
| `/api/reranker/mine` | POST | Mine training data | `{status: "success", triplets_added: 150}` | **Stream to terminal** |
| `/api/reranker/train` | POST | Train model | `{status: "training", progress: ...}` | **Stream training logs** |
| `/api/reranker/evaluate` | POST | Evaluate model | `{mrr: 0.85, hit_at_1: 0.65, ...}` | **Stream eval progress** |
| `/api/reranker/baseline/save` | POST | Save baseline | `{status: "saved"}` | None |
| `/api/reranker/baseline/compare` | GET | Compare metrics | `{current: {...}, baseline: {...}, delta: {...}}` | None |
| `/api/reranker/rollback` | POST | Rollback model | `{status: "rolled_back"}` | None |
| `/api/reranker/logs` | DELETE | Clear logs | `{status: "cleared"}` | None |
| `/api/reranker/cron/setup` | POST | Setup cron | `{cron_expression: "15 2 * * *"}` | None |
| `/api/reranker/cron` | DELETE | Remove cron | `{status: "removed"}` | None |

### Evaluation APIs

| Endpoint | Method | Purpose | Expected Response | Critical Sub-Actions |
|----------|--------|---------|-------------------|----------------------|
| `/api/eval/run` | POST | Run evaluation | `{top1_acc: 0.75, topk_acc: 0.92, duration: 45.2, details: [...]}` | **Stream progress** |
| `/api/eval/baseline/save` | POST | Save baseline | `{status: "saved"}` | None |
| `/api/eval/baseline/compare` | GET | Compare to baseline | `{current: {...}, baseline: {...}, delta: {...}}` | None |
| `/api/eval/results/latest` | GET | Get latest results | Full eval results JSON | Download if ?download=1 |
| `/api/eval/history` | GET | Get run history | `{runs: [{timestamp, metrics}, ...]}` | None |
| `/api/eval/history` | DELETE | Clear history | `{status: "cleared"}` | None |

---

## Files Modified Session 2

- `server/app.py:568-581` - FINAL_K fix
- `server/app.py:4-30` - LangTrace init (Session 1 carryover)
- `gui/js/tabs.js:167-183` - LangSmith button
- `requirements.txt:8` - langtrace-python-sdk
- `tests/langsmith_button_smoke.spec.js` - Created

---

## Handoff Instructions for Next Agent

### Start Here
1. Read this handoff document completely
2. Check current branch: `git rev-parse --abbrev-ref HEAD` (should be `development`)
3. Verify API server is running: `curl http://localhost:8012/health`
4. Review audit spreadsheet: `agent_docs/GUI_BACKEND_AUDIT_2025-10-21.md`

### Audit Approach
1. **Pick a button** from Learning Reranker or Evaluation section above
2. **Find HTML element** - verify ID matches table
3. **Search for JS handler** - `grep -r "button-id" gui/js/`
4. **Verify backend endpoint** - check if API exists in server/app.py
5. **Test end-to-end** - click button in GUI (http://localhost:8012), verify:
   - API call made (check Network tab)
   - Response received
   - **Sub-actions execute** (terminal updates, progress bars move, results display)
6. **Categorize**: ✅ WORKING | ⚠️ PARTIAL | ❌ BROKEN | 🚫 FAKE
7. **If broken**: Fix it following CLAUDE.md rules
8. **Test the fix**: Write Playwright test or smoke test
9. **Update tracking**: Add to audit spreadsheet
10. **Repeat** for next button

### CRITICAL: Sub-Actions Testing

**DO NOT** mark a button as ✅ WORKING unless:
- Terminal output appears when button says it will show logs
- Progress bars actually update (not fake spinners)
- Live streaming works for long-running tasks
- Success/error messages display correctly
- Counts/stats refresh after actions complete

### Example: Audit "Mine Triplets" Button

```javascript
// 1. Find HTML (gui/index.html:3568)
<button id="reranker-mine-btn">Mine Triplets</button>

// 2. Find JS handler (gui/js/*.js)
grep -r "reranker-mine-btn" gui/js/

// 3. If found, check what it does:
//    - Does it call fetch('/api/reranker/mine')?
//    - Does it update #reranker-terminal-container?
//    - Does it refresh triplet count?

// 4. Test backend
curl -X POST http://localhost:8012/api/reranker/mine

// 5. Test in GUI
//    - Click "Mine Triplets" button
//    - Watch Network tab for POST /api/reranker/mine
//    - Verify terminal shows: "Extracting triplets from logs..."
//    - Verify result shows: "Extracted 150 triplets"
//    - Verify count updates

// 6. Categorize
//    ✅ WORKING if all sub-actions work
//    ⚠️ PARTIAL if API works but terminal doesn't update
//    ❌ BROKEN if no handler or API missing
//    🚫 FAKE if it shows fake progress
```

### When You Find Bugs

1. **Document the bug** clearly in audit spreadsheet
2. **Fix the bug** following CLAUDE.md requirements
   - No stubs/placeholders
   - Wire to real backend
   - Add terminal streaming if promised
   - Write Playwright test
3. **Verify the fix** end-to-end
4. **Mark as fixed** in spreadsheet

### When Context Runs Low

1. Update audit spreadsheet with all findings
2. Create new handoff document (copy this template)
3. Specify next priority buttons to audit
4. Document any partial work or blockers

---

## Estimated Remaining Work

- **Learning Reranker**: 13 buttons + 13 settings = **26 elements**
- **Evaluation**: 7 buttons + 5 settings + 10 displays = **22 elements**
- **Total for these sections**: **48 elements**
- **Remaining in entire GUI**: **954 elements**

At current pace (7 elements + 2 bug fixes per session):
- **These sections**: ~7 sessions
- **Entire GUI**: ~136 sessions

**PRIORITY**: Complete Learning Reranker + Evaluation first (user directive)

---

## Status: Ready for Session 3

✅ All session 2 findings documented
✅ Next priorities clearly defined
✅ Sub-action requirements specified
✅ Test methodology documented
✅ Backend endpoints cataloged

**Next agent should start with**: `reranker-mine-btn` button audit
