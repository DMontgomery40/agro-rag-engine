import { apiClient, api } from './client';
import type { AppConfig, EnvConfig } from '@/types';

export const configApi = {
  /**
   * Load full application configuration
   */
  async load(): Promise<AppConfig> {
    const { data } = await apiClient.get<AppConfig>(api('/api/config'));
    return data;
  },

  /**
   * Reload environment variables from .env file
   */
  async reloadEnv(): Promise<void> {
    await apiClient.post(api('/api/env/reload'));
  },

  /**
   * Save environment configuration
   */
  async saveEnv(env: Partial<EnvConfig>): Promise<void> {
    await apiClient.post(api('/api/env/save'), { env });
  },
};
