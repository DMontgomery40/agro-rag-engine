// AGRO - General Subtab Component
// General server settings and configuration

import { useState, useEffect } from 'react';

interface GeneralConfig {
  THEME_MODE?: string;
  AGRO_EDITION?: string;
  THREAD_ID?: string;
  HOST?: string;
  PORT?: string;
  OPEN_BROWSER?: string;
  agro_PATH?: string;
  NETLIFY_API_KEY?: string;
  NETLIFY_DOMAINS?: string;
  EDITOR_ENABLED?: string;
  EDITOR_EMBED_ENABLED?: string;
  EDITOR_PORT?: string;
  EDITOR_BIND?: string;
}

export function GeneralSubtab() {
  const [config, setConfig] = useState<GeneralConfig>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const api = (path: string) => {
    const base = (window as any).API_BASE_URL || '';
    return `${base}${path}`;
  };

  async function loadConfig() {
    try {
      const response = await fetch(api('/api/config'));
      const data = await response.json();
      if (data.env) {
        setConfig(data.env);
      }
      setLoading(false);
    } catch (error) {
      console.error('Failed to load config:', error);
      setLoading(false);
    }
  }

  async function saveConfig() {
    setSaving(true);
    try {
      const response = await fetch(api('/api/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ env: config })
      });
      const data = await response.json();
      if (data.status === 'success') {
        alert('Configuration saved successfully!');
      } else {
        alert(`Failed to save configuration: ${data.error}`);
      }
    } catch (error: any) {
      alert(`Error saving configuration: ${error.message}`);
    } finally {
      setSaving(false);
    }
  }

  const updateConfig = (key: keyof GeneralConfig, value: string) => {
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
      <h2>General Settings</h2>

      {/* Theme & Appearance */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Theme & Appearance</h3>
        <div className="input-row">
          <div className="input-group">
            <label>Theme Mode</label>
            <select
              id="misc-theme-mode"
              name="THEME_MODE"
              value={config.THEME_MODE || 'auto'}
              onChange={(e) => updateConfig('THEME_MODE', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                color: 'var(--fg)'
              }}
            >
              <option value="auto">Auto (System)</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              Controls light/dark theme globally. Top bar selector changes it live.
            </p>
          </div>
        </div>
      </div>

      {/* Server Settings */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Server Settings</h3>

        <div className="input-row">
          <div className="input-group">
            <label>Edition (AGRO_EDITION)</label>
            <input
              name="AGRO_EDITION"
              type="text"
              value={config.AGRO_EDITION || ''}
              onChange={(e) => updateConfig('AGRO_EDITION', e.target.value)}
              placeholder="oss | pro | enterprise"
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
            <label>Thread ID</label>
            <input
              name="THREAD_ID"
              type="text"
              value={config.THREAD_ID || ''}
              onChange={(e) => updateConfig('THREAD_ID', e.target.value)}
              placeholder="http or cli-chat"
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
            <label>Serve Host</label>
            <input
              name="HOST"
              type="text"
              value={config.HOST || ''}
              onChange={(e) => updateConfig('HOST', e.target.value)}
              placeholder="127.0.0.1"
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
            <label>Serve Port</label>
            <input
              name="PORT"
              type="number"
              value={config.PORT || ''}
              onChange={(e) => updateConfig('PORT', e.target.value)}
              placeholder="8012"
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
            <label>Open Browser on Start</label>
            <select
              name="OPEN_BROWSER"
              value={config.OPEN_BROWSER || '1'}
              onChange={(e) => updateConfig('OPEN_BROWSER', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                color: 'var(--fg)'
              }}
            >
              <option value="1">On</option>
              <option value="0">Off</option>
            </select>
          </div>
          <div className="input-group">
            <label>AGRO Path</label>
            <input
              name="agro_PATH"
              type="text"
              value={config.agro_PATH || ''}
              onChange={(e) => updateConfig('agro_PATH', e.target.value)}
              placeholder="Path to AGRO"
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
            <label>Netlify API Key</label>
            <input
              name="NETLIFY_API_KEY"
              type="password"
              value={config.NETLIFY_API_KEY || ''}
              onChange={(e) => updateConfig('NETLIFY_API_KEY', e.target.value)}
              placeholder="Netlify API Key"
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
            <label>Netlify Domains</label>
            <input
              name="NETLIFY_DOMAINS"
              type="text"
              value={config.NETLIFY_DOMAINS || ''}
              onChange={(e) => updateConfig('NETLIFY_DOMAINS', e.target.value)}
              placeholder="Comma-separated domains"
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
      </div>

      {/* Embedded Editor Settings */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Embedded Editor</h3>

        <div className="input-row">
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                name="EDITOR_ENABLED"
                type="checkbox"
                value="1"
                checked={config.EDITOR_ENABLED === '1'}
                onChange={(e) => updateConfig('EDITOR_ENABLED', e.target.checked ? '1' : '0')}
              />
              <span>Enable Embedded Editor</span>
            </label>
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              Start OpenVSCode Server container on up.sh
            </p>
          </div>
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                name="EDITOR_EMBED_ENABLED"
                type="checkbox"
                value="1"
                checked={config.EDITOR_EMBED_ENABLED === '1'}
                onChange={(e) => updateConfig('EDITOR_EMBED_ENABLED', e.target.checked ? '1' : '0')}
              />
              <span>Enable Editor Embed (iframe)</span>
            </label>
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              Show the editor inline in the GUI (hides automatically in CI)
            </p>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Editor Port</label>
            <input
              name="EDITOR_PORT"
              type="number"
              value={config.EDITOR_PORT || ''}
              onChange={(e) => updateConfig('EDITOR_PORT', e.target.value)}
              placeholder="4440"
              min="1024"
              max="65535"
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
              Preferred port (auto-increments if busy)
            </p>
          </div>
          <div className="input-group">
            <label>Bind Mode</label>
            <select
              name="EDITOR_BIND"
              value={config.EDITOR_BIND || 'local'}
              onChange={(e) => updateConfig('EDITOR_BIND', e.target.value)}
              style={{
                width: '100%',
                padding: '8px',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                borderRadius: '4px',
                color: 'var(--fg)'
              }}
            >
              <option value="local">Local only (127.0.0.1)</option>
              <option value="public">Public (0.0.0.0)</option>
            </select>
            <p className="small" style={{ color: 'var(--fg-muted)', marginTop: '4px' }}>
              Local = secure; Public = accessible from network
            </p>
          </div>
        </div>
      </div>

      {/* Save Button */}
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
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}
