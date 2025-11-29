## Dashboard ‑ System Status Subtab

### Current Status
- React now owns the System Status subtab and exposes real data (branch, top folders, quick actions).
- Legacy JS modules are gated so they stop mutating `dash-*` nodes when React is active.

### Outstanding Playwright Failures
1. `tests/web-smoke/dashboard.spec.ts:10`  
   - **Expectation**: terminal output must contain `ValueError: max() arg is an empty sequence`.  
   - **Reality**: the new quick action streams live indexer logs, so the historical mock error never appears. The test needs to assert on a deterministic signal (e.g., presence of “Clean Indexer v2” header or an explicit status marker).
2. `tests/web-smoke/dashboard.spec.ts:54` (only during full-suite runs)  
   - **Expectation**: `#dash-branch` changes from the placeholder `—` within 10s.  
   - **Reality**: while an indexer run is active, the branch call can lag beyond 10s. Spot tests (running the spec in isolation) pass consistently. The full-suite run should wait on the new `SystemStatusSubtab` polling window or assert after the indexer finishes.

Artifacts for both failures are under:
```
test-results/dashboard-Dashboard-Functi-59226-when-Run-Indexer-is-clicked-chromium/
test-results/dashboard-Dashboard-Functi-0771d-branch-name-in-system-stats-chromium/
```

### Next Subtab
Proceeding to **Dashboard → Monitoring** next to remove the remaining legacy race conditions (alert polling, Loki card) and to ensure tooltips & status wiring meet the accessibility contract.

