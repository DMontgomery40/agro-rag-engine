## Handoff – 2025‑11‑28 (Docs refactor + Onboarding fixes)

### What changed
- Removed the legacy `/gui` HTML bundle, the duplicated `/public/agro` assets, and the entire `website/` Docusaurus tree (HTML, CSS, JS, screenshots, configs). The React/Vite app under `/web` is now the only GUI surface.
- Added a MkDocs documentation stack (`mkdocs.yml`, `mkdocs/docs/**`) plus a `docs-ai` GitHub workflow and helper script (`scripts/docs_ai/generate_docs_from_diff.py`). All new docs live under `mkdocs/docs` and should be edited there going forward.
- Checked in the latest `data/snapshots/code_chunks_agro/*.snapshot` artifacts. These are now tracked with Git LFS (pattern `data/snapshots/**/*.snapshot`) to stay under GitHub’s 100 MB limit.
- Server/config updates to support the refactor (`server/models/prices_config.py`, cost/profile routers, config registry/store tweaks, `agro_config.json`, etc.).
- React/web updates with a focus on the onboarding experience: `web/src/components/tabs/StartTab.tsx` now includes a client‑side fallback so the stepper buttons work immediately, `web/src/modules/onboarding.js` restores the step and marks readiness, `TuneStep`, tooltips, RAG subtab, Autoprofile, etc. were kept in sync.
- Added a new Playwright check: `tests/web-smoke/onboarding_wizard_clicks.spec.ts` exercises Next/Back/dot navigation to prevent regressions.

### Testing
- `pnpm playwright test tests/web-smoke/onboarding_wizard_clicks.spec.ts --config=playwright.web.config.ts` ✅
- `pnpm playwright test --config=playwright.web.config.ts` ❌ (73 passed / 36 failed). Failures are the long-standing GUI issues (dashboard terminals, help/glossary subtabs, runtime-mode persistence, RAG subtabs render, settings persistence, etc.) and not new regressions from today’s work. Full log is in the terminal history.

### Outstanding / follow-ups
1. **Playwright failures** – the full GUI smoke still has 30+ failing specs (dashboard terminals, help/glossary subtabs, runtime-mode save, settings persistence, RAG render, etc.). None were touched today, but they still block a green CI run.
2. **GitHub repo onboarding** – the wizard still treats the GitHub card as a stub: we only validate the URL/branch/token, then call `/api/index/start` without cloning. Same for the folder picker (no local ingest). If we need real cloning, we’ll have to wire a repo ingestion endpoint and update the wizard to send `projectDraft`.
3. **“Golden questions” + “Run a tiny evaluation” buttons** – still placeholder alert/naïve fetches. Implement real persistence/execution when those flows become priorities.
4. **Docs publishing** – MkDocs is staged but not yet wired into any hosting flow. The new `docs-ai` workflow lives in `.github/workflows/docs-ai.yml`; confirm with the docs team whether MkDocs builds should be deployed automatically or via Netlify/GitHub Pages.
5. **Snapshots via LFS** – I added LFS tracking, so anyone cloning will need `git lfs pull` (already installed in this repo). If more large artifacts show up, add them under the same pattern or expand `.gitattributes`.

### Misc notes
- Commit `614dbf3` (“chore: migrate docs and cleanup legacy UI”) is on `origin/development`.
- Playwright artifacts under `test-results/` were cleaned before the commit; you’ll need to regenerate them locally if you investigate failing tests.
- `.gitattributes` now contains the LFS rule for snapshots; don’t remove it unless you reconfigure LFS.

