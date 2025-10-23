// Autotune - Parameter optimization
// Handles autotune status and configuration
;(function() {
  'use strict';

  // Get shared utilities
  const api = window.CoreUtils?.api || ((p) => `/api${p}`);
  const $ = window.CoreUtils?.$ || ((s) => document.querySelector(s));

  // Refresh autotune status
  async function refreshAutotune() {
    try {
      const r = await fetch(api('/api/autotune/status'));
      if (!r.ok) {
        if (r.status === 403 || r.status === 402) {
          const modeEl = $('#autotune-mode');
          if (modeEl) modeEl.textContent = 'Pro required (set Edition to pro)';
        } else {
          const modeEl = $('#autotune-mode');
          if (modeEl) modeEl.textContent = '—';
        }
        const enabledEl = $('#autotune-enabled');
        if (enabledEl) enabledEl.checked = false;
        return;
      }

      const d = await r.json();
      const enabledEl = $('#autotune-enabled');
      const modeEl = $('#autotune-mode');

      if (enabledEl) enabledEl.checked = !!d.enabled;
      if (modeEl) modeEl.textContent = d.current_mode || '—';
    } catch (e) {
      const modeEl = $('#autotune-mode');
      if (modeEl) {
        modeEl.textContent = '⚠ Error loading';
        modeEl.title = `Failed to load autotune status: ${e.message}. The backend API may be unavailable.`;
        modeEl.style.color = 'var(--warn)';
      }
      console.error('[Autotune] Refresh failed:', e);
      console.warn('[Autotune] Tips to resolve:');
      console.warn('  • Verify backend is running (check Infrastructure tab)');
      console.warn('  • Check server logs: docker compose -f docker-compose.services.yml logs -f api');
      console.warn('  • Or inspect container directly: docker logs agro-api');
      console.warn('  • Refresh the page (Ctrl+F5) to retry');
    }
  }

  // Set autotune enabled/disabled
  async function setAutotuneEnabled() {
    try {
      const enabled = document.getElementById('autotune-enabled').checked;
      const r = await fetch(api('/api/autotune/status'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled, current_mode: null })
      });
      if (!r.ok) {
        if (r.status === 403 || r.status === 402) {
          const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Pro Feature Required', {
            message: 'Autotune requires Pro edition license',
            causes: [
              'PRO_ENABLED environment variable is not set to 1',
              'Edition setting in Misc section is not set to "pro"',
              'Backend does not recognize current license level'
            ],
            fixes: [
              'Go to Admin tab > Misc section and set Edition to "pro"',
              'Set PRO_ENABLED=1 in your .env file and restart backend',
              'Contact support if you have a Pro license but feature is locked'
            ],
            links: [
              ['Pro Features', '/docs/PRO.md'],
              ['License Configuration', '/docs/CONFIGURATION.md#licensing'],
              ['Backend Health', '/api/health']
            ]
          }) : 'Autotune is a Pro feature. Enable it by setting Edition to "pro" (Misc section) or PRO_ENABLED=1.';
          alert(msg);
          $('#autotune-enabled').checked = false;
          return;
        }
        throw new Error('HTTP ' + r.status);
      }
      await refreshAutotune();
    } catch (e) {
      const msg = window.ErrorHelpers ? window.ErrorHelpers.createAlertError('Failed to Configure Autotune', {
        message: e.message,
        causes: [
          'Backend autotune API endpoint is not responding',
          'Pro edition is not enabled (license check failed)',
          'Network connection to backend was lost',
          'Backend service crashed or restarted during request'
        ],
        fixes: [
          'Verify backend is running: check Infrastructure tab',
          'Enable Pro edition in Admin > Misc section',
          'Check network connectivity and retry',
          'Review backend logs for specific error details'
        ],
        links: [
          ['Autotune Documentation', '/docs/AUTOTUNE.md'],
          ['Pro Edition Setup', '/docs/PRO.md'],
          ['Backend Health', '/api/health']
        ]
      }) : ('Failed to set Auto‑Tune: ' + e.message);
      alert(msg);
    }
  }

  // Export public API
  window.Autotune = {
    refreshAutotune,
    setAutotuneEnabled
  };

  console.log('[Autotune] Loaded');
})();
