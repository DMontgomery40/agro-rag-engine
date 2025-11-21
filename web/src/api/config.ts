import { apiClient, api } from './client';
import type { AppConfig, EnvConfig, ConfigUpdate, KeywordCatalog } from '@/types';

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

  /**
   * Save full configuration (env + repos)
   */
  async saveConfig(update: ConfigUpdate): Promise<void> {
    await apiClient.post(api('/api/config'), update);
  },

  /**
   * Load keywords catalog
   */
  async loadKeywords(): Promise<KeywordCatalog> {
    const { data } = await apiClient.get<KeywordCatalog>(api('/api/keywords'));
    return data;
  },

  /**
   * Add a new keyword
   */
  async addKeyword(keyword: string, category?: string): Promise<void> {
    await apiClient.post(api('/api/keywords/add'), { keyword, category });
  },

  /**
   * Delete a keyword
   */
  async deleteKeyword(keyword: string): Promise<void> {
    await apiClient.post(api('/api/keywords/delete'), { keyword });
  },
};
