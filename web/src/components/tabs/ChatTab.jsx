export default function ChatTab() {
  return (
    <>
                <div id="tab-chat-ui" className="section-subtab active">
                    <div className="settings-section" style={{borderLeft: '3px solid var(--link)', padding: '0'}}>
                        <div style={{display: 'flex', flexDirection: 'column', height: '70vh'}}>
                        {/* Chat Header */}
                        <div style={{padding: '16px', borderBottom: '1px solid var(--line)', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                            <div>
                                <h3 style={{margin: '0 0 4px 0'}}><span className="accent-blue">●</span> RAG Chat</h3>
                                <p className="small" style={{margin: '0', color: 'var(--fg-muted)'}}>Ask questions about your codebase</p>
                            </div>
                            <div style={{display: 'flex', gap: '8px', alignItems: 'center'}}>
                                <select id="chat-repo-select" style={{background: 'var(--card-bg)', border: '1px solid var(--line)', color: 'var(--fg)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px'}}>
                                    <option value="">Auto-detect repo</option>
                                    <option value="agro">agro</option>
                                    <option value=""></option>
                                </select>

                                {/* History Button with Dropdown */}
                                <div style={{position: 'relative'}}>
                                    <button id="chat-history" style={{background: 'var(--bg-elev2)', color: 'var(--accent)', border: '1px solid var(--accent)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'}}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                            <circle cx="12" cy="12" r="10"></circle>
                                            <polyline points="12 6 12 12 16 14"></polyline>
                                        </svg>
                                        History
                                    </button>
                                    <div id="history-dropdown" style={{display: 'none', position: 'absolute', top: '100%', right: '0', marginTop: '4px', background: 'var(--card-bg)', border: '1px solid var(--line)', borderRadius: '6px', boxShadow: '0 4px 12px rgba(0,0,0,0.15)', zIndex: '1000', minWidth: '180px'}}>
                                        <button id="chat-export-history" style={{display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'var(--fg)', padding: '8px 12px', fontSize: '12px', cursor: 'pointer', transition: 'background 0.2s'}}>
                                            📥 Export History
                                        </button>
                                        <div style={{height: '1px', background: 'var(--line)'}}></div>
                                        <button id="chat-clear-history" style={{display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', color: 'var(--err)', padding: '8px 12px', fontSize: '12px', cursor: 'pointer', transition: 'background 0.2s'}}>
                                            🗑️ Clear History
                                        </button>
                                    </div>
                                </div>

                                <button id="chat-clear" style={{background: 'var(--bg-elev2)', color: 'var(--err)', border: '1px solid var(--err)', padding: '6px 12px', borderRadius: '4px', fontSize: '12px', cursor: 'pointer'}}>Clear</button>
                            </div>
                        </div>

                        {/* Chat Messages */}
                        <div id="chat-messages" style={{flex: '1', overflowY: 'auto', padding: '16px', background: 'var(--card-bg)'}}>
                            <div style={{textAlign: 'center', color: 'var(--fg-muted)', padding: '40px 20px'}}>
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" style={{opacity: '0.3', marginBottom: '12px'}}>
                                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path>
                                </svg>
                                <div>Start a conversation with your codebase</div>
                                <div style={{fontSize: '11px', marginTop: '8px'}}>Try: "Where is OAuth token validated?" or "How do we handle API errors?"</div>
                            </div>
                        </div>

                        {/* Chat Input */}
                        <div style={{padding: '16px', borderTop: '1px solid var(--line)', background: 'var(--code-bg)'}}>
                            <div style={{display: 'flex', gap: '8px'}}>
                                <textarea
                                    id="chat-input"
                                    placeholder="Ask a question about your codebase..."
                                    style={{flex: '1', background: 'var(--card-bg)', border: '1px solid var(--line)', color: 'var(--fg)', padding: '12px', borderRadius: '6px', fontSize: '14px', fontFamily: 'inherit', resize: 'none', minHeight: '60px', maxHeight: '120px'}}
                                    rows="2"
                                ></textarea>
                                <button
                                    id="chat-send"
                                    style={{background: 'var(--accent)', color: 'var(--accent-contrast)', border: 'none', padding: '12px 24px', borderRadius: '6px', fontSize: '14px', fontWeight: '600', cursor: 'pointer', height: 'fit-content', alignSelf: 'flex-end'}}
                                >Send</button>
                            </div>
                            <div style={{fontSize: '11px', color: 'var(--fg-muted)', marginTop: '8px'}}>
                                Press Ctrl+Enter to send • Citations will appear as clickable file links
                            </div>
                            <details id="chat-trace" style={{marginTop: '8px'}}>
                                <summary style={{cursor: 'pointer'}}>Routing Trace</summary>
                                <div id="chat-trace-output" className="result-display" style={{minHeight: '120px', whiteSpace: 'pre-wrap', marginTop: '8px'}}></div>
                            </details>
                        </div>
                    </div>
                </div>
                </div>

                {/* Chat Settings */}
                <div id="tab-chat-settings" className="section-subtab">
                <div className="settings-section" style={{borderLeft: '3px solid var(--warn)', marginTop: '16px'}}>
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
                    <div id="chat-settings-content">
                    <p className="small">Configure model, retrieval, and display options for chat. Settings persist in browser localStorage.</p>

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
                            <input type="text" id="chat-model" placeholder="e.g., gpt-4o-mini (leave empty for default)" />
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
                            <input type="number" id="chat-temperature" value="0.0" min="0" max="2" step="0.01" />
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
                            <input type="number" id="chat-max-tokens" value="1000" min="100" max="4000" step="100" />
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
                            <input type="number" id="chat-multi-query" value="3" min="1" max="6" />
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
                            <input type="number" id="chat-final-k" value="20" min="5" max="50" step="5" />
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
                            <input type="number" id="chat-confidence" value="0.55" min="0.3" max="0.9" step="0.05" />
                        </div>
                    </div>

                    {/* Display Options */}
                    <h4 style={{margin: '24px 0 12px 0', fontSize: '14px', color: 'var(--fg-muted)', textTransform: 'uppercase', letterSpacing: '0.5px'}}>Display Options</h4>
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
                            <select id="chat-show-citations">
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
                            <select id="chat-show-confidence">
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
                            <select id="chat-auto-scroll">
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
                            <select id="chat-syntax-highlight">
                                <option value="0">Basic</option>
                                <option value="1">Full (WIP)</option>
                            </select>
                        </div>
                    </div>

                    {/* System Prompt */}
                    <div className="input-group" style={{marginTop: '16px'}}>
                        <label>
                            Custom System Prompt
                            <span className="tooltip-wrap">
                                <span className="help-icon">?</span>
                                <div className="tooltip-bubble">
                                    <span className="tt-title">System Instructions</span>
                                    Override default system prompt. Leave empty to use expert prompt ( plugin development + AGRO RAG specialist). Use to change tone, add rules, etc.
                                </div>
                            </span>
                        </label>
                        <textarea id="chat-system-prompt" placeholder="Leave empty for expert system prompt ( plugin dev + AGRO RAG expert)" style={{minHeight: '80px'}}></textarea>
                    </div>

                    {/* History Settings Section */}
                    <div className="settings-subsection" style={{marginTop: '20px', paddingTop: '20px', borderTop: '1px solid var(--line)'}}>
                        <h4 style={{color: 'var(--accent)', fontSize: '13px', marginBottom: '12px'}}>
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
                                <select id="chat-history-enabled">
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
                                <input type="number" id="chat-history-limit" value="100" min="1" max="1000" step="10" />
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
                                <select id="chat-show-history-on-load">
                                    <option value="1">Yes</option>
                                    <option value="0">No</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Storage Usage</label>
                                <div style={{background: 'var(--card-bg)', border: '1px solid var(--line)', color: 'var(--fg-muted)', padding: '9px 12px', borderRadius: '4px', fontSize: '13px', fontFamily: "'SF Mono', monospace"}}>
                                    <span id="chat-storage-display">Calculating...</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div style={{marginTop: '16px', display: 'flex', gap: '8px'}}>
                        <button id="chat-save-settings" className="small-button" style={{background: 'var(--accent)', color: 'var(--accent-contrast)'}}>Save Settings</button>
                        <button id="chat-reset-settings" className="small-button" style={{background: 'var(--bg-elev2)', color: 'var(--err)', border: '1px solid var(--err)'}}>Reset to Defaults</button>
                    </div>
                    </div>
                </div>
                </div>
    </>
  )
}
