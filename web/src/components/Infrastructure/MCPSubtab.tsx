// AGRO - MCP Subtab Component
// MCP Server connection and configuration

import { useState, useEffect } from 'react';

interface MCPServer {
  name: string;
  url: string;
  status: 'connected' | 'disconnected' | 'unknown';
}

export function MCPSubtab() {
  const [servers, setServers] = useState<MCPServer[]>([
    { name: 'MCP HTTP Server', url: 'http://127.0.0.1:8013/mcp', status: 'unknown' }
  ]);
  const [serverUrl, setServerUrl] = useState('http://127.0.0.1:8013/mcp');
  const [apiKey, setApiKey] = useState('');
  const [testResult, setTestResult] = useState('');

  useEffect(() => {
    checkMCPStatus();
  }, []);

  const api = (path: string) => {
    const base = (window as any).API_BASE_URL || '';
    return `${base}${path}`;
  };

  async function checkMCPStatus() {
    try {
      const response = await fetch(api('/api/mcp/http/status'));
      const data = await response.json();
      if (data.ok) {
        setServers(prev => prev.map(s => ({
          ...s,
          status: 'connected'
        })));
      }
    } catch (error) {
      setServers(prev => prev.map(s => ({
        ...s,
        status: 'disconnected'
      })));
    }
  }

  async function testConnection() {
    setTestResult('Testing connection...');
    try {
      const response = await fetch(api('/api/mcp/http/status'));
      const data = await response.json();
      if (data.ok) {
        setTestResult(`Connected! Host: ${data.host}, Port: ${data.port}, Path: ${data.path}`);
      } else {
        setTestResult('Connection failed: Server not responding');
      }
    } catch (error: any) {
      setTestResult(`Connection failed: ${error.message}`);
    }
  }

  const statusColor = (status: string) => {
    if (status === 'connected') return 'var(--accent)';
    if (status === 'disconnected') return 'var(--err)';
    return 'var(--fg-muted)';
  };

  const statusIcon = (status: string) => {
    if (status === 'connected') return '●';
    if (status === 'disconnected') return '○';
    return '?';
  };

  return (
    <div className="settings-section">
      <h2>MCP Server Connection Status</h2>

      {/* Server List */}
      <div style={{ marginBottom: '24px' }}>
        {servers.map((server, idx) => (
          <div
            key={idx}
            style={{
              background: 'var(--card-bg)',
              border: '1px solid var(--line)',
              borderRadius: '6px',
              padding: '16px',
              marginBottom: '12px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <div style={{ fontWeight: '600', color: 'var(--fg)' }}>{server.name}</div>
              <div style={{ fontSize: '11px', color: statusColor(server.status) }}>
                {statusIcon(server.status)} {server.status.toUpperCase()}
              </div>
            </div>
            <div style={{ fontSize: '12px', color: 'var(--fg-muted)', fontFamily: 'monospace', marginBottom: '8px' }}>
              {server.url}
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                className="small-button"
                onClick={checkMCPStatus}
                style={{
                  flex: '1',
                  background: 'var(--bg-elev2)',
                  color: 'var(--link)',
                  border: '1px solid var(--link)'
                }}
              >
                Check Status
              </button>
              {server.status === 'disconnected' && (
                <button
                  className="small-button"
                  onClick={() => alert('Reconnect feature coming soon')}
                  style={{
                    flex: '1',
                    background: 'var(--bg-elev2)',
                    color: 'var(--accent)',
                    border: '1px solid var(--accent)'
                  }}
                >
                  Connect
                </button>
              )}
              {server.status === 'connected' && (
                <button
                  className="small-button"
                  onClick={() => alert('Disconnect feature coming soon')}
                  style={{
                    flex: '1',
                    background: 'var(--bg-elev2)',
                    color: 'var(--err)',
                    border: '1px solid var(--err)'
                  }}
                >
                  Disconnect
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Configuration Form */}
      <h3>MCP Server Configuration</h3>
      <div style={{ marginBottom: '16px' }}>
        <div className="input-row">
          <div className="input-group">
            <label>Server URL</label>
            <input
              type="text"
              value={serverUrl}
              onChange={(e) => setServerUrl(e.target.value)}
              placeholder="http://127.0.0.1:8013/mcp"
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
              Full URL to the MCP HTTP endpoint
            </p>
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>API Key (Optional)</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter API key if required"
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
              Optional authentication key
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginTop: '16px' }}>
          <button
            className="small-button"
            onClick={testConnection}
            style={{
              flex: '1',
              background: 'var(--link)',
              color: 'var(--accent-contrast)',
              fontWeight: '600',
              padding: '10px'
            }}
          >
            Test Connection
          </button>
          <button
            className="small-button"
            onClick={() => alert('Save feature will persist settings to config')}
            style={{
              flex: '1',
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              fontWeight: '600',
              padding: '10px'
            }}
          >
            Save Settings
          </button>
        </div>

        {testResult && (
          <div
            style={{
              marginTop: '12px',
              padding: '12px',
              background: 'var(--code-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              fontSize: '12px',
              color: 'var(--fg)',
              fontFamily: 'monospace'
            }}
          >
            {testResult}
          </div>
        )}
      </div>

      {/* Documentation */}
      <div
        style={{
          marginTop: '24px',
          padding: '16px',
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px'
        }}
      >
        <h4 style={{ marginTop: 0 }}>About MCP Servers</h4>
        <p style={{ fontSize: '12px', color: 'var(--fg-muted)', lineHeight: '1.6' }}>
          Model Context Protocol (MCP) servers provide a standardized way to connect AI assistants
          to external tools and data sources. The MCP HTTP server exposes RAG search and other
          functionality via HTTP endpoints.
        </p>
        <ul style={{ fontSize: '12px', color: 'var(--fg-muted)', lineHeight: '1.6' }}>
          <li>Default endpoint: http://127.0.0.1:8013/mcp</li>
          <li>Configurable via MCP_HTTP_HOST, MCP_HTTP_PORT, MCP_HTTP_PATH environment variables</li>
          <li>No authentication required for local development</li>
        </ul>
      </div>
    </div>
  );
}
