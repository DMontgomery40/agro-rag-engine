// AGRO - Grafana Configuration Component
// Configure Grafana connection settings
// Reference: /assets/grafana-config-subtab.png

import { useState, useEffect } from 'react';
import { useAPI } from '@/hooks';

interface GrafanaConfig {
  url: string;
  dashboardId: string;
  apiKey: string;
}

export function GrafanaConfig() {
  const { api } = useAPI();
  const [config, setConfig] = useState<GrafanaConfig>({
    url: 'http://localhost:3000',
    dashboardId: 'd/agro-metrics/agro-rag-metrics',
    apiKey: ''
  });
  const [showApiKey, setShowApiKey] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'success' | 'error'>('unknown');
  const [statusMessage, setStatusMessage] = useState('');
  const [saveMessage, setSaveMessage] = useState('');

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const response = await fetch(api('/grafana/config'));
      if (response.ok) {
        const data = await response.json();
        setConfig({
          url: data.url || 'http://localhost:3000',
          dashboardId: data.dashboardId || 'd/agro-metrics/agro-rag-metrics',
          apiKey: data.apiKey || ''
        });
      }
    } catch (error) {
      console.error('[GrafanaConfig] Failed to load config:', error);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setConnectionStatus('unknown');
    setStatusMessage('');

    try {
      const response = await fetch(api('/grafana/test'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          url: config.url,
          apiKey: config.apiKey
        })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConnectionStatus('success');
          setStatusMessage('Successfully connected to Grafana!');
        } else {
          setConnectionStatus('error');
          setStatusMessage(data.error || 'Connection failed');
        }
      } else {
        setConnectionStatus('error');
        setStatusMessage('Connection test failed');
      }
    } catch (error) {
      console.error('[GrafanaConfig] Test connection failed:', error);
      setConnectionStatus('error');
      setStatusMessage(error instanceof Error ? error.message : 'Connection test failed');
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveMessage('');

    try {
      const response = await fetch(api('/grafana/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setSaveMessage('Configuration saved successfully!');
      } else {
        setSaveMessage('Failed to save configuration');
      }
    } catch (error) {
      console.error('[GrafanaConfig] Failed to save config:', error);
      setSaveMessage('Failed to save configuration');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveMessage(''), 3000);
    }
  };

  const handleOpenInNewTab = () => {
    const baseUrl = config.url.replace(/\/$/, '');
    const fullUrl = `${baseUrl}/${config.dashboardId}`;
    window.open(fullUrl, '_blank', 'noopener,noreferrer');
  };

  return (
    <div style={{
      maxWidth: '800px',
      margin: '0 auto',
      padding: '24px'
    }}>
      <h2 style={{
        margin: '0 0 24px 0',
        fontSize: '20px',
        fontWeight: '600',
        color: 'var(--fg)'
      }}>
        Grafana Configuration
      </h2>

      {/* Configuration Form */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--line)',
        borderRadius: '6px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--fg)',
            marginBottom: '8px'
          }}>
            Grafana URL
          </label>
          <input
            type="text"
            value={config.url}
            onChange={(e) => setConfig(prev => ({ ...prev, url: e.target.value }))}
            placeholder="http://localhost:3000"
            style={{
              width: '100%',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              padding: '10px 12px',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            aria-label="Grafana URL"
          />
          <div style={{
            fontSize: '11px',
            color: 'var(--fg-muted)',
            marginTop: '4px'
          }}>
            The base URL of your Grafana instance (e.g., http://localhost:3000)
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--fg)',
            marginBottom: '8px'
          }}>
            Dashboard ID
          </label>
          <input
            type="text"
            value={config.dashboardId}
            onChange={(e) => setConfig(prev => ({ ...prev, dashboardId: e.target.value }))}
            placeholder="d/agro-metrics/agro-rag-metrics"
            style={{
              width: '100%',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              padding: '10px 12px',
              borderRadius: '4px',
              fontSize: '14px'
            }}
            aria-label="Dashboard ID"
          />
          <div style={{
            fontSize: '11px',
            color: 'var(--fg-muted)',
            marginTop: '4px'
          }}>
            The path to your Grafana dashboard (e.g., d/agro-metrics/agro-rag-metrics)
          </div>
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{
            display: 'block',
            fontSize: '13px',
            fontWeight: '600',
            color: 'var(--fg)',
            marginBottom: '8px'
          }}>
            API Key (Optional)
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showApiKey ? 'text' : 'password'}
              value={config.apiKey}
              onChange={(e) => setConfig(prev => ({ ...prev, apiKey: e.target.value }))}
              placeholder="Enter Grafana API key..."
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '10px 40px 10px 12px',
                borderRadius: '4px',
                fontSize: '14px'
              }}
              aria-label="API key"
            />
            <button
              onClick={() => setShowApiKey(!showApiKey)}
              style={{
                position: 'absolute',
                right: '8px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                color: 'var(--fg-muted)',
                cursor: 'pointer',
                padding: '4px 8px',
                fontSize: '12px'
              }}
              aria-label={showApiKey ? 'Hide API key' : 'Show API key'}
            >
              {showApiKey ? '👁️' : '👁️‍🗨️'}
            </button>
          </div>
          <div style={{
            fontSize: '11px',
            color: 'var(--fg-muted)',
            marginTop: '4px'
          }}>
            Required for API access and embedding. Can be created in Grafana Settings → API Keys
          </div>
        </div>
      </div>

      {/* Connection Test */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--line)',
        borderRadius: '6px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--fg)'
        }}>
          Connection Test
        </h3>

        <button
          onClick={handleTestConnection}
          disabled={testing || !config.url}
          style={{
            background: testing ? 'var(--bg-elev2)' : 'var(--accent)',
            color: testing ? 'var(--fg-muted)' : 'var(--accent-contrast)',
            border: 'none',
            padding: '10px 24px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: testing || !config.url ? 'not-allowed' : 'pointer',
            opacity: testing || !config.url ? 0.5 : 1,
            marginBottom: '16px'
          }}
          aria-label="Test connection"
        >
          {testing ? 'Testing Connection...' : 'Test Connection'}
        </button>

        {connectionStatus !== 'unknown' && (
          <div style={{
            padding: '12px 16px',
            borderRadius: '6px',
            background: connectionStatus === 'success' ? 'var(--success)' : 'var(--err)',
            color: 'white',
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            {connectionStatus === 'success' ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Connection successful!
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="15" y1="9" x2="9" y2="15" />
                  <line x1="9" y1="9" x2="15" y2="15" />
                </svg>
                {statusMessage || 'Connection failed'}
              </>
            )}
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={handleOpenInNewTab}
          disabled={!config.url || !config.dashboardId}
          style={{
            background: 'var(--bg-elev2)',
            color: 'var(--fg)',
            border: '1px solid var(--line)',
            padding: '10px 20px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: !config.url || !config.dashboardId ? 'not-allowed' : 'pointer',
            opacity: !config.url || !config.dashboardId ? 0.5 : 1,
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
          aria-label="Open in new tab"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
            <polyline points="15 3 21 3 21 9" />
            <line x1="10" y1="14" x2="21" y2="3" />
          </svg>
          Open in New Tab
        </button>

        <button
          onClick={handleSave}
          disabled={saving || !config.url}
          style={{
            background: saving ? 'var(--bg-elev2)' : 'var(--accent)',
            color: saving ? 'var(--fg-muted)' : 'var(--accent-contrast)',
            border: 'none',
            padding: '10px 32px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: saving || !config.url ? 'not-allowed' : 'pointer',
            opacity: saving || !config.url ? 0.5 : 1
          }}
          aria-label="Save configuration"
        >
          {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>

      {saveMessage && (
        <div style={{
          marginTop: '16px',
          padding: '12px 16px',
          borderRadius: '6px',
          background: saveMessage.includes('success') ? 'var(--success)' : 'var(--err)',
          color: 'white',
          fontSize: '14px',
          textAlign: 'center'
        }}>
          {saveMessage}
        </div>
      )}

      {/* Info Section */}
      <div style={{
        marginTop: '24px',
        padding: '16px',
        background: 'var(--bg-elev1)',
        border: '1px solid var(--line)',
        borderRadius: '6px',
        fontSize: '12px',
        color: 'var(--fg-muted)'
      }}>
        <h4 style={{
          margin: '0 0 8px 0',
          fontSize: '13px',
          fontWeight: '600',
          color: 'var(--fg)'
        }}>
          ℹ️ Configuration Help
        </h4>
        <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '4px' }}>
            Make sure Grafana is running and accessible at the specified URL
          </li>
          <li style={{ marginBottom: '4px' }}>
            The Dashboard ID can be found in the dashboard URL (e.g., d/your-dashboard/name)
          </li>
          <li style={{ marginBottom: '4px' }}>
            API Key is optional but recommended for secure access
          </li>
          <li style={{ marginBottom: '4px' }}>
            Test the connection before saving to ensure settings are correct
          </li>
        </ul>
      </div>
    </div>
  );
}
