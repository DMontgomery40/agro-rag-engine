# UX Information Architecture and Navigation

This document proposes the navigation model, route map, and layout system for the new Vite/React app. It scales from self‑hosted to cloud (RBAC/tenancy) without rewrites, keeping everything accessible and keyboard friendly.

## Navigation Model

- Primary navigation: left sidebar (collapsible). Sections are feature‑oriented, not technical.
- Secondary navigation: top tabs under the page header. Tabs update based on the selected left‑hand section.
- Top bar quick actions: two dedicated buttons for VSCode and Grafana with a small dropdown on each:
  - VSCode button: "Open Inline" (iframe) and "Open in New Window" options.
  - Grafana button: "Open Inline" (iframe) and "Open in New Window" options.
- Global actions: command palette, repo switcher, profile, theme.
- Context panel: optional right‑hand panel for details/logs in heavy workflows (indexing/cards/chat traces).

## Primary Sections (Sidebar)
- Dashboard
  - Contains a Pipeline Summary card showing: active repo (or local docs mode), branch, retrieval mode (BM25/Dense/Hybrid), reranker mode+model, enrichment on/off, generative model, and backends health (Qdrant/Redis/LLM). Quick links to jump to the relevant settings.
- Repositories (Projects)
- Chat
- Search
- Traces
- Indexing
- Keywords
- Profiles
- Calculators (Cost, Storage)
- VSCode (also available via top bar button)
- Grafana (also available via top bar button)
- Infrastructure
- MCP Tools
- Alerts
- Settings
- Admin (visible only when feature flagged)

Each section maps to a stable route prefix, and drives which secondary tabs appear.

## Secondary Tabs (Per Section)
- Chat: Conversation, Settings, History
- Search: Retrieval, Answer, Inspect (raw docs), Metrics
- Traces: Latest, List, Upload/Compare (future)
- Indexing: Start, Status, Stats, Semantic Boosts
- Keywords: Current, Generate, Import/Export
- Profiles: Active, Library, Auto‑Profile
- Calculators: Cost, Storage
- Editor: IDE, Settings, Health
- Grafana: Overview, Panels (links)
- Infrastructure: Containers, Logs, Redis/Qdrant, Controls
- MCP: Status, HTTP Bridge, Tools
- Settings: Env, Secrets, Repos, Prices

## Route Map (React Router)
- `/dashboard`
- `/repos` (project/repo selector)
- `/chat` (tabs via subroutes: `/chat/settings` etc.)
- `/search`, `/answer`
- `/traces`, `/traces/latest`
- `/indexing`, `/indexing/cards`
- `/keywords`, `/keywords/generate`
- `/profiles`, `/profiles/auto`
- `/calc/cost`, `/calc/storage`
- `/editor`
- `/grafana`
- `/infra`
- `/mcp`
- `/alerts`
- `/settings` (env/secrets/repos/prices)

All routes are deep‑linkable and preserve state via URL params where sensible.

## Server‑Driven Navigation

- Add `/api/nav` (future) to return a JSON structure describing sections, tabs, and visibility (by feature flag, license, or user role). The SPA renders menus from this, ensuring no hard‑coded items.
- For self‑host, `/api/nav` can mirror the default config; for cloud, it can tailor per tenant and plan.

Example shape (illustrative):
```
{
  "sections": [
    {"id":"chat","title":"Chat","path":"/chat","tabs":[{"id":"conversation","path":"/chat"},{"id":"settings","path":"/chat/settings"}]},
    {"id":"calc","title":"Calculators","path":"/calc","tabs":[{"id":"cost","path":"/calc/cost"},{"id":"storage","path":"/calc/storage"}]}
  ]
}
```

## Layout System

- AppShell: `Sidebar` (collapsible) + `Topbar` (actions) + `Content` + optional `RightPane`.
- Responsive behavior: sidebar collapses to icons on md; becomes overlay on sm.
- Keyboard support: `Ctrl/Cmd+K` command palette, `[`/`]` to switch tabs, `g` jumps (e.g. `g c` goes to Chat).
- A11y: landmark roles, aria labels for nav, visible focus outlines, skip links.

## Component Standards

- Tailwind with CSS variables for design tokens (colors, spacing, typography) to enable future theming/white‑label.
- Headless components for menus/tabs/dialogs; axe-core checks in CI.
- Route‑level code‑splitting and progressive hydration.

## Forward Compatibility (Cloud)

- Nav items include `requiredRole`, `requiredFeature` fields so RBAC/license gating is plug‑and‑play later.
- Multi‑tenant: routes accept `/t/:tenantId` prefix (optional) in a future cloud mode; SPA reads it from pathname and sets context.
- CSP: all embeds (Grafana/Editor) use allowlists derived from env to avoid future cross‑origin issues.

## Migration Guidance

- Implement Sidebar + Topbar first with static config; switch to server‑driven after `/api/nav` exists.
- Add Playwright coverage for: sidebar visibility/collapse, tab switching updates content, keyboard shortcuts, a11y checks.
 - Playwright for top bar Editor/Grafana buttons: dropdown opens new window vs. inline embed behaviors.
