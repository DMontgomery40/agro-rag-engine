// Theme Engine - Light/Dark mode management
// Handles theme detection, switching, and persistence
;(function() {
  'use strict';

  // Get shared utilities
  const $ = window.CoreUtils?.$ || ((s) => document.querySelector(s));

  // ---------------- Theme Functions ----------------

  function resolveTheme(mode) {
    const m = String(mode || 'auto').toLowerCase();
    if (m === 'light' || m === 'dark') return m;
    const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
    return prefersDark ? 'dark' : 'light';
  }

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
