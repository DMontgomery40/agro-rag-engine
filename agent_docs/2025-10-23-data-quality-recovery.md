## 2025-10-23 — RAG Data Quality recovery

Context: Users reported the Data Quality subtab showing an empty “Keywords” area and the repository selector stuck on “Loading…”. Investigation showed the view never refreshed repo metadata unless another config-driven tab had already mounted.

Changes:
- `gui/js/cards.js`: Data Quality view mount now awaits `Config.loadConfig()` so `#repos-section` always repopulates before cards and keywords modules initialize. Errors surface via console + toast.
- `gui/js/cards_builder.js`: Repo dropdown toggles disabled state, shows “No repositories configured” when empty, and surfaces fetch failures with a fallback `<option>` plus UX toast so the UI no longer sits on “Loading…”.
- `gui/index.html` / `gui/js/cards.js`: Added a live progress HUD for the Data Quality tab that reports real step-by-step completion (config refresh ➜ repo selector ➜ keywords ➜ cards) with true percentages and summaries.
- `gui/js/config.js`: Repository panel now displays an accessible indeterminate progress indicator while the latest `.env` / repo metadata is fetched and reports actionable errors on failure.
- `gui/js/cards_builder.js`: Prefills the cards builder include/exclude inputs based on the selected repo’s configuration (paths, keywords) and keeps them updated when the repo changes so users aren’t re-entering duplicate data.
- `gui/js/cards_builder.js` & LiveTerminal: cards builds now surface a reused terminal UI (same component as Learning Reranker) with real-time stage logs, model names (embed/enrich/rerank), and streaming SSE progress so long builds are observable instead of “seizure jerk” flashes.

Verification: `npx playwright test tests/gui/rag-data-quality.spec.ts --config=playwright.gui.config.ts --project=chromium`
