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

  // Simple event bus (on/off/emit)
  function createEventBus() {
    const listeners = {};
    return {
      on(event, handler) {
        if (typeof handler !== 'function') return () => {};
        (listeners[event] = listeners[event] || []).push(handler);
        return () => this.off(event, handler);
      },
      off(event, handler) {
        const arr = listeners[event];
        if (!arr) return;
        const idx = arr.indexOf(handler);
        if (idx !== -1) arr.splice(idx, 1);
      },
      emit(event, payload) {
        const arr = listeners[event];
        if (!arr || !arr.length) return;
        arr.slice().forEach(fn => {
          try {
            fn(payload);
          } catch (err) {
            console.error('[CoreUtils.events] handler error for', event, err);
          }
        });
      }
    };
  }

  const events = createEventBus();

  // Export public API
  window.CoreUtils = {
    API_BASE,
    api,
    $,
    $$,
    state,
    events
  };

  console.log('[CoreUtils] Loaded - API:', API_BASE);
})();
