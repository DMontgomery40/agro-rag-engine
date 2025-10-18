# Prompt for Opus 4.1 – AGRO Settings GUI

Build a local-only admin UI to manage every knob in AGRO RAG, with search-first navigation, per-repo/per-channel scopes, and live application via HTTP endpoints. No `.env` edits; all changes go through the API and apply at runtime.

## Inputs

- Settings catalog: `ui/ALL_KNOBS.yaml` (exhaustive keys, types, descriptions, tags, repo-scoped ops)
- Repo config: `repos.json` (enabled, priority_weight, keywords, path_boosts, layer_bonuses, paths)
- API contract: `docs/API_GUI.md` (GET/PATCH /api/gui/config, /api/repos CRUD, reindex, search)
- RAG docs search: call `/api/gui/search_settings?q=...` (backend merges local + MCP rag_search)

## IA & UX

- Persistent global search (debounced); results show matching settings and related code/doc hits; keyboard-first.
- Scope controls (top bar): Repo selector (multi), Channel selector (Global/HTTP/MCP/CLI); show effective value.
- Views (left nav): Overview, All Settings (default), Retrieval, Reranker, Generation, Embeddings, Repos, Indexing/Hydration, Eval & Diagnostics, Integrations, Advanced.
- Filters (chips): tags (retrieval/rerank/generation/embeddings/hydration/indexing/routing/repos/eval/integration/diagnostics/cost), impact (latency/quality gate/reindex), changed/favorites.
- Controls: toggle, number steppers with bounds, select, text, list chips editor, path editor; bulk-apply across selected repos/channels.
- Feedback: inline validation, “Applied” toast, badges (requires reindex, affects latency/gates), per-setting help and docs link.
- Favorites and History: star knobs; show recent changes in Overview; undo/redo.

## Components

- AppShell (sidebar + header with SearchBar + ScopeBar)
- SearchBar (local & rag results; keyboard nav)
- ScopeBar (RepoMultiSelect, ChannelSelect, EffectiveValueBadge)
- SettingsList (virtualized; sorted by relevance; group by tag)
- SettingRow (label, control, help, badges, history popover)
- RepoEditor (CRUD for keywords/path_boosts/layer_bonuses/paths; toggle enabled; priority_weight)
- ProfilesPanel (save/load/diff/export JSON)
- Toasts/Dialogs (apply summaries; confirm heavy changes)
- DocsPane (renders snippets from RAG hits; link to file paths)

## API Contract

Implement against `docs/API_GUI.md`. Assume JSON over localhost HTTP; no auth.

## Data Loading

1) On load: GET `/api/gui/config`, GET `/api/repos`.
2) When typing search: GET `/api/gui/search_settings?q=...`.
3) Applying edits: PATCH `/api/gui/config` (or POST `/api/repos` for repo metadata). Show badges if `requires_reindex`. Provide a “Reindex now” CTA.

## Visual Style

- Dyslexia-friendly fonts, high contrast, clear focus outlines.
- Compact but readable; large click targets; responsive.
- Minimal dependencies; plain React + CSS is fine.

## Style Reference (from ui/rag-calculator.html)

Adopt this visual language for the Settings UI to match the calculator’s look-and-feel.

- Palette
  - Background: `#0a0a0a` (app), `#111111` (cards)
  - Borders/dividers: `#2a2a2a`
  - Muted text: `#888` (labels, subtitle), `#666` (meta)
  - Brand accent (AGRO green): `#00ff88` (badges, focus, totals, links)
  - Warning: bg `#331a00`, border `#664400`, text `#ffaa00`
  - Success: bg `#003311`, border `#006622`, text `#00ff88`

- Typography
  - Base: Inter, system UI stack (`'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`)
  - Numeric/tech: `'SF Mono', Monaco, Inconsolata, monospace` for inputs/values
  - Headline: 32px, weight 300, letter-spacing -1px; brand word highlighted in AGRO green
  - Section titles: 18px, weight 600
  - Labels: 11px, uppercase, 0.5px letter-spacing, weight 500
  - Meta/subtitles: 12–14px

- Layout
  - Responsive grid: 2 columns → 1 column below 1024px
  - Card surfaces: 8px radius, 1px border, 24px padding
  - Consistent spacing scale: 4/8/12/16/24/40

- Components
  - Badge: pill, 10px font, uppercase, bg `#00ff88`, text `#000`, 4px radius
  - Inputs/selects: bg `#1a1a1a`, border `#333`, focus ring and border-color `#00ff88`
  - Tooltips: small “?” circle (14px), hover reveals content bubble (light bg `#fff`, dark text `#000`, 6px radius, shadow)
  - Result rows: label (uppercase, small, muted) + value (mono, bold); totals highlighted in AGRO green
  - Status banners: `.warning`, `.success` classes per palette above
  - Plan cards (example): neutral border; `.fits` = green border, `.exceeds` = amber border

- Header/Branding
  - Title: "AGRO Settings" with `<span class="brand">AGRO</span>` colored `#00ff88`
  - Consider reusing the calculator header layout: centered title + small uppercase subtitle

- Interaction
  - Subtle transitions on inputs (0.2s)
  - Clear focus outlines; accessible contrast on dark surfaces
  - Keyboard-friendly (tab order, focus states)

## Deliverables

- SPA in `gui/`: `index.html`, `app.js`, `style.css`.
- Type mapping for settings from `ui/ALL_KNOBS.yaml` to controls.
- State store with optimistic updates and rollback.
