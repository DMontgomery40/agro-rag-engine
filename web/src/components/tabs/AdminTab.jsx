export default function AdminTab() {
  return (
    <>
                {/* Theme & Appearance (from settings-general) */}
                <div className="settings-section">
                    <h3>Theme & Appearance</h3>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Theme Mode</label>
                            <select name="THEME_MODE" id="misc-theme-mode">
                                <option value="auto">Auto (System)</option>
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                            </select>
                            <p className="small">Controls light/dark theme globally. Top bar selector changes it live.</p>
                        </div>
                    </div>
                </div>

                {/* Server Settings (from settings-general) */}
                <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                    <h3>Server Settings</h3>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Edition (AGRO_EDITION)</label>
                            <input type="text" name="AGRO_EDITION" placeholder="oss | pro | enterprise" />
                        </div>
                        <div className="input-group">
                            <label>Thread ID</label>
                            <input type="text" name="THREAD_ID" placeholder="http or cli-chat" />
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Serve Host</label>
                            <input type="text" name="HOST" value="127.0.0.1" />
                        </div>
                        <div className="input-group">
                            <label>Serve Port</label>
                            <input type="number" name="PORT" value="8012" />
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Open Browser on Start</label>
                            <select name="OPEN_BROWSER">
                                <option value="1">On</option>
                                <option value="0">Off</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label>agro Path</label>
                            <input type="text" name="agro_PATH" />
                        </div>
                    </div>
                    
                    <div className="input-row">
                        <div className="input-group">
                            <label>Netlify API Key</label>
                            <input type="password" name="NETLIFY_API_KEY" />
                        </div>
                        <div className="input-group">
                            <label>Netlify Domains</label>
                            <input type="text" name="NETLIFY_DOMAINS" />
                        </div>
                    </div>
                </div>

                {/* Embedded Editor Settings (from settings-general) */}
                <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                    <h3 id="admin-editor-settings-anchor"><span className="accent-blue">●</span> Embedded Editor</h3>
                    <div className="input-row">
                        <div className="input-group">
                            <label><input type="checkbox" name="EDITOR_ENABLED" value="1" /> Enable Embedded Editor</label>
                            <p className="small">Start OpenVSCode Server container on up.sh</p>
                        </div>
                        <div className="input-group">
                            <label><input type="checkbox" name="EDITOR_EMBED_ENABLED" value="1" checked /> Enable Editor Embed (iframe)</label>
                            <p className="small">Show the editor inline in the GUI (hides automatically in CI)</p>
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Editor Port</label>
                            <input type="number" name="EDITOR_PORT" value="4440" min="1024" max="65535" />
                            <p className="small">Preferred port (auto-increments if busy)</p>
                        </div>
                        <div className="input-group">
                            <label>Bind Mode</label>
                            <select name="EDITOR_BIND">
                                <option value="local">Local only (127.0.0.1)</option>
                                <option value="public">Public (0.0.0.0)</option>
                            </select>
                            <p className="small">Local = secure; Public = accessible from network</p>
                        </div>
                    </div>
                </div>

                {/* Integrations (from settings-integrations) */}
                <div className="settings-section">
                    <h3 id="admin-integrations-anchor">MCP & Channels</h3>
                    <p className="small">Set per‑channel inference models. Provider is inferred from the model name; use base URL and keys from Infrastructure or Models for proxies/local engines.</p>
                    <div className="input-row">
                        <div className="input-group">
                            <label>HTTP Responses Model</label>
                            <input type="text" name="GEN_MODEL_HTTP" placeholder="override HTTP model" />
                        </div>
                        <div className="input-group">
                            <label>MCP stdio Model</label>
                            <input type="text" name="GEN_MODEL_MCP" placeholder="override MCP model" />
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>CLI Chat Model</label>
                            <input type="text" name="GEN_MODEL_CLI" placeholder="override CLI model" />
                        </div>
                        <div className="input-group">
                            <label>MCP HTTP (host/port/path)</label>
                            <div style={{display: 'flex', gap: '8px'}}>
                                <input type="text" name="MCP_HTTP_HOST" placeholder="0.0.0.0" style={{width: '40%'}} />
                                <input type="number" name="MCP_HTTP_PORT" placeholder="8013" style={{width: '30%'}} />
                                <input type="text" name="MCP_HTTP_PATH" placeholder="/mcp" style={{width: '30%'}} />
                            </div>
                        </div>
                    </div>
                </div>

                <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                    <h3><span style={{color: 'var(--link)'}}>●</span> Alert Notifications (Slack/Discord)</h3>
                    <p className="small">Configure webhook URLs for alert notifications. Leave blank to disable notifications for that platform.</p>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Slack Webhook URL</label>
                            <input type="password" id="webhook_slack_url" placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX" />
                            <p className="small" style={{color: 'var(--fg-muted)', marginTop: '4px'}}>🔒 Password field for security - not saved in browser</p>
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Discord Webhook URL</label>
                            <input type="password" id="webhook_discord_url" placeholder="https://discordapp.com/api/webhooks/000000000000000000/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX" />
                            <p className="small" style={{color: 'var(--fg-muted)', marginTop: '4px'}}>🔒 Password field for security - not saved in browser</p>
                        </div>
                    </div>

                    <div className="input-row">
                        <div className="input-group">
                            <label>Notification Settings</label>
                            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '8px'}}>
                                <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '400', margin: '0'}}>
                                    <input type="checkbox" id="webhook_enabled" checked />
                                    <span>Enable notifications</span>
                                </label>
                                <div>
                                    <label>Notify on severity:</label>
                                    <div style={{display: 'flex', gap: '12px', marginTop: '6px'}}>
                                        <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                            <input type="checkbox" id="webhook_sev_critical" checked />
                                            🔴 Critical
                                        </label>
                                        <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                            <input type="checkbox" id="webhook_sev_warning" checked />
                                            ⚠️ Warning
                                        </label>
                                        <label style={{display: 'flex', alignItems: 'center', gap: '6px'}}>
                                            <input type="checkbox" id="webhook_sev_info" />
                                            ℹ️ Info
                                        </label>
                                    </div>
                                </div>
                                <label style={{display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '400', margin: '0'}}>
                                    <input type="checkbox" id="webhook_include_resolved" checked />
                                    <span>Include resolved alerts</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div className="input-row">
                        <button className="small-button" id="btn-save-webhooks" style={{background: 'var(--accent)', color: 'var(--accent-contrast)', fontWeight: '600', width: '100%'}}>💾 Save Webhook Configuration</button>
                    </div>
                    <div id="webhook-save-status" style={{fontSize: '12px', color: 'var(--fg-muted)', marginTop: '8px'}}></div>
                </div>

                {/* Secrets Management (from settings-secrets) */}
                <div className="settings-section">
                    <h3 id="admin-secrets-anchor">Secrets Management</h3>
                    <p className="small">Import secrets from .env files. Drag and drop .env files in the sidepanel or use the file upload below.</p>
                    {/* Secrets dropzone is in sidepanel (lines 7140-7154) - reference only */}
                </div>

                {/* Debug Tools (from devtools-debug) */}
                <div className="settings-section" style={{borderLeft: '3px solid var(--link)'}}>
                    <h3>
                        <span style={{color: 'var(--link)'}}>●</span> MCP RAG Search (debug)
                    </h3>
                    <p className="small">Runs the MCP server's <code>rag_search</code> tool to return file paths and line ranges. Falls back to local retrieval if MCP is unavailable.</p>
                    <div className="input-row">
                        <div className="input-group full-width">
                            <label>Question</label>
                            <input type="text" id="mcp-rag-q" placeholder="e.g. Where is OAuth token validated?" />
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <label>Repository</label>
                            <input type="text" id="mcp-rag-repo" placeholder="agro" />
                        </div>
                        <div className="input-group">
                            <label>Top K</label>
                            <input type="number" id="mcp-rag-topk" value="10" min="1" max="50" />
                        </div>
                        <div className="input-group">
                            <label>Force Local</label>
                            <select id="mcp-rag-local">
                                <option value="false" selected>No (use MCP if available)</option>
                                <option value="true">Yes (bypass MCP)</option>
                            </select>
                        </div>
                    </div>
                    <div className="input-row">
                        <div className="input-group">
                            <button className="small-button" id="btn-mcp-rag-run">Run</button>
                        </div>
                    </div>
                    <pre id="mcp-rag-results" className="result-display" style={{minHeight: '120px', whiteSpace: 'pre-wrap', background: 'var(--code-bg)'}}></pre>
                </div>
    </>
  )
}
