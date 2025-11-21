// Core Utilities - Shared helpers for all GUI modules
// Provides API base resolution, DOM helpers, and global state
;(function() {
  'use strict';

  // Backend API base: respects ?api= override; defaults to local FastAPI
  const API_BASE = (() => {
    try {
      const u = new URL(window.location.href);
      const q = new URLSearchParams(u.search);
      const override = q.get('api');
      if (override) return override.replace(/\/$/, '');
      // Prefer same-origin whenever we were served over HTTP(S)
      if (u.protocol.startsWith('http')) return u.origin;
      // Fallback to local default
      return 'http://127.0.0.1:8012';
    } catch {
      return 'http://127.0.0.1:8012';
    }
  })();

  // Expose the resolved API base for diagnostics
  try { window.API_BASE = API_BASE; } catch {}

  // Helper: Construct full API URL
  const api = (p) => `${API_BASE}${p}`;

  // Helper: Query selector (single element)
  const $ = (sel) => document.querySelector(sel);

  // Helper: Query selector (all matching elements as array)
  const $$ = (sel) => Array.from(document.querySelectorAll(sel));

  // Global application state
  const state = {
    prices: null,
    config: null,
    profiles: [],
    defaultProfile: null,
  };

  // Export public API
  window.CoreUtils = {
    API_BASE,
    api,
    $,
    $$,
    state
  };

  console.log('[CoreUtils] Loaded - API:', API_BASE);
})();
