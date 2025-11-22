import { useState, useEffect } from 'react';
import { configApi } from '@/api/config';
import { apiClient, api } from '@/api/client';
import type { AppConfig, EnvConfig } from '@/types';

export function GeneralSubtab() {
  // Theme & Appearance
  const [themeMode, setThemeMode] = useState<'auto' | 'dark' | 'light'>('auto');

  // Server Settings
  const [agroEdition, setAgroEdition] = useState('');
  const [threadId, setThreadId] = useState('');
  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState(8012);
  const [openBrowser, setOpenBrowser] = useState(1);
  const [agroPath, setAgroPath] = useState('');
  const [netlifyApiKey, setNetlifyApiKey] = useState('');
  const [netlifyDomains, setNetlifyDomains] = useState('');
  const [chatStreamingEnabled, setChatStreamingEnabled] = useState(1);

  // Tracing & Observability
  const [tracingEnabled, setTracingEnabled] = useState(1);
  const [traceSamplingRate, setTraceSamplingRate] = useState(1.0);
  const [prometheusPort, setPrometheusPort] = useState(9090);
  const [metricsEnabled, setMetricsEnabled] = useState(1);
  const [logLevel, setLogLevel] = useState('INFO');
  const [alertWebhookTimeout, setAlertWebhookTimeout] = useState(5);

  // Editor Settings
  const [editorEnabled, setEditorEnabled] = useState(false);
  const [editorEmbedEnabled, setEditorEmbedEnabled] = useState(true);
  const [editorPort, setEditorPort] = useState(4440);
  const [editorBind, setEditorBind] = useState('local');

  // MCP Channels
  const [httpModel, setHttpModel] = useState('');
  const [mcpModel, setMcpModel] = useState('');
  const [cliModel, setCliModel] = useState('');
  const [mcpHttpHost, setMcpHttpHost] = useState('0.0.0.0');
  const [mcpHttpPort, setMcpHttpPort] = useState(8013);
  const [mcpHttpPath, setMcpHttpPath] = useState('/mcp');

  // Webhooks
  const [slackWebhookUrl, setSlackWebhookUrl] = useState('');
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [webhookEnabled, setWebhookEnabled] = useState(true);
  const [webhookSevCritical, setWebhookSevCritical] = useState(true);
  const [webhookSevWarning, setWebhookSevWarning] = useState(true);
  const [webhookSevInfo, setWebhookSevInfo] = useState(false);
  const [webhookIncludeResolved, setWebhookIncludeResolved] = useState(true);
  const [webhookSaveStatus, setWebhookSaveStatus] = useState('');

  // MCP RAG Search
  const [mcpRagQuestion, setMcpRagQuestion] = useState('');
  const [mcpRagRepo, setMcpRagRepo] = useState('agro');
  const [mcpRagTopK, setMcpRagTopK] = useState(10);
  const [mcpRagForceLocal, setMcpRagForceLocal] = useState(false);
  const [mcpRagResults, setMcpRagResults] = useState('');

  // Loading states
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Load initial config
  useEffect(() => {
    loadConfig();
    loadWebhookConfig();
  }, []);

  async function loadConfig() {
    try {
      setLoading(true);
      const config: AppConfig = await configApi.load();
      const env = config.env;

      // Theme
      setThemeMode((env.THEME_MODE as 'auto' | 'dark' | 'light') || 'auto');

      // Server
      setAgroEdition(String(env.AGRO_EDITION || ''));
      setThreadId(String(env.THREAD_ID || ''));
      setHost(String(env.HOST || '127.0.0.1'));
      setPort(Number(env.PORT) || 8012);
      setOpenBrowser(Number(env.OPEN_BROWSER) || 1);
      setAgroPath(String(env.AGRO_PATH || ''));
      setNetlifyApiKey(String(env.NETLIFY_API_KEY || ''));
      setNetlifyDomains(String(env.NETLIFY_DOMAINS || ''));
      setChatStreamingEnabled(Number(env.CHAT_STREAMING_ENABLED) || 1);

      // Tracing
      setTracingEnabled(Number(env.TRACING_ENABLED) || 1);
      setTraceSamplingRate(Number(env.TRACE_SAMPLING_RATE) || 1.0);
      setPrometheusPort(Number(env.PROMETHEUS_PORT) || 9090);
      setMetricsEnabled(Number(env.METRICS_ENABLED) || 1);
      setLogLevel(String(env.LOG_LEVEL || 'INFO'));
      setAlertWebhookTimeout(Number(env.ALERT_WEBHOOK_TIMEOUT) || 5);

      // Editor
      setEditorEnabled(env.EDITOR_ENABLED === 1 || env.EDITOR_ENABLED === '1');
      setEditorEmbedEnabled(env.EDITOR_EMBED_ENABLED !== 0 && env.EDITOR_EMBED_ENABLED !== '0');
      setEditorPort(Number(env.EDITOR_PORT) || 4440);
      setEditorBind(String(env.EDITOR_BIND || 'local'));

      // MCP
      setHttpModel(String(env.GEN_MODEL_HTTP || ''));
      setMcpModel(String(env.GEN_MODEL_MCP || ''));
      setCliModel(String(env.GEN_MODEL_CLI || ''));
      setMcpHttpHost(String(env.MCP_HTTP_HOST || '0.0.0.0'));
      setMcpHttpPort(Number(env.MCP_HTTP_PORT) || 8013);
      setMcpHttpPath(String(env.MCP_HTTP_PATH || '/mcp'));
    } catch (err) {
      console.error('Failed to load config:', err);
    } finally {
      setLoading(false);
    }
  }

  async function loadWebhookConfig() {
    try {
      const { data } = await apiClient.get(api('/webhooks/config'));
      if (data) {
        setWebhookEnabled(data.alert_notify_enabled !== false);
        const severities = (data.alert_notify_severities || 'critical,warning').split(',');
        setWebhookSevCritical(severities.includes('critical'));
        setWebhookSevWarning(severities.includes('warning'));
        setWebhookSevInfo(severities.includes('info'));
        setWebhookIncludeResolved(data.alert_include_resolved !== false);
      }
    } catch (err) {
      console.error('Failed to load webhook config:', err);
    }
  }

  async function saveGeneralSettings() {
    try {
      setSaving(true);
      const envUpdate: Partial<EnvConfig> = {
        THEME_MODE: themeMode,
        AGRO_EDITION: agroEdition,
        THREAD_ID: threadId,
        HOST: host,
        PORT: port,
        OPEN_BROWSER: openBrowser,
        AGRO_PATH: agroPath,
        NETLIFY_API_KEY: netlifyApiKey,
        NETLIFY_DOMAINS: netlifyDomains,
        CHAT_STREAMING_ENABLED: chatStreamingEnabled,
        TRACING_ENABLED: tracingEnabled,
        TRACE_SAMPLING_RATE: traceSamplingRate,
        PROMETHEUS_PORT: prometheusPort,
        METRICS_ENABLED: metricsEnabled,
        LOG_LEVEL: logLevel,
        ALERT_WEBHOOK_TIMEOUT: alertWebhookTimeout,
        EDITOR_ENABLED: editorEnabled ? 1 : 0,
        EDITOR_EMBED_ENABLED: editorEmbedEnabled ? 1 : 0,
        EDITOR_PORT: editorPort,
        EDITOR_BIND: editorBind,
        GEN_MODEL_HTTP: httpModel,
        GEN_MODEL_MCP: mcpModel,
        GEN_MODEL_CLI: cliModel,
        MCP_HTTP_HOST: mcpHttpHost,
        MCP_HTTP_PORT: mcpHttpPort,
        MCP_HTTP_PATH: mcpHttpPath,
      };

      await configApi.saveConfig({ env: envUpdate });
      alert('General settings saved successfully!');
    } catch (err) {
      console.error('Failed to save settings:', err);
      alert('Failed to save settings: ' + (err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  async function saveWebhookConfig() {
    try {
      setWebhookSaveStatus('Saving...');
      const severities = [];
      if (webhookSevCritical) severities.push('critical');
      if (webhookSevWarning) severities.push('warning');
      if (webhookSevInfo) severities.push('info');

      const payload = {
        slack_webhook_url: slackWebhookUrl,
        discord_webhook_url: discordWebhookUrl,
        alert_notify_enabled: webhookEnabled,
        alert_notify_severities: severities.join(','),
        alert_include_resolved: webhookIncludeResolved,
        alert_webhook_timeout_seconds: alertWebhookTimeout,
      };

      await apiClient.post(api('/webhooks/config'), payload);
      setWebhookSaveStatus('Saved successfully!');
      setTimeout(() => setWebhookSaveStatus(''), 3000);
    } catch (err) {
      console.error('Failed to save webhook config:', err);
      setWebhookSaveStatus('Failed to save: ' + (err as Error).message);
    }
  }

  async function runMcpRagSearch() {
    try {
      setMcpRagResults('Running...');
      const params = new URLSearchParams({
        q: mcpRagQuestion,
        repo: mcpRagRepo,
        top_k: String(mcpRagTopK),
        force_local: String(mcpRagForceLocal),
      });
      const { data } = await apiClient.get(api(`/api/mcp/rag_search?${params}`));
      setMcpRagResults(JSON.stringify(data, null, 2));
    } catch (err) {
      setMcpRagResults('Error: ' + (err as Error).message);
    }
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading configuration...</div>;
  }

  return (
    <div style={{ padding: '20px' }}>
      {/* Theme & Appearance */}
      <div className="settings-section">
        <h3>Theme & Appearance</h3>
        <div className="input-row">
          <div className="input-group">
            <label>Theme Mode</label>
            <select value={themeMode} onChange={(e) => setThemeMode(e.target.value as 'auto' | 'dark' | 'light')}>
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
            <input type="text" value={agroEdition} onChange={(e) => setAgroEdition(e.target.value)} placeholder="oss | pro | enterprise" />
          </div>
          <div className="input-group">
            <label>Thread ID</label>
            <input type="text" value={threadId} onChange={(e) => setThreadId(e.target.value)} placeholder="http or cli-chat" />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Serve Host</label>
            <input type="text" value={host} onChange={(e) => setHost(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Serve Port</label>
            <input type="number" value={port} onChange={(e) => setPort(Number(e.target.value))} />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Open Browser on Start</label>
            <select value={openBrowser} onChange={(e) => setOpenBrowser(Number(e.target.value))}>
              <option value="1">On</option>
              <option value="0">Off</option>
            </select>
          </div>
          <div className="input-group">
            <label>agro Path</label>
            <input type="text" value={agroPath} onChange={(e) => setAgroPath(e.target.value)} />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Netlify API Key</label>
            <input type="password" value={netlifyApiKey} onChange={(e) => setNetlifyApiKey(e.target.value)} />
          </div>
          <div className="input-group">
            <label>Netlify Domains</label>
            <input type="text" value={netlifyDomains} onChange={(e) => setNetlifyDomains(e.target.value)} />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Chat Streaming Enabled</label>
            <select value={chatStreamingEnabled} onChange={(e) => setChatStreamingEnabled(Number(e.target.value))}>
              <option value="1">Enabled</option>
              <option value="0">Disabled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tracing & Observability */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>Tracing & Observability</h3>
        <p className="small">Configure distributed tracing, metrics collection, and monitoring.</p>
        <div className="input-row">
          <div className="input-group">
            <label>Tracing Enabled</label>
            <select value={tracingEnabled} onChange={(e) => setTracingEnabled(Number(e.target.value))}>
              <option value="1">Enabled</option>
              <option value="0">Disabled</option>
            </select>
          </div>
          <div className="input-group">
            <label>Trace Sampling Rate</label>
            <input
              type="number"
              value={traceSamplingRate}
              onChange={(e) => setTraceSamplingRate(Number(e.target.value))}
              min="0.0"
              max="1.0"
              step="0.1"
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Prometheus Port</label>
            <input
              type="number"
              value={prometheusPort}
              onChange={(e) => setPrometheusPort(Number(e.target.value))}
              min="1024"
              max="65535"
            />
          </div>
          <div className="input-group">
            <label>Metrics Enabled</label>
            <select value={metricsEnabled} onChange={(e) => setMetricsEnabled(Number(e.target.value))}>
              <option value="1">Enabled</option>
              <option value="0">Disabled</option>
            </select>
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Log Level</label>
            <select value={logLevel} onChange={(e) => setLogLevel(e.target.value)}>
              <option value="DEBUG">DEBUG</option>
              <option value="INFO">INFO</option>
              <option value="WARNING">WARNING</option>
              <option value="ERROR">ERROR</option>
            </select>
          </div>
          <div className="input-group">
            <label>Alert Webhook Timeout</label>
            <input
              type="number"
              value={alertWebhookTimeout}
              onChange={(e) => setAlertWebhookTimeout(Number(e.target.value))}
              min="1"
              max="30"
            />
          </div>
        </div>
      </div>

      {/* Embedded Editor */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>
          <span className="accent-blue">●</span> Embedded Editor
        </h3>
        <div className="input-row">
          <div className="input-group">
            <label className="toggle">
              <input type="checkbox" checked={editorEnabled} onChange={(e) => setEditorEnabled(e.target.checked)} />
              <span className="toggle-track" aria-hidden="true">
                <span className="toggle-thumb"></span>
              </span>
              <span className="toggle-label">Enable Embedded Editor</span>
            </label>
            <p className="small">Start OpenVSCode Server container on up.sh</p>
          </div>
          <div className="input-group">
            <label className="toggle">
              <input type="checkbox" checked={editorEmbedEnabled} onChange={(e) => setEditorEmbedEnabled(e.target.checked)} />
              <span className="toggle-track" aria-hidden="true">
                <span className="toggle-thumb"></span>
              </span>
              <span className="toggle-label">Enable Editor Embed (iframe)</span>
            </label>
            <p className="small">Show the editor inline in the GUI (hides automatically in CI)</p>
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Editor Port</label>
            <input type="number" value={editorPort} onChange={(e) => setEditorPort(Number(e.target.value))} min="1024" max="65535" />
            <p className="small">Preferred port (auto-increments if busy)</p>
          </div>
          <div className="input-group">
            <label>Bind Mode</label>
            <select value={editorBind} onChange={(e) => setEditorBind(e.target.value)}>
              <option value="local">Local only (127.0.0.1)</option>
              <option value="public">Public (0.0.0.0)</option>
            </select>
            <p className="small">Local = secure; Public = accessible from network</p>
          </div>
        </div>
      </div>

      {/* MCP & Channels */}
      <div className="settings-section">
        <h3>MCP & Channels</h3>
        <p className="small">
          Set per-channel inference models. Provider is inferred from the model name; use base URL and keys from Infrastructure or
          Models for proxies/local engines.
        </p>
        <div className="input-row">
          <div className="input-group">
            <label>HTTP Responses Model</label>
            <input type="text" value={httpModel} onChange={(e) => setHttpModel(e.target.value)} placeholder="e.g., gpt-4" />
          </div>
          <div className="input-group">
            <label>MCP stdio Model</label>
            <input type="text" value={mcpModel} onChange={(e) => setMcpModel(e.target.value)} placeholder="e.g., gpt-4" />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>CLI Chat Model</label>
            <input type="text" value={cliModel} onChange={(e) => setCliModel(e.target.value)} placeholder="e.g., gpt-4" />
          </div>
          <div className="input-group">
            <label>MCP HTTP (host/port/path)</label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input type="text" value={mcpHttpHost} onChange={(e) => setMcpHttpHost(e.target.value)} placeholder="0.0.0.0" style={{ width: '40%' }} />
              <input type="number" value={mcpHttpPort} onChange={(e) => setMcpHttpPort(Number(e.target.value))} placeholder="8013" style={{ width: '30%' }} />
              <input type="text" value={mcpHttpPath} onChange={(e) => setMcpHttpPath(e.target.value)} placeholder="/mcp" style={{ width: '30%' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Webhooks */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>
          <span style={{ color: 'var(--link)' }}>●</span> Alert Notifications (Slack/Discord)
        </h3>
        <p className="small">Configure webhook URLs for alert notifications. Leave blank to disable notifications for that platform.</p>

        <div className="input-row">
          <div className="input-group">
            <label>Slack Webhook URL</label>
            <input
              type="password"
              value={slackWebhookUrl}
              onChange={(e) => setSlackWebhookUrl(e.target.value)}
              placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX"
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
              value={discordWebhookUrl}
              onChange={(e) => setDiscordWebhookUrl(e.target.value)}
              placeholder="https://discordapp.com/api/webhooks/000000000000000000/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
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
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 400, margin: 0 }}>
                <input type="checkbox" checked={webhookEnabled} onChange={(e) => setWebhookEnabled(e.target.checked)} />
                <span>Enable notifications</span>
              </label>
              <div>
                <label>Notify on severity:</label>
                <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="checkbox" checked={webhookSevCritical} onChange={(e) => setWebhookSevCritical(e.target.checked)} />
                    Critical
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="checkbox" checked={webhookSevWarning} onChange={(e) => setWebhookSevWarning(e.target.checked)} />
                    Warning
                  </label>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input type="checkbox" checked={webhookSevInfo} onChange={(e) => setWebhookSevInfo(e.target.checked)} />
                    Info
                  </label>
                </div>
              </div>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 400, margin: 0 }}>
                <input type="checkbox" checked={webhookIncludeResolved} onChange={(e) => setWebhookIncludeResolved(e.target.checked)} />
                <span>Include resolved alerts</span>
              </label>
            </div>
          </div>
        </div>

        <div className="input-row">
          <button
            className="small-button"
            onClick={saveWebhookConfig}
            style={{ background: 'var(--accent)', color: 'var(--accent-contrast)', fontWeight: '600', width: '100%' }}
          >
            Save Webhook Configuration
          </button>
        </div>
        {webhookSaveStatus && (
          <div style={{ fontSize: '12px', color: 'var(--fg-muted)', marginTop: '8px' }}>{webhookSaveStatus}</div>
        )}
      </div>

      {/* MCP RAG Search Debug */}
      <div className="settings-section" style={{ borderLeft: '3px solid var(--link)' }}>
        <h3>
          <span style={{ color: 'var(--link)' }}>●</span> MCP RAG Search (debug)
        </h3>
        <p className="small">
          Runs the MCP server's <code>rag_search</code> tool to return file paths and line ranges. Falls back to local retrieval if
          MCP is unavailable.
        </p>
        <div className="input-row">
          <div className="input-group full-width">
            <label>Question</label>
            <input
              type="text"
              value={mcpRagQuestion}
              onChange={(e) => setMcpRagQuestion(e.target.value)}
              placeholder="e.g. Where is OAuth token validated?"
            />
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <label>Repository</label>
            <input type="text" value={mcpRagRepo} onChange={(e) => setMcpRagRepo(e.target.value)} placeholder="agro" />
          </div>
          <div className="input-group">
            <label>Top K</label>
            <input type="number" value={mcpRagTopK} onChange={(e) => setMcpRagTopK(Number(e.target.value))} min="1" max="50" />
          </div>
          <div className="input-group">
            <label>Force Local</label>
            <select value={mcpRagForceLocal ? 'true' : 'false'} onChange={(e) => setMcpRagForceLocal(e.target.value === 'true')}>
              <option value="false">No (use MCP if available)</option>
              <option value="true">Yes (bypass MCP)</option>
            </select>
          </div>
        </div>
        <div className="input-row">
          <div className="input-group">
            <button className="small-button" onClick={runMcpRagSearch}>
              Run
            </button>
          </div>
        </div>
        <pre className="result-display" style={{ minHeight: '120px', whiteSpace: 'pre-wrap', background: 'var(--code-bg)' }}>
          {mcpRagResults}
        </pre>
      </div>

      {/* Save All Button */}
      <div className="input-row" style={{ marginTop: '24px' }}>
        <button
          className="small-button"
          onClick={saveGeneralSettings}
          disabled={saving}
          style={{
            width: '100%',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            fontWeight: '600',
            fontSize: '16px',
            padding: '12px',
          }}
        >
          {saving ? 'Saving...' : 'Save General Settings'}
        </button>
      </div>
    </div>
  );
}
