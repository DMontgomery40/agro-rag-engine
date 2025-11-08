import { useState, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';

/**
 * Chat settings panel for configuring model, retrieval, and display options
 */
export default function ChatSettings() {
  const { settings, updateSettings, resetSettings, getStorageStats } = useChat();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const storageStats = getStorageStats();

  // Sync local settings with hook settings
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    updateSettings(localSettings);
    setSaveMessage({ type: 'success', text: 'Chat settings saved' });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleReset = () => {
    if (!confirm('Reset all chat settings to defaults?')) return;

    resetSettings();
    setLocalSettings(settings);
    setSaveMessage({ type: 'success', text: 'Chat settings reset to defaults' });
    setTimeout(() => setSaveMessage(null), 3000);
  };

  const handleChange = (key: keyof typeof localSettings, value: any) => {
    setLocalSettings(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="settings-section" style={{ borderLeft: '3px solid var(--warn)', marginTop: '16px' }}>
      <h3>
        <span className="accent-orange">●</span> Chat Settings
        <span className="tooltip-wrap">
          <span className="help-icon">?</span>
          <div className="tooltip-bubble">
            <span className="tt-title">Chat Configuration</span>
            These settings control how the RAG chat behaves. Chat is the main interface for querying your codebase, so tune these carefully for your use case.
            <div className="tt-badges">
              <span className="tt-badge info">Affects quality</span>
              <span className="tt-badge info">Affects latency</span>
            </div>
          </div>
        </span>
      </h3>

      <p className="small">
        Configure model, retrieval, and display options for chat. Settings persist in browser localStorage.
      </p>

      {/* Model Selection */}
      <div className="input-row">
        <div className="input-group">
          <label>
            Chat Model (GEN_MODEL_CHAT)
            <span className="tooltip-wrap">
              <span className="help-icon">?</span>
              <div className="tooltip-bubble">
                <span className="tt-title">Chat-Specific Model</span>
                Override generation model for chat interface. Falls back to GEN_MODEL if not set. Examples: gpt-4o-mini, gpt-4o, qwen3-coder:14b (local). Larger models = better quality + higher cost/latency.
                <div className="tt-badges">
                  <span className="tt-badge info">Affects cost</span>
                  <span className="tt-badge info">Affects latency</span>
                </div>
              </div>
            </span>
          </label>
          <input
            type="text"
            value={localSettings.model}
            onChange={(e) => handleChange('model', e.target.value)}
            placeholder="e.g., gpt-4o-mini (leave empty for default)"
          />
        </div>
        <div className="input-group">
          <label>
            Temperature
            <span className="tooltip-wrap">
              <span className="help-icon">?</span>
              <div className="tooltip-bubble">
                <span className="tt-title">Response Creativity</span>
                Controls randomness. 0.0 = deterministic/factual, 1.0 = creative/varied. For code Q&A, stay low (0.1-0.3). Higher temps good for brainstorming/docs.
              </div>
            </span>
          </label>
          <input
            type="number"
            value={localSettings.temperature}
            onChange={(e) => handleChange('temperature', parseFloat(e.target.value))}
            min="0"
            max="2"
            step="0.01"
          />
        </div>
      </div>

      <div className="input-row">
        <div className="input-group">
          <label>
            Max Response Tokens
            <span className="tooltip-wrap">
              <span className="help-icon">?</span>
              <div className="tooltip-bubble">
                <span className="tt-title">Response Length Limit</span>
                Maximum tokens in generated response. ~4 chars = 1 token. 500 tokens ≈ short answer, 2000 ≈ detailed explanation. Higher = more cost.
                <div className="tt-badges">
                  <span className="tt-badge info">Affects cost</span>
                </div>
              </div>
            </span>
          </label>
          <input
            type="number"
            value={localSettings.maxTokens}
            onChange={(e) => handleChange('maxTokens', parseInt(e.target.value))}
            min="100"
            max="4000"
            step="100"
          />
        </div>
        <div className="input-group">
          <label>
            Multi-Query Rewrites
            <span className="tooltip-wrap">
              <span className="help-icon">?</span>
              <div className="tooltip-bubble">
                <span className="tt-title">Query Expansion</span>
                Rewrite query N times for better recall. 1 = no expansion (fastest), 3-4 = good balance, 6+ = thorough but slower. Use higher for "Where is X?" questions.
                <div className="tt-badges">
                  <span className="tt-badge info">Affects latency</span>
                </div>
              </div>
            </span>
          </label>
          <input
            type="number"
            value={localSettings.multiQuery}
            onChange={(e) => handleChange('multiQuery', parseInt(e.target.value))}
            min="1"
            max="6"
          />
        </div>
      </div>

      <div className="input-row">
        <div className="input-group">
          <label>
            Retrieval Top-K
            <span className="tooltip-wrap">
              <span className="help-icon">?</span>
              <div className="tooltip-bubble">
                <span className="tt-title">Results to Retrieve</span>
                How many code chunks to retrieve and pass to the model. Top 5 chunks typically used for generation. Higher = more context but slower/costlier.
                <div className="tt-badges">
                  <span className="tt-badge info">Affects latency</span>
                  <span className="tt-badge info">Affects cost</span>
                </div>
              </div>
            </span>
          </label>
          <input
            type="number"
            value={localSettings.finalK}
            onChange={(e) => handleChange('finalK', parseInt(e.target.value))}
            min="5"
            max="50"
            step="5"
          />
        </div>
        <div className="input-group">
          <label>
            Confidence Threshold
            <span className="tooltip-wrap">
              <span className="help-icon">?</span>
              <div className="tooltip-bubble">
                <span className="tt-title">Answer Gate</span>
                Minimum confidence to return answer without fallback. 0.55-0.65 typical. Lower = more answers (might guess), higher = fewer answers (more "I don't know").
              </div>
            </span>
          </label>
          <input
            type="number"
            value={localSettings.confidence}
            onChange={(e) => handleChange('confidence', parseFloat(e.target.value))}
            min="0.3"
            max="0.9"
            step="0.05"
          />
        </div>
      </div>

      {/* Display Options */}
      <h4 style={{ margin: '24px 0 12px 0', fontSize: '14px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
        Display Options
      </h4>
      <div className="input-row">
        <div className="input-group">
          <label>
            Show Citations Inline
            <span className="tooltip-wrap">
              <span className="help-icon">?</span>
              <div className="tooltip-bubble">
                <span className="tt-title">Inline File References</span>
                Display file paths and line numbers inline with the answer. Citations become clickable links.
              </div>
            </span>
          </label>
          <select
            value={localSettings.showCitations ? '1' : '0'}
            onChange={(e) => handleChange('showCitations', e.target.value === '1')}
          >
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </div>
        <div className="input-group">
          <label>
            Show Confidence Score
            <span className="tooltip-wrap">
              <span className="help-icon">?</span>
              <div className="tooltip-bubble">
                <span className="tt-title">Retrieval Confidence</span>
                Display the retrieval confidence score (0-1) with each answer. Helps judge answer quality.
              </div>
            </span>
          </label>
          <select
            value={localSettings.showConfidence ? '1' : '0'}
            onChange={(e) => handleChange('showConfidence', e.target.value === '1')}
          >
            <option value="0">No</option>
            <option value="1">Yes</option>
          </select>
        </div>
      </div>

      <div className="input-row">
        <div className="input-group">
          <label>
            Auto-scroll to New Messages
            <span className="tooltip-wrap">
              <span className="help-icon">?</span>
              <div className="tooltip-bubble">
                <span className="tt-title">Scroll Behavior</span>
                Automatically scroll to bottom when new messages arrive.
              </div>
            </span>
          </label>
          <select
            value={localSettings.autoScroll ? '1' : '0'}
            onChange={(e) => handleChange('autoScroll', e.target.value === '1')}
          >
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </div>
        <div className="input-group">
          <label>
            Syntax Highlighting
            <span className="tooltip-wrap">
              <span className="help-icon">?</span>
              <div className="tooltip-bubble">
                <span className="tt-title">Code Block Highlighting</span>
                Apply syntax highlighting to code blocks in responses (future feature).
              </div>
            </span>
          </label>
          <select
            value={localSettings.syntaxHighlight ? '1' : '0'}
            onChange={(e) => handleChange('syntaxHighlight', e.target.value === '1')}
          >
            <option value="0">Basic</option>
            <option value="1">Full (WIP)</option>
          </select>
        </div>
      </div>

      {/* System Prompt */}
      <div className="input-group" style={{ marginTop: '16px' }}>
        <label>
          Custom System Prompt
          <span className="tooltip-wrap">
            <span className="help-icon">?</span>
            <div className="tooltip-bubble">
              <span className="tt-title">System Instructions</span>
              Override default system prompt. Leave empty to use expert prompt (plugin development + AGRO RAG specialist). Use to change tone, add rules, etc.
            </div>
          </span>
        </label>
        <textarea
          value={localSettings.systemPrompt}
          onChange={(e) => handleChange('systemPrompt', e.target.value)}
          placeholder="Leave empty for expert system prompt (plugin dev + AGRO RAG expert)"
          style={{ minHeight: '80px' }}
        />
      </div>

      {/* History Settings */}
      <div className="settings-subsection" style={{ marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--line)' }}>
        <h4 style={{ color: 'var(--accent)', fontSize: '13px', marginBottom: '12px' }}>
          💾 History Settings
          <span className="tooltip-wrap">
            <span className="help-icon">?</span>
            <div className="tooltip-bubble">
              <span className="tt-title">Chat History Storage</span>
              Control how chat history is stored and loaded. History is saved in browser localStorage for persistence across sessions.
              <div className="tt-badges">
                <span className="tt-badge info">Browser storage</span>
                <span className="tt-badge info">Privacy: stays local</span>
              </div>
            </div>
          </span>
        </h4>

        <div className="input-row">
          <div className="input-group">
            <label>
              Enable History
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Save Chat Messages</span>
                  When enabled, all chat messages are saved to browser localStorage for later retrieval.
                </div>
              </span>
            </label>
            <select
              value={localSettings.historyEnabled ? '1' : '0'}
              onChange={(e) => handleChange('historyEnabled', e.target.value === '1')}
            >
              <option value="1">Enabled</option>
              <option value="0">Disabled</option>
            </select>
          </div>
          <div className="input-group">
            <label>
              History Limit
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Maximum Messages</span>
                  Maximum number of messages to keep in history. Older messages are automatically removed when limit is reached. Range: 1-1000 messages.
                </div>
              </span>
            </label>
            <input
              type="number"
              value={localSettings.historyLimit}
              onChange={(e) => handleChange('historyLimit', Math.min(1000, Math.max(1, parseInt(e.target.value) || 100)))}
              min="1"
              max="1000"
              step="10"
            />
          </div>
        </div>

        <div className="input-row">
          <div className="input-group">
            <label>
              Load on Startup
              <span className="tooltip-wrap">
                <span className="help-icon">?</span>
                <div className="tooltip-bubble">
                  <span className="tt-title">Auto-Load History</span>
                  Automatically display previous conversation history when opening the chat tab.
                </div>
              </span>
            </label>
            <select
              value={localSettings.showHistoryOnLoad ? '1' : '0'}
              onChange={(e) => handleChange('showHistoryOnLoad', e.target.value === '1')}
            >
              <option value="1">Yes</option>
              <option value="0">No</option>
            </select>
          </div>
          <div className="input-group">
            <label>Storage Usage</label>
            <div
              style={{
                background: 'var(--card-bg)',
                border: '1px solid var(--line)',
                color: 'var(--fg-muted)',
                padding: '9px 12px',
                borderRadius: '4px',
                fontSize: '13px',
                fontFamily: "'SF Mono', monospace"
              }}
            >
              {storageStats.messageCount} messages ({storageStats.sizeKB}KB)
            </div>
          </div>
        </div>
      </div>

      {/* Save/Reset Buttons */}
      <div style={{ marginTop: '16px', display: 'flex', gap: '8px' }}>
        <button
          onClick={handleSave}
          className="small-button"
          style={{ background: 'var(--accent)', color: 'var(--accent-contrast)' }}
        >
          Save Settings
        </button>
        <button
          onClick={handleReset}
          className="small-button"
          style={{ background: 'var(--bg-elev2)', color: 'var(--err)', border: '1px solid var(--err)' }}
        >
          Reset to Defaults
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
