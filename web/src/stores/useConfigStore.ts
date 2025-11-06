import { create } from 'zustand';
import { configApi } from '@/api';
import type { AppConfig, EnvConfig } from '@/types';

interface ConfigStore {
  config: AppConfig | null;
  loading: boolean;
  error: string | null;
  saving: boolean;

  // Actions
  loadConfig: () => Promise<void>;
  saveEnv: (env: Partial<EnvConfig>) => Promise<void>;
  reloadEnv: () => Promise<void>;
  updateEnv: (key: string, value: string | number | boolean) => void;
  reset: () => void;
}

export const useConfigStore = create<ConfigStore>((set, get) => ({
  config: null,
  loading: false,
  error: null,
  saving: false,

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

  reset: () => set({
    config: null,
    loading: false,
    error: null,
    saving: false
  }),
}));
