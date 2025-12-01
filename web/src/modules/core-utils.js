// Core Utilities - Shared helpers for all GUI modules
// Provides API base resolution, DOM helpers, and global state
;(function() {
  'use strict';

  // Backend API base: respects ?api= override; defaults to local FastAPI
  /**
   * ---agentspec
   * what: |
   *   Resolves API base URL from query param, same-origin, or fallback. Returns string.
   *
   * why: |
   *   Centralizes API endpoint config to support dev overrides and production same-origin routing.
   *
   * guardrails:
   *   - DO NOT hardcode API URLs; use this resolver for all client requests
   *   - NOTE: Query param 'api' takes precedence; strips trailing slash
   *   - NOTE: Falls back to window.location.origin only if served over HTTP(S)
   * ---/agentspec
   */
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
  /**
   * ---agentspec
   * what: |
   *   Defines API endpoint builder, DOM query helpers ($, $$), and initializes global app state. Inputs: selector strings, API paths. Outputs: resolved URLs, DOM node arrays.
   *
   * why: |
   *   Centralizes utility functions and state for consistent DOM/API access across app.
   *
   * guardrails:
   *   - DO NOT mutate global state directly; use accessor functions
   *   - NOTE: $$ returns Array, not NodeList; enables array methods
   *   - NOTE: API_BASE must be defined before api() calls
   * ---/agentspec
   */
  const api = (p) => `${API_BASE}${p}`;

  // Helper: Query selector (single element)
  /**
   * ---agentspec
   * what: |
   *   Initializes DOM query helpers ($, $$) and global state object (prices, config). Provides foundation for DOM manipulation and app state management.
   *
   * why: |
   *   Centralizes selector logic and state in one place to avoid repeated boilerplate and ensure consistent access patterns.
   *
   * guardrails:
   *   - DO NOT mutate state directly; use setter functions only
   *   - NOTE: $ returns single element; $$ returns array; both can be null
   * ---/agentspec
   */
  const $ = (sel) => document.querySelector(sel);

  // Helper: Query selector (all matching elements as array)
  /**
   * ---agentspec
   * what: |
   *   Initializes global app state object with prices, config, profiles, and defaultProfile properties. Provides centralized store for DOM queries via $$ utility.
   *
   * why: |
   *   Single source of truth for app data; enables consistent state access across modules.
   *
   * guardrails:
   *   - DO NOT mutate state directly; use setter functions only
   *   - NOTE: $$ returns Array, not NodeList; querySelectorAll must be spread
   *   - ASK USER: Add state validation/schema before production use
   * ---/agentspec
   */
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
