/**
 * IndexProfilesService - Index Profile Management
 * Converted from /web/src/modules/index_profiles.js
 *
 * Handles index profile selection and application (Shared/Fast, Full, Dev)
 */

export interface IndexProfile {
  name: string;
  description: string;
  settings: {
    OUT_DIR_BASE?: string;
    COLLECTION_NAME?: string;
    SKIP_DENSE?: string;
    EMBEDDING_TYPE?: string;
    CARDS_MAX?: string;
  };
  color: string;
}

export const PROFILES: Record<string, IndexProfile> = {
  shared: {
    name: 'Shared (Fast)',
    description: 'BM25-only indexing with no API calls. Perfect for quick searches across branches without embedding costs.',
    settings: {
      OUT_DIR_BASE: './out.noindex-shared',
      COLLECTION_NAME: 'code_chunks_agro_shared',
      SKIP_DENSE: '1',
      EMBEDDING_TYPE: 'local'
    },
    color: 'var(--accent)'
  },
  full: {
    name: 'Full (Best Quality)',
    description: 'Complete indexing with BM25 + dense embeddings (OpenAI). Best search quality, requires API key.',
    settings: {
      OUT_DIR_BASE: './out',
      COLLECTION_NAME: '',  // Auto-generated
      SKIP_DENSE: '0',
      EMBEDDING_TYPE: 'openai'
    },
    color: 'var(--link)'
  },
  dev: {
    name: 'Development (Testing)',
    description: 'Small subset for testing. Local embeddings, limited chunks. Fast iteration during development.',
    settings: {
      OUT_DIR_BASE: './out.noindex-dev',
      COLLECTION_NAME: 'code_chunks_agro_dev',
      SKIP_DENSE: '0',
      EMBEDDING_TYPE: 'local',
      CARDS_MAX: '50'
    },
    color: 'var(--warn)'
  }
};

export class IndexProfilesService {
  private apiBase: string;

  constructor(apiBase: string) {
    this.apiBase = apiBase;
  }

  /**
   * Get available profiles
   */
  getProfiles(): Record<string, IndexProfile> {
    return PROFILES;
  }

  /**
   * Get profile by key
   */
  getProfile(key: string): IndexProfile | null {
    return PROFILES[key] || null;
  }

  /**
   * Apply profile settings
   */
  async applyProfile(profileKey: string): Promise<{ status: string }> {
    const profile = PROFILES[profileKey];
    if (!profile) {
      throw new Error('Invalid profile selected');
    }

    const response = await fetch(`${this.apiBase}/api/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        env: profile.settings
      })
    });

    if (!response.ok) {
      throw new Error('Failed to apply profile settings');
    }

    return await response.json();
  }
}
