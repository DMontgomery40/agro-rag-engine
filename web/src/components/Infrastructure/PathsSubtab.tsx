// AGRO - Paths & Stores Subtab Component
// Directory paths and storage configuration

import { useState, useEffect } from 'react';
import { configApi } from '@/api/config';
import { useTooltips } from '@/hooks/useTooltips';

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

/**
 * ---agentspec
 * what: |
 *   React component that manages a configuration subtab for file paths within a settings interface.
 *   Accepts no props; manages internal state for PathConfig object (partial), loading state, saving state, and action messages.
 *   Returns JSX rendering a form/UI for path configuration with real-time feedback.
 *   Loads configuration on mount via loadConfig() effect hook; provides setConfig for updates and setSaving for async operations.
 *   Handles loading and saving states independently to show spinners/disabled states during async operations.
 *   Edge cases: component may render before config loads (loading=true), save operations may fail (setSaving cleanup required), tooltips may be undefined if useTooltips() hook fails.
 *
 * why: |
 *   Separates path configuration UI from business logic by using React hooks (useState, useEffect) for local state management.
 *   Follows standard React patterns: loading state prevents render-before-data bugs, saving state prevents double-submit, actionMessage provides user feedback.
 *   Tooltips hook injected as dependency to keep component testable and decoupled from tooltip implementation.
 *
 * guardrails:
 *   - DO NOT mutate config state directly; always use setConfig to ensure React re-renders and state consistency
 *   - ALWAYS call setLoading(false) after loadConfig() completes, even on error, to prevent infinite loading spinners
 *   - ALWAYS call setSaving(false) after save operations complete (success or failure) to re-enable form controls
 *   - NOTE: actionMessage state has no auto-clear timeout; component relies on parent or explicit setActionMessage(null) to dismiss messages
 *   - ASK USER: Confirm whether tooltips should be optional (graceful fallback if useTooltips() returns undefined) or required before rendering
 * ---/agentspec
 */
export function PathsSubtab() {
  const [config, setConfig] = useState<Partial<PathConfig>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);
  const tooltips = useTooltips();

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
    setActionMessage('Saving configuration...');

    try {
      // Build env update object with only non-empty values
      const envUpdate: Record<string, string> = {};
      for (const [key, value] of Object.entries(config)) {
        if (value !== undefined && value !== null) {
          envUpdate[key] = String(value);
        }
      }

      await configApi.saveConfig({ env: envUpdate });
      setActionMessage('Configuration saved successfully!');

      // Reload config to show updated values
      setTimeout(() => loadConfig(), 500);
    } catch (error: any) {
      console.error('[PathsSubtab] Failed to save config:', error);
      setActionMessage(`Failed to save configuration: ${error.message || error}`);
    } finally {
      setSaving(false);
      setTimeout(() => setActionMessage(null), 3000);
    }
  }

  /**
   * ---agentspec
   * what: |
   *   Updates a single configuration key-value pair in a PathConfig state object using React's setState pattern.
   *   Takes a key (string literal from PathConfig keys) and a value (string), then merges the update into the previous config state.
   *   Returns void; side effect is updating the config state via setConfig hook.
   *   Handles all PathConfig keys uniformly without validation of value content or key existence at runtime.
   *   Edge case: If key does not exist in PathConfig type, TypeScript will catch it at compile time, but runtime behavior is permissive (spreads any key-value pair).
   *
   * why: |
   *   Provides a generic, reusable update function for form inputs or configuration changes without repeating setState logic for each field.
   *   Uses functional setState (prev => {...}) to ensure updates are based on the latest state, avoiding race conditions in rapid updates.
   *   Keeps the component concise by centralizing the update pattern rather than inline setState calls throughout the component.
   *
   * guardrails:
   *   - DO NOT add validation logic here; this function is intentionally a thin wrapper for state updates. Validation should happen at the form input level or in a separate validation hook.
   *   - ALWAYS use this function for all PathConfig updates to maintain consistent state management patterns across the component.
   *   - NOTE: This function does not persist config to storage or trigger side effects; callers must handle persistence separately if needed.
   *   - ASK USER: Before adding async operations (API calls, debouncing, or validation) to updateConfig, confirm whether a separate effect hook or custom hook would be more appropriate.
   * ---/agentspec
   */
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
      {/* Action message */}
      {actionMessage && (
        <div style={{
          padding: '12px',
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          marginBottom: '16px',
          fontSize: '12px',
          color: 'var(--fg)'
        }}>
          {actionMessage}
        </div>
      )}

      <h2>Infrastructure Configuration</h2>
      <p className="small" style={{ marginBottom: '24px' }}>
        Configure database endpoints, file paths, and storage locations.
      </p>

      {/* Database Endpoints */}
      <h3>Database Endpoints</h3>
      <div className="input-row">
        <div className="input-group">
          <label dangerouslySetInnerHTML={{ __html: tooltips.QDRANT_URL }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.REDIS_URL }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.REPO_ROOT }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.FILES_ROOT }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.REPO }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.COLLECTION_SUFFIX }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.COLLECTION_NAME }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.REPO_PATH }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.GUI_DIR }} />
          <input
            type="text"
            value={config.GUI_DIR || ''}
            onChange={(e) => updateConfig('GUI_DIR', e.target.value)}
            placeholder="./web/public"
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.DOCS_DIR }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.DATA_DIR }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.REPOS_FILE }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.OUT_DIR_BASE }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.RAG_OUT_BASE }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.MCP_HTTP_HOST }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.MCP_HTTP_PORT }} />
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
          <label dangerouslySetInnerHTML={{ __html: tooltips.MCP_HTTP_PATH }} />
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
            padding: '12px',
            opacity: saving ? 0.5 : 1,
            cursor: saving ? 'not-allowed' : 'pointer'
          }}
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    </div>
  );
}
