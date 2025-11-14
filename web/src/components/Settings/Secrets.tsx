import { useState, useEffect } from 'react';
import { useConfigStore } from '@/stores';

interface EnvVariable {
  key: string;
  value: string;
  masked: boolean;
}

export function Secrets() {
  const { config, loadConfig, saveEnv, saving } = useConfigStore();

  // API Keys
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [cohereKey, setCohereKey] = useState('');
  const [voyageKey, setVoyageKey] = useState('');
  const [googleKey, setGoogleKey] = useState('');

  // Show/hide states
  const [showOpenai, setShowOpenai] = useState(false);
  const [showAnthropic, setShowAnthropic] = useState(false);
  const [showCohere, setShowCohere] = useState(false);
  const [showVoyage, setShowVoyage] = useState(false);
  const [showGoogle, setShowGoogle] = useState(false);

  // Environment variables
  const [envVars, setEnvVars] = useState<EnvVariable[]>([]);
  const [showAddEnvVar, setShowAddEnvVar] = useState(false);
  const [newEnvKey, setNewEnvKey] = useState('');
  const [newEnvValue, setNewEnvValue] = useState('');

  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (!config) {
      loadConfig();
    }
  }, [config, loadConfig]);

  useEffect(() => {
    if (config?.env) {
      setOpenaiKey(String(config.env.OPENAI_API_KEY || ''));
      setAnthropicKey(String(config.env.ANTHROPIC_API_KEY || ''));
      setCohereKey(String(config.env.COHERE_API_KEY || ''));
      setVoyageKey(String(config.env.VOYAGE_API_KEY || ''));
      setGoogleKey(String(config.env.GOOGLE_API_KEY || ''));

      // Load environment variables (excluding API keys and standard config)
      const excludeKeys = new Set([
        'OPENAI_API_KEY',
        'ANTHROPIC_API_KEY',
        'COHERE_API_KEY',
        'VOYAGE_API_KEY',
        'GOOGLE_API_KEY',
        'THEME_MODE',
        'SERVE_HOST',
        'SERVE_PORT',
        'AGRO_EDITION',
        'THREAD_ID',
      ]);

      const vars: EnvVariable[] = Object.entries(config.env)
        .filter(([key]) => !excludeKeys.has(key))
        .map(([key, value]) => ({
          key,
          value: String(value),
          masked: key.toLowerCase().includes('key') || key.toLowerCase().includes('secret') || key.toLowerCase().includes('password'),
        }));

      setEnvVars(vars);
    }
  }, [config]);

  const handleSaveSecrets = async () => {
    const updates = {
      OPENAI_API_KEY: openaiKey,
      ANTHROPIC_API_KEY: anthropicKey,
      COHERE_API_KEY: cohereKey,
      VOYAGE_API_KEY: voyageKey,
      GOOGLE_API_KEY: googleKey,
      ...Object.fromEntries(envVars.map(v => [v.key, v.value])),
    };

    await saveEnv(updates);
    setHasChanges(false);
    alert('Secrets saved successfully. Changes require restart.');
  };

  const handleAddEnvVar = () => {
    if (!newEnvKey.trim()) {
      alert('Environment variable key cannot be empty');
      return;
    }

    if (envVars.some(v => v.key === newEnvKey)) {
      alert('Environment variable already exists');
      return;
    }

    const isMasked = newEnvKey.toLowerCase().includes('key') ||
                     newEnvKey.toLowerCase().includes('secret') ||
                     newEnvKey.toLowerCase().includes('password');

    setEnvVars(prev => [...prev, { key: newEnvKey, value: newEnvValue, masked: isMasked }]);
    setNewEnvKey('');
    setNewEnvValue('');
    setShowAddEnvVar(false);
    setHasChanges(true);
  };

  const handleDeleteEnvVar = (key: string) => {
    if (!confirm(`Are you sure you want to delete ${key}?`)) return;

    setEnvVars(prev => prev.filter(v => v.key !== key));
    setHasChanges(true);
  };

  const handleEditEnvVar = (key: string, newValue: string) => {
    setEnvVars(prev => prev.map(v => v.key === key ? { ...v, value: newValue } : v));
    setHasChanges(true);
  };

  const handleImportFromEnv = async () => {
    try {
      const response = await fetch('/api/env/load');
      if (response.ok) {
        const data = await response.json();
        alert('Environment variables imported successfully from .env file');
        await loadConfig();
      } else {
        throw new Error('Failed to import .env file');
      }
    } catch (error) {
      alert(`Failed to import: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleExportToEnv = async () => {
    try {
      const response = await fetch('/api/env/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...config?.env,
          OPENAI_API_KEY: openaiKey,
          ANTHROPIC_API_KEY: anthropicKey,
          COHERE_API_KEY: cohereKey,
          VOYAGE_API_KEY: voyageKey,
          GOOGLE_API_KEY: googleKey,
          ...Object.fromEntries(envVars.map(v => [v.key, v.value])),
        }),
      });

      if (response.ok) {
        alert('Configuration exported to .env file successfully');
      } else {
        throw new Error('Failed to export to .env file');
      }
    } catch (error) {
      alert(`Failed to export: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const maskValue = (value: string): string => {
    if (value.length === 0) return '';
    return '•'.repeat(Math.min(value.length, 40));
  };

  if (!config) {
    return (
      <div style={{ padding: '24px', color: 'var(--fg-muted)' }}>
        Loading configuration...
      </div>
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Warning Banner */}
      <div
        style={{
          background: '#f59e0b',
          color: '#000',
          padding: '12px 16px',
          borderRadius: '6px',
          marginBottom: '24px',
          fontSize: '14px',
          fontWeight: 500,
          display: 'flex',
          alignItems: 'center',
        }}
      >
        <span style={{ fontSize: '20px', marginRight: '12px' }}>⚠</span>
        Changes require restart
      </div>

      {/* API Keys Section */}
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
          API Keys
        </h3>

        <div style={{ display: 'grid', gap: '16px' }}>
          {/* OpenAI */}
          <div>
            <label htmlFor="openai-key" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              OpenAI API Key
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="openai-key"
                type={showOpenai ? 'text' : 'password'}
                value={showOpenai ? openaiKey : maskValue(openaiKey)}
                onChange={(e) => { setOpenaiKey(e.target.value); setHasChanges(true); }}
                style={{
                  flex: 1,
                  background: 'var(--bg-elev2)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: showOpenai ? 'monospace' : 'inherit',
                }}
              />
              <button
                onClick={() => setShowOpenai(!showOpenai)}
                style={{
                  background: 'var(--bg-elev2)',
                  color: 'var(--fg)',
                  border: '1px solid var(--line)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  minWidth: '60px',
                }}
              >
                {showOpenai ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Anthropic */}
          <div>
            <label htmlFor="anthropic-key" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              Anthropic API Key
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="anthropic-key"
                type={showAnthropic ? 'text' : 'password'}
                value={showAnthropic ? anthropicKey : maskValue(anthropicKey)}
                onChange={(e) => { setAnthropicKey(e.target.value); setHasChanges(true); }}
                style={{
                  flex: 1,
                  background: 'var(--bg-elev2)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: showAnthropic ? 'monospace' : 'inherit',
                }}
              />
              <button
                onClick={() => setShowAnthropic(!showAnthropic)}
                style={{
                  background: 'var(--bg-elev2)',
                  color: 'var(--fg)',
                  border: '1px solid var(--line)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  minWidth: '60px',
                }}
              >
                {showAnthropic ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Cohere */}
          <div>
            <label htmlFor="cohere-key" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              Cohere API Key
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="cohere-key"
                type={showCohere ? 'text' : 'password'}
                value={showCohere ? cohereKey : maskValue(cohereKey)}
                onChange={(e) => { setCohereKey(e.target.value); setHasChanges(true); }}
                style={{
                  flex: 1,
                  background: 'var(--bg-elev2)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: showCohere ? 'monospace' : 'inherit',
                }}
              />
              <button
                onClick={() => setShowCohere(!showCohere)}
                style={{
                  background: 'var(--bg-elev2)',
                  color: 'var(--fg)',
                  border: '1px solid var(--line)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  minWidth: '60px',
                }}
              >
                {showCohere ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Voyage */}
          <div>
            <label htmlFor="voyage-key" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              Voyage API Key
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="voyage-key"
                type={showVoyage ? 'text' : 'password'}
                value={showVoyage ? voyageKey : maskValue(voyageKey)}
                onChange={(e) => { setVoyageKey(e.target.value); setHasChanges(true); }}
                style={{
                  flex: 1,
                  background: 'var(--bg-elev2)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: showVoyage ? 'monospace' : 'inherit',
                }}
              />
              <button
                onClick={() => setShowVoyage(!showVoyage)}
                style={{
                  background: 'var(--bg-elev2)',
                  color: 'var(--fg)',
                  border: '1px solid var(--line)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  minWidth: '60px',
                }}
              >
                {showVoyage ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          {/* Google */}
          <div>
            <label htmlFor="google-key" style={{ display: 'block', fontSize: '13px', color: 'var(--fg-muted)', marginBottom: '6px' }}>
              Google API Key
            </label>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input
                id="google-key"
                type={showGoogle ? 'text' : 'password'}
                value={showGoogle ? googleKey : maskValue(googleKey)}
                onChange={(e) => { setGoogleKey(e.target.value); setHasChanges(true); }}
                style={{
                  flex: 1,
                  background: 'var(--bg-elev2)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '14px',
                  fontFamily: showGoogle ? 'monospace' : 'inherit',
                }}
              />
              <button
                onClick={() => setShowGoogle(!showGoogle)}
                style={{
                  background: 'var(--bg-elev2)',
                  color: 'var(--fg)',
                  border: '1px solid var(--line)',
                  padding: '8px 16px',
                  borderRadius: '4px',
                  fontSize: '12px',
                  cursor: 'pointer',
                  minWidth: '60px',
                }}
              >
                {showGoogle ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Environment Variables Section */}
      <div
        style={{
          background: 'var(--bg-elev1)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '16px',
          marginBottom: '24px',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h3 style={{ margin: 0, fontSize: '16px', color: 'var(--fg)' }}>
            Environment Variables
          </h3>
          <button
            onClick={() => setShowAddEnvVar(true)}
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
            + Add Environment Variable
          </button>
        </div>

        {envVars.length === 0 ? (
          <div style={{ color: 'var(--fg-muted)', fontSize: '13px', textAlign: 'center', padding: '40px' }}>
            No custom environment variables
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--line)' }}>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: 'var(--fg-muted)', width: '30%' }}>
                    Key
                  </th>
                  <th style={{ textAlign: 'left', padding: '8px', fontSize: '12px', color: 'var(--fg-muted)', width: '50%' }}>
                    Value
                  </th>
                  <th style={{ textAlign: 'center', padding: '8px', fontSize: '12px', color: 'var(--fg-muted)', width: '20%' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {envVars.map((envVar) => (
                  <tr key={envVar.key} style={{ borderBottom: '1px solid var(--line)' }}>
                    <td style={{ padding: '12px 8px', fontSize: '13px', color: 'var(--fg)', fontFamily: 'monospace' }}>
                      {envVar.key}
                    </td>
                    <td style={{ padding: '12px 8px' }}>
                      <input
                        type={envVar.masked ? 'password' : 'text'}
                        value={envVar.value}
                        onChange={(e) => handleEditEnvVar(envVar.key, e.target.value)}
                        style={{
                          width: '100%',
                          background: 'var(--bg-elev2)',
                          border: '1px solid var(--line)',
                          color: 'var(--fg)',
                          padding: '6px 10px',
                          borderRadius: '4px',
                          fontSize: '12px',
                          fontFamily: 'monospace',
                        }}
                      />
                    </td>
                    <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleDeleteEnvVar(envVar.key)}
                        style={{
                          background: '#ef4444',
                          color: '#fff',
                          border: 'none',
                          padding: '4px 12px',
                          borderRadius: '4px',
                          fontSize: '11px',
                          cursor: 'pointer',
                        }}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '12px', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={handleImportFromEnv}
            style={{
              background: 'var(--bg-elev2)',
              color: 'var(--fg)',
              border: '1px solid var(--line)',
              padding: '10px 20px',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Import from .env
          </button>
          <button
            onClick={handleExportToEnv}
            style={{
              background: 'var(--bg-elev2)',
              color: 'var(--fg)',
              border: '1px solid var(--line)',
              padding: '10px 20px',
              borderRadius: '4px',
              fontSize: '14px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            Export to .env
          </button>
        </div>

        <button
          onClick={handleSaveSecrets}
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
          {saving ? 'Saving...' : 'Save Secrets'}
        </button>
      </div>

      {/* Add Environment Variable Modal */}
      {showAddEnvVar && (
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
            onClick={() => setShowAddEnvVar(false)}
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
            <h4 style={{ color: 'var(--accent)', marginBottom: '16px' }}>Add Environment Variable</h4>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ display: 'block', color: 'var(--fg-muted)', fontSize: '11px', marginBottom: '4px' }}>
                Key
              </label>
              <input
                type="text"
                value={newEnvKey}
                onChange={(e) => setNewEnvKey(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddEnvVar();
                  if (e.key === 'Escape') setShowAddEnvVar(false);
                }}
                style={{
                  width: '100%',
                  background: 'var(--bg-elev2)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
                placeholder="VARIABLE_NAME"
                autoFocus
              />
            </div>
            <div style={{ marginBottom: '16px' }}>
              <label style={{ display: 'block', color: 'var(--fg-muted)', fontSize: '11px', marginBottom: '4px' }}>
                Value
              </label>
              <input
                type="text"
                value={newEnvValue}
                onChange={(e) => setNewEnvValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleAddEnvVar();
                  if (e.key === 'Escape') setShowAddEnvVar(false);
                }}
                style={{
                  width: '100%',
                  background: 'var(--bg-elev2)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '8px',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
                placeholder="variable_value"
              />
            </div>
            <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => setShowAddEnvVar(false)}
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
                onClick={handleAddEnvVar}
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
