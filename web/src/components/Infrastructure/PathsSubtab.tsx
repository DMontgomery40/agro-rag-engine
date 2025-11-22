// AGRO - Paths & Stores Subtab Component
// Directory paths and storage configuration

import { useState, useEffect } from 'react';
import { configApi } from '@/api/config';

interface PathConfig {
  QDRANT_URL: string;
  REDIS_URL: string;
  REPO_ROOT: string;
  FILES_ROOT: string;
  REPO: string;
  COLLECTION_SUFFIX: string;
  COLLECTION_NAME: string;
  REPO_PATH: string;
  GUI_DIR: string;
  DOCS_DIR: string;
  DATA_DIR: string;
  REPOS_FILE: string;
  OUT_DIR_BASE: string;
  RAG_OUT_BASE: string;
  MCP_HTTP_HOST: string;
  MCP_HTTP_PORT: string;
  MCP_HTTP_PATH: string;
}

export function PathsSubtab() {
  const [config, setConfig] = useState<Partial<PathConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  async function loadConfig() {
    try {
      const data = await configApi.load();
      // Extract relevant fields from env
      const pathConfig: Partial<PathConfig> = {
        QDRANT_URL: data.env?.QDRANT_URL || '',
        REDIS_URL: data.env?.REDIS_URL || '',
        REPO_ROOT: data.env?.REPO_ROOT || '',
        FILES_ROOT: data.env?.FILES_ROOT || '',
        REPO: data.env?.REPO || '',
        COLLECTION_SUFFIX: data.env?.COLLECTION_SUFFIX || '',
        COLLECTION_NAME: data.env?.COLLECTION_NAME || '',
        REPO_PATH: data.env?.REPO_PATH || '',
        GUI_DIR: data.env?.GUI_DIR || '',
        DOCS_DIR: data.env?.DOCS_DIR || '',
        DATA_DIR: data.env?.DATA_DIR || '',
        REPOS_FILE: data.env?.REPOS_FILE || '',
        OUT_DIR_BASE: data.env?.OUT_DIR_BASE || '',
        RAG_OUT_BASE: data.env?.RAG_OUT_BASE || '',
        MCP_HTTP_HOST: data.env?.MCP_HTTP_HOST || '',
        MCP_HTTP_PORT: data.env?.MCP_HTTP_PORT || '',
        MCP_HTTP_PATH: data.env?.MCP_HTTP_PATH || '',
      };
      setConfig(pathConfig);
      setLoading(false);
    } catch (error) {
      console.error('Failed to load config:', error);
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      // Build env update object with only non-empty values
      const envUpdate: Record<string, string> = {};
      for (const [key, value] of Object.entries(config)) {
        if (value !== undefined && value !== null) {
          envUpdate[key] = String(value);
        }
      }

      await configApi.saveConfig({ env: envUpdate });
      alert('Configuration saved successfully!');
    } catch (error: any) {
      alert(`Error saving configuration: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  const updateConfig = (key: keyof PathConfig, value: string) => {
    setConfig(prev => ({ ...prev, [key]: value }));
  };

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: 'var(--fg-muted)' }}>
        Loading configuration...
      </div>
    );
  }

  return (
    <div className="settings-section">
      <h2>Infrastructure Configuration</h2>
      <p className="small" style={{ marginBottom: '24px' }}>
        Configure database endpoints, file paths, and storage locations.
      </p>

      {/* Database Endpoints */}
      <h3>Database Endpoints</h3>
      <div className="input-row">
        <div className="input-group">
          <label>Qdrant URL</label>
          <input
            type="text"
            value={config.QDRANT_URL || ''}
            onChange={(e) => updateConfig('QDRANT_URL', e.target.value)}
            placeholder="http://127.0.0.1:6333"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
          <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
            Vector database URL
          </p>
        </div>
        <div className="input-group">
          <label>Redis URL</label>
          <input
            type="text"
            value={config.REDIS_URL || ''}
            onChange={(e) => updateConfig('REDIS_URL', e.target.value)}
            placeholder="redis://127.0.0.1:6379/0"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
          <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
            LangGraph memory store
          </p>
        </div>
      </div>

      {/* Repository Configuration */}
      <h3 style={{ marginTop: '32px' }}>Repository Configuration</h3>
      <div className="input-row">
        <div className="input-group">
          <label>Repo Root</label>
          <input
            type="text"
            value={config.REPO_ROOT || ''}
            onChange={(e) => updateConfig('REPO_ROOT', e.target.value)}
            placeholder="Override project root (optional)"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
        <div className="input-group">
          <label>Files Root</label>
          <input
            type="text"
            value={config.FILES_ROOT || ''}
            onChange={(e) => updateConfig('FILES_ROOT', e.target.value)}
            placeholder="/files mount root (optional)"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
      </div>

      <div className="input-row">
        <div className="input-group">
          <label>Active Repository</label>
          <input
            type="text"
            value={config.REPO || ''}
            onChange={(e) => updateConfig('REPO', e.target.value)}
            placeholder="agro"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
        <div className="input-group">
          <label>Collection Suffix</label>
          <input
            type="text"
            value={config.COLLECTION_SUFFIX || ''}
            onChange={(e) => updateConfig('COLLECTION_SUFFIX', e.target.value)}
            placeholder="default"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
      </div>

      <div className="input-row">
        <div className="input-group">
          <label>Collection Name</label>
          <input
            type="text"
            value={config.COLLECTION_NAME || ''}
            onChange={(e) => updateConfig('COLLECTION_NAME', e.target.value)}
            placeholder="code_chunks_{REPO}"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
        <div className="input-group">
          <label>Repo Path (fallback)</label>
          <input
            type="text"
            value={config.REPO_PATH || ''}
            onChange={(e) => updateConfig('REPO_PATH', e.target.value)}
            placeholder="/path/to/repo"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
      </div>

      {/* Directory Paths */}
      <h3 style={{ marginTop: '32px' }}>Directory Paths</h3>
      <div className="input-row">
        <div className="input-group">
          <label>GUI Directory</label>
          <input
            type="text"
            value={config.GUI_DIR || ''}
            onChange={(e) => updateConfig('GUI_DIR', e.target.value)}
            placeholder="./gui"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
        <div className="input-group">
          <label>Docs Directory</label>
          <input
            type="text"
            value={config.DOCS_DIR || ''}
            onChange={(e) => updateConfig('DOCS_DIR', e.target.value)}
            placeholder="./docs"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
      </div>

      <div className="input-row">
        <div className="input-group">
          <label>Data Directory</label>
          <input
            type="text"
            value={config.DATA_DIR || ''}
            onChange={(e) => updateConfig('DATA_DIR', e.target.value)}
            placeholder="./data"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
        <div className="input-group">
          <label>Repos File</label>
          <input
            type="text"
            value={config.REPOS_FILE || ''}
            onChange={(e) => updateConfig('REPOS_FILE', e.target.value)}
            placeholder="./repos.json"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
      </div>

      {/* Storage Configuration */}
      <h3 style={{ marginTop: '32px' }}>Storage Configuration</h3>
      <div className="input-row">
        <div className="input-group">
          <label>Out Dir Base</label>
          <input
            type="text"
            value={config.OUT_DIR_BASE || ''}
            onChange={(e) => updateConfig('OUT_DIR_BASE', e.target.value)}
            placeholder="./out"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
          <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
            Primary storage location for all indexed data
          </p>
        </div>
        <div className="input-group">
          <label>RAG Out Base</label>
          <input
            type="text"
            value={config.RAG_OUT_BASE || ''}
            onChange={(e) => updateConfig('RAG_OUT_BASE', e.target.value)}
            placeholder="Override for OUT_DIR_BASE"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
      </div>

      {/* MCP HTTP Configuration */}
      <h3 style={{ marginTop: '32px' }}>MCP HTTP Configuration</h3>
      <div className="input-row">
        <div className="input-group">
          <label>MCP HTTP Host</label>
          <input
            type="text"
            value={config.MCP_HTTP_HOST || ''}
            onChange={(e) => updateConfig('MCP_HTTP_HOST', e.target.value)}
            placeholder="0.0.0.0"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
        <div className="input-group">
          <label>MCP HTTP Port</label>
          <input
            type="number"
            value={config.MCP_HTTP_PORT || ''}
            onChange={(e) => updateConfig('MCP_HTTP_PORT', e.target.value)}
            placeholder="8013"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
      </div>

      <div className="input-row">
        <div className="input-group">
          <label>MCP HTTP Path</label>
          <input
            type="text"
            value={config.MCP_HTTP_PATH || ''}
            onChange={(e) => updateConfig('MCP_HTTP_PATH', e.target.value)}
            placeholder="/mcp"
            style={{
              width: '100%',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)'
            }}
          />
        </div>
        <div className="input-group"></div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: '32px' }}>
        <button
          className="small-button"
          onClick={saveConfig}
          disabled={saving}
          style={{
            width: '100%',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            fontWeight: '600',
            padding: '12px'
          }}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
