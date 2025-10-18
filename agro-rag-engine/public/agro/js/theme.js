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
        ['#0a0a0a', 'var(--card-bg)'],
        ['#0f0f0f', 'var(--code-bg)'],
        ['#111111', 'var(--panel-bg)'],
        ['#1a1a1a', 'var(--bg-elev2)'],
        ['#2a2a2a', 'var(--line)'],
        ['#333', 'var(--line)'],
        ['#666', 'var(--fg-muted)'],
        ['#888', 'var(--fg-muted)'],
        ['#ddd', 'var(--fg)'],
        ['#ffffff', 'var(--fg)'],
        ['#5b9dff', 'var(--link)'],
        ['#00ff88', 'var(--accent)'],
        ['#ff9b5e', 'var(--accent)'],
        ['#ff6b6b', 'var(--err)']
      ];
      const nodes = document.querySelectorAll('[style*="#0a0a0a"], [style*="#0f0f0f"], [style*="#111111"], [style*="#1a1a1a"], [style*="#2a2a2a"], [style*="#333"], [style*="#666"], [style*="#888"], [style*="#ddd"], [style*="#ffffff"], [style*="#5b9dff"], [style*="#00ff88"], [style*="#ff9b5e"], [style*="#ff6b6b"]');
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
