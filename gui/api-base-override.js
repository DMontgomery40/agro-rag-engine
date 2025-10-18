// API Base URL Override - sets AGRO API endpoints
(() => {
  'use strict';

  const BASE = window.location.origin + '/api';

  function setupAPI() {
    if (!window.CoreUtils) {
      setTimeout(setupAPI, 100);
      return;
    }

    try {
      window.CoreUtils.API_BASE = BASE;

      // Helper to build API URLs
      window.CoreUtils.api = function(path) {
        const p = String(path || '');
        if (p.startsWith('/api/')) return BASE + p.slice(4);
        if (p.startsWith('/')) return BASE + p;
        return BASE + '/' + p;
      };

      console.log('[AGRO GUI] API base configured:', BASE);
    } catch (e) {
      console.warn('[API override] Setup failed:', e);
    }
  }

  // Setup when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupAPI);
  } else {
    setupAPI();
  }
})();
