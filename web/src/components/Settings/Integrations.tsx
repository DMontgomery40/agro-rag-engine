import { useState, useEffect } from 'react';
import { useConfigStore } from '@/stores';

interface MCPServer {
  name: string;
  status: 'connected' | 'disconnected' | 'error';
  port: number;
  url?: string;
}

export function Integrations() {
  const { config, loadConfig, saveEnv, saving } = useConfigStore();

  // LangSmith
  const [langSmithEnabled, setLangSmithEnabled] = useState(false);
  const [langSmithApiKey, setLangSmithApiKey] = useState('');
  const [langSmithProject, setLangSmithProject] = useState('agro');
  const [langSmithEndpoint, setLangSmithEndpoint] = useState('https://api.smith.langchain.com');

  // Grafana
  const [grafanaEnabled, setGrafanaEnabled] = useState(false);
  const [grafanaDashboardUrl, setGrafanaDashboardUrl] = useState('http://localhost:3000');
  const [grafanaApiKey, setGrafanaApiKey] = useState('');

  // VS Code Extension
  const [vscodeEnabled, setVscodeEnabled] = useState(false);
  const [vscodePort, setVscodePort] = useState('4440');

  // MCP Servers
  const [mcpServers, setMcpServers] = useState<MCPServer[]>([]);
  const [showAddMcp, setShowAddMcp] = useState(false);
  const [newMcpName, setNewMcpName] = useState('');
  const [newMcpPort, setNewMcpPort] = useState('');

  // Notification settings
  const [enableNotifications, setEnableNotifications] = useState(false);
  const [notifyCritical, setNotifyCritical] = useState(true);
  const [notifyWarning, setNotifyWarning] = useState(true);
  const [notifyInfo, setNotifyInfo] = useState(false);
  const [includeResolved, setIncludeResolved] = useState(false);
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');

  // MCP & Channels settings
  const [httpResponsesModel, setHttpResponsesModel] = useState('');
  const [cliChatModel, setCliChatModel] = useState('');
  const [mcpStdioModel, setMcpStdioModel] = useState('');
  const [mcpHttpHost, setMcpHttpHost] = useState('0.0.0.0');
  const [mcpHttpPort, setMcpHttpPort] = useState('8013');

  const [hasChanges, setHasChanges] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(null);

  useEffect(() => {
    if (!config) {
      loadConfig();
    }
  }, [config, loadConfig]);

  useEffect(() => {
    if (config?.env) {
      setLangSmithEnabled(Boolean(config.env.LANGCHAIN_TRACING_V2));
      setLangSmithApiKey(String(config.env.LANGSMITH_API_KEY || ''));
      setLangSmithProject(String(config.env.LANGCHAIN_PROJECT || 'agro'));
      setLangSmithEndpoint(String(config.env.LANGSMITH_ENDPOINT || 'https://api.smith.langchain.com'));

      setGrafanaEnabled(Boolean(config.env.GRAFANA_ENABLED));
      setGrafanaDashboardUrl(String(config.env.GRAFANA_DASHBOARD_URL || 'http://localhost:3000'));
      setGrafanaApiKey(String(config.env.GRAFANA_API_KEY || ''));

      setVscodeEnabled(Boolean(config.env.ENABLE_EMBEDDED_EDITOR));
      setVscodePort(String(config.env.EDITOR_PORT || '4440'));

      setEnableNotifications(Boolean(config.env.ENABLE_NOTIFICATIONS));
      setNotifyCritical(Boolean(config.env.NOTIFY_CRITICAL ?? true));
      setNotifyWarning(Boolean(config.env.NOTIFY_WARNING ?? true));
      setNotifyInfo(Boolean(config.env.NOTIFY_INFO ?? false));
      setIncludeResolved(Boolean(config.env.INCLUDE_RESOLVED_ALERTS));
      setSlackWebhookUrl(String(config.env.SLACK_WEBHOOK_URL || ''));
      setDiscordWebhookUrl(String(config.env.DISCORD_WEBHOOK_URL || ''));

      setHttpResponsesModel(String(config.env.HTTP_RESPONSES_MODEL || ''));
      setCliChatModel(String(config.env.CLI_CHAT_MODEL || ''));
      setMcpStdioModel(String(config.env.MCP_STDIO_MODEL || ''));
      setMcpHttpHost(String(config.env.MCP_HTTP_HOST || '0.0.0.0'));
      setMcpHttpPort(String(config.env.MCP_HTTP_PORT || '8013'));
    }
  }, [config]);

  // Load MCP servers
  useEffect(() => {
    const loadMcpServers = async () => {
      try {
        const response = await fetch('/api/mcp/servers');
        if (response.ok) {
          const data = await response.json();
          setMcpServers(data.servers || []);
        }
      } catch (error) {
        console.error('Failed to load MCP servers:', error);
      }
    };

    loadMcpServers();
  }, []);

  const handleSaveSettings = async () => {
    const updates = {
      LANGCHAIN_TRACING_V2: langSmithEnabled,
      LANGSMITH_API_KEY: langSmithApiKey,
      LANGCHAIN_PROJECT: langSmithProject,
      LANGSMITH_ENDPOINT: langSmithEndpoint,
      GRAFANA_ENABLED: grafanaEnabled,
      GRAFANA_DASHBOARD_URL: grafanaDashboardUrl,
      GRAFANA_API_KEY: grafanaApiKey,
      ENABLE_EMBEDDED_EDITOR: vscodeEnabled,
      EDITOR_PORT: parseInt(vscodePort, 10),
      ENABLE_NOTIFICATIONS: enableNotifications,
      NOTIFY_CRITICAL: notifyCritical,
      NOTIFY_WARNING: notifyWarning,
      NOTIFY_INFO: notifyInfo,
      INCLUDE_RESOLVED_ALERTS: includeResolved,
      SLACK_WEBHOOK_URL: slackWebhookUrl,
      DISCORD_WEBHOOK_URL: discordWebhookUrl,
      HTTP_RESPONSES_MODEL: httpResponsesModel,
      CLI_CHAT_MODEL: cliChatModel,
      MCP_STDIO_MODEL: mcpStdioModel,
      MCP_HTTP_HOST: mcpHttpHost,
      MCP_HTTP_PORT: mcpHttpPort,
    };

    await saveEnv(updates);
    setHasChanges(false);
    alert('Integration settings saved successfully.');
  };

  const handleTestConnection = async (service: string) => {
    setTestingConnection(service);

    try {
      let url = '';
      if (service === 'langsmith') {
        url = `/api/integrations/test/langsmith?endpoint=${encodeURIComponent(langSmithEndpoint)}&apiKey=${encodeURIComponent(langSmithApiKey)}`;
      } else if (service === 'grafana') {
        url = `/api/integrations/test/grafana?url=${encodeURIComponent(grafanaDashboardUrl)}&apiKey=${encodeURIComponent(grafanaApiKey)}`;
      }

      const response = await fetch(url);
      if (response.ok) {
        alert(`✓ ${service} connection successful`);
      } else {
        throw new Error('Connection failed');
      }
    } catch (error) {
      alert(`✗ ${service} connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setTestingConnection(null);
    }
  };

  const handleOpenInVSCode = () => {
    window.open(`http://localhost:${vscodePort}`, '_blank');
  };

  const handleConnectMcp = async (serverName: string) => {
    try {
      const response = await fetch('/api/mcp/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server: serverName }),
      });

      if (response.ok) {
        setMcpServers(prev => prev.map(s => s.name === serverName ? { ...s, status: 'connected' } : s));
      }
    } catch (error) {
      alert(`Failed to connect to ${serverName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDisconnectMcp = async (serverName: string) => {
    try {
      const response = await fetch('/api/mcp/disconnect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ server: serverName }),
      });

      if (response.ok) {
        setMcpServers(prev => prev.map(s => s.name === serverName ? { ...s, status: 'disconnected' } : s));
      }
    } catch (error) {
      alert(`Failed to disconnect from ${serverName}: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleAddMcpServer = () => {
    if (!newMcpName.trim() || !newMcpPort.trim()) {
      alert('Server name and port are required');
      return;
    }

    setMcpServers(prev => [...prev, {
      name: newMcpName,
      status: 'disconnected',
      port: parseInt(newMcpPort, 10),
    }]);

    setNewMcpName('');
    setNewMcpPort('');
    setShowAddMcp(false);
    setHasChanges(true);
  };

  const markChanged = () => setHasChanges(true);

  if (!config) {
    return (
      <div style={{ padding: '24px', color: 'var(--fg-muted)' }}>
        Loading configuration...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* MCP & Channels Section */}
      <div
        style={{
          background: 'var(--bg-elev1)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--fg)' }}>
          MCP & Channels
        </h3>
        <div style={{ fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '16px' }}>
          Set per-channel inference models. Provider is inferred from the model name; use base URL and keys from Infrastructure or Models for proxies/local engines.
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label htmlFor="http-model" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              HTTP RESPONSES MODEL
            </label>
            <input
              id="http-model"
              type="text"
              value={httpResponsesModel}
              onChange={(e) => { setHttpResponsesModel(e.target.value); markChanged(); }}
              placeholder="override HTTP model"
              style={{
                width: '100%',
                background: 'var(--bg-elev2)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label htmlFor="mcp-model" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              MCP STDIO MODEL
            </label>
            <input
              id="mcp-model"
              type="text"
              value={mcpStdioModel}
              onChange={(e) => { setMcpStdioModel(e.target.value); markChanged(); }}
              placeholder="override MCP model"
              style={{
                width: '100%',
                background: 'var(--bg-elev2)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label htmlFor="cli-model" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              CLI CHAT MODEL
            </label>
            <input
              id="cli-model"
              type="text"
              value={cliChatModel}
              onChange={(e) => { setCliChatModel(e.target.value); markChanged(); }}
              placeholder="override CLI model"
              style={{
                width: '100%',
                background: 'var(--bg-elev2)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '8px' }}>
            <div>
              <label htmlFor="mcp-host" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
                MCP HTTP (HOST/PORT/PATH)
              </label>
              <input
                id="mcp-host"
                type="text"
                value={mcpHttpHost}
                onChange={(e) => { setMcpHttpHost(e.target.value); markChanged(); }}
                style={{
                  width: '100%',
                  background: 'var(--bg-elev2)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
            <div>
              <label htmlFor="mcp-port" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
                &nbsp;
              </label>
              <input
                id="mcp-port"
                type="text"
                value={mcpHttpPort}
                onChange={(e) => { setMcpHttpPort(e.target.value); markChanged(); }}
                placeholder="/mcp"
                style={{
                  width: '100%',
                  background: 'var(--bg-elev2)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Alert Notifications Section */}
      <div
        style={{
          background: 'var(--bg-elev1)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--fg)' }}>
          Alert Notifications (Slack/Discord)
        </h3>
        <div style={{ fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '16px' }}>
          Configure webhook URLs for alert notifications. Leave blank to disable notifications for that platform.
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="slack-webhook" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
            SLACK WEBHOOK URL
          </label>
          <input
            id="slack-webhook"
            type="password"
            value={slackWebhookUrl}
            onChange={(e) => { setSlackWebhookUrl(e.target.value); markChanged(); }}
            placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
            style={{
              width: '100%',
              background: 'var(--bg-elev2)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
          <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginTop: '4px' }}>
            Password field for security - not saved in browser
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="discord-webhook" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
            DISCORD WEBHOOK URL
          </label>
          <input
            id="discord-webhook"
            type="password"
            value={discordWebhookUrl}
            onChange={(e) => { setDiscordWebhookUrl(e.target.value); markChanged(); }}
            placeholder="https://discordapp.com/api/webhooks/0000000000000000/XXXXXXXXXXXXXXXXXXXX"
            style={{
              width: '100%',
              background: 'var(--bg-elev2)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
          <div style={{ fontSize: '11px', color: 'var(--fg-muted)', marginTop: '4px' }}>
            Password field for security - not saved in browser
          </div>
        </div>

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '8px' }}>
            NOTIFICATION SETTINGS
          </div>
          <label style={{ display: 'flex', alignItems: 'center', marginBottom: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={enableNotifications}
              onChange={(e) => { setEnableNotifications(e.target.checked); markChanged(); }}
              style={{ marginRight: '8px' }}
            />
            <span style={{ fontSize: '14px', color: 'var(--fg)' }}>ENABLE NOTIFICATIONS</span>
          </label>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '16px', marginLeft: '24px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notifyCritical}
                onChange={(e) => { setNotifyCritical(e.target.checked); markChanged(); }}
                style={{ marginRight: '6px' }}
              />
              <span style={{ fontSize: '13px', color: 'var(--fg)' }}>CRITICAL</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notifyWarning}
                onChange={(e) => { setNotifyWarning(e.target.checked); markChanged(); }}
                style={{ marginRight: '6px' }}
              />
              <span style={{ fontSize: '13px', color: 'var(--fg)' }}>WARNING</span>
            </label>

            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={notifyInfo}
                onChange={(e) => { setNotifyInfo(e.target.checked); markChanged(); }}
                style={{ marginRight: '6px' }}
              />
              <span style={{ fontSize: '13px', color: 'var(--fg)' }}>INFO</span>
            </label>
          </div>
        </div>

        <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={includeResolved}
            onChange={(e) => { setIncludeResolved(e.target.checked); markChanged(); }}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontSize: '14px', color: 'var(--fg)' }}>INCLUDE RESOLVED ALERTS</span>
        </label>

        <button
          onClick={handleSaveSettings}
          disabled={!hasChanges || saving}
          style={{
            width: '100%',
            background: !hasChanges || saving ? 'var(--bg-elev2)' : 'var(--accent)',
            color: !hasChanges || saving ? 'var(--fg-muted)' : 'var(--accent-contrast)',
            border: 'none',
            padding: '10px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: !hasChanges || saving ? 'not-allowed' : 'pointer',
            marginTop: '16px',
          }}
        >
          {saving ? 'Saving...' : '💾 SAVE WEBHOOK CONFIGURATION'}
        </button>
      </div>

      {/* LangSmith Section */}
      <div
        style={{
          background: 'var(--bg-elev1)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--fg)' }}>
          LangSmith
        </h3>

        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={langSmithEnabled}
            onChange={(e) => { setLangSmithEnabled(e.target.checked); markChanged(); }}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontSize: '14px', color: 'var(--fg)' }}>Enable LangSmith Tracing</span>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label htmlFor="langsmith-api-key" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              API Key
            </label>
            <input
              id="langsmith-api-key"
              type="password"
              value={langSmithApiKey}
              onChange={(e) => { setLangSmithApiKey(e.target.value); markChanged(); }}
              disabled={!langSmithEnabled}
              style={{
                width: '100%',
                background: 'var(--bg-elev2)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label htmlFor="langsmith-project" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              Project Name
            </label>
            <input
              id="langsmith-project"
              type="text"
              value={langSmithProject}
              onChange={(e) => { setLangSmithProject(e.target.value); markChanged(); }}
              disabled={!langSmithEnabled}
              style={{
                width: '100%',
                background: 'var(--bg-elev2)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        <button
          onClick={() => handleTestConnection('langsmith')}
          disabled={!langSmithEnabled || testingConnection !== null}
          style={{
            background: !langSmithEnabled || testingConnection !== null ? 'var(--bg-elev2)' : 'var(--accent)',
            color: !langSmithEnabled || testingConnection !== null ? 'var(--fg-muted)' : 'var(--accent-contrast)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: !langSmithEnabled || testingConnection !== null ? 'not-allowed' : 'pointer',
          }}
        >
          {testingConnection === 'langsmith' ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {/* Grafana Section */}
      <div
        style={{
          background: 'var(--bg-elev1)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--fg)' }}>
          Grafana
        </h3>

        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={grafanaEnabled}
            onChange={(e) => { setGrafanaEnabled(e.target.checked); markChanged(); }}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontSize: '14px', color: 'var(--fg)' }}>Enable Grafana Integration</span>
        </label>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label htmlFor="grafana-url" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              Dashboard URL
            </label>
            <input
              id="grafana-url"
              type="text"
              value={grafanaDashboardUrl}
              onChange={(e) => { setGrafanaDashboardUrl(e.target.value); markChanged(); }}
              disabled={!grafanaEnabled}
              style={{
                width: '100%',
                background: 'var(--bg-elev2)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>

          <div>
            <label htmlFor="grafana-api-key" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              API Key
            </label>
            <input
              id="grafana-api-key"
              type="password"
              value={grafanaApiKey}
              onChange={(e) => { setGrafanaApiKey(e.target.value); markChanged(); }}
              disabled={!grafanaEnabled}
              style={{
                width: '100%',
                background: 'var(--bg-elev2)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '14px',
              }}
            />
          </div>
        </div>

        <button
          onClick={() => handleTestConnection('grafana')}
          disabled={!grafanaEnabled || testingConnection !== null}
          style={{
            background: !grafanaEnabled || testingConnection !== null ? 'var(--bg-elev2)' : 'var(--accent)',
            color: !grafanaEnabled || testingConnection !== null ? 'var(--fg-muted)' : 'var(--accent-contrast)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: !grafanaEnabled || testingConnection !== null ? 'not-allowed' : 'pointer',
          }}
        >
          {testingConnection === 'grafana' ? 'Testing...' : 'Test Connection'}
        </button>
      </div>

      {/* VS Code Extension Section */}
      <div
        style={{
          background: 'var(--bg-elev1)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <h3 style={{ margin: '0 0 16px 0', fontSize: '16px', color: 'var(--fg)' }}>
          VS Code Extension
        </h3>

        <label style={{ display: 'flex', alignItems: 'center', marginBottom: '16px', cursor: 'pointer' }}>
          <input
            type="checkbox"
            checked={vscodeEnabled}
            onChange={(e) => { setVscodeEnabled(e.target.checked); markChanged(); }}
            style={{ marginRight: '8px' }}
          />
          <span style={{ fontSize: '14px', color: 'var(--fg)' }}>Enable Embedded Editor</span>
        </label>

        <div style={{ marginBottom: '16px' }}>
          <label htmlFor="vscode-port" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
            Port
          </label>
          <input
            id="vscode-port"
            type="number"
            value={vscodePort}
            onChange={(e) => { setVscodePort(e.target.value); markChanged(); }}
            disabled={!vscodeEnabled}
            style={{
              width: '200px',
              background: 'var(--bg-elev2)',
              border: '1px solid var(--line)',
              color: 'var(--fg)',
              padding: '8px 12px',
              borderRadius: '4px',
              fontSize: '14px',
            }}
          />
        </div>

        <button
          onClick={handleOpenInVSCode}
          disabled={!vscodeEnabled}
          style={{
            background: !vscodeEnabled ? 'var(--bg-elev2)' : 'var(--accent)',
            color: !vscodeEnabled ? 'var(--fg-muted)' : 'var(--accent-contrast)',
            border: 'none',
            padding: '8px 16px',
            borderRadius: '4px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: !vscodeEnabled ? 'not-allowed' : 'pointer',
          }}
        >
          Open in VS Code
        </button>
      </div>

      {/* MCP Servers Section */}
      <div
        style={{
          background: 'var(--bg-elev1)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--fg)' }}>
            MCP Servers
          </h3>
          <button
            onClick={() => setShowAddMcp(true)}
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              border: 'none',
              padding: '6px 16px',
              borderRadius: '4px',
              fontSize: '12px',
              fontWeight: 500,
              cursor: 'pointer',
            }}
          >
            + Add Server
          </button>
        </div>

        {mcpServers.length === 0 ? (
          <div style={{ color: 'var(--fg-muted)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
            No MCP servers configured
          </div>
        ) : (
          <div style={{ display: 'grid', gap: '12px' }}>
            {mcpServers.map(server => (
              <div
                key={server.name}
                style={{
                  background: 'var(--bg-elev2)',
                  border: '1px solid var(--line)',
                  borderRadius: '4px',
                  padding: '12px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--fg)', marginBottom: '4px' }}>
                    {server.name}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--fg-muted)' }}>
                    Port: {server.port} • Status: <span style={{ color: server.status === 'connected' ? 'var(--accent)' : 'var(--fg-muted)' }}>{server.status}</span>
                  </div>
                </div>

                <button
                  onClick={() => server.status === 'connected' ? handleDisconnectMcp(server.name) : handleConnectMcp(server.name)}
                  style={{
                    background: server.status === 'connected' ? '#ef4444' : 'var(--accent)',
                    color: '#fff',
                    border: 'none',
                    padding: '6px 16px',
                    borderRadius: '4px',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  {server.status === 'connected' ? 'Disconnect' : 'Connect'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Save Button */}
      <div style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleSaveSettings}
          disabled={!hasChanges || saving}
          style={{
            background: !hasChanges || saving ? 'var(--bg-elev2)' : 'var(--accent)',
            color: !hasChanges || saving ? 'var(--fg-muted)' : 'var(--accent-contrast)',
            border: 'none',
            padding: '10px 32px',
            borderRadius: '4px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: !hasChanges || saving ? 'not-allowed' : 'pointer',
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {/* Add MCP Server Modal */}
      {showAddMcp && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              zIndex: 9999,
            }}
            onClick={() => setShowAddMcp(false)}
          />
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              background: 'var(--bg-elev1)',
              border: '1px solid var(--accent)',
              borderRadius: '8px',
              padding: '20px',
              zIndex: 10000,
              minWidth: '400px',
              boxShadow: '0 8px 24px rgba(0,0,0,0.8)',
            }}
          >
            <h4 style={{ color: 'var(--accent)', marginBottom: '16px' }}>Add MCP Server</h4>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: 'var(--fg-muted)', fontSize: '11px', marginBottom: '4px' }}>
                Server Name
              </label>
              <input
                type="text"
                value={newMcpName}
                onChange={(e) => setNewMcpName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddMcpServer();
                  if (e.key === 'Escape') setShowAddMcp(false);
                }}
                style={{
                  width: '100%',
                  background: 'var(--bg-elev2)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '8px',
                  borderRadius: '4px',
                }}
                placeholder="my-mcp-server"
                autoFocus
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: 'var(--fg-muted)', fontSize: '11px', marginBottom: '4px' }}>
                Port
              </label>
              <input
                type="number"
                value={newMcpPort}
                onChange={(e) => setNewMcpPort(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddMcpServer();
                  if (e.key === 'Escape') setShowAddMcp(false);
                }}
                style={{
                  width: '100%',
                  background: 'var(--bg-elev2)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '8px',
                  borderRadius: '4px',
                }}
                placeholder="8000"
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddMcp(false)}
                style={{
                  background: 'var(--bg-elev2)',
                  color: 'var(--fg-muted)',
                  border: '1px solid var(--line)',
                  padding: '6px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleAddMcpServer}
                style={{
                  background: 'var(--accent)',
                  color: 'var(--accent-contrast)',
                  border: 'none',
                  padding: '6px 16px',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Add
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
