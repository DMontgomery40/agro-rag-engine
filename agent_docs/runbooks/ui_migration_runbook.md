# Runbook: UI Migration Execution

Use this runbook to execute the UI migration incrementally. Each step lands as a PR to `development`, with Playwright coverage and a clean revert path.

## Preconditions

- Current API is healthy; `/api/config`, `/search`, `/answer`, `/api/traces*`, `/api/keywords/*` reachable
- Docker is running if using compose; Qdrant only needed for perf/feature tests, not basic UI smoke
- Branch: `development` (do not push to `main` directly)

## Steps

1) Scaffold `web/`
- Vite React TS template; Tailwind; ESLint/Prettier/Vitest/Playwright
- Add `VITE_API_BASE` default `/api`; confirm relative fetch works locally
- Mount `/web` in FastAPI serving `web/dist`

2) App shell and navigation
- Layout, top nav, responsive with Tailwind; basic route stubs: `/config`, `/onboarding`, `/chat`, `/search`, `/answer`, `/traces`, `/keywords`, `/cost`, `/calculator`, `/profiles`, `/editor`, `/grafana`, `/infra`, `/alerts`
- Add Playwright route visibility checks for each tab

3) Settings forms from schema
- Implement backend `/api/config-schema` (see backend runbook)
- Render forms from schema; handle secrets (mask + reveal)
- Add “Apply” path using existing `/api/config` POST
- Playwright: change a simple non‑secret value, apply, re‑fetch to assert

4) Chat + Search + Answer
- Chat page posting to `/api/chat` with full settings; show provider/model headers; show link to traces
- Search page calling `/search` with repo/top‑k; render list with links to `/files/*`
- Answer page calling `/answer` with trace linkout
- Playwright: chat returns text; search returns >0 results; open a file link

5) Onboarding + Traces + Keywords
- Onboarding wizard: persist `/api/onboarding/state`; “Complete” writes to `/api/onboarding/complete`; indexing buttons call index APIs
- Traces: list/latest; empty state handling
- Keywords: list/generate/add
- Playwright: onboarding completes; traces render (skip empty); keyword add works

6) Cost + Profiles
- Cost estimator wired to `/api/cost/estimate_pipeline` with fallback
- Profiles list/apply/save; auto‑profile via `/api/profile/autoselect`
- Playwright: estimate returns totals; profile apply reflected in `/api/config`

7) Calculator
- Iframe `gui/rag-calculator.html` as an interim; later consider React port
- Playwright: page renders and key control exists

8) Editor + Grafana + Infra + Cutover
- Editor: `/editor` iframe with health + restart + settings
- Grafana: iframe with env controls, preview/open buttons, CI visibility rules
- Infra: Docker containers list/actions; Redis ping; simple controls
- Playwright: basic visibility checks for editor/grafana when enabled
- Cutover: add `GUI_CUTOVER` env flag; when `1`, redirect `/` → `/web` (keep `/gui` mounted). Document rollback

## Verification & Smoke

- Run Playwright smoke locally: `cd web && npx playwright test --project=chromium`
- Ensure no a11y violations on config/search/traces routes

## Rollback

- Disable `GUI_CUTOVER`; refresh API container
- Revert last web deploy if needed; keep legacy `/gui` available
