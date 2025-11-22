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
  finalK: number;
  frequencyPenalty: number;
  presencePenalty: number;
  streaming: boolean;
  showConfidence: boolean;
  showCitations: boolean;
  showTrace: boolean;
  autoSave: boolean;
}

const DEFAULT_CONFIG: ChatConfig = {
  systemPrompt: 'You are a helpful AI assistant that answers questions about codebases using RAG (Retrieval-Augmented Generation). Provide accurate, concise answers with citations.',
  model: 'gpt-4o-mini',
  temperature: 0,
  maxTokens: 1000,
  topP: 1,
  finalK: 10,
  frequencyPenalty: 0,
  presencePenalty: 0,
  streaming: true,
  showConfidence: false,
  showCitations: true,
  showTrace: false,
  autoSave: true
};

export function ChatSettings() {
  const { api } = useAPI();
  const [config, setConfig] = useState<ChatConfig>(DEFAULT_CONFIG);
  const [saving, setSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string>('');
  const [modelOptions, setModelOptions] = useState<string[]>([]);
  const broadcastConfig = (cfg: ChatConfig) => {
    window.dispatchEvent(new CustomEvent('agro-chat-config-updated', { detail: cfg }));
  };

  // Load config on mount
  useEffect(() => {
    loadConfig();
    loadModelOptions();
  }, []);

  const loadConfig = async () => {
    try {
      // Try to load from API
      const response = await fetch(api('chat/config'));
      if (response.ok) {
        const data = await response.json();
        // Normalize legacy topK -> finalK if present in stored config
        const normalized = { ...data };
        if (normalized.topK && !normalized.finalK) {
          normalized.finalK = normalized.topK;
          delete normalized.topK;
        }
        setConfig({ ...DEFAULT_CONFIG, ...normalized });
      } else {
        // Fall back to localStorage
        const saved = localStorage.getItem('agro-chat-config');
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed.topK && !parsed.finalK) { parsed.finalK = parsed.topK; delete parsed.topK; }
          setConfig({ ...DEFAULT_CONFIG, ...parsed });
        }
      }
    } catch (error) {
      console.error('[ChatSettings] Failed to load config:', error);
      // Try localStorage fallback
      const saved = localStorage.getItem('agro-chat-config');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed.topK && !parsed.finalK) { parsed.finalK = parsed.topK; delete parsed.topK; }
          setConfig({ ...DEFAULT_CONFIG, ...parsed });
        } catch {}
      }
    }
  };

  const loadModelOptions = async () => {
    try {
      const r = await fetch(api('/api/prices'));
      if (!r.ok) return;
      const d = await r.json();
      const list: string[] = (d.models || [])
        .filter((m: any) => {
          const comps = Array.isArray(m.components) ? m.components : [];
          const unit = String(m.unit || '').toLowerCase();
          return comps.includes('GEN') || unit === '1k_tokens' || unit === 'request';
        })
        .map((m: any) => String(m.model || '').trim())
        .filter(Boolean);
      const uniq = Array.from(new Set(list));
      // Put OpenAI/GPT family first for sanity; preserve others
      uniq.sort((a, b) => {
        const ao = a.toLowerCase().includes('gpt') ? 0 : 1;
        const bo = b.toLowerCase().includes('gpt') ? 0 : 1;
        return ao - bo || a.localeCompare(b);
      });
      setModelOptions(uniq);
    } catch (e) {
      // Silent fallback to text input
      console.debug('[ChatSettings] prices fetch failed:', e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveStatus('');

    try {
      // Save to API
      const response = await fetch(api('chat/config'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      });

      if (response.ok) {
        setSaveStatus('Settings saved successfully!');
        broadcastConfig(config);
      } else {
        throw new Error('API save failed');
      }
    } catch (error) {
      console.error('[ChatSettings] Failed to save to API, using localStorage:', error);
      // Fallback to localStorage
      localStorage.setItem('agro-chat-config', JSON.stringify(config));
      setSaveStatus('Settings saved locally');
      broadcastConfig(config);
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
      broadcastConfig(DEFAULT_CONFIG);
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
      await fetch(api('chat/templates'), {
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
          id="chat-system-prompt"
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
            {modelOptions.length > 0 ? (
              <select
                id="chat-model"
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
              >
                {modelOptions.map(m => (<option key={m} value={m}>{m}</option>))}
              </select>
            ) : (
              <input
                type="text"
                id="chat-model"
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
            )}
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
              id="chat-max-tokens"
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
            }} title="Final K: number of results to keep after fusion and reranking. Higher = broader context, more latency.">
              Final K (results)
            </label>
            <input
              type="number"
              id="chat-final-k"
              value={config.finalK}
              onChange={(e) => setConfig(prev => ({ ...prev, finalK: Math.max(1, parseInt(e.target.value) || 10) }))}
              min="1"
              max="200"
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
              Top-K (results)
            </label>
            <input
              type="number"
              id="chat-top-k"
              value={config.topK}
              onChange={(e) => setConfig(prev => ({ ...prev, topK: Math.max(1, parseInt(e.target.value) || DEFAULT_CONFIG.topK) }))}
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
              Temperature
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 90px', gap: '8px', alignItems: 'center' }}>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={config.temperature}
                onChange={(e) => setConfig(prev => ({ ...prev, temperature: parseFloat(e.target.value) }))}
                style={{ width: '100%' }}
                aria-label="Temperature"
              />
              <input
                id="chat-temperature"
                type="number"
                min={0}
                max={2}
                step={0.1}
                value={config.temperature}
                onChange={(e) => setConfig(prev => ({ ...prev, temperature: Math.max(0, Math.min(2, parseFloat(e.target.value) || 0)) }))}
                style={{
                  width: '100%',
                  background: 'var(--input-bg)',
                  border: '1px solid var(--line)',
                  color: 'var(--fg)',
                  padding: '8px 12px',
                  borderRadius: '4px',
                  fontSize: '13px'
                }}
                aria-label="Temperature input"
              />
            </div>
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

          {/* Duplicate Top-K removed; single control above with id=chat-top-k */}

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
          }} title="Stream tokens as they generate (requires streaming backend)">
            <input
              id="chat-streaming"
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
          }} title="Show retrieval trace steps beneath chat responses">
            <input
              id="chat-show-trace"
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
          }} title="Prefix answers with confidence when available">
            <input
              id="chat-show-confidence"
              type="checkbox"
              checked={config.showConfidence}
              onChange={(e) => setConfig(prev => ({ ...prev, showConfidence: e.target.checked }))}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            Show confidence score
            <span style={{ fontSize: '11px', color: 'var(--fg-muted)', marginLeft: 'auto' }}>
              (adds [Confidence: XX%] before answers)
            </span>
          </label>

          <label style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            fontSize: '13px'
          }} title="Toggle citations under each answer">
            <input
              id="chat-show-citations"
              type="checkbox"
              checked={config.showCitations}
              onChange={(e) => setConfig(prev => ({ ...prev, showCitations: e.target.checked }))}
              style={{ width: '16px', height: '16px', cursor: 'pointer' }}
            />
            Show citations
            <span style={{ fontSize: '11px', color: 'var(--fg-muted)', marginLeft: 'auto' }}>
              (file paths + line ranges)
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
          id="chat-reset-settings"
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
          id="chat-save-settings"
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
