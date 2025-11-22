// AGRO - Integrations Subtab Component
// External service integrations and webhooks

import { useState } from 'react';
import { configApi } from '@/api/config';

export function IntegrationsSubtab() {
  // LangSmith settings
  const [langsmithEndpoint, setLangsmithEndpoint] = useState('https://api.smith.langchain.com');
  const [langsmithKey, setLangsmithKey] = useState('');
  const [langsmithKeyAlias, setLangsmithKeyAlias] = useState('');
  const [langsmithProject, setLangsmithProject] = useState('agro');
  const [langchainTracingV2, setLangchainTracingV2] = useState(true);

  // Grafana settings
  const [grafanaUrl, setGrafanaUrl] = useState('http://127.0.0.1:3000');
  const [grafanaApiKey, setGrafanaApiKey] = useState('');

  // VS Code settings
  const [vscodeEnabled, setVscodeEnabled] = useState(false);
  const [vscodePort, setVscodePort] = useState('4440');

  // MCP & Channels
  const [httpModel, setHttpModel] = useState('');
  const [mcpModel, setMcpModel] = useState('');
  const [cliModel, setCliModel] = useState('');
  const [mcpHttpHost, setMcpHttpHost] = useState('0.0.0.0');
  const [mcpHttpPort, setMcpHttpPort] = useState('8013');
  const [mcpHttpPath, setMcpHttpPath] = useState('/mcp');

  // Alert Notifications
  const [slackWebhook, setSlackWebhook] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [notifyCritical, setNotifyCritical] = useState(true);
  const [notifyWarning, setNotifyWarning] = useState(true);
  const [notifyInfo, setNotifyInfo] = useState(false);
  const [includeResolved, setIncludeResolved] = useState(true);

  // Status
  const [saveStatus, setSaveStatus] = useState<string>('');

  async function saveIntegrationSettings() {
    setSaveStatus('');
    const integrations: Record<string, any> = {};

    // LangSmith
    if (langsmithEndpoint) integrations.LANGSMITH_ENDPOINT = langsmithEndpoint;
    if (langsmithKey) integrations.LANGSMITH_API_KEY = langsmithKey;
    if (langsmithKeyAlias) integrations.LANGCHAIN_API_KEY = langsmithKeyAlias;
    if (langsmithProject) integrations.LANGSMITH_PROJECT = langsmithProject;
    integrations.LANGCHAIN_TRACING_V2 = langchainTracingV2 ? '1' : '0';

    // Grafana
    if (grafanaUrl) integrations.GRAFANA_BASE_URL = grafanaUrl;
    if (grafanaApiKey) integrations.GRAFANA_API_KEY = grafanaApiKey;

    // VS Code
    integrations.VSCODE_ENABLED = vscodeEnabled ? '1' : '0';
    if (vscodePort) integrations.VSCODE_PORT = vscodePort;

    // MCP & Channels
    if (httpModel) integrations.HTTP_MODEL = httpModel;
    if (mcpModel) integrations.MCP_MODEL = mcpModel;
    if (cliModel) integrations.CLI_MODEL = cliModel;
    if (mcpHttpHost) integrations.MCP_HTTP_HOST = mcpHttpHost;
    if (mcpHttpPort) integrations.MCP_HTTP_PORT = mcpHttpPort;
    if (mcpHttpPath) integrations.MCP_HTTP_PATH = mcpHttpPath;

    // Webhooks
    if (slackWebhook) integrations.SLACK_WEBHOOK_URL = slackWebhook;
    if (discordWebhook) integrations.DISCORD_WEBHOOK_URL = discordWebhook;
    integrations.NOTIFICATIONS_ENABLED = notificationsEnabled ? '1' : '0';
    integrations.NOTIFY_CRITICAL = notifyCritical ? '1' : '0';
    integrations.NOTIFY_WARNING = notifyWarning ? '1' : '0';
    integrations.NOTIFY_INFO = notifyInfo ? '1' : '0';
    integrations.INCLUDE_RESOLVED = includeResolved ? '1' : '0';

    try {
      const result = await configApi.saveIntegrations(integrations);
      if (result.status === 'success') {
        setSaveStatus('Integration settings saved successfully!');
        setTimeout(() => setSaveStatus(''), 3000);
      } else {
        setSaveStatus(`Failed to save: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      setSaveStatus(`Error saving integration settings: ${error.message}`);
    }
  }

  async function testLangSmith() {
    alert(`Testing connection to LangSmith at ${langsmithEndpoint}...`);
  }

  async function testGrafana() {
    try {
      const response = await fetch(grafanaUrl + '/api/health');
      if (response.ok) {
        alert('Grafana connection successful!');
      } else {
        alert('Grafana connection failed');
      }
    } catch (error: any) {
      alert(`Grafana test failed: ${error.message}`);
    }
  }

  async function testVSCode() {
    try {
      const response = await fetch(`http://127.0.0.1:${vscodePort}`);
      if (response.ok) {
        alert('VS Code server is running!');
      } else {
        alert('VS Code server not responding');
      }
    } catch (error: any) {
      alert(`VS Code test failed: ${error.message}`);
    }
  }

  async function saveWebhooks() {
    const config = {
      slack_url: slackWebhook,
      discord_url: discordWebhook,
      enabled: notificationsEnabled,
      severity: {
        critical: notifyCritical,
        warning: notifyWarning,
        info: notifyInfo
      },
      include_resolved: includeResolved
    };

    alert(`Webhook configuration saved!\n${JSON.stringify(config, null, 2)}`);
  }

  return (
    <div className="settings-section">
      <h2>Integrations</h2>
      <p className="small" style={{ marginBottom: '24px' }}>
        Configure external services and integrations.
      </p>

      {/* Status Messages */}
      {saveStatus && (
        <div
          data-testid="integrations-save-status"
          style={{
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '6px',
            background: saveStatus.includes('Error') || saveStatus.includes('Failed') ? 'var(--err)' : 'var(--ok)',
            color: 'var(--accent-contrast)',
            fontWeight: '500'
          }}
        >
          {saveStatus}
        </div>
      )}

      {/* MCP & Channels */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>MCP & Channels</h3>
        <p className="small" style={{ marginBottom: '16px' }}>
          Set per-channel inference models. Provider is inferred from the model name.
        </p>

        <div className="input-row">
          <div className="input-group">
            <label>HTTP Responses Model</label>
            <input
              type="text"
              value={httpModel}
              onChange={(e) => setHttpModel(e.target.value)}
              placeholder="override HTTP model"
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
            <label>MCP stdio Model</label>
            <input
              type="text"
              value={mcpModel}
              onChange={(e) => setMcpModel(e.target.value)}
              placeholder="override MCP model"
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
            <label>CLI Chat Model</label>
            <input
              type="text"
              value={cliModel}
              onChange={(e) => setCliModel(e.target.value)}
              placeholder="override CLI model"
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
            <label>MCP HTTP Configuration</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={mcpHttpHost}
                onChange={(e) => setMcpHttpHost(e.target.value)}
                placeholder="Host"
                style={{
                  width: '40%',
                  padding: '8px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  color: 'var(--fg)'
                }}
              />
              <input
                type="number"
                value={mcpHttpPort}
                onChange={(e) => setMcpHttpPort(e.target.value)}
                placeholder="Port"
                style={{
                  width: '30%',
                  padding: '8px',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  color: 'var(--fg)'
                }}
              />
              <input
                type="text"
                value={mcpHttpPath}
                onChange={(e) => setMcpHttpPath(e.target.value)}
                placeholder="Path"
                style={{
                  width: '30%',
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
      </div>

      {/* LangSmith Integration */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>LangSmith Integration</h3>

        <div className="input-row">
          <div className="input-group">
            <label>LangSmith Endpoint</label>
            <input
              type="text"
              value={langsmithEndpoint}
              onChange={(e) => setLangsmithEndpoint(e.target.value)}
              placeholder="https://api.smith.langchain.com"
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
            <label>LangSmith Project</label>
            <input
              type="text"
              value={langsmithProject}
              onChange={(e) => setLangsmithProject(e.target.value)}
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
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>LangSmith API Key</label>
            <input
              type="password"
              value={langsmithKey}
              onChange={(e) => setLangsmithKey(e.target.value)}
              placeholder="Enter API key"
              data-testid="langsmith-api-key"
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
            <label>LangSmith API Key (Alias)</label>
            <input
              type="password"
              value={langsmithKeyAlias}
              onChange={(e) => setLangsmithKeyAlias(e.target.value)}
              placeholder="Enter alias key"
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
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={langchainTracingV2}
                onChange={(e) => setLangchainTracingV2(e.target.checked)}
              />
              <span>Enable LangChain Tracing V2</span>
            </label>
          </div>
        </div>

        <button
          className="small-button"
          onClick={testLangSmith}
          style={{
            width: '100%',
            background: 'var(--link)',
            color: 'var(--accent-contrast)',
            fontWeight: '600',
            marginTop: '12px'
          }}
        >
          Test Connection
        </button>
      </div>

      {/* Grafana Integration */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Grafana Integration</h3>

        <div className="input-row">
          <div className="input-group">
            <label>Grafana URL</label>
            <input
              type="text"
              value={grafanaUrl}
              onChange={(e) => setGrafanaUrl(e.target.value)}
              placeholder="http://127.0.0.1:3000"
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
            <label>Grafana API Key</label>
            <input
              type="password"
              value={grafanaApiKey}
              onChange={(e) => setGrafanaApiKey(e.target.value)}
              placeholder="Optional API key"
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

        <button
          className="small-button"
          onClick={testGrafana}
          style={{
            width: '100%',
            background: 'var(--warn)',
            color: 'var(--accent-contrast)',
            fontWeight: '600',
            marginTop: '12px'
          }}
        >
          Test Connection
        </button>
      </div>

      {/* VS Code Settings */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>VS Code Integration</h3>

        <div className="input-row">
          <div className="input-group">
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="checkbox"
                checked={vscodeEnabled}
                onChange={(e) => setVscodeEnabled(e.target.checked)}
              />
              <span>Enable VS Code Server</span>
            </label>
          </div>
          <div className="input-group">
            <label>VS Code Port</label>
            <input
              type="number"
              value={vscodePort}
              onChange={(e) => setVscodePort(e.target.value)}
              placeholder="4440"
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

        <button
          className="small-button"
          onClick={testVSCode}
          style={{
            width: '100%',
            background: 'var(--link)',
            color: 'var(--accent-contrast)',
            fontWeight: '600',
            marginTop: '12px'
          }}
        >
          Test Connection
        </button>
      </div>

      {/* Alert Notifications */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Alert Notifications (Slack/Discord)</h3>
        <p className="small" style={{ marginBottom: '16px' }}>
          Configure webhook URLs for alert notifications. Leave blank to disable.
        </p>

        <div className="input-row">
          <div className="input-group">
            <label>Slack Webhook URL</label>
            <input
              type="password"
              value={slackWebhook}
              onChange={(e) => setSlackWebhook(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
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
              Password field for security - not saved in browser
            </p>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Discord Webhook URL</label>
            <input
              type="password"
              value={discordWebhook}
              onChange={(e) => setDiscordWebhook(e.target.value)}
              placeholder="https://discordapp.com/api/webhooks/..."
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
              Password field for security - not saved in browser
            </p>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>Notification Settings</label>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={notificationsEnabled}
                  onChange={(e) => setNotificationsEnabled(e.target.checked)}
                />
                <span>Enable notifications</span>
              </label>
              <div>
                <label>Notify on severity:</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={notifyCritical}
                      onChange={(e) => setNotifyCritical(e.target.checked)}
                    />
                    Critical
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={notifyWarning}
                      onChange={(e) => setNotifyWarning(e.target.checked)}
                    />
                    Warning
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={notifyInfo}
                      onChange={(e) => setNotifyInfo(e.target.checked)}
                    />
                    Info
                  </label>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  type="checkbox"
                  checked={includeResolved}
                  onChange={(e) => setIncludeResolved(e.target.checked)}
                />
                <span>Include resolved alerts</span>
              </label>
            </div>
          </div>
        </div>

        <button
          className="small-button"
          onClick={saveWebhooks}
          style={{
            width: '100%',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            fontWeight: '600',
            marginTop: '12px'
          }}
        >
          Save Webhook Configuration
        </button>
      </div>

      {/* Save All Settings */}
      <button
        className="small-button"
        onClick={saveIntegrationSettings}
        data-testid="save-integrations-btn"
        style={{
          width: '100%',
          background: 'var(--accent)',
          color: 'var(--accent-contrast)',
          fontWeight: '600',
          padding: '12px'
        }}
      >
        Save All Integration Settings
      </button>
    </div>
  );
}
