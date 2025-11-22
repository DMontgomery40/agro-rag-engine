import { useState, useEffect, useCallback } from 'react';

/**
 * useAPI Hook
 * Manages API base URL configuration with support for query parameter overrides
 * Converts core-utils.js and api-base-override.js functionality to React
 */
export function useAPI() {
  const resolveAPIBase = (): string => {
    try {
      const u = new URL(window.location.href);
      const q = new URLSearchParams(u.search);
      const override = q.get('api');
      if (override) return override.replace(/\/$/, '');
      // If on vite dev server (5173/4/5), use relative URLs to go through Vite proxy
      if (u.port === '5173' || u.port === '5174' || u.port === '5175') return '';
      if (u.protocol.startsWith('http')) return (u.origin.replace(/\/$/, '')) + '/api';
      return 'http://127.0.0.1:8012/api';
    } catch {
      return 'http://127.0.0.1:8012/api';
    }
  };

  // Initialize synchronously to avoid first-render race conditions
  const [apiBase, setApiBase] = useState<string>(() => resolveAPIBase());

  // Observe changes to ?api= override (rare) and update
  useEffect(() => {
    const next = resolveAPIBase();
    if (next !== apiBase) setApiBase(next);
    try { (window as any).API_BASE = next; } catch {}
    console.log('[useAPI] API base configured:', next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Helper to build full API URLs
  const api = useCallback((path: string = ''): string => {
    let base = String(apiBase || '').replace(/\/$/, '');
    let p = String(path || '');
    // Normalize to /api/... path regardless of caller format
    if (!p.startsWith('/')) p = '/' + p;
    if (!p.startsWith('/api/')) p = '/api' + p;
    // Ensure base does not already include /api twice
    base = base.replace(/\/api$/, '');
    return base + p;
  }, [apiBase]);

  return {
    apiBase,
    api
  };
}
