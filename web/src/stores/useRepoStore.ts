/**
 * AGRO - Centralized Repository State Management
 * 
 * Provides a single source of truth for:
 * - Available repositories list
 * - Currently active repository
 * - Repo switching with backend propagation
 * 
 * All components should use this store instead of local state for repo selection.
 */

import { create } from 'zustand';

export interface Repository {
  name: string;
  slug?: string;
  path?: string;
  branch?: string;
  exclude_paths?: string[];
  keywords?: string[];
  path_boosts?: string[];
  layer_bonuses?: Record<string, Record<string, number>>;
}

interface RepoStore {
  // State
  repos: Repository[];
  activeRepo: string;
  loading: boolean;
  error: string | null;
  switching: boolean;
  
  // Actions
  loadRepos: () => Promise<void>;
  setActiveRepo: (repoName: string) => Promise<void>;
  refreshActiveRepo: () => Promise<void>;
  getRepoByName: (name: string) => Repository | undefined;
}

// Determine API base URL
const getApiBase = (): string => {
  try {
    const u = new URL(window.location.href);
    if (u.port === '5173') return 'http://127.0.0.1:8012/api';
    return u.origin + '/api';
  } catch {
    return '/api';
  }
};

export const useRepoStore = create<RepoStore>((set, get) => ({
  repos: [],
  activeRepo: '',
  loading: false,
  error: null,
  switching: false,

  loadRepos: async () => {
    set({ loading: true, error: null });
    try {
      const apiBase = getApiBase();
      
      // Fetch repos list AND current config in parallel
      const [reposRes, configRes] = await Promise.all([
        fetch(`${apiBase}/repos`),
        fetch(`${apiBase}/config`)
      ]);
      
      if (!reposRes.ok || !configRes.ok) {
        throw new Error('Failed to load repos or config');
      }
      
      const reposData = await reposRes.json();
      const configData = await configRes.json();
      
      const repos: Repository[] = reposData.repos || [];
      const activeRepo = configData.env?.REPO || configData.default_repo || (repos[0]?.name || 'agro');
      
      set({ 
        repos, 
        activeRepo,
        loading: false, 
        error: null 
      });
      
      // Broadcast repo state for any listeners
      window.dispatchEvent(new CustomEvent('agro-repo-loaded', { 
        detail: { repos, activeRepo } 
      }));
      
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load repositories'
      });
    }
  },

  setActiveRepo: async (repoName: string) => {
    const { activeRepo, repos } = get();
    if (repoName === activeRepo) return;
    
    // Verify repo exists
    const targetRepo = repos.find(r => r.name === repoName || r.slug === repoName);
    if (!targetRepo && repos.length > 0) {
      set({ error: `Repository "${repoName}" not found` });
      return;
    }
    
    set({ switching: true, error: null });
    
    try {
      const apiBase = getApiBase();
      
      // Update backend config with new REPO
      const response = await fetch(`${apiBase}/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: { REPO: repoName } })
      });
      
      if (!response.ok) {
        throw new Error('Failed to update active repository');
      }
      
      // Trigger config reload to propagate changes to all backend modules
      await fetch(`${apiBase}/env/reload`, { method: 'POST' });
      
      const previousRepo = activeRepo;
      set({ activeRepo: repoName, switching: false });
      
      // Broadcast repo change for all listeners
      window.dispatchEvent(new CustomEvent('agro-repo-changed', { 
        detail: { repo: repoName, previous: previousRepo } 
      }));
      
    } catch (error) {
      set({
        switching: false,
        error: error instanceof Error ? error.message : 'Failed to switch repository'
      });
    }
  },

  refreshActiveRepo: async () => {
    const apiBase = getApiBase();
    try {
      const response = await fetch(`${apiBase}/config`);
      if (response.ok) {
        const data = await response.json();
        const activeRepo = data.env?.REPO || data.default_repo || 'agro';
        set({ activeRepo });
      }
    } catch {
      // Silent fail - will use cached value
    }
  },

  getRepoByName: (name: string) => {
    return get().repos.find(r => r.name === name || r.slug === name);
  }
}));

// Export selector hooks for convenience
export const useActiveRepo = () => useRepoStore(state => state.activeRepo);
export const useRepos = () => useRepoStore(state => state.repos);
export const useRepoLoading = () => useRepoStore(state => state.loading || state.switching);

