import axios, { AxiosInstance, AxiosError } from 'axios';

/**
 * Resolve API base URL - same logic as useAPI hook
 * Ensures consistency across axios and fetch-based API calls
 */
function resolveAPIBase(): string {
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
}

// Get API base URL from env or resolve dynamically
const API_BASE = import.meta.env.VITE_API_BASE || resolveAPIBase();

// Create axios instance with defaults
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE || 'http://127.0.0.1:8012/api', // Final fallback to prevent empty baseURL
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    console.error('[API Error]', error.message, error.response?.data);
    return Promise.reject(error);
  }
);

// Helper to build API paths for axios (relative to baseURL)
export const api = (path: string): string => {
  return path.startsWith('/') ? path : `/${path}`;
};

// Helper to build full API URLs for fetch
export const apiUrl = (path: string): string => {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${API_BASE}${normalizedPath}`;
};
