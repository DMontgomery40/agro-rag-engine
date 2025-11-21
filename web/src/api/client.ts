import axios, { AxiosInstance, AxiosError } from 'axios';

// Get API base URL from env or default to current origin
const API_BASE = import.meta.env.VITE_API_BASE || '';

// Create axios instance with defaults
export const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE,
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

// Helper to build API paths
export const api = (path: string): string => {
  return path.startsWith('/') ? path : `/${path}`;
};
