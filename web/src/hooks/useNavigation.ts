// AGRO - useNavigation Hook
// Replaces legacy navigation.js DOM manipulation with React Router

import { useCallback, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { routes } from '../config/routes';

export function useNavigation() {
  const navigate = useNavigate();
  const location = useLocation();

  // Get current tab from location
  const activeTab = location.pathname.slice(1) || 'dashboard';

  // Navigate to a tab
  const navigateTo = useCallback((tabId: string) => {
    // Ensure leading slash
    const path = tabId.startsWith('/') ? tabId : `/${tabId}`;
    navigate(path);

    // Store in localStorage for compatibility with legacy modules
    try {
      localStorage.setItem('nav_current_tab', tabId.replace('/', ''));
    } catch (e) {
      console.warn('[useNavigation] Failed to save to localStorage:', e);
    }
  }, [navigate]);

  // Handle browser back/forward
  useEffect(() => {
    // Update localStorage when location changes
    try {
      const currentTab = location.pathname.slice(1) || 'dashboard';
      localStorage.setItem('nav_current_tab', currentTab);
    } catch (e) {
      console.warn('[useNavigation] Failed to save to localStorage:', e);
    }
  }, [location]);

  // Restore last tab from localStorage on mount
  useEffect(() => {
    try {
      const lastTab = localStorage.getItem('nav_current_tab');
      if (lastTab && location.pathname === '/') {
        // Only navigate if we're at root
        const route = routes.find(r => r.path === `/${lastTab}`);
        if (route) {
          navigate(`/${lastTab}`, { replace: true });
        }
      }
    } catch (e) {
      console.warn('[useNavigation] Failed to restore from localStorage:', e);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    activeTab,
    navigateTo,
    currentPath: location.pathname
  };
}
