import { create } from 'zustand';
import { configApi } from '@/api';
import type { AppConfig, EnvConfig, ConfigUpdate, KeywordCatalog, Repository } from '@/types';

interface ConfigStore {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  saving: boolean;
  keywordsCatalog: KeywordCatalog | null;
  keywordsLoading: boolean;

  // Actions
  loadConfig: () => Promise<void>;
  saveEnv: (env: Partial<EnvConfig>) => Promise<void>;
  saveConfig: (update: ConfigUpdate) => Promise<void>;
  reloadEnv: () => Promise<void>;
  updateEnv: (key: string, value: string | number | boolean) => void;
  updateRepo: (repoName: string, updates: Partial<Repository>) => void;

  // Keyword actions
  loadKeywords: () => Promise<void>;
  addKeyword: (keyword: string, category?: string) => Promise<void>;
  deleteKeyword: (keyword: string) => Promise<void>;

  reset: () => void;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: null,
  loading: false,
  error: null,
  saving: false,
  keywordsCatalog: null,
  keywordsLoading: false,

  loadConfig: async () => {
    set({ loading: true, error: null });
    try {
      // Reload env first
      await configApi.reloadEnv().catch(() => {});
      const config = await configApi.load();
      set({ config, loading: false, error: null });
    } catch (error) {
      set({
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to load configuration'
      });
    }
  },

  saveEnv: async (env: Partial<EnvConfig>) => {
    set({ saving: true, error: null });
    try {
      await configApi.saveEnv(env);
      set({ saving: false, error: null });
      // Reload config after save
      await get().loadConfig();
    } catch (error) {
      set({
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to save configuration'
      });
    }
  },

  saveConfig: async (update: ConfigUpdate) => {
    set({ saving: true, error: null });
    try {
      await configApi.saveConfig(update);
      set({ saving: false, error: null });
      // Reload config after save
      await get().loadConfig();
    } catch (error) {
      set({
        saving: false,
        error: error instanceof Error ? error.message : 'Failed to save configuration'
      });
    }
  },

  reloadEnv: async () => {
    try {
      await configApi.reloadEnv();
      await get().loadConfig();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reload environment'
      });
    }
  },

  updateEnv: (key: string, value: string | number | boolean) => {
    const { config } = get();
    if (!config) return;

    set({
      config: {
        ...config,
        env: {
          ...config.env,
          [key]: value,
        },
      },
    });
  },

  updateRepo: (repoName: string, updates: Partial<Repository>) => {
    const { config } = get();
    if (!config) return;

    const updatedRepos = config.repos.map(repo =>
      repo.name === repoName ? { ...repo, ...updates } : repo
    );

    set({
      config: {
        ...config,
        repos: updatedRepos,
      },
    });
  },

  loadKeywords: async () => {
    set({ keywordsLoading: true, error: null });
    try {
      const keywordsCatalog = await configApi.loadKeywords();
      set({ keywordsCatalog, keywordsLoading: false, error: null });
    } catch (error) {
      set({
        keywordsLoading: false,
        error: error instanceof Error ? error.message : 'Failed to load keywords'
      });
    }
  },

  addKeyword: async (keyword: string, category?: string) => {
    try {
      await configApi.addKeyword(keyword, category);
      // Update local state immediately
      const { keywordsCatalog } = get();
      if (keywordsCatalog) {
        const updated: KeywordCatalog = {
          ...keywordsCatalog,
          keywords: [...(keywordsCatalog.keywords || []), keyword].sort(),
        };

        if (category && category in keywordsCatalog) {
          updated[category as keyof KeywordCatalog] = [
            ...(keywordsCatalog[category as keyof KeywordCatalog] as string[] || []),
            keyword
          ].sort();
        }

        set({ keywordsCatalog: updated });
      }
      // Reload from server to ensure consistency
      await get().loadKeywords();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to add keyword'
      });
      throw error;
    }
  },

  deleteKeyword: async (keyword: string) => {
    try {
      await configApi.deleteKeyword(keyword);
      // Update local state immediately
      const { keywordsCatalog } = get();
      if (keywordsCatalog) {
        const updated: KeywordCatalog = {
          keywords: keywordsCatalog.keywords?.filter(k => k !== keyword) || [],
          discriminative: keywordsCatalog.discriminative?.filter(k => k !== keyword),
          semantic: keywordsCatalog.semantic?.filter(k => k !== keyword),
          llm: keywordsCatalog.llm?.filter(k => k !== keyword),
          repos: keywordsCatalog.repos?.filter(k => k !== keyword),
        };
        set({ keywordsCatalog: updated });
      }
      // Reload from server to ensure consistency
      await get().loadKeywords();
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to delete keyword'
      });
      throw error;
    }
  },

  reset: () => set({
    config: null,
    loading: false,
    error: null,
    saving: false,
    keywordsCatalog: null,
    keywordsLoading: false,
  }),
}));
