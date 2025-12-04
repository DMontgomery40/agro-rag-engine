// Theme Engine - Light/Dark mode management
// Handles theme detection, switching, and persistence
;(function() {
  'use strict';

  // Get shared utilities
  const $ = window.CoreUtils?.$ || ((s) => document.querySelector(s));

  // ---------------- Theme Functions ----------------

  /**
   * ---agentspec
   * what: |
   *   Resolves theme mode ('light'/'dark'/'auto') to concrete value. Returns 'light' or 'dark' string. Falls back to system preference via matchMedia.
   *
   * why: |
   *   Centralizes theme resolution logic; decouples caller from browser API and preference detection.
   *
   * guardrails:
   *   - DO NOT call applyTheme without first resolveTheme; applyTheme expects resolved value
   *   - NOTE: matchMedia may return false if unsupported; defaults to 'light'
   *   - DO NOT assume 'auto' mode persists; always resolves to concrete value
   * ---/agentspec
   */
  function resolveTheme(mode) {
    const m = String(mode || 'auto').toLowerCase();
    if (m === 'light' || m === 'dark') return m;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

  /**
   * ---agentspec
   * what: |
   *   Applies theme to document root via data-theme attribute. Resolves theme mode, sets attribute, normalizes legacy inline styles to CSS variables.
   *
   * why: |
   *   Centralized theme application with graceful fallback; try-catch prevents crashes if DOM unavailable.
   *
   * guardrails:
   *   - DO NOT assume mappings array is complete; legacy styles may exist outside this list
   *   - NOTE: Best-effort only; inline styles take precedence over CSS vars
   *   - ASK USER: Should unmapped legacy styles trigger warning or silent skip?
   * ---/agentspec
   */
  function applyTheme(mode) {
    const t = resolveTheme(mode);
    try { document.documentElement.setAttribute('data-theme', t); } catch {}

    // Best-effort normalize legacy inline dark styles to tokenized vars
    try {
      const mappings = [
        ['var(--card-bg)', 'var(--card-bg)'],
        ['var(--code-bg)', 'var(--code-bg)'],
        ['var(--panel)', 'var(--panel-bg)'],
        ['var(--bg-elev2)', 'var(--bg-elev2)'],
        ['var(--line)', 'var(--line)'],
        ['var(--line)', 'var(--line)'],
        ['var(--fg-muted)', 'var(--fg-muted)'],
        ['var(--fg-muted)', 'var(--fg-muted)'],
        ['#ddd', 'var(--fg)'],
        ['#ffffff', 'var(--fg)'],
        ['var(--link)', 'var(--link)'],
        ['var(--accent)', 'var(--accent)'],
        ['#ff9b5e', 'var(--accent)'],
        ['var(--err)', 'var(--err)']
      ];
      const nodes = document.querySelectorAll('[style*="var(--card-bg)"], [style*="var(--code-bg)"], [style*="var(--panel)"], [style*="var(--bg-elev2)"], [style*="var(--line)"], [style*="var(--line)"], [style*="var(--fg-muted)"], [style*="var(--fg-muted)"], [style*="#ddd"], [style*="#ffffff"], [style*="var(--link)"], [style*="var(--accent)"], [style*="#ff9b5e"], [style*="var(--err)"]');
      nodes.forEach(el => {
        let s = el.getAttribute('style') || '';
        mappings.forEach(([k, v]) => { s = s.replaceAll(k, v); });
        el.setAttribute('style', s);
      });
    } catch {}
  }

  /**
   * ---agentspec
   * what: |
   *   Initializes theme mode from localStorage or env.THEME_MODE. Sets both #theme-mode and #misc-theme-mode selectors if present. Defaults to 'auto'.
   *
   * why: |
   *   Centralizes theme initialization with fallback chain: saved preference → env var → default.
   *
   * guardrails:
   *   - DO NOT assume both selectors exist; check presence before setting
   *   - NOTE: localStorage takes precedence over env; verify this is intentional
   *   - ASK USER: Should missing selectors fail silently or throw?
   * ---/agentspec
   */
  function initThemeFromEnv(env) {
    try {
      const saved = localStorage.getItem('THEME_MODE');
      const envMode = env && env.THEME_MODE ? String(env.THEME_MODE) : 'auto';
      const mode = saved || envMode || 'auto';

      // Set both selectors if present
      const selTop = $('#theme-mode');
      const selMisc = $('#misc-theme-mode');
      if (selTop) selTop.value = mode;
      if (selMisc) selMisc.value = mode;
      applyTheme(mode);

      // React to system changes when Auto
      if (window.matchMedia) {
        const mq = window.matchMedia('(prefers-color-scheme: dark)');
        const onChange = () => {
          const current = (selTop && selTop.value) || (selMisc && selMisc.value) || mode;
          if (String(current || 'auto').toLowerCase() === 'auto') applyTheme('auto');
        };
        try { mq.addEventListener('change', onChange); } catch { try { mq.addListener(onChange); } catch {} }
      }
    } catch {}
  }

  /**
   * ---agentspec
   * what: |
   *   Cycles theme mode (auto → dark → light → auto). Reads current from localStorage, writes next state, applies theme, updates UI selectors.
   *
   * why: |
   *   Centralizes theme toggle logic with persistent storage and immediate UI sync.
   *
   * guardrails:
   *   - DO NOT assume selectors exist; check before update
   *   - NOTE: Cycles in fixed order; no random/custom modes
   * ---/agentspec
   */
  function toggleTheme() {
    const current = localStorage.getItem('THEME_MODE') || 'auto';
    const next = current === 'dark' ? 'light' : current === 'light' ? 'auto' : 'dark';
    localStorage.setItem('THEME_MODE', next);
    applyTheme(next);

    // Update selectors if present
    const selTop = $('#theme-mode');
    const selMisc = $('#misc-theme-mode');
    if (selTop) selTop.value = next;
    if (selMisc) selMisc.value = next;
  }

  // Export public API
  window.Theme = {
    resolveTheme,
    applyTheme,
    initThemeFromEnv,
    toggleTheme
  };

  console.log('[Theme] Loaded');
})();
