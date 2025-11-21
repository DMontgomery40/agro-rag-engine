import { useEffect, useState } from 'react';
import { ChatSubtabs } from '@/components/Chat/ChatSubtabs';

// Chat tab with subtabs for UI and Settings
export default function ChatTab() {
  const [activeSubtab, setActiveSubtab] = useState('ui');

  // Notify legacy module to (re)bind events when this view mounts or switches back to UI
  useEffect(() => {
    // Fire a mount event for modules listening
    window.dispatchEvent(new Event('agro:chat:mount'));
    // Also try direct init if exposed
    try { (window as any).ChatUI?.init?.(); } catch {}
  }, []);

  useEffect(() => {
    try { (window as any).ChatUI?.init?.(); } catch {}
  }, [activeSubtab]);

  const uiContent = `
                    <div class="settings-section" style="border-left: 3px solid var(--link); padding: 0;">
                        <div style="display: flex; flex-direction: column; height: 70vh;">
                        <!-- Chat Header -->
                        <div style="padding: 16px; border-bottom: 1px solid var(--line); display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <h3 style="margin: 0 0 4px 0;"><span class="accent-blue">●</span> RAG Chat</h3>
                                <p class="small" style="margin: 0; color: var(--fg-muted);">Ask questions about your codebase</p>
                            </div>
                            <div style="display: flex; gap: 8px; align-items: center;">
                                <select id="chat-repo-select" style="background: var(--card-bg); border: 1px solid var(--line); color: var(--fg); padding: 6px 12px; border-radius: 4px; font-size: 12px;">
                                    <option value="">Auto-detect repo</option>
                                    <option value="agro">agro</option>
                                    <option value=""></option>
                                </select>

                                <!-- History Button with Dropdown -->
                                <div style="position: relative;">
                                    <button id="chat-history" style="background: var(--bg-elev2); color: var(--accent); border: 1px solid var(--accent); padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer; display: flex; align-items: center; gap: 4px;">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        History
                                    </button>
                                    <div id="history-dropdown" style="display: none; position: absolute; top: 100%; right: 0; margin-top: 4px; background: var(--card-bg); border: 1px solid var(--line); border-radius: 6px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); z-index: 1000; min-width: 180px;">
                                        <button id="chat-export-history" style="display: block; width: 100%; text-align: left; background: none; border: none; color: var(--fg); padding: 8px 12px; font-size: 12px; cursor: pointer; transition: background 0.2s;">
                                            📥 Export History
                                        </button>
                                        <div style="height: 1px; background: var(--line);"></div>
                                        <button id="chat-clear-history" style="display: block; width: 100%; text-align: left; background: none; border: none; color: var(--err); padding: 8px 12px; font-size: 12px; cursor: pointer; transition: background 0.2s;">
                                            🗑️ Clear History
                                        </button>
                                    </div>
                                </div>

                                <button id="chat-clear" style="background: var(--bg-elev2); color: var(--err); border: 1px solid var(--err); padding: 6px 12px; border-radius: 4px; font-size: 12px; cursor: pointer">Clear</button>
                            </div>
                        </div>

                        <!-- Chat Messages -->
                        <div id="chat-messages" style="flex: 1; overflow-y: auto; padding: 16px; background: var(--card-bg);">
                            <div style="text-align: center; color: var(--fg-muted); padding: 40px 20px;">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="opacity: 0.3; margin-bottom: 12px;">
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                <div>Start a conversation with your codebase</div>
                                <div style="font-size: 11px; margin-top: 8px;">Try: "Where is OAuth token validated?" or "How do we handle API errors?"</div>
                            </div>
                        </div>

                        <!-- Chat Input -->
                        <div style="padding: 16px; border-top: 1px solid var(--line); background: var(--code-bg);">
                            <div style="display: flex; gap: 8px;">
                                <textarea
                                    id="chat-input"
                                    placeholder="Ask a question about your codebase..."
                                    style="flex: 1; background: var(--card-bg); border: 1px solid var(--line); color: var(--fg); padding: 12px; border-radius: 6px; font-size: 14px; font-family: inherit; resize: none; min-height: 60px; max-height: 120px;"
                                    rows="2"
                                ></textarea>
                                <button
                                    id="chat-send"
                                    style="background: var(--accent); color: var(--accent-contrast); border: none; padding: 12px 24px; border-radius: 6px; font-size: 14px; font-weight: 600; cursor: pointer; height: fit-content; align-self: flex-end;"
                                >Send</button>
                            </div>
                            <div style="font-size: 11px; color: var(--fg-muted); margin-top: 8px;">
                                Press Ctrl+Enter to send • Citations will appear as clickable file links
                            </div>
                            <details id="chat-trace" style="margin-top:8px;">
                                <summary style="cursor:pointer;">Routing Trace</summary>
                                <div id="chat-trace-output" class="result-display" style="min-height:120px;white-space:pre-wrap;margin-top:8px;"></div>
                            </details>
                        </div>
                    </div>
                </div>
  `;

  const settingsContent = `
                    <div class="settings-section" style="border-left: 3px solid var(--warn); margin-top: 16px;">
                        <h3>
                            <span class="accent-orange">●</span> Chat Settings
                            <span class="tooltip-wrap">
                                <span class="help-icon">?</span>
                                <div class="tooltip-bubble">
                                    <span class="tt-title">Chat Configuration</span>
                                    These settings control how the RAG chat behaves. Chat is the main interface for querying your codebase, so tune these carefully for your use case.
                                    <div class="tt-badges">
                                        <span class="tt-badge info">Affects quality</span>
                                        <span class="tt-badge info">Affects latency</span>
                                    </div>
                                </div>
                            </span>
                        </h3>
                        <div id="chat-settings-content">
                            <p class="small">Configure model, retrieval, and display options for chat. Settings persist in browser localStorage.</p>
                            <!-- Model Selection -->
                            <div class="input-row">
                                <div class="input-group">
                                    <label>
                                        Chat Model (GEN_MODEL_CHAT)
                                        <span class="tooltip-wrap">
                                            <span class="help-icon">?</span>
                                            <div class="tooltip-bubble">
                                                <span class="tt-title">Chat-Specific Model</span>
                                                Override generation model for chat interface. Falls back to GEN_MODEL if not set. Examples: gpt-4o-mini, gpt-4o, qwen3-coder:14b (local). Larger models = better quality + higher cost/latency.
                                                <div class="tt-badges">
                                                    <span class="tt-badge info">Affects cost</span>
                                                    <span class="tt-badge info">Affects latency</span>
                                                </div>
                                            </div>
                                        </span>
                                    </label>
                                    <input type="text" id="chat-model" placeholder="e.g., gpt-4o-mini (leave empty for default)" />
                                </div>
                                <div class="input-group">
                                    <label>
                                        Temperature
                                        <span class="tooltip-wrap">
                                            <span class="help-icon">?</span>
                                            <div class="tooltip-bubble">
                                                <span class="tt-title">Randomness</span>
                                                Controls randomness in generation. Lower = more deterministic, higher = more creative. Typical range 0.0–1.0.
                                            </div>
                                        </span>
                                    </label>
                                    <input type="number" id="chat-temperature" value="0.0" min="0" max="2" step="0.01" />
                                </div>
                                <div class="input-group">
                                    <label>Max Tokens</label>
                                    <input type="number" id="chat-max-tokens" value="1000" min="100" max="4000" step="100" />
                                </div>
                            </div>
                            <!-- Retrieval & Reranking -->
                            <h4 style="margin: 24px 0 12px 0; font-size: 14px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px;">Retrieval & Reranking</h4>
                            <div class="input-row">
                                <div class="input-group">
                                    <label>Multi-Query Rewrites</label>
                                    <input type="number" id="chat-multi-query" value="3" min="1" max="6" />
                                </div>
                                <div class="input-group">
                                    <label>Final K</label>
                                    <input type="number" id="chat-final-k" value="20" min="5" max="50" step="5" />
                                </div>
                                <div class="input-group">
                                    <label>Confidence Threshold</label>
                                    <input type="number" id="chat-confidence" value="0.55" min="0.3" max="0.9" step="0.05" />
                                </div>
                            </div>
                            <!-- Display Options -->
                            <h4 style="margin: 24px 0 12px 0; font-size: 14px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px;">Display Options</h4>
                            <div class="input-row">
                                <div class="input-group">
                                    <label>Show Citations Inline</label>
                                    <select id="chat-show-citations"><option value="1">Yes</option><option value="0">No</option></select>
                                </div>
                                <div class="input-group">
                                    <label>Show Confidence Score</label>
                                    <select id="chat-show-confidence"><option value="0">No</option><option value="1">Yes</option></select>
                                </div>
                            </div>
                            <div class="input-row">
                                <div class="input-group">
                                    <label>Auto-scroll to New Messages</label>
                                    <select id="chat-auto-scroll"><option value="1">Yes</option><option value="0">No</option></select>
                                </div>
                                <div class="input-group">
                                    <label>Syntax Highlighting</label>
                                    <select id="chat-syntax-highlight"><option value="1">Yes</option><option value="0">No</option></select>
                                </div>
                            </div>
                            <!-- History Management -->
                            <h4 style="margin: 24px 0 12px 0; font-size: 14px; color: var(--fg-muted); text-transform: uppercase; letter-spacing: 0.5px;">History</h4>
                            <div class="input-row">
                                <div class="input-group">
                                    <label>Enable History</label>
                                    <select id="chat-history-enabled"><option value="1">Yes</option><option value="0">No</option></select>
                                </div>
                                <div class="input-group">
                                    <label>History Limit</label>
                                    <input type="number" id="chat-history-limit" value="100" min="1" max="1000" step="10" />
                                </div>
                                <div class="input-group">
                                    <label>Load on Startup</label>
                                    <select id="chat-show-history-on-load"><option value="1">Yes</option><option value="0">No</option></select>
                                </div>
                                <div class="input-group">
                                    <label>Storage Usage</label>
                                    <div style="background: var(--card-bg); border: 1px solid var(--line); color: var(--fg-muted); padding: 9px 12px; border-radius: 4px; font-size: 13px; font-family: 'SF Mono', monospace;">
                                        <span id="chat-storage-display">Calculating...</span>
                                    </div>
                                </div>
                            </div>
                            <div style="margin-top: 16px; display: flex; gap: 8px;">
                                <button id="chat-save-settings" class="small-button" style="background: var(--accent); color: var(--accent-contrast);">Save Settings</button>
                                <button id="chat-reset-settings" class="small-button" style="background: var(--bg-elev2); color: var(--err); border: 1px solid var(--err);">Reset to Defaults</button>
                            </div>
                        </div>
                    </div>
  `;

  return (
    <div id="tab-chat" className="tab-content active">
      <ChatSubtabs activeSubtab={activeSubtab} onSubtabChange={setActiveSubtab} />

      <div
        id="tab-chat-ui"
        className={`section-subtab ${activeSubtab === 'ui' ? 'active' : ''}`}
        dangerouslySetInnerHTML={{ __html: uiContent }}
      />

      <div
        id="tab-chat-settings"
        className={`section-subtab ${activeSubtab === 'settings' ? 'active' : ''}`}
        dangerouslySetInnerHTML={{ __html: settingsContent }}
      />
    </div>
  );
}
