# UI Design Tokens Plan (Colors, Fonts, Themes)

This documents how we will carry forward the existing CSS token approach into the new Vite/React/TS/Tailwind app, preserving names and behavior while making theming and accessibility first‑class.

## Goals
- Keep existing token names so the visual language remains consistent.
- Map tokens into Tailwind so components use utility classes backed by CSS variables.
- Support light/dark (and later high‑contrast + brand themes) without refactors.
- Enforce WCAG AA contrast and keyboard focus visibility.

## Token Sources (today)
Tokens seen in current GUI styles and scripts include (non‑exhaustive):
- Neutrals: `--bg`, `--fg`, `--fg-muted`, `--panel`, `--panel-bg`, `--code-bg`, `--card-bg`, `--bg-elev2`, `--input-bg`, `--line`, `--ring`
- Accent + status: `--accent`, `--accent-contrast`, `--link`, `--ok`, `--warn`, `--err`
- Typography: system sans; code fonts via `SF Mono`/Monaco/etc.

We will standardize these into a canonical set and preserve their names to avoid churn.

## Files and Structure (web/)
- `web/src/styles/tokens.css`
  - Defines CSS variables for `:root[data-theme="dark"]` and `:root[data-theme="light"]`.
  - Optional: `:root[data-theme="hc"]` for high‑contrast.
- `web/src/styles/global.css`
  - Imports `tokens.css`; sets base elements; Tailwind’s `@tailwind base; @tailwind components; @tailwind utilities;`.
- `web/tailwind.config.ts`
  - Colors map to `var(--token)` so utilities like `bg-bg`, `text-fg`, `border-line`, `ring-ring`, `text-link` work.
- Fonts
  - `--font-sans` and `--font-mono` variables in `tokens.css`.
  - Tailwind `fontFamily` extends to use `var(--font-sans)` / `var(---font-mono)`.

## Sample tokens.css (illustrative)
```
:root {
  --font-sans: Inter, system-ui, -apple-system, Segoe UI, Roboto, sans-serif;
  --font-mono: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
}

:root[data-theme="dark"] {
  --bg: #0b0f14;
  --fg: #e6e9ef;
  --fg-muted: #a6adbb;
  --panel: #0f141b;
  --panel-bg: #121822;
  --code-bg: #0f141b;
  --card-bg: #111827;
  --bg-elev2: #131a23;
  --input-bg: #0f141b;
  --line: #1f2937;
  --ring: rgba(59,130,246,0.35);
  --accent: #3b82f6;
  --accent-contrast: #0b1220;
  --link: #7aa2ff;
  --ok: #22c55e;
  --warn: #f59e0b;
  --err: #ef4444;
}

:root[data-theme="light"] {
  --bg: #ffffff;
  --fg: #0b0f14;
  --fg-muted: #4b5563;
  --panel: #f9fafb;
  --panel-bg: #f3f4f6;
  --code-bg: #f8fafc;
  --card-bg: #ffffff;
  --bg-elev2: #eef2f7;
  --input-bg: #ffffff;
  --line: #e5e7eb;
  --ring: rgba(59,130,246,0.35);
  --accent: #2563eb;
  --accent-contrast: #ffffff;
  --link: #1d4ed8;
  --ok: #15803d;
  --warn: #b45309;
  --err: #b91c1c;
}
```

## Tailwind config mapping (snippet)
```
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        bg: "var(--bg)",
        fg: "var(--fg)",
        muted: "var(--fg-muted)",
        panel: "var(--panel)",
        panelBg: "var(--panel-bg)",
        codeBg: "var(--code-bg)",
        cardBg: "var(--card-bg)",
        bgElev2: "var(--bg-elev2)",
        inputBg: "var(--input-bg)",
        line: "var(--line)",
        ring: "var(--ring)",
        accent: "var(--accent)",
        accentContrast: "var(--accent-contrast)",
        link: "var(--link)",
        ok: "var(--ok)",
        warn: "var(--warn)",
        err: "var(--err)",
      },
      fontFamily: {
        sans: ["var(--font-sans)"],
        mono: ["var(--font-mono)"],
      },
    },
  },
  plugins: [],
}
```

## Theme selection
- Default to `data-theme="dark"` (as now), toggle via a control in Settings.
- Respect `prefers-color-scheme` on first load; persist override in `localStorage`.
- High‑contrast (`hc`) can ship later using the same tokens file.

## Accessibility
- Run axe-core a11y checks in Playwright on core routes (config/chat/search/traces).
- Ensure focus rings use `--ring` and are always visible.
- Maintain minimum AA contrast on all text vs backgrounds; tokens are picked accordingly.

## Migration plan
- Extract the canonical token list by static scanning for `var(--*)` in `gui/style.css` and related files; confirm with design.
- Seed `tokens.css` with those names; point Tailwind config to `var(--token)` values.
- Replace ad-hoc inline colors in React components with Tailwind utilities using the mapped colors (e.g., `text-fg`, `bg-panel`, `border-line`, `ring-ring`, `text-link`, `text-warn`, `text-err`).
- Fonts: use `font-sans` and `font-mono` classes (mapped to variables) so branding overrides are simple.

## Brand theming (forward‑looking)
- Add an optional `:root[data-brand="acme"]` layer that overrides a subset of tokens (accent/link/ok/warn/err) without touching components.
- Keep all component colors driven by tokens; never hard‑code brand colors in components.

## Testing
- Visual smoke: render a token swatch grid and snapshot it via Playwright to catch accidental token regressions.
- A11y: ensure dark/light/hc themes pass AA contrast on text vs background.
