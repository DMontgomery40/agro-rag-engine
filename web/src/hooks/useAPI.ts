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
      
      // If on Vite dev server (ports 5170-5179), talk directly to backend on 8012
      const port = u.port || '';
      if (port && /^517[0-9]$/.test(port)) {
        return 'http://127.0.0.1:8012/api';
      }
      
      // If protocol is http/https but not Vite dev port, use same origin
      if (u.protocol.startsWith('http')) {
        return (u.origin.replace(/\/$/, '')) + '/api';
      }
      
      // Default fallback to local backend
      return 'http://127.0.0.1:8012/api';
    } catch {
      // Always return a valid base URL, never empty
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
    // Ensure base is never empty - fallback to localhost:8012 if undefined/empty
    let base = String(apiBase || 'http://127.0.0.1:8012/api').replace(/\/$/, '');
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
