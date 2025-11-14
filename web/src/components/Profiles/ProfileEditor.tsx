import { useState } from 'react';
import { useProfiles } from '../../hooks/useProfiles';
import type { ProfileConfig } from '../../types';

interface ProfileEditorProps {
  config?: ProfileConfig;
  onSave?: (name: string, config: ProfileConfig) => void;
}

/**
 * Setting metadata for rich display
 * Converted from profile_renderer.js SETTING_INFO
 */
const SETTING_INFO: Record<string, {
  name: string;
  description: string;
  category: string;
  icon: string;
  valueExplainer?: (v: string | number) => string;
}> = {
  GEN_MODEL: {
    name: 'Generation Model',
    description: 'The AI model used to generate answers from retrieved code. This is the "brain" that synthesizes information.',
    category: 'Generation',
    icon: '🧠'
  },
  EMBEDDING_TYPE: {
    name: 'Embedding Provider',
    description: 'Creates vector representations of your code for semantic search. Higher quality embeddings find more relevant results.',
    category: 'Retrieval',
    icon: '🔍'
  },
  RERANK_BACKEND: {
    name: 'Reranking Engine',
    description: 'Re-scores retrieved results for precision. This is your quality filter that ensures the best results rise to the top.',
    category: 'Retrieval',
    icon: '⚡'
  },
  COHERE_RERANK_MODEL: {
    name: 'Cohere Rerank Model',
    description: 'Specific Cohere reranker model used when backend = cohere (e.g., rerank-3.5).',
    category: 'Retrieval',
    icon: '⚙️'
  },
  RERANKER_MODEL: {
    name: 'Local Rerank Model',
    description: 'Local/HF reranker model used when backend = local or hf (e.g., BAAI/bge-reranker-v2-m3).',
    category: 'Retrieval',
    icon: '⚙️'
  },
  MQ_REWRITES: {
    name: 'Multi-Query Expansion',
    description: 'Number of query variations generated to cast a wider search net. More rewrites = better recall but higher cost.',
    category: 'Search Strategy',
    icon: '🎯',
    valueExplainer: (v) => `${v} variations per query`
  },
  TOPK_SPARSE: {
    name: 'BM25 Candidates',
    description: 'Number of keyword-based matches to retrieve. BM25 is excellent for exact terms and technical names.',
    category: 'Search Strategy',
    icon: '📝',
    valueExplainer: (v) => `Top ${v} keyword matches`
  },
  TOPK_DENSE: {
    name: 'Vector Candidates',
    description: 'Number of semantic matches to retrieve. Vector search excels at conceptual similarity.',
    category: 'Search Strategy',
    icon: '🎨',
    valueExplainer: (v) => `Top ${v} semantic matches`
  },
  FINAL_K: {
    name: 'Final Results',
    description: 'After hybrid fusion and reranking, this many results are sent to generation. Balance between context and cost.',
    category: 'Search Strategy',
    icon: '🎁',
    valueExplainer: (v) => `${v} final results`
  },
  HYDRATION_MODE: {
    name: 'Code Hydration',
    description: 'How full code is loaded. "Lazy" fetches on-demand for efficiency. "Eager" pre-loads everything.',
    category: 'Performance',
    icon: '💧'
  }
};

/**
 * ProfileEditor Component
 * Displays and edits profile configuration with save functionality
 * Converts profile_renderer.js and save logic from autoprofile_v2.js
 */
export function ProfileEditor({ config, onSave }: ProfileEditorProps) {
  const { saveProfile, exportProfile } = useProfiles();
  const [profileName, setProfileName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showStatus = (text: string, type: 'success' | 'error') => {
    setStatusMessage({ text, type });
    setTimeout(() => setStatusMessage(null), 5000);
  };

  const handleSave = async () => {
    if (!profileName.trim()) {
      showStatus('Please enter a profile name', 'error');
      return;
    }

    if (!config || Object.keys(config).length === 0) {
      showStatus('No configuration to save', 'error');
      return;
    }

    try {
      setIsSaving(true);
      await saveProfile(profileName.trim(), config);
      showStatus(`Profile "${profileName}" saved successfully`, 'success');
      setProfileName('');
      onSave?.(profileName.trim(), config);
    } catch (e) {
      showStatus(`Failed to save profile: ${e instanceof Error ? e.message : String(e)}`, 'error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleExport = () => {
    if (!config || Object.keys(config).length === 0) {
      showStatus('No configuration to export', 'error');
      return;
    }

    try {
      const json = exportProfile(config);
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `profile-${profileName || 'config'}-${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showStatus('Profile exported successfully', 'success');
    } catch (e) {
      showStatus(`Failed to export profile: ${e instanceof Error ? e.message : String(e)}`, 'error');
    }
  };

  if (!config || Object.keys(config).length === 0) {
    return (
      <div className="settings-section">
        <p className="small" style={{ color: 'var(--fg-muted)', textAlign: 'center', padding: '40px 20px' }}>
          No profile configuration loaded. Generate an auto-profile or load an existing profile to view settings.
        </p>
      </div>
    );
  }

  // Group settings by category
  const categories: Record<string, Array<{ key: string; value: string | number; info: typeof SETTING_INFO[string] }>> = {};
  Object.entries(config).forEach(([key, value]) => {
    const info = SETTING_INFO[key];
    if (!info || value === undefined) return;

    const cat = info.category;
    if (!categories[cat]) categories[cat] = [];
    categories[cat].push({ key, value: String(value), info });
  });

  return (
    <div className="settings-section">
      <h3>⚙️ Profile Configuration</h3>
      <p className="small">
        Review and save the current profile settings. These settings control model selection, retrieval strategy,
        and performance characteristics.
      </p>

      {statusMessage && (
        <div style={{
          padding: '12px',
          marginBottom: '16px',
          background: statusMessage.type === 'success' ? 'var(--accent-bg)' : 'var(--err-bg)',
          border: `1px solid ${statusMessage.type === 'success' ? 'var(--accent)' : 'var(--err)'}`,
          borderRadius: '6px',
          color: statusMessage.type === 'success' ? 'var(--accent)' : 'var(--err)',
          fontSize: '13px'
        }}>
          {statusMessage.text}
        </div>
      )}

      {/* Settings Display */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '24px' }}>
        {Object.entries(categories).map(([catName, settings]) => (
          <div
            key={catName}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '16px'
            }}
          >
            <h5 style={{
              fontSize: '12px',
              color: 'var(--fg-muted)',
              textTransform: 'uppercase',
              letterSpacing: '0.8px',
              fontWeight: 600,
              marginBottom: '14px'
            }}>
              {catName}
            </h5>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {settings.map(({ key, value, info }) => {
                let displayValue = info.valueExplainer ? info.valueExplainer(value) : value;

                // Handle rerank backend display
                if (key === 'RERANK_BACKEND') {
                  if (String(value) === 'cohere' && config.COHERE_RERANK_MODEL) {
                    displayValue = `${value}: ${config.COHERE_RERANK_MODEL}`;
                  } else if ((String(value) === 'hf' || String(value) === 'local') && config.RERANKER_MODEL) {
                    displayValue = `${value}: ${config.RERANKER_MODEL}`;
                  }
                }

                return (
                  <div key={key} style={{ display: 'flex', gap: '12px' }}>
                    <div style={{
                      fontSize: '20px',
                      flexShrink: 0,
                      width: '32px',
                      height: '32px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      background: 'var(--bg-elev2)',
                      borderRadius: '6px'
                    }}>
                      {info.icon}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '4px'
                      }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--fg)' }}>
                          {info.name}
                        </span>
                        <code style={{
                          fontSize: '12px',
                          color: 'var(--accent)',
                          background: 'var(--card-bg)',
                          padding: '2px 8px',
                          borderRadius: '4px',
                          fontFamily: 'SF Mono, monospace'
                        }}>
                          {displayValue}
                        </code>
                      </div>
                      <p style={{
                        fontSize: '12px',
                        color: 'var(--fg-muted)',
                        lineHeight: '1.5',
                        margin: 0
                      }}>
                        {info.description}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Save Controls */}
      <div style={{
        padding: '16px',
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: '6px'
      }}>
        <div className="input-row">
          <div className="input-group" style={{ flex: 1 }}>
            <label htmlFor="profile-name">Profile Name</label>
            <input
              id="profile-name"
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="my-optimized-config"
              disabled={isSaving}
              style={{ width: '100%' }}
            />
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              Choose a descriptive name (e.g., "production-high-quality", "dev-fast")
            </p>
          </div>
        </div>

        <div className="input-row" style={{ gap: '12px' }}>
          <button
            className="small-button"
            onClick={handleSave}
            disabled={isSaving || !profileName.trim()}
            style={{
              flex: 1,
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              fontWeight: 700
            }}
          >
            {isSaving ? '⏳ Saving...' : '💾 Save Profile'}
          </button>

          <button
            className="small-button"
            onClick={handleExport}
            disabled={isSaving}
            style={{
              background: 'var(--bg-elev2)',
              border: '1px solid var(--line)',
              color: 'var(--fg-muted)'
            }}
          >
            📤 Export JSON
          </button>
        </div>
      </div>

      {/* Raw JSON View (Collapsible) */}
      <details style={{ marginTop: '16px' }}>
        <summary style={{
          cursor: 'pointer',
          color: 'var(--fg-muted)',
          fontSize: '13px',
          fontWeight: 600,
          padding: '8px',
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '6px'
        }}>
          View Raw JSON
        </summary>
        <pre style={{
          marginTop: '8px',
          padding: '12px',
          background: 'var(--card-bg)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          color: 'var(--fg-muted)',
          fontSize: '11px',
          whiteSpace: 'pre-wrap',
          fontFamily: 'SF Mono, monospace',
          maxHeight: '300px',
          overflow: 'auto'
        }}>
          {JSON.stringify(config, null, 2)}
        </pre>
      </details>
    </div>
  );
}
