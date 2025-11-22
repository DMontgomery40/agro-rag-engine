// AGRO - Secrets Subtab Component
// API keys and environment variables management

import { useState } from 'react';
import { configApi } from '@/api/config';

interface EnvVariable {
  key: string;
  value: string;
}

export function SecretsSubtab() {
  const [openaiKey, setOpenaiKey] = useState('');
  const [anthropicKey, setAnthropicKey] = useState('');
  const [cohereKey, setCohereKey] = useState('');
  const [voyageKey, setVoyageKey] = useState('');
  const [jinaKey, setJinaKey] = useState('');
  const [envVariables, setEnvVariables] = useState<EnvVariable[]>([]);
  const [newVarKey, setNewVarKey] = useState('');
  const [newVarValue, setNewVarValue] = useState('');
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [uploadStatus, setUploadStatus] = useState<string>('');

  async function saveApiKeys() {
    setSaveStatus('');
    const keys: Record<string, string> = {};
    if (openaiKey) keys.OPENAI_API_KEY = openaiKey;
    if (anthropicKey) keys.ANTHROPIC_API_KEY = anthropicKey;
    if (cohereKey) keys.COHERE_API_KEY = cohereKey;
    if (voyageKey) keys.VOYAGE_API_KEY = voyageKey;
    if (jinaKey) keys.JINA_API_KEY = jinaKey;

    try {
      const result = await configApi.saveEnv(keys);
      setSaveStatus('API keys saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error: any) {
      setSaveStatus(`Error saving API keys: ${error.message}`);
    }
  }

  function addEnvVariable() {
    if (!newVarKey.trim()) {
      alert('Please enter a variable key');
      return;
    }
    setEnvVariables(prev => [...prev, { key: newVarKey, value: newVarValue }]);
    setNewVarKey('');
    setNewVarValue('');
  }

  function removeEnvVariable(index: number) {
    setEnvVariables(prev => prev.filter((_, i) => i !== index));
  }

  function updateEnvVariable(index: number, field: 'key' | 'value', value: string) {
    setEnvVariables(prev => prev.map((item, i) =>
      i === index ? { ...item, [field]: value } : item
    ));
  }

  async function saveEnvVariables() {
    setSaveStatus('');
    const envObj: Record<string, string> = {};
    envVariables.forEach(item => {
      if (item.key.trim()) {
        envObj[item.key] = item.value;
      }
    });

    try {
      await configApi.saveEnv(envObj);
      setSaveStatus('Environment variables saved successfully!');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error: any) {
      setSaveStatus(`Error saving environment variables: ${error.message}`);
    }
  }

  async function handleFileUpload(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    setUploadStatus('');
    try {
      const result = await configApi.uploadSecrets(file);
      if (result.ok) {
        const count = result.applied?.length || 0;
        setUploadStatus(`Successfully imported ${count} secrets from ${file.name}`);
        setTimeout(() => setUploadStatus(''), 5000);
      } else {
        setUploadStatus(`Failed to import .env file: ${result.error || 'Unknown error'}`);
      }
    } catch (error: any) {
      setUploadStatus(`Error uploading .env file: ${error.message}`);
    }
  }

  return (
    <div className="settings-section">
      <h2>Secrets Management</h2>
      <p className="small" style={{ marginBottom: '24px' }}>
        Manage API keys and environment variables. Values are encrypted and stored securely.
      </p>

      {/* Status Messages */}
      {saveStatus && (
        <div
          data-testid="secrets-save-status"
          style={{
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '6px',
            background: saveStatus.includes('Error') ? 'var(--err)' : 'var(--ok)',
            color: 'var(--accent-contrast)',
            fontWeight: '500'
          }}
        >
          {saveStatus}
        </div>
      )}
      {uploadStatus && (
        <div
          data-testid="secrets-upload-status"
          style={{
            padding: '12px',
            marginBottom: '16px',
            borderRadius: '6px',
            background: uploadStatus.includes('Error') || uploadStatus.includes('Failed') ? 'var(--err)' : 'var(--ok)',
            color: 'var(--accent-contrast)',
            fontWeight: '500'
          }}
        >
          {uploadStatus}
        </div>
      )}

      {/* API Keys */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>API Keys</h3>

        <div className="input-row">
          <div className="input-group">
            <label>OpenAI API Key</label>
            <input
              type="password"
              value={openaiKey}
              onChange={(e) => setOpenaiKey(e.target.value)}
              placeholder="sk-..."
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
            <label>Anthropic API Key</label>
            <input
              type="password"
              value={anthropicKey}
              onChange={(e) => setAnthropicKey(e.target.value)}
              placeholder="sk-ant-..."
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
            <label>Cohere API Key</label>
            <input
              type="password"
              value={cohereKey}
              onChange={(e) => setCohereKey(e.target.value)}
              placeholder="Cohere API key"
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
            <label>Voyage API Key</label>
            <input
              type="password"
              value={voyageKey}
              onChange={(e) => setVoyageKey(e.target.value)}
              placeholder="Voyage API key"
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
            <label>Jina API Key</label>
            <input
              type="password"
              value={jinaKey}
              onChange={(e) => setJinaKey(e.target.value)}
              placeholder="Jina API key"
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

        <button
          className="small-button"
          onClick={saveApiKeys}
          data-testid="save-api-keys-btn"
          style={{
            width: '100%',
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            fontWeight: '600',
            marginTop: '12px'
          }}
        >
          Save API Keys
        </button>
      </div>

      {/* Environment Variables */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px',
          marginBottom: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Environment Variables</h3>

        {/* Existing Variables */}
        {envVariables.length > 0 && (
          <div style={{ marginBottom: '16px' }}>
            {envVariables.map((item, index) => (
              <div
                key={index}
                style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '8px',
                  alignItems: 'center'
                }}
              >
                <input
                  type="text"
                  value={item.key}
                  onChange={(e) => updateEnvVariable(index, 'key', e.target.value)}
                  placeholder="KEY"
                  style={{
                    flex: '1',
                    padding: '8px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    color: 'var(--fg)',
                    fontFamily: 'monospace'
                  }}
                />
                <input
                  type="text"
                  value={item.value}
                  onChange={(e) => updateEnvVariable(index, 'value', e.target.value)}
                  placeholder="value"
                  style={{
                    flex: '2',
                    padding: '8px',
                    background: 'var(--input-bg)',
                    border: '1px solid var(--line)',
                    borderRadius: '4px',
                    color: 'var(--fg)',
                    fontFamily: 'monospace'
                  }}
                />
                <button
                  className="small-button"
                  onClick={() => removeEnvVariable(index)}
                  style={{
                    background: 'var(--err)',
                    color: 'var(--accent-contrast)',
                    padding: '8px 12px'
                  }}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add New Variable */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            value={newVarKey}
            onChange={(e) => setNewVarKey(e.target.value)}
            placeholder="KEY"
            style={{
              flex: '1',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)',
              fontFamily: 'monospace'
            }}
          />
          <input
            type="text"
            value={newVarValue}
            onChange={(e) => setNewVarValue(e.target.value)}
            placeholder="value"
            style={{
              flex: '2',
              padding: '8px',
              background: 'var(--input-bg)',
              border: '1px solid var(--line)',
              borderRadius: '4px',
              color: 'var(--fg)',
              fontFamily: 'monospace'
            }}
          />
          <button
            className="small-button"
            onClick={addEnvVariable}
            style={{
              background: 'var(--accent)',
              color: 'var(--accent-contrast)',
              fontWeight: '600',
              padding: '8px 12px'
            }}
          >
            Add Variable
          </button>
        </div>

        {envVariables.length > 0 && (
          <button
            className="small-button"
            onClick={saveEnvVariables}
            data-testid="save-env-vars-btn"
            style={{
              width: '100%',
              background: 'var(--link)',
              color: 'var(--accent-contrast)',
              fontWeight: '600'
            }}
          >
            Save Environment Variables
          </button>
        )}
      </div>

      {/* Import from .env File */}
      <div
        style={{
          background: 'var(--bg-elev2)',
          border: '1px solid var(--line)',
          borderRadius: '6px',
          padding: '20px'
        }}
      >
        <h3 style={{ marginTop: 0 }}>Import from .env File</h3>
        <p className="small" style={{ marginBottom: '16px' }}>
          Upload a .env file to import multiple environment variables at once.
        </p>

        <input
          type="file"
          accept=".env,.txt"
          onChange={handleFileUpload}
          data-testid="env-file-upload"
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
  );
}
