// API Base URL Override - sets AGRO API endpoints
(() => {
  'use strict';

  const BASE = window.location.origin + '/api';

  /**
   * ---agentspec
   * what: |
   *   Polls for CoreUtils global availability, then sets API_BASE URL. Retries every 100ms until CoreUtils exists.
   *
   * why: |
   *   Ensures CoreUtils loads before configuration to avoid race conditions.
   *
   * guardrails:
   *   - DO NOT set API_BASE if CoreUtils missing; defer via setTimeout
   *   - NOTE: Infinite retry loop if CoreUtils never loads; add max-attempt guard
   *   - ASK USER: Should timeout after N retries instead of polling indefinitely?
   * ---/agentspec
   */
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
