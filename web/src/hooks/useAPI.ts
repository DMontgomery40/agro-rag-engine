import { useState, useEffect, useCallback } from 'react';

/**
 * useAPI Hook
 * Manages API base URL configuration with support for query parameter overrides
 * Converts core-utils.js and api-base-override.js functionality to React
 */
export function useAPI() {
  const [apiBase, setApiBase] = useState<string>('');

  // Initialize API base URL on mount
  useEffect(() => {
    const resolveAPIBase = (): string => {
      try {
        const u = new URL(window.location.href);
        const q = new URLSearchParams(u.search);
        const override = q.get('api');

        if (override) {
          return override.replace(/\/$/, '');
        }

        // Prefer same-origin whenever we were served over HTTP(S)
        if (u.protocol.startsWith('http')) {
          return u.origin + '/api';
        }

        // Fallback to local default
        return 'http://127.0.0.1:8012';
      } catch {
        return 'http://127.0.0.1:8012';
      }
    };

    const base = resolveAPIBase();
    setApiBase(base);

    // Expose to window for backwards compatibility during migration
    try {
      (window as any).API_BASE = base;
    } catch {}

    console.log('[useAPI] API base configured:', base);
  }, []);

  // Helper to build full API URLs
  const api = useCallback((path: string = ''): string => {
    const p = String(path || '');

    // Handle different path formats
    if (p.startsWith('/api/')) {
      return apiBase + p.slice(4);
    }
    if (p.startsWith('/')) {
      return apiBase + p;
    }
    return apiBase + '/' + p;
  }, [apiBase]);

  return {
    apiBase,
    api
  };
}
