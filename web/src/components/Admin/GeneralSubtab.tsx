// Imported from /gui/index.html - contains all config parameters
// This component uses dangerouslySetInnerHTML to render the exact HTML from /gui

export function GeneralSubtab() {
  const htmlContent = `                <!-- Theme & Appearance (from settings-general) -->
                <div class="settings-section">
                    <h3>Theme & Appearance</h3>
                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Theme Mode
                                <span class="help-icon" data-tooltip="THEME_MODE">?</span>
                            </label>
                            <select name="THEME_MODE" id="misc-theme-mode">
                                <option value="auto">Auto (System)</option>
                                <option value="dark">Dark</option>
                                <option value="light">Light</option>
                            </select>
                            <p class="small">Controls light/dark theme globally. Top bar selector changes it live.</p>
                        </div>
                    </div>
                </div>

                <!-- Server Settings (from settings-general) -->
                <div class="settings-section" style="border-left: 3px solid var(--link);">
                    <h3>Server Settings</h3>
                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Edition (AGRO_EDITION)
                                <span class="help-icon" data-tooltip="AGRO_EDITION">?</span>
                            </label>
                            <input type="text" name="AGRO_EDITION" placeholder="oss | pro | enterprise">
                        </div>
                        <div class="input-group">
                            <label>
                                Thread ID
                                <span class="help-icon" data-tooltip="THREAD_ID">?</span>
                            </label>
                            <input type="text" name="THREAD_ID" placeholder="http or cli-chat">
                        </div>
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Serve Host
                                <span class="help-icon" data-tooltip="HOST">?</span>
                            </label>
                            <input type="text" name="HOST" value="127.0.0.1">
                        </div>
                        <div class="input-group">
                            <label>
                                Serve Port
                                <span class="help-icon" data-tooltip="PORT">?</span>
                            </label>
                            <input type="number" name="PORT" value="8012">
                        </div>
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Open Browser on Start
                                <span class="help-icon" data-tooltip="OPEN_BROWSER">?</span>
                            </label>
                            <select name="OPEN_BROWSER">
                                <option value="1">On</option>
                                <option value="0">Off</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>
                                agro Path
                                <span class="help-icon" data-tooltip="AGRO_PATH">?</span>
                            </label>
                            <input type="text" name="agro_PATH">
                        </div>
                    </div>

                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Netlify API Key
                                <span class="help-icon" data-tooltip="NETLIFY_API_KEY">?</span>
                            </label>
                            <input type="password" name="NETLIFY_API_KEY">
                        </div>
                        <div class="input-group">
                            <label>
                                Netlify Domains
                                <span class="help-icon" data-tooltip="NETLIFY_DOMAINS">?</span>
                            </label>
                            <input type="text" name="NETLIFY_DOMAINS">
                        </div>
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Chat Streaming Enabled
                                <span class="help-icon" data-tooltip="CHAT_STREAMING_ENABLED">?</span>
                            </label>
                            <select id="CHAT_STREAMING_ENABLED" name="CHAT_STREAMING_ENABLED">
                                <option value="1">Enabled</option>
                                <option value="0">Disabled</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Tracing & Observability Settings -->
                <div class="settings-section" style="border-left: 3px solid var(--link);">
                    <h3>Tracing & Observability</h3>
                    <p class="small">Configure distributed tracing, metrics collection, and monitoring.</p>
                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Tracing Enabled
                                <span class="help-icon" data-tooltip="TRACING_ENABLED">?</span>
                            </label>
                            <select id="TRACING_ENABLED" name="TRACING_ENABLED">
                                <option value="1">Enabled</option>
                                <option value="0">Disabled</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>
                                Trace Sampling Rate
                                <span class="help-icon" data-tooltip="TRACE_SAMPLING_RATE">?</span>
                            </label>
                            <input
                                type="number"
                                id="TRACE_SAMPLING_RATE"
                                name="TRACE_SAMPLING_RATE"
                                value="1.0"
                                min="0.0"
                                max="1.0"
                                step="0.1"
                            />
                        </div>
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Prometheus Port
                                <span class="help-icon" data-tooltip="PROMETHEUS_PORT">?</span>
                            </label>
                            <input
                                type="number"
                                id="PROMETHEUS_PORT"
                                name="PROMETHEUS_PORT"
                                value="9090"
                                min="1024"
                                max="65535"
                                step="1"
                            />
                        </div>
                        <div class="input-group">
                            <label>
                                Metrics Enabled
                                <span class="help-icon" data-tooltip="METRICS_ENABLED">?</span>
                            </label>
                            <select id="METRICS_ENABLED" name="METRICS_ENABLED">
                                <option value="1">Enabled</option>
                                <option value="0">Disabled</option>
                            </select>
                        </div>
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Log Level
                                <span class="help-icon" data-tooltip="LOG_LEVEL">?</span>
                            </label>
                            <select id="LOG_LEVEL" name="LOG_LEVEL">
                                <option value="DEBUG">DEBUG</option>
                                <option value="INFO">INFO</option>
                                <option value="WARNING">WARNING</option>
                                <option value="ERROR">ERROR</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>
                                Alert Webhook Timeout
                                <span class="help-icon" data-tooltip="ALERT_WEBHOOK_TIMEOUT">?</span>
                            </label>
                            <input
                                type="number"
                                id="ALERT_WEBHOOK_TIMEOUT"
                                name="ALERT_WEBHOOK_TIMEOUT"
                                value="5"
                                min="1"
                                max="30"
                                step="1"
                            />
                        </div>
                    </div>
                </div>

                <!-- Embedded Editor Settings (from settings-general) -->
                <div class="settings-section" style="border-left: 3px solid var(--link);">
                    <h3 id="admin-editor-settings-anchor"><span class="accent-blue">●</span> Embedded Editor</h3>
                    <div class="input-row">
                        <div class="input-group">
                            <label class="toggle">
                                <input type="checkbox" name="EDITOR_ENABLED" value="1">
                                <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
                                <span class="toggle-label">Enable Embedded Editor</span>
                            </label>
                            <p class="small">Start OpenVSCode Server container on up.sh</p>
                        </div>
                        <div class="input-group">
                            <label class="toggle">
                                <input type="checkbox" name="EDITOR_EMBED_ENABLED" value="1" checked>
                                <span class="toggle-track" aria-hidden="true"><span class="toggle-thumb"></span></span>
                                <span class="toggle-label">Enable Editor Embed (iframe)</span>
                            </label>
                            <p class="small">Show the editor inline in the GUI (hides automatically in CI)</p>
                        </div>
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <label>
                                Editor Port
                                <span class="help-icon" data-tooltip="EDITOR_PORT">?</span>
                            </label>
                            <input type="number" name="EDITOR_PORT" value="4440" min="1024" max="65535">
                            <p class="small">Preferred port (auto-increments if busy)</p>
                        </div>
                        <div class="input-group">
                            <label>
                                Bind Mode
                                <span class="help-icon" data-tooltip="EDITOR_BIND">?</span>
                            </label>
                            <select name="EDITOR_BIND">
                                <option value="local">Local only (127.0.0.1)</option>
                                <option value="public">Public (0.0.0.0)</option>
                            </select>
                            <p class="small">Local = secure; Public = accessible from network</p>
                        </div>
                    </div>
                </div>

                <!-- Integrations (from settings-integrations) -->
                <div class="settings-section">
                    <h3 id="admin-integrations-anchor">MCP & Channels</h3>
                    <p class="small">Set per‑channel inference models. Provider is inferred from the model name; use base URL and keys from Infrastructure or Models for proxies/local engines.</p>
                    <div class="input-row">
                        <div class="input-group">
                            <label>HTTP Responses Model</label>
                            <select name="GEN_MODEL_HTTP" id="http-model-select">
                                <option value="">Select a model...</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>MCP stdio Model</label>
                            <select name="GEN_MODEL_MCP" id="mcp-model-select">
                                <option value="">Select a model...</option>
                            </select>
                        </div>
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <label>CLI Chat Model</label>
                            <select name="GEN_MODEL_CLI" id="cli-model-select">
                                <option value="">Select a model...</option>
                            </select>
                        </div>
                        <div class="input-group">
                            <label>MCP HTTP (host/port/path)</label>
                            <div style="display:flex; gap:8px;">
                                <input type="text" name="MCP_HTTP_HOST" placeholder="0.0.0.0" style="width:40%">
                                <input type="number" name="MCP_HTTP_PORT" placeholder="8013" style="width:30%">
                                <input type="text" name="MCP_HTTP_PATH" placeholder="/mcp" style="width:30%">
                            </div>
                        </div>
                    </div>
                </div>

                <div class="settings-section" style="border-left: 3px solid var(--link);">
                    <h3><span style="color: var(--link);">●</span> Alert Notifications (Slack/Discord)</h3>
                    <p class="small">Configure webhook URLs for alert notifications. Leave blank to disable notifications for that platform.</p>

                    <div class="input-row">
                        <div class="input-group">
                            <label>Slack Webhook URL</label>
                            <input type="password" id="webhook_slack_url" placeholder="https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX">
                            <p class="small" style="color: var(--fg-muted); margin-top: 4px;">🔒 Password field for security - not saved in browser</p>
                        </div>
                    </div>

                    <div class="input-row">
                        <div class="input-group">
                            <label>Discord Webhook URL</label>
                            <input type="password" id="webhook_discord_url" placeholder="https://discordapp.com/api/webhooks/000000000000000000/XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX">
                            <p class="small" style="color: var(--fg-muted); margin-top: 4px;">🔒 Password field for security - not saved in browser</p>
                        </div>
                    </div>

                    <div class="input-row">
                        <div class="input-group">
                            <label>Notification Settings</label>
                            <div style="display: flex; flex-direction: column; gap: 10px; margin-top: 8px;">
                                <label style="display: flex; align-items: center; gap: 8px; font-weight: 400; margin: 0;">
                                    <input type="checkbox" id="webhook_enabled" checked>
                                    <span>Enable notifications</span>
                                </label>
                                <div>
                                    <label>Notify on severity:</label>
                                    <div style="display: flex; gap: 12px; margin-top: 6px;">
                                        <label style="display: flex; align-items: center; gap: 6px;">
                                            <input type="checkbox" id="webhook_sev_critical" checked>
                                            🔴 Critical
                                        </label>
                                        <label style="display: flex; align-items: center; gap: 6px;">
                                            <input type="checkbox" id="webhook_sev_warning" checked>
                                            ⚠️ Warning
                                        </label>
                                        <label style="display: flex; align-items: center; gap: 6px;">
                                            <input type="checkbox" id="webhook_sev_info">
                                            ℹ️ Info
                                        </label>
                                    </div>
                                </div>
                                <label style="display: flex; align-items: center; gap: 8px; font-weight: 400; margin: 0;">
                                    <input type="checkbox" id="webhook_include_resolved" checked>
                                    <span>Include resolved alerts</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    <div class="input-row">
                        <button class="small-button" id="btn-save-webhooks" style="background: var(--accent); color: var(--accent-contrast); font-weight: 600; width: 100%;">💾 Save Webhook Configuration</button>
                    </div>
                    <div id="webhook-save-status" style="font-size: 12px; color: var(--fg-muted); margin-top: 8px;"></div>
                </div>

                <!-- Secrets Management (from settings-secrets) -->
                <div class="settings-section">
                    <h3 id="admin-secrets-anchor">Secrets Management</h3>
                    <p class="small">Import secrets from .env files. Drag and drop .env files in the sidepanel or use the file upload below.</p>
                    <!-- Secrets dropzone is in sidepanel (lines 7140-7154) - reference only -->
                </div>

                <!-- Debug Tools (from devtools-debug) -->
                <div class="settings-section" style="border-left: 3px solid var(--link);">
                    <h3>
                        <span style="color:var(--link);">●</span> MCP RAG Search (debug)
                    </h3>
                    <p class="small">Runs the MCP server's <code>rag_search</code> tool to return file paths and line ranges. Falls back to local retrieval if MCP is unavailable.</p>
                    <div class="input-row">
                        <div class="input-group full-width">
                            <label>Question</label>
                            <input type="text" id="mcp-rag-q" placeholder="e.g. Where is OAuth token validated?">
                        </div>
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <label>Repository</label>
                            <input type="text" id="mcp-rag-repo" placeholder="agro">
                        </div>
                        <div class="input-group">
                            <label>Top K</label>
                            <input type="number" id="mcp-rag-topk" value="10" min="1" max="50">
                        </div>
                        <div class="input-group">
                            <label>Force Local</label>
                            <select id="mcp-rag-local">
                                <option value="false" selected>No (use MCP if available)</option>
                                <option value="true">Yes (bypass MCP)</option>
                            </select>
                        </div>
                    </div>
                    <div class="input-row">
                        <div class="input-group">
                            <button class="small-button" id="btn-mcp-rag-run">Run</button>
                        </div>
                    </div>
                    <pre id="mcp-rag-results" class="result-display" style="min-height: 120px; white-space: pre-wrap; background: var(--code-bg);"></pre>
                </div>
`;
  
  return <div dangerouslySetInnerHTML={{ __html: htmlContent }} />;
}
