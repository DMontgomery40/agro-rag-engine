// Health Check - System health monitoring
// Handles health status checking and display
;(function() {
  'use strict';

  // Get shared utilities
  const api = window.CoreUtils?.api || ((p) => `/api${p}`);
  const $ = window.CoreUtils?.$ || ((s) => document.querySelector(s));

  // Check system health
  async function checkHealth() {
    try {
      const r = await fetch(api('/health'));
      const d = await r.json();
      const healthEl = $('#health-status');
      if (healthEl) {
        healthEl.textContent = d.ok || d.status === 'healthy'
          ? `OK @ ${d.ts ? new Date(d.ts).toLocaleString() : new Date().toLocaleString()}`
          : 'Not OK';
      }
    } catch (e) {
      const healthEl = $('#health-status');
      if (healthEl) {
        healthEl.textContent = '⚠ Unreachable';
        healthEl.title = `Health check failed: ${e.message}. Backend API at http://localhost:8012 may not be running. Check Infrastructure tab or server logs.`;
        healthEl.style.color = 'var(--warn)';
      }
      console.error('[Health] Check failed:', e);
      console.warn('[Health] Backend health check unreachable. Possible causes:');
      console.warn('  • Docker container not running');
      console.warn('  • Port 8012 already in use by another service');
      console.warn('  • Network/firewall blocking localhost:8012');
      console.warn('  • Python backend dependencies not installed');
    }
  }

  // Export public API
  window.Health = {
    checkHealth
  };

  console.log('[Health] Loaded');
})();
