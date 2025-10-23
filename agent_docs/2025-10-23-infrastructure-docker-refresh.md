## 2025-10-23 — Infrastructure Docker console refresh

- Restored the Infrastructure tab to show **two live grids**: “AGRO Containers” (compose-managed services) and “All Containers” (every Docker container on the host). Both reuse the card UI with pause/stop/start/restart controls and logs dropdowns.
- Rewired all Docker actions (`start/stop/pause/unpause/restart/remove`) through `runContainerAction`, feeding a reused `LiveTerminal` instance (`#docker-terminal-container`) so every operation now streams output, progress, and errors in real time. `startInfra`/`stopInfra` use the same terminal.
- Added `/api/docker/container/{id}/restart` and extended `/api/docker/containers/all` to return compose metadata + `agro_managed` flag, powering the new AGRO/user split and the service badges.
- Container state now drives the service cards (Qdrant/Redis/Prometheus/Grafana). Redis gets an extra ping overlay (`✓ Running (PONG)` vs `⚠ Running (no PONG)`), and the aggregate Docker status falls back to container detection when `docker info` fails.
- Every control exposes feedback: UX toasts, terminal logs, and refreshed grids/service panels, keeping the user in sync without manual refreshes.

Verification: `npx playwright test tests/gui/navigation.spec.ts --config=playwright.gui.config.ts --project=chromium`
