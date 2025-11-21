// AGRO - Chat Settings Component
// Configuration for chat model, behavior, and display options

import { useState, useEffect } from 'react';
import { useAPI } from '@/hooks';

interface ChatConfig {
  systemPrompt: string;
  model: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  topK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  streaming: boolean;
  showTrace: boolean;
  autoSave: boolean;
}

const DEFAULT_CONFIG: ChatConfig = {
  systemPrompt: 'You are a helpful AI assistant that answers questions about codebases using RAG (Retrieval-Augmented Generation). Provide accurate, concise answers with citations.',
  model: 'gpt-4o-mini',
  temperature: 0,
  maxTokens: 1000,
  topP: 1,
  topK: 50,
  frequencyPenalty: 0,
  presencePenalty: 0,
  streaming: true,
  showTrace: false,
  autoSave: true
};

export function ChatSettings() {
  const { api } = useAPI();
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');

  // Load config on mount
  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      // Try to load from API
      const response = await fetch(api('/chat/config'));
      if (response.ok) {
        const data = await response.json();
        setConfig({ ...DEFAULT_CONFIG, ...data });
      } else {
        // Fall back to localStorage
        const saved = localStorage.getItem('agro-chat-config');
        if (saved) {
          setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
        }
      }
    } catch (error) {
      console.error('[ChatSettings] Failed to load config:', error);
      // Try localStorage fallback
      const saved = localStorage.getItem('agro-chat-config');
      if (saved) {
        try {
          setConfig({ ...DEFAULT_CONFIG, ...JSON.parse(saved) });
        } catch {}
      }
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('');

    try {
      // Save to API
      const response = await fetch(api('/chat/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setSaveStatus('Settings saved successfully!');
      } else {
        throw new Error('API save failed');
      }
    } catch (error) {
      console.error('[ChatSettings] Failed to save to API, using localStorage:', error);
      // Fallback to localStorage
      localStorage.setItem('agro-chat-config', JSON.stringify(config));
      setSaveStatus('Settings saved locally');
    } finally {
      setSaving(false);
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleReset = () => {
    if (confirm('Reset all chat settings to defaults?')) {
      setConfig(DEFAULT_CONFIG);
      localStorage.removeItem('agro-chat-config');
      setSaveStatus('Settings reset to defaults');
      setTimeout(() => setSaveStatus(''), 3000);
    }
  };

  const handleUseDefault = () => {
    setConfig(prev => ({ ...prev, systemPrompt: DEFAULT_CONFIG.systemPrompt }));
  };

  const handleSaveAsTemplate = async () => {
    const templateName = prompt('Enter template name:');
    if (!templateName) return;

    try {
      await fetch(api('/chat/templates'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: templateName,
          prompt: config.systemPrompt
        })
      });
      alert(`Template "${templateName}" saved!`);
    } catch (error) {
      console.error('[ChatSettings] Failed to save template:', error);
      alert('Failed to save template');
    }
  };

  return (
    <div style={{
      maxWidth: '900px',
      margin: '0 auto',
      padding: '24px'
    }}>
      <h2 style={{
        margin: '0 0 24px 0',
        fontSize: '20px',
        fontWeight: '600',
        color: 'var(--fg)'
      }}>
        Chat Settings
      </h2>

      {/* System Prompt Section */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--line)',
        borderRadius: '6px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--fg)'
        }}>
          System Prompt
        </h3>

        <textarea
          value={config.systemPrompt}
          onChange={(e) => setConfig(prev => ({ ...prev, systemPrompt: e.target.value }))}
          style={{
            width: '100%',
            background: 'var(--input-bg)',
            border: '1px solid var(--line)',
            color: 'var(--fg)',
            padding: '12px',
            borderRadius: '4px',
            fontSize: '13px',
            fontFamily: 'inherit',
            resize: 'vertical',
            minHeight: '120px',
            marginBottom: '12px'
          }}
          placeholder="Enter system prompt..."
          aria-label="System prompt"
        />

        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleUseDefault}
            style={{
              background: 'var(--bg-elev2)',
              color: 'var(--fg)',
              border: '1px solid var(--line)',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Use Default
          </button>
          <button
            onClick={handleSaveAsTemplate}
            style={{
              background: 'var(--bg-elev2)',
              color: 'var(--accent)',
              border: '1px solid var(--accent)',
              padding: '8px 16px',
              borderRadius: '4px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Save as Template
          </button>
        </div>
      </div>

      {/* Model Configuration */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--line)',
        borderRadius: '6px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--fg)'
        }}>
          Model Configuration
        </h3>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--fg-muted)',
              marginBottom: '6px'
            }}>
              Model
            </label>
            <input
              type="text"
              value={config.model}
              onChange={(e) => setConfig(prev => ({ ...prev, model: e.target.value }))}
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '13px'
              }}
              placeholder="gpt-4o-mini"
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--fg-muted)',
              marginBottom: '6px'
            }}>
              Max Tokens (1-32000)
            </label>
            <input
              type="number"
              value={config.maxTokens}
              onChange={(e) => setConfig(prev => ({ ...prev, maxTokens: parseInt(e.target.value) || 1000 }))}
              min="1"
              max="32000"
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--fg-muted)',
              marginBottom: '6px'
            }}>
              Temperature: {config.temperature.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="2"
              step="0.1"
              value={config.temperature}
              onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
              style={{ width: '100%' }}
            />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--fg-muted)' }}>
              <span>Focused</span>
              <span>Creative</span>
            </div>
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--fg-muted)',
              marginBottom: '6px'
            }}>
              Top-p: {config.topP.toFixed(2)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={config.topP}
              onChange={(e) => setConfig(prev => ({ ...prev, topP: parseFloat(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--fg-muted)',
              marginBottom: '6px'
            }}>
              Top-k
            </label>
            <input
              type="number"
              value={config.topK}
              onChange={(e) => setConfig(prev => ({ ...prev, topK: parseInt(e.target.value) || 50 }))}
              min="1"
              max="100"
              style={{
                width: '100%',
                background: 'var(--input-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg)',
                padding: '8px 12px',
                borderRadius: '4px',
                fontSize: '13px'
              }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--fg-muted)',
              marginBottom: '6px'
            }}>
              Frequency Penalty: {config.frequencyPenalty.toFixed(1)}
            </label>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={config.frequencyPenalty}
              onChange={(e) => setConfig(prev => ({ ...prev, frequencyPenalty: parseFloat(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: 'var(--fg-muted)',
              marginBottom: '6px'
            }}>
              Presence Penalty: {config.presencePenalty.toFixed(1)}
            </label>
            <input
              type="range"
              min="-2"
              max="2"
              step="0.1"
              value={config.presencePenalty}
              onChange={(e) => setConfig(prev => ({ ...prev, presencePenalty: parseFloat(e.target.value) }))}
              style={{ width: '100%' }}
            />
          </div>
        </div>
      </div>

      {/* Chat Behavior */}
      <div style={{
        background: 'var(--card-bg)',
        border: '1px solid var(--line)',
        borderRadius: '6px',
        padding: '20px',
        marginBottom: '24px'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '16px',
          fontWeight: '600',
          color: 'var(--fg)'
        }}>
          Chat Behavior
        </h3>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '13px'
          }}>
            <input
              type="checkbox"
              checked={config.streaming}
              onChange={(e) => setConfig(prev => ({ ...prev, streaming: e.target.checked }))}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            Enable streaming responses
            <span style={{ fontSize: '11px', color: 'var(--fg-muted)', marginLeft: 'auto' }}>
              (shows responses as they generate)
            </span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '13px'
          }}>
            <input
              type="checkbox"
              checked={config.showTrace}
              onChange={(e) => setConfig(prev => ({ ...prev, showTrace: e.target.checked }))}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            Show routing trace
            <span style={{ fontSize: '11px', color: 'var(--fg-muted)', marginLeft: 'auto' }}>
              (displays retrieval steps)
            </span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '13px'
          }}>
            <input
              type="checkbox"
              checked={config.autoSave}
              onChange={(e) => setConfig(prev => ({ ...prev, autoSave: e.target.checked }))}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            Auto-save conversations
            <span style={{ fontSize: '11px', color: 'var(--fg-muted)', marginLeft: 'auto' }}>
              (saves to browser storage)
            </span>
          </label>
        </div>
      </div>

      {/* Action Buttons */}
      <div style={{
        display: 'flex',
        gap: '12px',
        justifyContent: 'flex-end'
      }}>
        <button
          onClick={handleReset}
          style={{
            background: 'var(--bg-elev2)',
            color: 'var(--err)',
            border: '1px solid var(--err)',
            padding: '10px 20px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer'
          }}
        >
          Reset to Defaults
        </button>

        <button
          onClick={handleSave}
          disabled={saving}
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-contrast)',
            border: 'none',
            padding: '10px 20px',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: saving ? 'wait' : 'pointer',
            opacity: saving ? 0.7 : 1
          }}
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
      </div>

      {saveStatus && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          background: 'var(--success)',
          color: 'white',
          borderRadius: '6px',
          fontSize: '13px',
          textAlign: 'center'
        }}>
          {saveStatus}
        </div>
      )}
    </div>
  );
}
