import { useState } from 'react';
import { useTheme } from '@/hooks/useTheme';
import { useConfigStore } from '@/stores/useConfigStore';

/**
 * Admin settings panel for theme, server, and editor configuration
 */
export default function AdminSettings() {
  const { theme, setTheme } = useTheme();
  const { config, updateConfig } = useConfigStore();
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const handleSave = async () => {
    try {
      await updateConfig(config);
      setSaveMessage({ type: 'success', text: 'Settings saved successfully' });
      setTimeout(() => setSaveMessage(null), 3000);
    } catch (error) {
      setSaveMessage({ type: 'error', text: 'Failed to save settings' });
      setTimeout(() => setSaveMessage(null), 3000);
    }
  };

  return (
    <div>
      {/* Theme & Appearance */}
      <div className="settings-section">
        <h3>Theme & Appearance</h3>
        <div className="input-row">
          <div className="input-group">
            <label>Theme Mode</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value as 'auto' | 'dark' | 'light')}
            >
              <option value="auto">Auto (System)</option>
              <option value="dark">Dark</option>
              <option value="light">Light</option>
            </select>
            <p className="small">Controls light/dark theme globally. Top bar selector changes it live.</p>
          </div>
        </div>
      </div>

      {/* Server Settings */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>Server Settings</h3>
        <div className="input-row">
          <div className="input-group">
            <label>Edition (AGRO_EDITION)</label>
            <input type="text" placeholder="oss | pro | enterprise" readOnly value="oss" />
          </div>
          <div className="input-group">
            <label>Thread ID</label>
            <input type="text" placeholder="http or cli-chat" readOnly value="http" />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Serve Host</label>
            <input type="text" value="127.0.0.1" readOnly />
          </div>
          <div className="input-group">
            <label>Serve Port</label>
            <input type="number" value="8012" readOnly />
          </div>
        </div>
      </div>

      {/* Embedded Editor Settings */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3><span className="accent-blue">●</span> Embedded Editor</h3>
        <div className="input-row">
          <div className="input-group">
            <label>
              <input type="checkbox" defaultChecked /> Enable Embedded Editor
            </label>
            <p className="small">Start OpenVSCode Server container on up.sh</p>
          </div>
          <div className="input-group">
            <label>
              <input type="checkbox" defaultChecked /> Enable Editor Embed (iframe)
            </label>
            <p className="small">Show the editor inline in the GUI (hides automatically in CI)</p>
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Editor Port</label>
            <input type="number" value="4440" min="1024" max="65535" readOnly />
            <p className="small">Preferred port (auto-increments if busy)</p>
          </div>
          <div className="input-group">
            <label>Bind Mode</label>
            <select defaultValue="local">
              <option value="local">Local only (127.0.0.1)</option>
              <option value="public">Public (0.0.0.0)</option>
            </select>
            <p className="small">Local = secure; Public = accessible from network</p>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div style={{ marginTop: '16px' }}>
        <button
          onClick={handleSave}
          className="small-button"
          style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
        >
          Save Settings
        </button>
      </div>

      {/* Save Message */}
      {saveMessage && (
        <div
          style={{
            marginTop: '12px',
            padding: '8px 12px',
            borderRadius: '4px',
            background: saveMessage.type === 'success' ? 'var(--ok)' : 'var(--err)',
            color: 'white',
            fontSize: '13px'
          }}
        >
          {saveMessage.text}
        </div>
      )}
    </div>
  );
}
